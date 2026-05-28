/**
 * Retro PR fetch + surface pipeline.
 *
 * When a user enables Sous-Chef PR-merge notifications for a repo, we fetch
 * the most-recent merged PR on the default branch and surface it in the
 * activity feed (summary + brag-worthiness) — no eager draft.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getInstallationToken } from "./auth";
import { scanContent } from "@/lib/safety/content-filter";
import {
  buildPrMergeDraftInput,
  type GitHubPullRequestPayload,
} from "./pr-merge";
import {
  surfaceTrigger,
  fallbackSurfaceTrigger,
} from "@/lib/drafts/surface-trigger";

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

function prToPayload(
  pr: GhPull,
  repoFullName: string,
  defaultBranch: string,
): GitHubPullRequestPayload {
  return {
    action: "closed",
    pull_request: {
      number: pr.number,
      merged: true,
      title: pr.title,
      body: pr.body,
      html_url: pr.html_url,
      base: { ref: defaultBranch },
    },
    repository: {
      full_name: repoFullName,
      default_branch: defaultBranch,
    },
  };
}

/**
 * Surface the latest merged PR for a repo (idempotent via sourceReference).
 */
export async function runRetroPrMergeDraft(
  convex: ConvexHttpClient,
  userId: string,
  installationId: number,
  repoFullName: string,
): Promise<
  | { ok: true; mode: "surfaced" | "skipped" | "no_pr" | "exists" }
  | { ok: false; error: string }
> {
  try {
    const result = await fetchLatestMergedPr(installationId, repoFullName);
    if (!result) return { ok: true, mode: "no_pr" };
    const { pr, defaultBranch } = result;
    const payload = prToPayload(pr, repoFullName, defaultBranch);
    const input = buildPrMergeDraftInput(payload, userId);

    const filter = scanContent(pr.title, pr.body);
    let summary: string;
    let confidence: number;
    let reason: string | undefined;

    if (filter.blocked) {
      summary = fallbackSurfaceTrigger({
        type: "pr_merged",
        title: pr.title,
        body: pr.body ?? "",
        repoFullName,
      }).summary;
      confidence = 0;
      reason = "content_filter";
    } else {
      const surfaced = await surfaceTrigger({
        type: "pr_merged",
        title: pr.title,
        body: pr.body ?? "",
        repoFullName,
      });
      summary = surfaced.summary;
      confidence = surfaced.confidence;
    }

    const record = await convex.action(api.triggerEvents.recordSurfacedAction, {
      userId,
      sourceSystem: "github",
      triggerType: "pr_merged_retro",
      sourceReference: pr.html_url,
      summary,
      confidence,
      reason: reason ?? "retro_signup",
      metadata: JSON.stringify({
        milestoneKey: input.milestoneKey,
        repoFullName,
        prNumber: pr.number,
        retro: true,
      }),
    });

    if (!record.created) return { ok: true, mode: "exists" };
    return { ok: true, mode: filter.blocked ? "skipped" : "surfaced" };
  } catch (err) {
    console.error("[sous-chef] runRetroPrMergeDraft failed:", err);
    return { ok: false, error: String(err) };
  }
}
