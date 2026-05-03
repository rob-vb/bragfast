// Canonical idempotency key for Sous-Chef milestone events.
// Shape: `${userId}:${sourceSystem}:${milestoneKey}`.
// `milestoneKey` itself carries any extra disambiguators (e.g. repo + PR number,
// MRR threshold, star threshold + repo). See the plan under
// docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md — "Key Technical Decisions".

export type SourceSystem = "github" | "stripe" | "posthog" | "ga4" | "cron";

export function buildIdempotencyKey(
  userId: string,
  sourceSystem: SourceSystem,
  milestoneKey: string,
): string {
  if (!userId) throw new Error("userId required for idempotency key");
  if (!milestoneKey) throw new Error("milestoneKey required for idempotency key");
  return `${userId}:${sourceSystem}:${milestoneKey}`;
}

// Convenience builders for the well-known milestone families.

export function prMergedMilestoneKey(repoFullName: string, prNumber: number): string {
  return `pr_merged:${repoFullName}#${prNumber}`;
}

export function mrrMilestoneKey(thresholdUsd: number): string {
  return `mrr:${thresholdUsd}`;
}

export function firstSaleMilestoneKey(): string {
  return "first_sale";
}

export function visitorsMilestoneKey(
  source: "posthog" | "ga4",
  threshold: number,
): string {
  return source === "ga4" ? `ga:visitors:${threshold}` : `visitors:${threshold}`;
}

export function starMilestoneKey(repoFullName: string, threshold: number): string {
  return `star:${threshold}:${repoFullName}`;
}

// Idempotency key component for goal-based milestone hits.
// Shape: `goal:<goalExternalId>` — stable across target edits (delete+add gets new externalId).
export function goalMilestoneKey(goalExternalId: string): string {
  return `goal:${goalExternalId}`;
}

// Weekly summary draft milestone key, e.g. "weekly:2026-W18".
// Combined with sourceSystem="cron" → idempotencyKey "${userId}:cron:weekly:2026-W18".
export function weeklySummaryMilestoneKey(isoWeek: string): string {
  return `weekly:${isoWeek}`;
}
