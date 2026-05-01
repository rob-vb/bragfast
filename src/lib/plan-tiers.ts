// Client mirror of convex/planTiers.ts. Keep numeric values + format arrays in sync.
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

export type TierSpec = {
  credits: number;
  formats: Format[];
  platforms: number;
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
