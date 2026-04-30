import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { TIER_CONFIG } from "./planTiers";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

// S5.5: internal counterpart so internalActions can read profile (for email).
export const getByUserIdInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const create = mutation({
  args: { userId: v.string(), email: v.string() },
  handler: async (ctx, { userId, email }) => {
    // Check if this userId already has a profile
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;

    // Check if this email had a previous profile (re-registration)
    const previous = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    return ctx.db.insert("userProfiles", {
      userId,
      email,
      creditsRemaining: previous ? 0 : 30,
      plan: "trial",
    });
  },
});

export const getBalance = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.creditsRemaining ?? 0;
  },
});

// Atomically check balance and deduct. Throws if insufficient.
// Call BEFORE starting render to prevent race conditions.
export const reserve = mutation({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    if (profile.creditsRemaining < amount)
      throw new Error("Insufficient credits");
    const remaining = profile.creditsRemaining - amount;
    await ctx.db.patch(profile._id, { creditsRemaining: remaining });
    return remaining;
  },
});

export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const releases = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const creditsUsedThisMonth = releases
      .filter((r) => r.created_at >= monthStart)
      .reduce((sum, r) => sum + r.credits_used, 0);

    const totalImages = releases
      .filter((r) => r.status === "completed" && r.images)
      .reduce((sum, r) => {
        const imgs = r.images as Record<string, Record<string, string>> | undefined;
        if (!imgs) return sum;
        return sum + Object.values(imgs).reduce((s, formats) => s + Object.keys(formats).length, 0);
      }, 0);

    return {
      creditsRemaining: profile?.creditsRemaining ?? 0,
      plan: profile?.plan ?? "trial",
      // S2.7: surface posts/month + lifetime so dashboards on new accounting can render.
      postsRemainingThisMonth: profile?.postsRemainingThisMonth,
      postsLifetime: profile?.postsLifetime,
      creditsUsedThisMonth,
      totalReleases: releases.length,
      totalImages,
    };
  },
});

// Sous-Chef: read per-user disabled-platform set. Missing/empty = both X and LinkedIn enabled.
export const getDisabledPlatforms = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return (profile?.disabledPlatforms ?? []) as string[];
  },
});

export const setDisabledPlatforms = mutation({
  args: { userId: v.string(), platforms: v.array(v.string()) },
  handler: async (ctx, { userId, platforms }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    const allowed = new Set(["x", "linkedin"]);
    const cleaned = [...new Set(platforms.filter((p) => allowed.has(p)))];
    await ctx.db.patch(profile._id, { disabledPlatforms: cleaned });
    return cleaned;
  },
});

// S8.2: voice preset shapes Haiku draft tone. 4 presets only, validated server-side.
const VOICE_PRESETS = new Set([
  "casual_builder",
  "dry_technical",
  "earnest_milestone",
  "deadpan",
]);

export const getVoicePreset = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.voicePreset ?? null;
  },
});

export const setVoicePreset = mutation({
  args: { userId: v.string(), preset: v.string() },
  handler: async (ctx, { userId, preset }) => {
    if (!VOICE_PRESETS.has(preset)) throw new Error("invalid_preset");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    await ctx.db.patch(profile._id, { voicePreset: preset });
    return preset;
  },
});

// S2.7: idempotent one-shot backfill. Map legacy plans → new tiers + seed counter.
// Run manually from Convex dashboard at launch (after flag flip).
// Skip rows already on new accounting (postsRemainingThisMonth or postsLifetime set).
// Does NOT touch creditsRemaining — legacy field stays for /api/v1/cook routes (R8).
export const backfillToNewAccounting = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("userProfiles").collect();
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const p of profiles) {
      // Already migrated?
      if (
        p.postsRemainingThisMonth !== undefined ||
        p.postsLifetime !== undefined
      ) {
        skipped++;
        continue;
      }
      // Already on new plan literal but no counter — seed it.
      if (
        p.plan === "free" ||
        p.plan === "toast" ||
        p.plan === "plate" ||
        p.plan === "buffet"
      ) {
        const tier = p.plan;
        const field = TIER_CONFIG[tier].counterField;
        await ctx.db.patch(p._id, {
          [field]: TIER_CONFIG[tier].posts,
        });
        migrated++;
        continue;
      }
      // Map legacy → new tier with seeded counter.
      switch (p.plan) {
        case "trial":
          await ctx.db.patch(p._id, {
            plan: "free",
            postsLifetime: TIER_CONFIG.free.posts,
          });
          migrated++;
          break;
        case "starter":
          await ctx.db.patch(p._id, {
            plan: "toast",
            postsRemainingThisMonth: TIER_CONFIG.toast.posts,
          });
          migrated++;
          break;
        case "pro":
          await ctx.db.patch(p._id, {
            plan: "plate",
            postsRemainingThisMonth: TIER_CONFIG.plate.posts,
          });
          migrated++;
          break;
        case "scale":
          await ctx.db.patch(p._id, {
            plan: "buffet",
            postsRemainingThisMonth: TIER_CONFIG.buffet.posts,
          });
          migrated++;
          break;
        default:
          errors.push(`unknown plan literal '${p.plan}' on userId=${p.userId}`);
      }
    }

    return { migrated, skipped, errors };
  },
});

// Refund credits on render failure.
export const refund = mutation({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    const remaining = profile.creditsRemaining + amount;
    await ctx.db.patch(profile._id, { creditsRemaining: remaining });
    return remaining;
  },
});
