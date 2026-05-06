import { describe, it, expect } from "vitest";
import {
  TIER_CONFIG,
  tierFor,
  capsFor,
  nextTierFor,
  resolvePostAllowance,
  evaluatePostSelections,
} from "../plan-tiers";
import { TIER_CONFIG as CONVEX_TIER_CONFIG } from "../../../convex/planTiers";

describe("plan-tiers TIER_CONFIG", () => {
  it("has expected credit caps per tier", () => {
    expect(TIER_CONFIG.free.credits).toBe(30);
    expect(TIER_CONFIG.toast.credits).toBe(200);
    expect(TIER_CONFIG.plate.credits).toBe(800);
    expect(TIER_CONFIG.buffet.credits).toBe(2_500);
  });

  it("historyDays: free/toast=30, plate=365, buffet=forever", () => {
    expect(TIER_CONFIG.free.historyDays).toBe(30);
    expect(TIER_CONFIG.toast.historyDays).toBe(30);
    expect(TIER_CONFIG.plate.historyDays).toBe(365);
    expect(TIER_CONFIG.buffet.historyDays).toBe("forever");
  });

  it("video enabled on all tiers", () => {
    expect(TIER_CONFIG.free.video).toBe(true);
    expect(TIER_CONFIG.toast.video).toBe(true);
    expect(TIER_CONFIG.plate.video).toBe(true);
    expect(TIER_CONFIG.buffet.video).toBe(true);
  });

  it("all tiers support all 3 formats", () => {
    for (const t of ["free", "toast", "plate", "buffet"] as const) {
      expect(TIER_CONFIG[t].formats.sort()).toEqual(
        ["landscape", "portrait", "square"],
      );
    }
  });

  it("platforms: free/toast=1, plate/buffet=2", () => {
    expect(TIER_CONFIG.free.platforms).toBe(1);
    expect(TIER_CONFIG.toast.platforms).toBe(1);
    expect(TIER_CONFIG.plate.platforms).toBe(2);
    expect(TIER_CONFIG.buffet.platforms).toBe(2);
  });

  it("every tier has sane invariants", () => {
    for (const t of ["free", "toast", "plate", "buffet"] as const) {
      expect(TIER_CONFIG[t].formats.length).toBeGreaterThanOrEqual(1);
      expect(TIER_CONFIG[t].platforms).toBeGreaterThanOrEqual(1);
      expect(TIER_CONFIG[t].credits).toBeGreaterThan(0);
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
    expect(capsFor("toast").credits).toBe(200);
    expect(capsFor("buffet").video).toBe(true);
  });
});

describe("nextTierFor", () => {
  it("video → toast (all tiers support video now)", () => {
    // All tiers support video, so the cheapest is toast.
    expect(nextTierFor({ needsVideo: true })).toBe("toast");
  });

  it("portrait format → toast (all tiers support all formats now)", () => {
    // All tiers support all formats, so cheapest is toast.
    expect(nextTierFor({ needsFormat: "portrait" })).toBe("toast");
  });

  it("2 platforms → plate (cheapest with multi-platform)", () => {
    expect(nextTierFor({ needsPlatforms: 2 })).toBe("plate");
  });

  it("3 platforms → null (no tier supports it; max 2)", () => {
    expect(nextTierFor({ needsPlatforms: 3 })).toBeNull();
  });

  it("square + 1 platform → toast (cheapest)", () => {
    expect(
      nextTierFor({ needsFormat: "square", needsPlatforms: 1 }),
    ).toBe("toast");
  });
});

describe("resolvePostAllowance", () => {
  it("returns post-mode allowance for new tiers", () => {
    expect(resolvePostAllowance({ plan: "toast", creditsRemaining: 17 })).toEqual({
      mode: "posts",
      plan: "toast",
      tier: "toast",
      name: "Toast",
      remaining: 17,
      total: 200,
      unitLabel: "posts",
    });
  });

  it("returns credit-mode allowance for legacy plans", () => {
    expect(resolvePostAllowance({ plan: "pro", creditsRemaining: 412 })).toEqual({
      mode: "credits",
      plan: "pro",
      tier: null,
      name: "Pro",
      remaining: 412,
      total: 800,
      unitLabel: "credits",
    });
  });
});

describe("evaluatePostSelections", () => {
  it("allows legacy plans without applying new tier caps", () => {
    expect(
      evaluatePostSelections("starter", [
        { format: "square", provider: "buffer", channelId: "x" },
        { format: "square", provider: "postiz", channelId: "linkedin" },
        { format: "square", provider: "postiz", channelId: "mastodon" },
      ]),
    ).toEqual({ ok: true });
  });

  it("blocks destination count above the tier cap", () => {
    expect(
      evaluatePostSelections("toast", [
        { format: "square", provider: "buffer", channelId: "x" },
        { format: "square", provider: "postiz", channelId: "linkedin" },
      ]),
    ).toEqual({ ok: false, error: "platform_blocked", upgradeTier: "plate" });
  });
});

describe("client/convex parity", () => {
  it("numeric values + formats + video boolean match across copies", () => {
    for (const t of ["free", "toast", "plate", "buffet"] as const) {
      const c = TIER_CONFIG[t];
      const s = CONVEX_TIER_CONFIG[t];
      expect(c.credits).toBe(s.credits);
      expect(c.platforms).toBe(s.platforms);
      expect(c.video).toBe(s.video);
      expect(c.historyDays).toBe(s.historyDays);
      expect([...c.formats].sort()).toEqual([...s.formats].sort());
    }
  });
});
