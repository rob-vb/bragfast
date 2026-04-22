"use node";

import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { open } from "../../src/lib/crypto/secret-box";
import {
  buildIdempotencyKey,
} from "../../src/lib/drafts/idempotency-key";
import { typedMilestoneKey } from "../../src/lib/goals/types";
import type { GoalMetric } from "../../src/lib/goals/types";
import { goalMilestoneKey } from "../../src/lib/drafts/idempotency-key";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";
import { ALLOWED_POSTHOG_HOSTS } from "../../src/lib/integrations/posthog-hosts";

type PostHogExtra = {
  projectId: string;
  host: string;
};

type VisitorGoal = {
  externalId: string;
  metric: GoalMetric;
  target: number | null;
  scope: string | null;
  label: string | null;
  enabled: boolean;
};

async function readState(ctx: ActionCtx, userId: string): Promise<{
  apiKey: string;
  extra: PostHogExtra;
  hitKeys: string[];
} | null> {
  const sealed = await ctx.runQuery(
    internal.integrationSecrets.getSealedForScan,
    { userId, provider: "posthog" },
  );
  if (!sealed || !sealed.extra) return null;

  const apiKey = open({
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
  });

  let extra: PostHogExtra;
  try {
    extra = JSON.parse(sealed.extra) as PostHogExtra;
  } catch {
    return null;
  }
  if (!extra.projectId || !extra.host) return null;

  const hitKeys = (await ctx.runQuery(api.milestoneHits.listByUserSource, {
    userId,
    sourceSystem: "posthog",
  })) as string[];

  return { apiKey, extra, hitKeys };
}

// Query PostHog for unique visitors over the last 30 days via HogQL.
// Returns 0 on any failure — scan handler records the error; next run retries.
async function fetchUniqueVisitors30d(
  apiKey: string,
  extra: PostHogExtra,
): Promise<number> {
  const host = extra.host.replace(/\/$/, "");
  const url = `${host}/api/projects/${extra.projectId}/query/`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query:
          "SELECT count(DISTINCT person_id) FROM events WHERE event = '$pageview' AND timestamp >= now() - interval 30 day",
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `PostHog query failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }
  const json = (await response.json()) as { results?: unknown[] };
  const first = Array.isArray(json.results) ? json.results[0] : null;
  const count = Array.isArray(first) ? Number(first[0]) : 0;
  return Number.isFinite(count) ? count : 0;
}

export const scan = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      const state = await readState(ctx, userId);
      if (!state) return { skipped: "not_connected" };

      const { apiKey, extra, hitKeys } = state;
      const firedGoalIds = new Set(
        hitKeys
          .filter((k) => k.startsWith("goal:"))
          .map((k) => k.slice("goal:".length)),
      );

      const goals = (await ctx.runQuery(
        internal.goals.listEnabledByUserProvider,
        { userId, provider: "posthog" },
      )) as VisitorGoal[];

      if (goals.length === 0) {
        await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
          userId, provider: "posthog", ok: true,
        });
        return { ok: true, fired: 0, reason: "no_goals" };
      }

      const visitors = await fetchUniqueVisitors30d(apiKey, extra);

      let fired = 0;
      for (const goal of goals) {
        if (firedGoalIds.has(goal.externalId)) continue;
        if (visitors < (goal.target ?? 0)) continue;
        await fireDraft(ctx, userId, goal, visitors);
        fired++;
      }

      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId, provider: "posthog", ok: true,
        snapshotJson: JSON.stringify({ visitors }),
      });
      return { ok: true, visitors, fired };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "posthog",
        ok: false,
        error: msg.slice(0, 500),
      });
      console.error(`[sous-chef] PostHog scan failed for ${userId}:`, err);
      return { ok: false, error: msg };
    }
  },
});

export const seedFromCurrentState = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const state = await readState(ctx, userId);
    if (!state) return { skipped: "not_connected" };

    await ctx.runMutation(internal.goals.seedDefaultsForProvider, {
      userId,
      provider: "posthog",
    });

    const visitors = await fetchUniqueVisitors30d(state.apiKey, state.extra);

    const goals = (await ctx.runQuery(
      internal.goals.listEnabledByUserProvider,
      { userId, provider: "posthog" },
    )) as VisitorGoal[];

    const seeded: string[] = [];
    for (const goal of goals) {
      if (visitors < (goal.target ?? 0)) continue;
      await ctx.runMutation(internal.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "posthog",
        milestoneKey: goalMilestoneKey(goal.externalId),
      });
      seeded.push(goal.externalId);
    }

    await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
      userId, provider: "posthog", ok: true,
      snapshotJson: JSON.stringify({ visitors }),
    });

    return { seeded, visitors };
  },
});

export const scanAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const enabled = await ctx.runQuery(
      internal.integrationSecrets.listEnabledByProvider,
      { provider: "posthog" },
    );
    for (const row of enabled as Array<{ userId: string }>) {
      await ctx.scheduler.runAfter(0, internal.integrations.posthog.scan, {
        userId: row.userId,
      });
    }
    return { scheduled: enabled.length };
  },
});

async function fireDraft(
  ctx: ActionCtx,
  userId: string,
  goal: VisitorGoal,
  visitors: number,
): Promise<void> {
  const milestoneKey = typedMilestoneKey({
    metric: goal.metric,
    target: goal.target ?? undefined,
    scope: goal.scope ?? undefined,
    provider: "posthog",
  });
  const idempotencyKey = buildIdempotencyKey(
    userId,
    "posthog",
    goalMilestoneKey(goal.externalId),
  );

  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy({ type: "visitors", source: "posthog", threshold: goal.target ?? visitors }),
  ]);

  const draftConfig: DraftConfig = {
    output: "image",
    templateId: pick.templateId,
    objectContent: {
      title: { text: copy.title },
      description: { text: copy.description },
    },
    notes: `Sous-Chef: ${milestoneKey}`,
  };

  await ctx.runMutation(internal.drafts.insertDraftIfNew, {
    userId,
    idempotencyKey,
    sourceSystem: "posthog",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
  await ctx.runMutation(internal.goals.disableGoal, { externalId: goal.externalId });
}
