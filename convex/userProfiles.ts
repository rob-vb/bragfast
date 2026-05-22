import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

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

// S9.1: list all profiles with an email — fan-out for weekly digest cron.
export const listAllWithEmailInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("userProfiles").collect();
    return rows
      .filter((r) => typeof r.email === "string" && r.email.length > 0)
      .map((r) => ({ userId: r.userId, email: r.email as string }));
  },
});

// Fan-out for the weekly-report cron — every userProfile, regardless of email.
export const listAllInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("userProfiles").collect();
    return rows.map((r) => ({ userId: r.userId }));
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
      plan: "trial",
      trialEnd: Date.now() + 14 * 24 * 60 * 60 * 1000,
    });
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

    const totalImages = releases
      .filter((r) => r.status === "completed" && r.images)
      .reduce((sum, r) => {
        const imgs = r.images as Record<string, Record<string, string>> | undefined;
        if (!imgs) return sum;
        return sum + Object.values(imgs).reduce((s, formats) => s + Object.keys(formats).length, 0);
      }, 0);

    const totalVideos = releases
      .filter((r) => r.status === "completed" && r.videos)
      .reduce((sum, r) => {
        const vids = r.videos as Record<string, unknown> | undefined;
        if (!vids) return sum;
        return sum + Object.keys(vids).length;
      }, 0);

    return {
      plan: profile?.plan ?? "trial",
      trialEnd: profile?.trialEnd ?? null,
      totalReleases: releases.length,
      totalImages,
      totalVideos,
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

