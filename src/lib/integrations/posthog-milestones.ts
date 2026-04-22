// Pure PostHog-visitor milestone math.
//
// PostHog returns an unsigned visitor count over a rolling 30-day window;
// the Convex action sources that number from a HogQL query. This module
// only concerns itself with threshold crossing, which is shape-identical
// across providers.

import {
  VISITOR_THRESHOLDS,
  detectCrossedThresholds,
} from "./thresholds";

export { VISITOR_THRESHOLDS };

// Parse "visitors:<N>" milestone keys back into numeric thresholds, for use
// by the scan action when reading prior hits out of the milestoneHits table.
export function parseVisitorMilestoneKey(key: string): number | null {
  if (!key.startsWith("visitors:")) return null;
  const n = parseInt(key.slice("visitors:".length), 10);
  return Number.isFinite(n) ? n : null;
}

export function detectCrossedVisitorThresholds(
  currentVisitors: number,
  alreadyHitThresholds: ReadonlyArray<number>,
): number[] {
  return detectCrossedThresholds(
    currentVisitors,
    alreadyHitThresholds,
    VISITOR_THRESHOLDS,
  );
}
