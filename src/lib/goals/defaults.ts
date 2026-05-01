import type { GoalInput, GoalProvider } from "./types";

type DefaultGoal = Omit<GoalInput, "provider"> & { provider: GoalProvider; enabled: true };

export const DEFAULT_GOALS_BY_PROVIDER: {
  stripe: DefaultGoal[];
  posthog: DefaultGoal[];
  ga4: DefaultGoal[];
} = {
  stripe: [
    { provider: "stripe", metric: "mrr", target: 100, enabled: true },
    { provider: "stripe", metric: "mrr", target: 500, enabled: true },
    { provider: "stripe", metric: "mrr", target: 1000, enabled: true },
    { provider: "stripe", metric: "mrr", target: 5000, enabled: true },
    { provider: "stripe", metric: "mrr", target: 10000, enabled: true },
    { provider: "stripe", metric: "first_sale", enabled: true },
    { provider: "stripe", metric: "total_revenue", target: 1000, enabled: true },
    { provider: "stripe", metric: "total_revenue", target: 10000, enabled: true },
    { provider: "stripe", metric: "subscribers", target: 10, enabled: true },
    { provider: "stripe", metric: "subscribers", target: 100, enabled: true },
    { provider: "stripe", metric: "subscribers", target: 1000, enabled: true },
  ],
  posthog: [
    { provider: "posthog", metric: "visitors", target: 100, enabled: true },
    { provider: "posthog", metric: "visitors", target: 1000, enabled: true },
    { provider: "posthog", metric: "visitors", target: 10000, enabled: true },
    { provider: "posthog", metric: "visitors", target: 100000, enabled: true },
    { provider: "posthog", metric: "visitors", target: 1000000, enabled: true },
  ],
  ga4: [
    { provider: "ga4", metric: "visitors", target: 100, enabled: true },
    { provider: "ga4", metric: "visitors", target: 1000, enabled: true },
    { provider: "ga4", metric: "visitors", target: 10000, enabled: true },
    { provider: "ga4", metric: "visitors", target: 100000, enabled: true },
    { provider: "ga4", metric: "visitors", target: 1000000, enabled: true },
  ],
};

// Star threshold defaults applied per repo at seed time.
export const DEFAULT_STAR_THRESHOLDS = [100, 1000, 10000] as const;
