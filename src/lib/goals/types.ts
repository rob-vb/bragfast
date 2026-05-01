export type GoalProvider = "stripe" | "posthog" | "ga4" | "github";

export type GoalMetric =
  | "mrr"
  | "total_revenue"
  | "subscribers"
  | "first_sale"
  | "visitors"
  | "stars"
  | "custom";

export type Goal = {
  externalId: string;
  userId: string;
  provider: GoalProvider | null;
  metric: GoalMetric;
  target?: number;
  scope?: string;  // owner/repo for stars
  label?: string;
  enabled: boolean;
  firedAt?: string | null;
  firstHitAt?: string | null;
  recurring?: boolean;
  created_at: string;
  updated_at: string;
};

export type GoalInput = {
  provider: GoalProvider | null;
  metric: GoalMetric;
  target?: number;
  scope?: string;
  label?: string;
  enabled: boolean;
  recurring?: boolean;
};

export function isCustomMetric(metric: GoalMetric): boolean {
  return metric === "custom";
}

export function isThresholdMetric(metric: GoalMetric): boolean {
  return metric !== "first_sale" && metric !== "custom";
}

export function isScopedMetric(metric: GoalMetric): boolean {
  return metric === "stars";
}

// Produces the human-readable milestoneKey for template-picker + compose-copy
// compatibility. These match the existing key shapes in idempotency-key.ts.
export function typedMilestoneKey(
  goal: Pick<Goal, "metric" | "target" | "scope" | "provider">,
): string {
  switch (goal.metric) {
    case "mrr":
      return `mrr:${goal.target}`;
    case "total_revenue":
      return `total_revenue:${goal.target}`;
    case "subscribers":
      return `subscribers:${goal.target}`;
    case "first_sale":
      return "first_sale";
    case "visitors":
      return goal.provider === "ga4"
        ? `ga:visitors:${goal.target}`
        : `visitors:${goal.target}`;
    case "stars":
      return `star:${goal.target}:${goal.scope}`;
    case "custom":
      return `custom:${goal.target ?? "any"}`;
  }
}

// Validates that a GoalInput has the required fields for its metric.
export function validateGoalInput(input: GoalInput): string | null {
  if (isCustomMetric(input.metric)) {
    if (input.provider != null) {
      return `metric "custom" must not have a provider`;
    }
    if (!input.label || !input.label.trim()) {
      return `metric "custom" requires a label`;
    }
    return null;
  }
  if (input.provider == null) {
    return `metric "${input.metric}" requires a provider`;
  }
  if (isThresholdMetric(input.metric)) {
    if (input.target == null || input.target <= 0) {
      return `metric "${input.metric}" requires a positive target`;
    }
  }
  if (isScopedMetric(input.metric)) {
    if (!input.scope) {
      return `metric "${input.metric}" requires a scope (owner/repo)`;
    }
  }
  return null;
}
