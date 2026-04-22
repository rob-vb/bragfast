import { describe, it, expect } from "vitest";
import {
  parseStarMilestoneKeyForRepo,
  detectCrossedStarThresholds,
  STAR_THRESHOLDS,
} from "../github-star-milestones";

describe("parseStarMilestoneKeyForRepo", () => {
  it("parses matching repo + threshold", () => {
    expect(
      parseStarMilestoneKeyForRepo("star:100:rob/brag.fast", "rob/brag.fast"),
    ).toBe(100);
    expect(
      parseStarMilestoneKeyForRepo("star:10000:rob/brag.fast", "rob/brag.fast"),
    ).toBe(10000);
  });

  it("returns null when repo doesn't match", () => {
    expect(
      parseStarMilestoneKeyForRepo("star:100:rob/other", "rob/brag.fast"),
    ).toBeNull();
  });

  it("returns null for non-star keys", () => {
    expect(
      parseStarMilestoneKeyForRepo("mrr:100", "rob/brag.fast"),
    ).toBeNull();
    expect(
      parseStarMilestoneKeyForRepo("pr_merged:rob/brag.fast#42", "rob/brag.fast"),
    ).toBeNull();
  });

  it("handles repos with slashes in the owner org", () => {
    // GitHub forbids slashes in owner/repo, but paranoid test anyway:
    expect(
      parseStarMilestoneKeyForRepo("star:1000:acme-co/sub.repo", "acme-co/sub.repo"),
    ).toBe(1000);
  });
});

describe("detectCrossedStarThresholds", () => {
  it("fires below current", () => {
    expect(detectCrossedStarThresholds(2500, [])).toEqual([100, 1000]);
  });

  it("skips already-hit", () => {
    expect(detectCrossedStarThresholds(2500, [100])).toEqual([1000]);
  });

  it("empty on regression", () => {
    expect(detectCrossedStarThresholds(500, [100, 1000])).toEqual([]);
  });
});

describe("STAR_THRESHOLDS catalog", () => {
  it("matches the plan (100/1k/10k)", () => {
    expect(STAR_THRESHOLDS).toEqual([100, 1000, 10000]);
  });
});
