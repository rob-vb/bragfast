export type ParsedRepo = { owner: string; name: string; fullName: string };

const SEG = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

// Accepts: https://github.com/{o}/{n}, http://github.com/{o}/{n},
// github.com/{o}/{n}, git@github.com:{o}/{n}(.git)?, with or without trailing /, .git, paths.
export function parseRepoUrl(input: string): ParsedRepo | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  let owner = "";
  let name = "";

  const ssh = raw.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (ssh) {
    owner = ssh[1];
    name = ssh[2];
  } else {
    let s = raw.replace(/^https?:\/\//i, "");
    if (!/^github\.com\//i.test(s)) return null;
    s = s.slice("github.com/".length);
    const parts = s.split(/[/?#]/).filter(Boolean);
    if (parts.length < 2) return null;
    owner = parts[0];
    name = parts[1].replace(/\.git$/i, "");
  }

  if (!SEG.test(owner) || !SEG.test(name)) return null;
  return { owner, name, fullName: `${owner}/${name}` };
}

export function extractClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
