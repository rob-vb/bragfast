// S2.7: tier-config — single source of truth for posts/month, format/platform/video caps.
// Mirrored in src/lib/plan-tiers.ts for client display. Numbers must stay in sync (parity test).
// Source: PRD.md §4.

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
export type CounterField = "postsRemainingThisMonth" | "postsLifetime";

export type TierSpec = {
  posts: number;
  counterField: CounterField;
  formats: Format[];
  platforms: number; // max destinations per post
  video: boolean;
  sources: number | "unlimited";
  goals: number | "unlimited";
};

export const TIER_CONFIG: Record<Tier, TierSpec> = {
  free: {
    posts: 30,
    counterField: "postsLifetime",
    formats: ["square"],
    platforms: 1,
    video: false,
    sources: 1,
    goals: 1,
  },
  toast: {
    posts: 30,
    counterField: "postsRemainingThisMonth",
    formats: ["square"],
    platforms: 1,
    video: false,
    sources: 1,
    goals: 1,
  },
  plate: {
    posts: 100,
    counterField: "postsRemainingThisMonth",
    formats: ["square", "landscape", "portrait"],
    platforms: 3,
    video: false,
    sources: 3,
    goals: 5,
  },
  buffet: {
    posts: 500,
    counterField: "postsRemainingThisMonth",
    formats: ["square", "landscape", "portrait"],
    platforms: 3,
    video: true,
    sources: "unlimited",
    goals: "unlimited",
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

export function counterFieldFor(tier: Tier): CounterField {
  return TIER_CONFIG[tier].counterField;
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
