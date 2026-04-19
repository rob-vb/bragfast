import type { CommitInput } from "./analyze-commits";

export async function fetchRecentCommits(
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
  if (res.status === 404) return [];
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
  return data
    .filter((c) => {
      const login = c.author?.login?.toLowerCase() ?? "";
      return !login.includes("bot") && !login.includes("dependabot") && !login.includes("renovate");
    })
    .map((c) => ({ sha: c.sha, message: c.commit.message }));
}
