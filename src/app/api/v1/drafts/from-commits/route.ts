import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getInstallationToken } from "@/lib/github/auth";
import { fetchRecentCommits } from "@/lib/github/fetch-commits";
import { analyzeCommits } from "@/lib/github/analyze-commits";
import { pickTemplate, type TemplateCandidate } from "@/lib/github/pick-template";
import { generateSlideContent } from "@/lib/github/generate-slide-content";
import { migrateConfig } from "@/lib/templates/canvas-types";
import { extractCandidateSlots } from "@/lib/templates/extract-slots";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

// Haiku x3 + GitHub fetch can run 5-15s. Vercel hobby default is 10s.
export const maxDuration = 60;

const WINDOW_MS = 24 * 60 * 60 * 1000;

function dayWindow(nowMs: number): { windowStart: number; windowEnd: number } {
  const day = Math.floor(nowMs / WINDOW_MS);
  return { windowStart: day * WINDOW_MS, windowEnd: (day + 1) * WINDOW_MS };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repoFullName?: string; windowStartMs?: number; windowEndMs?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.repoFullName || typeof body.repoFullName !== "string") {
    return Response.json({ error: "repoFullName required" }, { status: 400 });
  }

  const now = Date.now();
  const { windowStart: defaultStart, windowEnd: defaultEnd } = dayWindow(now);
  const windowStart = body.windowStartMs ?? defaultStart;
  const windowEnd = body.windowEndMs ?? defaultEnd;

  // Authz: confirm repo is in user's watched set + resolve installationId.
  const repos = await fetchQuery(api.drafts.listWatchedReposForUser, {
    userId: auth.userId,
  });
  const repo = repos.find((r) => r.repoFullName === body.repoFullName);
  if (!repo) {
    return Response.json({ error: "Repo not in watched list" }, { status: 403 });
  }

  let token: string;
  try {
    token = await getInstallationToken(repo.installationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `GitHub installation token failed: ${message}` }, { status: 502 });
  }

  let commits;
  try {
    commits = await fetchRecentCommits(body.repoFullName, token, windowStart);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `GitHub commits fetch failed: ${message}` }, { status: 502 });
  }

  if (commits.length === 0) {
    return Response.json({ skipped: "no-commits" }, { status: 200 });
  }

  const analysis = await analyzeCommits({
    repoFullName: body.repoFullName,
    commits,
  });

  if (!analysis.worthPosting || !analysis.draftCopy || !analysis.chosenCommitSha) {
    return Response.json({ skipped: "not-worth-posting", reasoning: analysis.reasoning }, { status: 200 });
  }

  const templates = await fetchQuery(api.drafts.listTemplateCandidates, {
    userId: auth.userId,
  });
  if (templates.length === 0) {
    return Response.json({ error: "No templates available" }, { status: 500 });
  }

  const pick = await pickTemplate({
    draftCopy: analysis.draftCopy,
    candidates: templates.map(
      (t): TemplateCandidate => ({
        id: t.externalId,
        name: t.name,
        tags: t.tags,
        description: t.description,
      }),
    ),
    availableFormats: ["landscape"],
  });

  const chosenTemplate = templates.find((t) => t.externalId === pick.templateId);
  if (!chosenTemplate) {
    return Response.json({ error: `Template ${pick.templateId} not found` }, { status: 500 });
  }

  const config = migrateConfig(chosenTemplate.config) as CanvasTemplateConfig;
  const slots = extractCandidateSlots(config, pick.format);

  const slide = await generateSlideContent({
    draftCopy: analysis.draftCopy,
    commitMessage: commits.find((c) => c.sha === analysis.chosenCommitSha)?.message ?? "",
    templateSlots: slots,
  });

  const insertResult = await fetchMutation(api.drafts.insertDraftIfNew, {
    userId: auth.userId,
    source: "mcp-manual",
    repoFullName: body.repoFullName,
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

  if (!insertResult.inserted) {
    return Response.json({ skipped: insertResult.reason }, { status: 200 });
  }

  return Response.json({ id: insertResult.draftId, status: "pending_review" }, { status: 200 });
}
