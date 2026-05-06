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
export type LegacyPlan = Exclude<Plan, Tier>;
export type PostFormat = "square" | "landscape" | "portrait";
export type ApprovalFormat = PostFormat | `video-${PostFormat}`;

export type TierSpec = {
  credits: number;
  formats: PostFormat[];
  platforms: number;
  video: boolean;
  historyDays: number | "forever";
};

export type PostAllowance = {
  mode: "posts" | "credits";
  plan: Plan;
  tier: Tier | null;
  name: string;
  remaining: number;
  total: number;
  unitLabel: "posts" | "credits";
};

export type ApprovalSelection = {
  format: ApprovalFormat;
  provider: string;
  channelId: string;
};

export type SelectionAllowanceResult =
  | { ok: true }
  | {
      ok: false;
      error: "format_blocked";
      blockedFormat: PostFormat;
      upgradeTier?: Tier;
    }
  | { ok: false; error: "video_blocked"; upgradeTier?: Tier }
  | { ok: false; error: "platform_blocked"; upgradeTier?: Tier };

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

export const TIER_NAMES: Record<Tier, string> = {
  free: "On the House",
  toast: "Toast",
  plate: "Full Plate",
  buffet: "Buffet",
};

export const LEGACY_PLAN_NAMES: Record<LegacyPlan, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

export const LEGACY_PLAN_CREDITS: Record<LegacyPlan, number> = {
  trial: 30,
  starter: 200,
  pro: 800,
  scale: 2_500,
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
  needsFormat?: PostFormat;
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

export function planName(plan: Plan): string {
  const tier = tierFor(plan);
  return tier ? TIER_NAMES[tier] : LEGACY_PLAN_NAMES[plan as LegacyPlan];
}

export function resolvePostAllowance(input: {
  plan: Plan;
  creditsRemaining: number;
}): PostAllowance {
  const tier = tierFor(input.plan);
  if (tier) {
    return {
      mode: "posts",
      plan: input.plan,
      tier,
      name: TIER_NAMES[tier],
      remaining: input.creditsRemaining,
      total: TIER_CONFIG[tier].credits,
      unitLabel: "posts",
    };
  }

  return {
    mode: "credits",
      plan: input.plan,
      tier: null,
      name: LEGACY_PLAN_NAMES[input.plan as LegacyPlan],
      remaining: input.creditsRemaining,
      total: LEGACY_PLAN_CREDITS[input.plan as LegacyPlan],
      unitLabel: "credits",
    };
}

export function evaluatePostSelections(
  plan: Plan,
  selections: ReadonlyArray<ApprovalSelection>,
): SelectionAllowanceResult {
  const tier = tierFor(plan);
  if (!tier) return { ok: true };

  const caps = capsFor(tier);
  const baseFormats = new Set<PostFormat>();
  let includesVideo = false;

  for (const selection of selections) {
    if (selection.format.startsWith("video-")) {
      includesVideo = true;
      baseFormats.add(selection.format.slice("video-".length) as PostFormat);
    } else {
      baseFormats.add(selection.format as PostFormat);
    }
  }

  if (includesVideo && !caps.video) {
    return {
      ok: false,
      error: "video_blocked",
      upgradeTier: nextTierFor({ needsVideo: true }) ?? undefined,
    };
  }

  for (const format of baseFormats) {
    if (!caps.formats.includes(format)) {
      return {
        ok: false,
        error: "format_blocked",
        blockedFormat: format,
        upgradeTier: nextTierFor({ needsFormat: format }) ?? undefined,
      };
    }
  }

  const distinctChannels = new Set(
    selections.map((selection) => `${selection.provider}:${selection.channelId}`),
  );
  if (distinctChannels.size > caps.platforms) {
    return {
      ok: false,
      error: "platform_blocked",
      upgradeTier:
        nextTierFor({ needsPlatforms: distinctChannels.size }) ?? undefined,
    };
  }

  return { ok: true };
}
