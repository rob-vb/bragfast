import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { parseRepoUrl, extractClientIp } from "@/lib/preview/parse-repo-url";
import { isRepoOptedOut } from "@/lib/preview/opt-out";

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

  return Response.json({
    status: "pending",
    repo: parsed.fullName,
  });
}
