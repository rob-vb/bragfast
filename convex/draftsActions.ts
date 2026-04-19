"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { analyzeCommits, type CommitInput } from "../src/lib/github/analyze-commits";
import { pickTemplate, type TemplateCandidate } from "../src/lib/github/pick-template";
import { generateSlideContent } from "../src/lib/github/generate-slide-content";
import { migrateConfig } from "../src/lib/templates/canvas-types";
import type { CanvasTemplateConfig, TemplateObject } from "../src/lib/templates/canvas-types";

// Windowed source = "24h ending at startedAt, aligned to UTC day".
const WINDOW_MS = 24 * 60 * 60 * 1000;

function dayWindow(nowMs: number): { windowStart: number; windowEnd: number } {
  const day = Math.floor(nowMs / WINDOW_MS);
  return { windowStart: day * WINDOW_MS, windowEnd: (day + 1) * WINDOW_MS };
}

async function fetchInstallationToken(userId: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CONVEX_INTERNAL_SECRET;
  if (!base) throw new Error("NEXT_PUBLIC_SITE_URL not set in Convex env");
  if (!secret) throw new Error("CONVEX_INTERNAL_SECRET not set in Convex env");

  const res = await fetch(`${base}/api/internal/github-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-auth": secret },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`token fetch failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

async function fetchRecentCommits(
  repoFullName: string,
  token: string,
  sinceMs: number,
): Promise<CommitInput[]> {
  const since = new Date(sinceMs).toISOString();
  const url = `https://api.github.com/repos/${repoFullName}/commits?since=${encodeURIComponent(since)}&per_page=50`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return []; // repo renamed/deleted
  if (res.status === 409) return []; // empty repo
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    throw new Error(`commits ${res.status} (ratelimit remaining: ${remaining ?? "unknown"})`);
  }
  const data = (await res.json()) as Array<{
    sha: string;
    commit: { message: string };
    author?: { login?: string };
  }>;
  // Drop bot authors eagerly before Haiku sees them.
  return data
    .filter((c) => {
      const login = c.author?.login?.toLowerCase() ?? "";
      return !login.includes("bot") && !login.includes("dependabot") && !login.includes("renovate");
    })
    .map((c) => ({ sha: c.sha, message: c.commit.message }));
}

function extractCandidateSlots(config: CanvasTemplateConfig, format: "landscape" | "square" | "portrait") {
  const objs = config.formats[format]?.objects ?? [];
  return objs
    .filter((o: TemplateObject) => o.type === "text" || o.type === "visual")
    .map((o: TemplateObject) => ({
      id: o.id,
      type: o.type as "text" | "visual" | "logo",
      maxLines: o.type === "text" ? (o as unknown as { maxLines?: number }).maxLines : undefined,
    }));
}

// ────────────────────────────────────────────────────────────
// Per-user daily cron action
// ────────────────────────────────────────────────────────────

export const draftForUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const startedAt = Date.now();
    const { windowStart, windowEnd } = dayWindow(startedAt);
    let draftsCreated = 0;
    let draftsSkippedDedup = 0;
    let draftsSkippedCollision = 0;

    try {
      const repos = await ctx.runQuery(internal.drafts.listWatchedReposForUser, { userId });
      if (repos.length === 0) {
        await ctx.runMutation(internal.drafts.recordCronRun, {
          userId,
          startedAt,
          outcome: "silent",
          draftsCreated: 0,
          draftsSkippedDedup: 0,
          draftsSkippedCollision: 0,
        });
        return;
      }

      const token = await fetchInstallationToken(userId);

      // Flatten commits across all watched repos, keyed by repoFullName.
      // Cron picks at most one draft per user per day; repo-level iteration
      // exists so we can tag the draft with the right repo for dedup.
      const perRepo: Array<{ repoFullName: string; commits: CommitInput[] }> = [];
      for (const repo of repos) {
        const commits = await fetchRecentCommits(repo.repoFullName, token, windowStart);
        if (commits.length > 0) perRepo.push({ repoFullName: repo.repoFullName, commits });
      }

      if (perRepo.length === 0) {
        await ctx.runMutation(internal.drafts.recordCronRun, {
          userId,
          startedAt,
          outcome: "silent",
          draftsCreated: 0,
          draftsSkippedDedup: 0,
          draftsSkippedCollision: 0,
        });
        return;
      }

      // Pick the most active repo (most commits) as Haiku's target.
      perRepo.sort((a, b) => b.commits.length - a.commits.length);
      const target = perRepo[0];

      const analysis = await analyzeCommits({
        repoFullName: target.repoFullName,
        commits: target.commits,
      });

      if (!analysis.worthPosting || !analysis.draftCopy || !analysis.chosenCommitSha) {
        await ctx.runMutation(internal.drafts.recordCronRun, {
          userId,
          startedAt,
          outcome: "silent",
          draftsCreated: 0,
          draftsSkippedDedup: 0,
          draftsSkippedCollision: 0,
        });
        return;
      }

      const templates = await ctx.runQuery(internal.drafts.listTemplateCandidates, { userId });
      if (templates.length === 0) {
        throw new Error("No templates available for user");
      }

      const pick = await pickTemplate({
        draftCopy: analysis.draftCopy,
        candidates: templates.map(
          (t) => ({ id: t.externalId, name: t.name, tags: t.tags, description: t.description }) satisfies TemplateCandidate,
        ),
        availableFormats: ["landscape"], // v1: landscape only
      });

      const chosenTemplate = templates.find((t) => t.externalId === pick.templateId);
      if (!chosenTemplate) throw new Error(`Haiku-picked template ${pick.templateId} not found`);

      const config = migrateConfig(chosenTemplate.config) as CanvasTemplateConfig;
      const slots = extractCandidateSlots(config, pick.format);

      const slide = await generateSlideContent({
        draftCopy: analysis.draftCopy,
        commitMessage: target.commits.find((c) => c.sha === analysis.chosenCommitSha)?.message ?? "",
        templateSlots: slots,
      });

      const insertResult = await ctx.runMutation(internal.drafts.insertDraftIfNew, {
        userId,
        source: "cron-commit",
        repoFullName: target.repoFullName,
        windowStart,
        windowEnd,
        sourceCommitShas: [analysis.chosenCommitSha],
        platform: "twitter",
        copy: analysis.draftCopy,
        originalCopy: analysis.draftCopy,
        suggestedTemplateId: pick.templateId,
        suggestedFormat: pick.format,
        aiContent: slide.objects,
      });

      if (insertResult.inserted) {
        draftsCreated = 1;
      } else if (insertResult.reason === "dedup") {
        draftsSkippedDedup = 1;
      } else if (insertResult.reason === "collision") {
        draftsSkippedCollision = 1;
      }

      await ctx.runMutation(internal.drafts.recordCronRun, {
        userId,
        startedAt,
        outcome: draftsCreated > 0 ? "success" : "silent",
        draftsCreated,
        draftsSkippedDedup,
        draftsSkippedCollision,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[draftForUser] failed", { userId, message });
      await ctx.runMutation(internal.drafts.recordDraftError, {
        userId,
        windowStart,
        windowEnd,
        errorMessage: message,
      });
      await ctx.runMutation(internal.drafts.recordCronRun, {
        userId,
        startedAt,
        outcome: "error",
        draftsCreated,
        draftsSkippedDedup,
        draftsSkippedCollision,
        errorMessage: message,
      });
    }
  },
});

// ────────────────────────────────────────────────────────────
// Top-level cron entrypoint — fans out to eligible users.
// v1: founder-only via FOUNDER_USER_ID env guard.
// TODO: remove founder gate when opening to users.
// ────────────────────────────────────────────────────────────

export const runDailyDraftJob = internalAction({
  args: {},
  handler: async (ctx) => {
    const founderUserId = process.env.FOUNDER_USER_ID;
    if (!founderUserId) {
      console.warn("[runDailyDraftJob] FOUNDER_USER_ID not set — no-op");
      return;
    }
    // Single-user v1. Fanout harness is the same when we remove the gate.
    await ctx.scheduler.runAfter(0, internal.draftsActions.draftForUser, {
      userId: founderUserId,
    });
  },
});

