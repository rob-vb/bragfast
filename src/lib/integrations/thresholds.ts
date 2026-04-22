// Shared threshold-crossing logic. Used by Stripe MRR, PostHog visitors,
// GA4 visitors, and GitHub stars.

export const VISITOR_THRESHOLDS = [100, 1000, 10000, 100000, 1000000] as const;
export const STAR_THRESHOLDS = [100, 1000, 10000] as const;

// Returns the thresholds newly crossed since the caller's high-water mark.
// Upward-only: regression returns []. Already-hit thresholds are filtered out
// so cron reruns after a partial success do not re-fire.
export function detectCrossedThresholds(
  current: number,
  alreadyHit: ReadonlyArray<number>,
  thresholds: ReadonlyArray<number>,
): number[] {
  const hitSet = new Set(alreadyHit);
  return thresholds
    .filter((t) => !hitSet.has(t) && current >= t)
    .slice()
    .sort((a, b) => a - b);
}
