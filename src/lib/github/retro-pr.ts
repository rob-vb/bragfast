/**
 * Retro PR fetch + draft pipeline.
 *
 * When a user enables Sous-Chef PR-merge notifications for a repo, we fetch
 * the most-recent merged PR on the default branch and run the same pipeline
 * the live webhook does (Layer 1 filter → composeCopy → confidence → idempotent
 * insert). The result is that signing up + picking a repo yields a pre-rendered
 * draft on the dashboard, instead of an empty state.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getInstallationToken } from "./auth";
import {
  composeCopyByPlatform,
  PLATFORMS,
  SUPPRESS_THRESHOLD,
  type Platform,
} from "@/lib/drafts/compose-copy";
import { pickTemplate } from "@/lib/drafts/pick-template";
import { scanContent } from "@/lib/safety/content-filter";
import {
  buildIdempotencyKey,
  prMergedMilestoneKey,
} from "@/lib/drafts/idempotency-key";
import type { DraftConfig } from "@/lib/drafts/types";

interface GhPull {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string | null;
  base: { ref: string };
}

interface GhRepo {
  default_branch: string;
}

/**
 * Fetch the most-recent merged PR on the repo's default branch via the GitHub
 * REST API. Returns null if none exist or the API call fails.
 */
export async function fetchLatestMergedPr(
  installationId: number,
  repoFullName: string,
): Promise<{ pr: GhPull; defaultBranch: string } | null> {
  const token = await getInstallationToken(installationId);

  const repoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!repoRes.ok) return null;
  const repo = (await repoRes.json()) as GhRepo;
  const defaultBranch = repo.default_branch;

  const listRes = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls?state=closed&base=${encodeURIComponent(defaultBranch)}&sort=updated&direction=desc&per_page=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!listRes.ok) return null;
  const pulls = (await listRes.json()) as GhPull[];
  const merged = pulls.find((p) => p.merged_at !== null);
  if (!merged) return null;

  return { pr: merged, defaultBranch };
}

/**
 * Run the retro-PR pipeline for a single repo. Idempotent via the same
 * milestoneKey the live webhook uses, so re-running is a no-op.
 */
export async function runRetroPrMergeDraft(
  convex: ConvexHttpClient,
  userId: string,
  installationId: number,
  repoFullName: string,
): Promise<
  | { ok: true; draftId?: string; mode: "drafted" | "skipped" | "no_pr" }
  | { ok: false; error: string }
> {
  try {
    const result = await fetchLatestMergedPr(installationId, repoFullName);
    if (!result) return { ok: true, mode: "no_pr" };
    const { pr } = result;

    // Layer 1 safety: skip retro draft if PR title/body is sensitive.
    const filter = scanContent(pr.title, pr.body);
    if (filter.blocked) {
      const categories = [...new Set(filter.matches.map((m) => m.category))];
      await convex
        .action(api.triggerEvents.recordAction, {
          userId,
          sourceSystem: "github",
          triggerType: "pr_merged_retro",
          decision: "auto_skipped",
          reason: "content_filter",
          sourceReference: pr.html_url,
          metadata: JSON.stringify({ categories, retro: true }),
        })
        .catch(() => undefined);
      return { ok: true, mode: "skipped" };
    }

    const milestoneKey = prMergedMilestoneKey(repoFullName, pr.number);
    const idempotencyKey = buildIdempotencyKey(userId, "github", milestoneKey);

    // Skip generation if a draft for this milestone already exists.
    const [disabled, voicePreset, examples] = await Promise.all([
      convex.query(api.userProfiles.getDisabledPlatforms, { userId }),
      convex.query(api.userProfiles.getVoicePreset, { userId }),
      convex.query(api.drafts.getRecentApprovedEdits, { userId }),
    ]);
    const enabledPlatforms: Platform[] = PLATFORMS.filter(
      (p) => !disabled.includes(p),
    );
    const preset = voicePreset as
      | "casual_builder"
      | "dry_technical"
      | "earnest_milestone"
      | "deadpan"
      | null;

    const [pick, composed] = await Promise.all([
      pickTemplate({
        milestoneKey,
        prContext: { title: pr.title, body: pr.body ?? "" },
      }),
      composeCopyByPlatform(
        {
          type: "pr_merged",
          title: pr.title,
          body: pr.body ?? "",
          repoFullName,
          voicePreset: preset,
          examples,
        },
        enabledPlatforms,
      ),
    ]);
    const { copies, primary } = composed;
    const suppressed = primary.confidence < SUPPRESS_THRESHOLD;

    const draftConfig: DraftConfig = {
      output: "image",
      templateId: pick.templateId,
      objectContent: {
        title: { text: primary.title },
        description: { text: primary.description },
      },
      copyByPlatform: copies,
      notes: `Sous-Chef: retro PR #${pr.number} merged in ${repoFullName}`,
    };

    await convex.action(api.drafts.insertDraftIfNewAction, {
      userId,
      idempotencyKey,
      sourceSystem: "github",
      milestoneKey,
      eventReference: pr.html_url,
      name: primary.title,
      config: JSON.stringify(draftConfig),
      createdBy: "sous-chef-retro",
      confidence: primary.confidence,
      suppressed,
    });

    await convex
      .action(api.triggerEvents.recordAction, {
        userId,
        sourceSystem: "github",
        triggerType: "pr_merged_retro",
        decision: suppressed ? "auto_skipped" : "drafted",
        reason: suppressed ? "low_confidence" : "retro_signup",
        confidence: primary.confidence,
        sourceReference: pr.html_url,
        metadata: JSON.stringify({ milestoneKey, retro: true }),
      })
      .catch(() => undefined);

    return { ok: true, mode: suppressed ? "skipped" : "drafted" };
  } catch (err) {
    console.error("[sous-chef] runRetroPrMergeDraft failed:", err);
    return { ok: false, error: String(err) };
  }
}
