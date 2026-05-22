// Stub: plan-tiers collapse in progress (Plan 08-06 rewrites convex/stripe.ts).
// Minimal exports to satisfy stripe.ts until that plan runs.

export type Tier = "free" | "toast" | "plate" | "buffet";

export type TierSpec = {
  credits: number;
  formats: string[];
  platforms: number;
  video: boolean;
  historyDays: number | "forever";
};

export const TIER_CONFIG: Record<Tier, TierSpec> = {
  free: { credits: 0, formats: ["square", "landscape", "portrait"], platforms: 1, video: true, historyDays: 30 },
  toast: { credits: 0, formats: ["square", "landscape", "portrait"], platforms: 1, video: true, historyDays: 30 },
  plate: { credits: 0, formats: ["square", "landscape", "portrait"], platforms: 2, video: true, historyDays: 365 },
  buffet: { credits: 0, formats: ["square", "landscape", "portrait"], platforms: 2, video: true, historyDays: "forever" },
};

export type Plan =
  | "trial"
  | "starter"
  | "pro"
  | "scale"
  | "free"
  | "toast"
  | "plate"
  | "buffet";

// Always allow — tiers removed in D-12 credits teardown.
export function evaluatePostSelections(
  _plan: Plan,
  _selections: ReadonlyArray<unknown>
): { ok: true } {
  return { ok: true };
}
