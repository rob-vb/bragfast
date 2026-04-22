// Pure GitHub-star milestone math. `star:<N>:<owner>/<repo>` keys disambiguate
// across the user's repos so two sibling repos can cross 100 stars independently.

import { STAR_THRESHOLDS, detectCrossedThresholds } from "./thresholds";

export { STAR_THRESHOLDS };

const PREFIX = "star:";

// Parse the numeric threshold out of a milestone key scoped to one repo.
// Returns null for keys from a different repo or unrelated keys.
export function parseStarMilestoneKeyForRepo(
  key: string,
  repoFullName: string,
): number | null {
  if (!key.startsWith(PREFIX)) return null;
  const rest = key.slice(PREFIX.length);
  const firstColon = rest.indexOf(":");
  if (firstColon < 0) return null;
  const thresholdStr = rest.slice(0, firstColon);
  const repoPart = rest.slice(firstColon + 1);
  if (repoPart !== repoFullName) return null;
  const n = parseInt(thresholdStr, 10);
  return Number.isFinite(n) ? n : null;
}

export function detectCrossedStarThresholds(
  currentStars: number,
  alreadyHit: ReadonlyArray<number>,
): number[] {
  return detectCrossedThresholds(currentStars, alreadyHit, STAR_THRESHOLDS);
}
