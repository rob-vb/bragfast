import { describe, it, expect } from "vitest";
import {
  buildIdempotencyKey,
  prMergedMilestoneKey,
  mrrMilestoneKey,
  firstSaleMilestoneKey,
  visitorsMilestoneKey,
  starMilestoneKey,
} from "../idempotency-key";

describe("buildIdempotencyKey", () => {
  it("joins userId, sourceSystem, and milestoneKey with colons", () => {
    expect(buildIdempotencyKey("u1", "stripe", "mrr:1000")).toBe(
      "u1:stripe:mrr:1000",
    );
  });

  it("includes embedded colons in milestoneKey untouched", () => {
    expect(buildIdempotencyKey("u1", "github", "pr_merged:owner/repo#42")).toBe(
      "u1:github:pr_merged:owner/repo#42",
    );
  });

  it("throws on empty userId", () => {
    expect(() => buildIdempotencyKey("", "stripe", "mrr:100")).toThrow();
  });

  it("throws on empty milestoneKey", () => {
    expect(() => buildIdempotencyKey("u1", "stripe", "")).toThrow();
  });
});

describe("milestone key builders", () => {
  it("prMergedMilestoneKey includes repo and PR number", () => {
    expect(prMergedMilestoneKey("rob/brag.fast", 42)).toBe(
      "pr_merged:rob/brag.fast#42",
    );
  });

  it("mrrMilestoneKey uses threshold in dollars", () => {
    expect(mrrMilestoneKey(1000)).toBe("mrr:1000");
  });

  it("firstSaleMilestoneKey is a literal", () => {
    expect(firstSaleMilestoneKey()).toBe("first_sale");
  });

  it("visitorsMilestoneKey prefixes ga4 with ga:", () => {
    expect(visitorsMilestoneKey("ga4", 10000)).toBe("ga:visitors:10000");
    expect(visitorsMilestoneKey("posthog", 10000)).toBe("visitors:10000");
  });

  it("starMilestoneKey places threshold before repo", () => {
    expect(starMilestoneKey("rob/brag.fast", 100)).toBe(
      "star:100:rob/brag.fast",
    );
  });

  it("ga4 + visitors key round-trips through buildIdempotencyKey", () => {
    const key = visitorsMilestoneKey("ga4", 10000);
    expect(buildIdempotencyKey("u1", "ga4", key)).toBe(
      "u1:ga4:ga:visitors:10000",
    );
  });
});
