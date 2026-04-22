"use node";

import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { getInstallationToken } from "../../src/lib/github/auth";
import {
  parseStarMilestoneKeyForRepo,
  detectCrossedStarThresholds,
} from "../../src/lib/integrations/github-star-milestones";
import {
  buildIdempotencyKey,
  starMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";

type RepoConfig = {
  installationId: number;
  repoFullName: string;
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
// fires drafts for newly-crossed thresholds per repo.
export const scan = internalAction({
  args: { userId: v.string(), installationId: v.number() },
  handler: async (ctx, { userId, installationId }) => {
    try {
      const token = await getInstallationToken(installationId);

      const configs = (await ctx.runQuery(
        api.githubRepoConfigs.listByInstallation,
        { installationId },
      )) as RepoConfig[];
      const enabledRepos = configs.filter((c) => c.enabled);

      const hitKeys = (await ctx.runQuery(
        api.milestoneHits.listByUserSource,
        { userId, sourceSystem: "github" },
      )) as string[];

      const results: Array<{ repo: string; stars: number; fired: number[] }> = [];

      for (const cfg of enabledRepos) {
        const stars = await fetchStarCount(token, cfg.repoFullName);
        const alreadyHit = hitKeys
          .map((k) => parseStarMilestoneKeyForRepo(k, cfg.repoFullName))
          .filter((n): n is number => n !== null);
        const crossed = detectCrossedStarThresholds(stars, alreadyHit);
        for (const threshold of crossed) {
          await fireDraft(ctx, userId, cfg.repoFullName, threshold);
        }
        results.push({ repo: cfg.repoFullName, stars, fired: crossed });
      }

      return { ok: true, results };
    } catch (err) {
      console.error(
        `[sous-chef] GitHub stars scan failed for user=${userId} installation=${installationId}:`,
        err,
      );
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },
});

export const seedFromCurrentState = internalAction({
  args: { userId: v.string(), installationId: v.number() },
  handler: async (ctx, { userId, installationId }) => {
    const token = await getInstallationToken(installationId);
    const configs = (await ctx.runQuery(
      api.githubRepoConfigs.listByInstallation,
      { installationId },
    )) as RepoConfig[];
    const enabledRepos = configs.filter((c) => c.enabled);

    const seeded: Array<{ repo: string; thresholds: number[] }> = [];
    for (const cfg of enabledRepos) {
      const stars = await fetchStarCount(token, cfg.repoFullName);
      const crossed = detectCrossedStarThresholds(stars, []);
      for (const threshold of crossed) {
        await ctx.runMutation(api.milestoneHits.seedAlreadyHit, {
          userId,
          sourceSystem: "github",
          milestoneKey: starMilestoneKey(cfg.repoFullName, threshold),
        });
      }
      seeded.push({ repo: cfg.repoFullName, thresholds: crossed });
    }
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
  repoFullName: string,
  threshold: number,
): Promise<void> {
  const milestoneKey = starMilestoneKey(repoFullName, threshold);
  const idempotencyKey = buildIdempotencyKey(userId, "github", milestoneKey);
  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy({ type: "star", repoFullName, threshold }),
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
    sourceSystem: "github",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
}
