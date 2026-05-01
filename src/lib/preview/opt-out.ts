const TTL_MS = 60 * 60 * 1000;

type CacheEntry = { optedOut: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function __resetOptOutCache() {
  cache.clear();
}

export async function isRepoOptedOut(
  repoFullName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(repoFullName);
  if (cached && cached.expiresAt > now) return cached.optedOut;

  const url = `https://raw.githubusercontent.com/${repoFullName}/HEAD/bragfast.txt`;
  let optedOut = false;
  try {
    const res = await fetchImpl(url, { method: "HEAD" });
    optedOut = res.status === 200;
  } catch {
    optedOut = false;
  }

  cache.set(repoFullName, { optedOut, expiresAt: now + TTL_MS });
  return optedOut;
}
