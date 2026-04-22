"use node";

import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { open } from "../../src/lib/crypto/secret-box";
import {
  parseVisitorMilestoneKey,
  detectCrossedVisitorThresholds,
} from "../../src/lib/integrations/posthog-milestones";
import {
  buildIdempotencyKey,
  visitorsMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";

type PostHogExtra = {
  projectId: string;
  host: string; // e.g. https://us.posthog.com, https://eu.posthog.com, or self-hosted URL
};

async function readState(ctx: ActionCtx, userId: string): Promise<{
  apiKey: string;
  extra: PostHogExtra;
  alreadyHit: number[];
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

  const hitKeys = await ctx.runQuery(api.milestoneHits.listByUserSource, {
    userId,
    sourceSystem: "posthog",
  });
  const alreadyHit = (hitKeys as string[])
    .map(parseVisitorMilestoneKey)
    .filter((n): n is number => n !== null);

  return { apiKey, extra, alreadyHit };
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

      const visitors = await fetchUniqueVisitors30d(state.apiKey, state.extra);
      const newThresholds = detectCrossedVisitorThresholds(
        visitors,
        state.alreadyHit,
      );
      for (const threshold of newThresholds) {
        await fireDraft(ctx, userId, threshold);
      }
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "posthog",
        ok: true,
      });
      return { ok: true, visitors, fired: newThresholds };
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
    const visitors = await fetchUniqueVisitors30d(state.apiKey, state.extra);
    const crossed = detectCrossedVisitorThresholds(visitors, []);
    for (const threshold of crossed) {
      await ctx.runMutation(api.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "posthog",
        milestoneKey: visitorsMilestoneKey("posthog", threshold),
      });
    }
    return { seeded: crossed, visitors };
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
  threshold: number,
): Promise<void> {
  const milestoneKey = visitorsMilestoneKey("posthog", threshold);
  const idempotencyKey = buildIdempotencyKey(userId, "posthog", milestoneKey);
  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy({ type: "visitors", source: "posthog", threshold }),
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
  await ctx.runMutation(api.drafts.insertDraftIfNew, {
    userId,
    idempotencyKey,
    sourceSystem: "posthog",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
}
