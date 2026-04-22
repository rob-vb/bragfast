// Pure MRR math for Sous-Chef Stripe scans. Testable without the SDK.

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

