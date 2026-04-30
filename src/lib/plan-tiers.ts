// S2.7: client mirror of convex/plan-tiers.ts. Keep numeric values + format arrays in sync.
// Convex types are server-only; client copy duplicates the table verbatim. Parity covered by tests.

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
  platforms: number;
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
    platforms: 2,
    video: false,
    sources: 3,
    goals: 5,
  },
  buffet: {
    posts: 500,
    counterField: "postsRemainingThisMonth",
    formats: ["square", "landscape", "portrait"],
    platforms: 2,
    video: true,
    sources: "unlimited",
    goals: "unlimited",
  },
};

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
