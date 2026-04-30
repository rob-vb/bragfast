import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { parseRepoUrl, extractClientIp } from "@/lib/preview/parse-repo-url";
import { isRepoOptedOut } from "@/lib/preview/opt-out";
import { fetchPublicLatestPr } from "@/lib/preview/public-pr";
import { renderAndUploadPreview } from "@/lib/preview/render-preview";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const repoUrl = (body as { repoUrl?: unknown })?.repoUrl;
  if (typeof repoUrl !== "string") {
    return Response.json({ error: "missing_repo_url" }, { status: 400 });
  }

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return Response.json({ error: "invalid_repo_url" }, { status: 400 });
  }

  const ip = extractClientIp(request.headers);
  const limit = await convex.mutation(api.previewLimit.check, { ip });
  if (!limit.allowed) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
    return Response.json(
      { error: "rate_limited", scope: limit.scope, retryAfter },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (await isRepoOptedOut(parsed.fullName)) {
    return Response.json(
      { error: "opted_out", reason: "opted_out" },
      { status: 403 },
    );
  }

  const prResult = await fetchPublicLatestPr(parsed.fullName);
  if (!prResult.ok) {
    if (prResult.code === "rate_limited") {
      return Response.json(
        { error: "github_rate_limited" },
        { status: 503, headers: { "retry-after": "3600" } },
      );
    }
    if (prResult.code === "not_found") {
      return Response.json({ error: "repo_not_found" }, { status: 404 });
    }
    // no_pr — repo exists but has no merged PR yet
    return Response.json({ error: "no_merged_pr" }, { status: 404 });
  }

  let imageUrl: string;
  try {
    imageUrl = await renderAndUploadPreview(prResult.pr, parsed.fullName);
  } catch (err) {
    console.error(`Preview render failed for ${parsed.fullName}#${prResult.pr.number}:`, err);
    return Response.json({ error: "render_failed" }, { status: 500 });
  }

  return Response.json({
    status: "ready",
    repo: parsed.fullName,
    pr: {
      number: prResult.pr.number,
      title: prResult.pr.title,
      url: prResult.pr.html_url,
    },
    image: { url: imageUrl, format: "square", width: 1080, height: 1080 },
  });
}
