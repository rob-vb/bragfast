export interface PublicPr {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string | null;
}

export type PublicPrResult =
  | { ok: true; pr: PublicPr; defaultBranch: string }
  | { ok: false; code: "not_found" | "rate_limited" | "no_pr" };

interface GhRepo {
  default_branch: string;
}

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "brag.fast-preview",
};

// Unauthenticated GitHub REST. Rate cap 60/IP/hour shared across all callers.
// 404 → private/missing. 403 with rate-limit-remaining=0 → rate_limited (we map to 503).
export async function fetchPublicLatestPr(
  repoFullName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicPrResult> {
  const repoRes = await fetchImpl(
    `https://api.github.com/repos/${repoFullName}`,
    { headers: GH_HEADERS },
  );

  if (repoRes.status === 404) return { ok: false, code: "not_found" };
  if (repoRes.status === 403 || repoRes.status === 429) {
    return { ok: false, code: "rate_limited" };
  }
  if (!repoRes.ok) return { ok: false, code: "not_found" };

  const repo = (await repoRes.json()) as GhRepo;
  const defaultBranch = repo.default_branch;

  const listRes = await fetchImpl(
    `https://api.github.com/repos/${repoFullName}/pulls?state=closed&base=${encodeURIComponent(defaultBranch)}&sort=updated&direction=desc&per_page=20`,
    { headers: GH_HEADERS },
  );

  if (listRes.status === 403 || listRes.status === 429) {
    return { ok: false, code: "rate_limited" };
  }
  if (!listRes.ok) return { ok: false, code: "not_found" };

  const pulls = (await listRes.json()) as PublicPr[];
  const merged = pulls.find((p) => p.merged_at !== null);
  if (!merged) return { ok: false, code: "no_pr" };

  return { ok: true, pr: merged, defaultBranch };
}
