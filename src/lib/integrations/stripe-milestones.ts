// Pure MRR math for Sous-Chef Stripe scans. Testable without the SDK.
//
// Thresholds are in whole USD. Matches the milestone catalog in
// docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md.

export const MRR_THRESHOLDS_USD = [100, 500, 1000, 5000, 10000] as const;

export type SubscriptionLike = {
  status: string;
  // Monthly recurring revenue contribution in USD (float dollars, not cents).
  // The Stripe action converts each Stripe.Subscription into one of these.
  monthlyUsd: number;
};

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due", // still contributes to MRR; Stripe considers it active
]);

export function computeMrrUsd(subs: ReadonlyArray<SubscriptionLike>): number {
  return subs
    .filter((s) => ACTIVE_STATUSES.has(s.status))
    .reduce((sum, s) => sum + s.monthlyUsd, 0);
}

// Convert a Stripe subscription item's recurring price into monthly USD.
// Caller passes (unitAmountCents, currency, interval, intervalCount, quantity).
// Returns 0 for non-USD currencies (v1 limitation — see plan).
export function lineItemMonthlyUsd(input: {
  unitAmountCents: number | null;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  quantity: number;
}): number {
  if (input.unitAmountCents == null) return 0;
  if (input.currency.toLowerCase() !== "usd") return 0;
  const dollarsPerPeriod =
    (input.unitAmountCents * input.quantity) / 100;
  const divisor = periodsPerMonth(input.interval, input.intervalCount);
  return dollarsPerPeriod * divisor;
}

function periodsPerMonth(
  interval: "day" | "week" | "month" | "year",
  intervalCount: number,
): number {
  const count = Math.max(1, intervalCount);
  switch (interval) {
    case "day":
      return 30 / count;
    case "week":
      return 4 / count;
    case "month":
      return 1 / count;
    case "year":
      return 1 / (12 * count);
  }
}

// Thresholds crossed since the previous high-water mark. Never returns already-hit
// thresholds (so cron reruns after a partial scan don't re-fire). Upward-only:
// if MRR regressed, nothing fires.
export function detectCrossedThresholds(
  currentMrrUsd: number,
  alreadyHitThresholds: ReadonlyArray<number>,
  thresholds: ReadonlyArray<number> = MRR_THRESHOLDS_USD,
): number[] {
  const hitSet = new Set(alreadyHitThresholds);
  return thresholds
    .filter((t) => !hitSet.has(t) && currentMrrUsd >= t)
    .slice()
    .sort((a, b) => a - b);
}

// Returns true if the user has never fired a first_sale milestone AND there is
// at least one successful charge on file. Caller checks the hit list + passes
// a boolean sourced from a Stripe charges.list call.
export function shouldFireFirstSale(input: {
  hasSuccessfulCharge: boolean;
  alreadyHitFirstSale: boolean;
}): boolean {
  return input.hasSuccessfulCharge && !input.alreadyHitFirstSale;
}
