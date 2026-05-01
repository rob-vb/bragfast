// Tier-config — single source of truth for credits/month, format/platform/video caps, history.
// Mirrored in src/lib/plan-tiers.ts for client display. Numbers must stay in sync (parity test).

export type Tier = "free" | "toast" | "plate" | "buffet";
export type Plan =
  | "trial"
  | "starter"
  | "pro"
  | "scale"
  | "free"
  | "toast"
  | "plate"
  | "buffet";
export type Format = "square" | "landscape" | "portrait";

export type TierSpec = {
  credits: number;
  formats: Format[];
  platforms: number; // max destinations per post
  video: boolean;
  historyDays: number | "forever";
};

export const TIER_CONFIG: Record<Tier, TierSpec> = {
  free: {
    credits: 30,
    formats: ["square", "landscape", "portrait"],
    platforms: 1,
    video: true,
    historyDays: 30,
  },
  toast: {
    credits: 200,
    formats: ["square", "landscape", "portrait"],
    platforms: 1,
    video: true,
    historyDays: 30,
  },
  plate: {
    credits: 800,
    formats: ["square", "landscape", "portrait"],
    platforms: 2,
    video: true,
    historyDays: 365,
  },
  buffet: {
    credits: 2_500,
    formats: ["square", "landscape", "portrait"],
    platforms: 2,
    video: true,
    historyDays: "forever",
  },
};

// Returns the new-accounting tier for a plan, or null for legacy plans (trial/starter/pro/scale)
// which have not yet been backfilled. Legacy rows skip new gating per R9.
export function tierFor(plan: Plan): Tier | null {
  switch (plan) {
    case "free":
    case "toast":
    case "plate":
    case "buffet":
      return plan;
    default:
      return null;
  }
}

export function capsFor(tier: Tier): TierSpec {
  return TIER_CONFIG[tier];
}

// Cheapest paid tier that unlocks a given format/platform/video combo.
// Used by approval-time rejections to suggest an upgrade target.
export function nextTierFor(opts: {
  needsFormat?: Format;
  needsVideo?: boolean;
  needsPlatforms?: number;
}): Tier | null {
  const order: Tier[] = ["toast", "plate", "buffet"];
  for (const t of order) {
    const c = TIER_CONFIG[t];
    if (opts.needsFormat && !c.formats.includes(opts.needsFormat)) continue;
    if (opts.needsVideo && !c.video) continue;
    if (opts.needsPlatforms && c.platforms < opts.needsPlatforms) continue;
    return t;
  }
  return null;
}
