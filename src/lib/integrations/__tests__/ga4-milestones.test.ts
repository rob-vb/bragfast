import { describe, it, expect } from "vitest";
import {
  parseGa4VisitorMilestoneKey,
  detectCrossedGa4Thresholds,
} from "../ga4-milestones";

describe("parseGa4VisitorMilestoneKey", () => {
  it("parses ga:visitors:<N>", () => {
    expect(parseGa4VisitorMilestoneKey("ga:visitors:10000")).toBe(10000);
  });

  it("does not match PostHog-style keys", () => {
    expect(parseGa4VisitorMilestoneKey("visitors:10000")).toBeNull();
  });

  it("returns null for malformed tail", () => {
    expect(parseGa4VisitorMilestoneKey("ga:visitors:nope")).toBeNull();
  });
});

describe("detectCrossedGa4Thresholds", () => {
  it("fires below current", () => {
    expect(detectCrossedGa4Thresholds(25000, [])).toEqual([100, 1000, 10000]);
  });

  it("skips already-hit", () => {
    expect(detectCrossedGa4Thresholds(25000, [100, 1000])).toEqual([10000]);
  });

  it("empty on regression", () => {
    expect(detectCrossedGa4Thresholds(500, [100, 1000])).toEqual([]);
  });
});
