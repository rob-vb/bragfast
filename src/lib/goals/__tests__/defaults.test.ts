import { describe, it, expect } from "vitest";
import { DEFAULT_GOALS_BY_PROVIDER, DEFAULT_STAR_THRESHOLDS } from "../defaults";
import {
  isThresholdMetric,
  isScopedMetric,
  typedMilestoneKey,
  validateGoalInput,
} from "../types";

describe("DEFAULT_GOALS_BY_PROVIDER.stripe", () => {
  it("contains MRR [100, 500, 1000, 5000, 10000]", () => {
    const mrrTargets = DEFAULT_GOALS_BY_PROVIDER.stripe
      .filter((g) => g.metric === "mrr")
      .map((g) => g.target);
    expect(mrrTargets).toEqual([100, 500, 1000, 5000, 10000]);
  });

  it("contains first_sale goal", () => {
    expect(
      DEFAULT_GOALS_BY_PROVIDER.stripe.some((g) => g.metric === "first_sale"),
    ).toBe(true);
  });

  it("contains total_revenue [1000, 10000]", () => {
    const targets = DEFAULT_GOALS_BY_PROVIDER.stripe
      .filter((g) => g.metric === "total_revenue")
      .map((g) => g.target);
    expect(targets).toEqual([1000, 10000]);
  });

  it("contains subscribers [10, 100, 1000]", () => {
    const targets = DEFAULT_GOALS_BY_PROVIDER.stripe
      .filter((g) => g.metric === "subscribers")
      .map((g) => g.target);
    expect(targets).toEqual([10, 100, 1000]);
  });

  it("all goals are enabled by default", () => {
    expect(DEFAULT_GOALS_BY_PROVIDER.stripe.every((g) => g.enabled)).toBe(true);
  });
});

describe("DEFAULT_GOALS_BY_PROVIDER.posthog + ga4", () => {
  it("posthog has visitor thresholds [100, 1k, 10k, 100k, 1M]", () => {
    const targets = DEFAULT_GOALS_BY_PROVIDER.posthog.map((g) => g.target);
    expect(targets).toEqual([100, 1000, 10000, 100000, 1000000]);
  });

  it("ga4 has same visitor thresholds as posthog", () => {
    const posthogTargets = DEFAULT_GOALS_BY_PROVIDER.posthog.map((g) => g.target);
    const ga4Targets = DEFAULT_GOALS_BY_PROVIDER.ga4.map((g) => g.target);
    expect(ga4Targets).toEqual(posthogTargets);
  });
});

describe("DEFAULT_STAR_THRESHOLDS", () => {
  it("is [100, 1000, 10000]", () => {
    expect([...DEFAULT_STAR_THRESHOLDS]).toEqual([100, 1000, 10000]);
  });
});

describe("typedMilestoneKey", () => {
  it("mrr → mrr:1000", () => {
    expect(
      typedMilestoneKey({ metric: "mrr", target: 1000, provider: "stripe" }),
    ).toBe("mrr:1000");
  });

  it("total_revenue → total_revenue:10000", () => {
    expect(
      typedMilestoneKey({ metric: "total_revenue", target: 10000, provider: "stripe" }),
    ).toBe("total_revenue:10000");
  });

  it("subscribers → subscribers:100", () => {
    expect(
      typedMilestoneKey({ metric: "subscribers", target: 100, provider: "stripe" }),
    ).toBe("subscribers:100");
  });

  it("first_sale → first_sale (no target)", () => {
    expect(
      typedMilestoneKey({ metric: "first_sale", provider: "stripe" }),
    ).toBe("first_sale");
  });

  it("visitors (posthog) → visitors:1000", () => {
    expect(
      typedMilestoneKey({ metric: "visitors", target: 1000, provider: "posthog" }),
    ).toBe("visitors:1000");
  });

  it("visitors (ga4) → ga:visitors:1000", () => {
    expect(
      typedMilestoneKey({ metric: "visitors", target: 1000, provider: "ga4" }),
    ).toBe("ga:visitors:1000");
  });

  it("stars → star:100:foo/bar", () => {
    expect(
      typedMilestoneKey({ metric: "stars", target: 100, scope: "foo/bar", provider: "github" }),
    ).toBe("star:100:foo/bar");
  });
});

describe("isThresholdMetric", () => {
  it("mrr is a threshold metric", () => {
    expect(isThresholdMetric("mrr")).toBe(true);
  });

  it("total_revenue is a threshold metric", () => {
    expect(isThresholdMetric("total_revenue")).toBe(true);
  });

  it("subscribers is a threshold metric", () => {
    expect(isThresholdMetric("subscribers")).toBe(true);
  });

  it("visitors is a threshold metric", () => {
    expect(isThresholdMetric("visitors")).toBe(true);
  });

  it("stars is a threshold metric", () => {
    expect(isThresholdMetric("stars")).toBe(true);
  });

  it("first_sale is NOT a threshold metric", () => {
    expect(isThresholdMetric("first_sale")).toBe(false);
  });
});

describe("isScopedMetric", () => {
  it("stars requires scope", () => {
    expect(isScopedMetric("stars")).toBe(true);
  });

  it("mrr does not require scope", () => {
    expect(isScopedMetric("mrr")).toBe(false);
  });

  it("visitors does not require scope", () => {
    expect(isScopedMetric("visitors")).toBe(false);
  });
});

describe("validateGoalInput", () => {
  it("accepts valid mrr goal", () => {
    expect(validateGoalInput({ provider: "stripe", metric: "mrr", target: 1000, enabled: true })).toBeNull();
  });

  it("rejects mrr with no target", () => {
    expect(validateGoalInput({ provider: "stripe", metric: "mrr", enabled: true })).toBeTruthy();
  });

  it("rejects mrr with target=0", () => {
    expect(validateGoalInput({ provider: "stripe", metric: "mrr", target: 0, enabled: true })).toBeTruthy();
  });

  it("accepts first_sale without target", () => {
    expect(validateGoalInput({ provider: "stripe", metric: "first_sale", enabled: true })).toBeNull();
  });

  it("rejects stars without scope", () => {
    expect(validateGoalInput({ provider: "github", metric: "stars", target: 100, enabled: true })).toBeTruthy();
  });

  it("accepts stars with scope", () => {
    expect(
      validateGoalInput({ provider: "github", metric: "stars", target: 100, scope: "foo/bar", enabled: true }),
    ).toBeNull();
  });
});
