import { describe, it, expect } from "vitest";
import {
  parseVisitorMilestoneKey,
  detectCrossedVisitorThresholds,
  VISITOR_THRESHOLDS,
} from "../posthog-milestones";

describe("parseVisitorMilestoneKey", () => {
  it("parses canonical prefix", () => {
    expect(parseVisitorMilestoneKey("visitors:10000")).toBe(10000);
    expect(parseVisitorMilestoneKey("visitors:100")).toBe(100);
  });

  it("returns null for mismatched prefix", () => {
    expect(parseVisitorMilestoneKey("ga:visitors:10000")).toBeNull();
    expect(parseVisitorMilestoneKey("mrr:100")).toBeNull();
  });

  it("returns null for garbage payload", () => {
    expect(parseVisitorMilestoneKey("visitors:abc")).toBeNull();
    expect(parseVisitorMilestoneKey("visitors:")).toBeNull();
  });
});

describe("detectCrossedVisitorThresholds", () => {
  it("fires catalog thresholds below current count", () => {
    expect(detectCrossedVisitorThresholds(15000, [])).toEqual([
      100, 1000, 10000,
    ]);
  });

  it("skips already-hit thresholds", () => {
    expect(detectCrossedVisitorThresholds(15000, [100, 1000])).toEqual([
      10000,
    ]);
  });

  it("returns empty on regression", () => {
    expect(detectCrossedVisitorThresholds(500, [100, 1000])).toEqual([]);
  });

  it("fires the 1M threshold at million+", () => {
    expect(detectCrossedVisitorThresholds(1_250_000, [])).toEqual([
      100, 1000, 10000, 100000, 1000000,
    ]);
  });
});

describe("VISITOR_THRESHOLDS catalog", () => {
  it("matches the plan (100/1k/10k/100k/1M)", () => {
    expect(VISITOR_THRESHOLDS).toEqual([
      100, 1000, 10000, 100000, 1000000,
    ]);
  });
});
