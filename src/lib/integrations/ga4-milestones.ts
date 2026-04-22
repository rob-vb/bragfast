// Pure GA4-visitor milestone math. Threshold crossing is shared; this module
// adds GA4-specific milestone-key parsing (the `ga:` prefix disambiguates
// GA4 totals from PostHog uniques).

import { VISITOR_THRESHOLDS, detectCrossedThresholds } from "./thresholds";

export { VISITOR_THRESHOLDS };

const PREFIX = "ga:visitors:";

export function parseGa4VisitorMilestoneKey(key: string): number | null {
  if (!key.startsWith(PREFIX)) return null;
  const n = parseInt(key.slice(PREFIX.length), 10);
  return Number.isFinite(n) ? n : null;
}

export function detectCrossedGa4Thresholds(
  currentUsers: number,
  alreadyHit: ReadonlyArray<number>,
): number[] {
  return detectCrossedThresholds(currentUsers, alreadyHit, VISITOR_THRESHOLDS);
}
