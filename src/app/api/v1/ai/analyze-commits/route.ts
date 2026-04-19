import { authenticate } from "@/lib/auth/authenticate";
import { analyzeCommits, type CommitInput } from "@/lib/github/analyze-commits";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repoFullName?: unknown; commits?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.repoFullName !== "string" || body.repoFullName.length === 0) {
    return Response.json({ error: "repoFullName required" }, { status: 400 });
  }
  if (!Array.isArray(body.commits)) {
    return Response.json({ error: "commits must be an array" }, { status: 400 });
  }

  const commits = body.commits
    .filter(
      (c): c is { sha: unknown; message: unknown } =>
        typeof c === "object" && c !== null && "sha" in c && "message" in c,
    )
    .map(
      (c): CommitInput => ({
        sha: String(c.sha),
        message: String(c.message),
      }),
    );

  try {
    const result = await analyzeCommits({ repoFullName: body.repoFullName, commits });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Haiku analyze failed: ${message}` }, { status: 502 });
  }
}
