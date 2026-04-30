import { describe, it, expect } from "vitest";
import {
  TIER_CONFIG,
  tierFor,
  capsFor,
  nextTierFor,
} from "../plan-tiers";
import { TIER_CONFIG as CONVEX_TIER_CONFIG } from "../../../convex/planTiers";

describe("plan-tiers TIER_CONFIG", () => {
  it("has expected post caps per tier", () => {
    expect(TIER_CONFIG.free.posts).toBe(30);
    expect(TIER_CONFIG.toast.posts).toBe(30);
    expect(TIER_CONFIG.plate.posts).toBe(100);
    expect(TIER_CONFIG.buffet.posts).toBe(500);
  });

  it("counterField maps free→lifetime, paid→monthly", () => {
    expect(TIER_CONFIG.free.counterField).toBe("postsLifetime");
    expect(TIER_CONFIG.toast.counterField).toBe("postsRemainingThisMonth");
    expect(TIER_CONFIG.plate.counterField).toBe("postsRemainingThisMonth");
    expect(TIER_CONFIG.buffet.counterField).toBe("postsRemainingThisMonth");
  });

  it("video gating: only buffet", () => {
    expect(TIER_CONFIG.free.video).toBe(false);
    expect(TIER_CONFIG.toast.video).toBe(false);
    expect(TIER_CONFIG.plate.video).toBe(false);
    expect(TIER_CONFIG.buffet.video).toBe(true);
  });

  it("formats: free/toast square-only, plate+ all formats", () => {
    expect(TIER_CONFIG.free.formats).toEqual(["square"]);
    expect(TIER_CONFIG.toast.formats).toEqual(["square"]);
    expect(TIER_CONFIG.plate.formats.sort()).toEqual(
      ["landscape", "portrait", "square"],
    );
    expect(TIER_CONFIG.buffet.formats.sort()).toEqual(
      ["landscape", "portrait", "square"],
    );
  });

  it("every tier has sane invariants", () => {
    for (const t of ["free", "toast", "plate", "buffet"] as const) {
      expect(TIER_CONFIG[t].formats.length).toBeGreaterThanOrEqual(1);
      expect(TIER_CONFIG[t].platforms).toBeGreaterThanOrEqual(1);
      expect(TIER_CONFIG[t].posts).toBeGreaterThan(0);
    }
  });
});

describe("tierFor", () => {
  it("maps new plans to themselves", () => {
    expect(tierFor("free")).toBe("free");
    expect(tierFor("toast")).toBe("toast");
    expect(tierFor("plate")).toBe("plate");
    expect(tierFor("buffet")).toBe("buffet");
  });

  it("returns null for legacy plans (R9)", () => {
    expect(tierFor("trial")).toBeNull();
    expect(tierFor("starter")).toBeNull();
    expect(tierFor("pro")).toBeNull();
    expect(tierFor("scale")).toBeNull();
  });
});

describe("capsFor", () => {
  it("returns the tier spec", () => {
    expect(capsFor("toast").posts).toBe(30);
    expect(capsFor("buffet").video).toBe(true);
  });
});

describe("nextTierFor", () => {
  it("video → buffet", () => {
    expect(nextTierFor({ needsVideo: true })).toBe("buffet");
  });

  it("portrait format → plate (cheapest with portrait)", () => {
    expect(nextTierFor({ needsFormat: "portrait" })).toBe("plate");
  });

  it("2 platforms → plate (cheapest with multi-platform)", () => {
    expect(nextTierFor({ needsPlatforms: 2 })).toBe("plate");
  });

  it("3 platforms → null (no tier supports it; max 2 per PRD §4)", () => {
    expect(nextTierFor({ needsPlatforms: 3 })).toBeNull();
  });

  it("square + 1 platform → toast (cheapest)", () => {
    expect(
      nextTierFor({ needsFormat: "square", needsPlatforms: 1 }),
    ).toBe("toast");
  });
});

describe("client/convex parity", () => {
  it("numeric values + formats + video boolean match across copies", () => {
    for (const t of ["free", "toast", "plate", "buffet"] as const) {
      const c = TIER_CONFIG[t];
      const s = CONVEX_TIER_CONFIG[t];
      expect(c.posts).toBe(s.posts);
      expect(c.platforms).toBe(s.platforms);
      expect(c.video).toBe(s.video);
      expect(c.counterField).toBe(s.counterField);
      expect([...c.formats].sort()).toEqual([...s.formats].sort());
    }
  });
});
