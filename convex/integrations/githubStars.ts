"use node";

import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { getInstallationToken } from "../../src/lib/github/auth";
import {
  buildIdempotencyKey,
  goalMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { typedMilestoneKey } from "../../src/lib/goals/types";
import type { GoalMetric } from "../../src/lib/goals/types";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";
import {
  captureFromConvex,
  goalCategoryFromMetric,
  daysBetween,
} from "../posthogCapture";

type RepoConfig = {
  installationId: number;
  repoFullName: string;
  enabled: boolean;
};

type StarGoal = {
  externalId: string;
  metric: GoalMetric;
  target: number | null;
  scope: string | null;
  label: string | null;
  enabled: boolean;
};

async function fetchStarCount(
  token: string,
  repoFullName: string,
): Promise<number> {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitHub /repos/${repoFullName} failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  const json = (await response.json()) as { stargazers_count?: number };
  return typeof json.stargazers_count === "number" ? json.stargazers_count : 0;
}

// Per-user scan: walks each installation's enabled repos, polls star counts,
// fires drafts for newly-crossed goal thresholds per repo.
export const scan = internalAction({
  args: { userId: v.string(), installationId: v.number() },
  handler: async (ctx, { userId, installationId }) => {
    try {
      const token = await getInstallationToken(installationId);

      const configs = (await ctx.runQuery(
        internal.githubRepoConfigs.internalListByInstallation,
        { installationId },
      )) as RepoConfig[];
      const enabledRepos = configs.filter((c) => c.enabled);

      const hitKeys = (await ctx.runQuery(
        api.milestoneHits.listByUserSource,
        { userId, sourceSystem: "github" },
      )) as string[];

      const firedGoalIds = new Set(
        hitKeys
          .filter((k) => k.startsWith("goal:"))
          .map((k) => k.slice("goal:".length)),
      );

      const goals = (await ctx.runQuery(
        internal.goals.listEnabledByUserProvider,
        { userId, provider: "github" },
      )) as StarGoal[];

      const results: Array<{ repo: string; stars: number; fired: number }> = [];
      const starMap: Record<string, number> = {};

      for (const cfg of enabledRepos) {
        const repoGoals = goals.filter((g) => g.scope === cfg.repoFullName);
        if (repoGoals.length === 0) {
          results.push({ repo: cfg.repoFullName, stars: 0, fired: 0 });
          continue;
        }

        const stars = await fetchStarCount(token, cfg.repoFullName);
        starMap[cfg.repoFullName] = stars;
        let fired = 0;
        for (const goal of repoGoals) {
          if (firedGoalIds.has(goal.externalId)) continue;
          if (stars < (goal.target ?? 0)) continue;
          await fireDraft(ctx, userId, goal);
          fired++;
        }
        results.push({ repo: cfg.repoFullName, stars, fired });
      }

      await ctx.runMutation(internal.githubInstallations.recordScanResult, {
        installationId,
        ok: true,
        snapshotJson: JSON.stringify(starMap),
      });
      return { ok: true, results };
    } catch (err) {
      console.error(
        `[sous-chef] GitHub stars scan failed for user=${userId} installation=${installationId}:`,
        err,
      );
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.githubInstallations.recordScanResult, {
        installationId,
        ok: false,
        error: msg.slice(0, 500),
      });
      return { ok: false, error: msg };
    }
  },
});

export const seedFromCurrentState = internalAction({
  args: { userId: v.string(), installationId: v.number() },
  handler: async (ctx, { userId, installationId }) => {
    const token = await getInstallationToken(installationId);
    const configs = (await ctx.runQuery(
      internal.githubRepoConfigs.internalListByInstallation,
      { installationId },
    )) as RepoConfig[];

    // Seed default star goals for each repo (enabled or not)
    const repoFullNames = configs.map((c) => c.repoFullName);
    await ctx.runMutation(internal.goals.seedDefaultsForProvider, {
      userId,
      provider: "github",
      repoFullNames,
    });

    const goals = (await ctx.runQuery(
      internal.goals.listEnabledByUserProvider,
      { userId, provider: "github" },
    )) as StarGoal[];

    // Fetch stars for any repo that has a goal, regardless of repo enabled flag
    const reposWithGoals = [...new Set(goals.map((g) => g.scope).filter(Boolean) as string[])];

    const seeded: Array<{ repo: string; goalIds: string[] }> = [];
    const starMap: Record<string, number> = {};
    for (const repoFullName of reposWithGoals) {
      const repoGoals = goals.filter((g) => g.scope === repoFullName);
      if (repoGoals.length === 0) continue;

      const stars = await fetchStarCount(token, repoFullName);
      starMap[repoFullName] = stars;
      const goalIds: string[] = [];
      for (const goal of repoGoals) {
        if (stars < (goal.target ?? 0)) continue;
        await ctx.runMutation(internal.milestoneHits.seedAlreadyHit, {
          userId,
          sourceSystem: "github",
          milestoneKey: goalMilestoneKey(goal.externalId),
        });
        goalIds.push(goal.externalId);
      }
      if (goalIds.length > 0) seeded.push({ repo: repoFullName, goalIds });
    }

    await ctx.runMutation(internal.githubInstallations.recordScanResult, {
      installationId,
      ok: true,
      snapshotJson: JSON.stringify(starMap),
    });

    return { seeded };
  },
});

// Fans out: one scheduled per-user-installation scan for every active install.
export const scanAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const installs = await ctx.runQuery(
      internal.githubInstallations.listAllEnabled,
      {},
    );
    for (const row of installs as Array<{
      installationId: number;
      userId: string;
    }>) {
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.githubStars.scan,
        { userId: row.userId, installationId: row.installationId },
      );
    }
    return { scheduled: installs.length };
  },
});

async function fireDraft(
  ctx: ActionCtx,
  userId: string,
  goal: StarGoal,
): Promise<void> {
  const milestoneKey = typedMilestoneKey({
    metric: goal.metric,
    target: goal.target ?? undefined,
    scope: goal.scope ?? undefined,
    provider: "github",
  });
  const idempotencyKey = buildIdempotencyKey(
    userId,
    "github",
    goalMilestoneKey(goal.externalId),
  );

  const [profile, examples] = await Promise.all([
    ctx.runQuery(internal.userProfiles.getByUserIdInternal, { userId }),
    ctx.runQuery(api.drafts.getRecentApprovedEdits, { userId }),
  ]);
  const voicePreset = (profile?.voicePreset ?? null) as
    | "casual_builder"
    | "dry_technical"
    | "earnest_milestone"
    | "deadpan"
    | null;
  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy({
      type: "star",
      repoFullName: goal.scope ?? "",
      threshold: goal.target ?? 0,
      voicePreset,
      examples,
    }),
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
    sourceSystem: "github",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
  const fireResult = await ctx.runMutation(internal.goals.markFired, {
    externalId: goal.externalId,
  });
  // S5.5: schedule celebration email exactly once (first hit only).
  if (fireResult.firstHit && fireResult.userId) {
    await ctx.scheduler.runAfter(0, internal.goalEmails.sendCelebrationEmail, {
      userId: fireResult.userId,
      label: fireResult.label,
      metric: fireResult.metric,
      target: fireResult.target,
      scope: fireResult.scope,
    });
    await captureFromConvex({
      event: "goal_hit",
      distinctId: fireResult.userId,
      properties: {
        goal_category: goalCategoryFromMetric(fireResult.metric),
        days_from_goal_set: daysBetween(
          fireResult.createdAt,
          new Date().toISOString(),
        ),
      },
    });
  }
}
