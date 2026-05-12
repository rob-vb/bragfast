import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";
import {
  DEFAULT_VOICE_PROFILE_MD,
  appendTimelineEntry,
  parseVoiceProfile,
} from "../src/lib/drafts/voice-profile";

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

    const totalVideos = releases
      .filter((r) => r.status === "completed" && r.videos)
      .reduce((sum, r) => {
        const vids = r.videos as Record<string, unknown> | undefined;
        if (!vids) return sum;
        return sum + Object.keys(vids).length;
      }, 0);

    return {
      creditsRemaining: profile?.creditsRemaining ?? 0,
      plan: profile?.plan ?? "trial",
      creditsUsedThisMonth,
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

// ---------------------------------------------------------------------------
// GBrain: voice profile markdown
// ---------------------------------------------------------------------------

// Public query — used by dashboard / client components.
export const getVoiceProfileMd = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.voiceProfileMd ?? null;
  },
});

// Internal counterpart — used by server-side actions (reflection, compose).
export const getVoiceProfileMdInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return profile?.voiceProfileMd ?? null;
  },
});

// Internal mutation — bypasses auth so internalActions can persist the profile.
export const setVoiceProfileMdInternal = internalMutation({
  args: { userId: v.string(), md: v.string() },
  handler: async (ctx, { userId, md }) => {
    // Hard cap: 32 KB
    if (md.length > 32 * 1024) throw new Error("voice_profile_too_large");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    await ctx.db.patch(profile._id, { voiceProfileMd: md });
  },
});

// Internal mutation — stamps voiceProfileReflectedAt after reflection runs.
export const stampVoiceProfileReflectedAt = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, { voiceProfileReflectedAt: Date.now() });
  },
});

// Authenticated mutation — lets the user (or dashboard) overwrite the profile.
export const setVoiceProfileMd = mutation({
  args: { md: v.string() },
  handler: async (ctx, { md }) => {
    const userId = await requireAuthedUser(ctx);
    // Hard cap: 32 KB
    if (md.length > 32 * 1024) throw new Error("voice_profile_too_large");
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("User profile not found");
    await ctx.db.patch(profile._id, { voiceProfileMd: md });
  },
});

// Internal mutation — appends a timeline entry and conditionally schedules reflection.
export const appendTimelineInternal = internalMutation({
  args: {
    userId: v.string(),
    entry: v.object({
      dateIso: v.string(),
      triggerType: v.string(),
      action: v.union(v.literal("approved"), v.literal("skipped")),
      wasEdited: v.boolean(),
      original: v.optional(v.string()),
      final: v.optional(v.string()),
      editType: v.optional(v.string()),
      reason: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { userId, entry }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return; // silently skip if no profile

    const currentMd = profile.voiceProfileMd ?? DEFAULT_VOICE_PROFILE_MD;
    const updated = appendTimelineEntry(currentMd, entry);

    // Parse to get updated counts for scheduling decision.
    const parsed = parseVoiceProfile(updated);
    const approvalCount = parsed.frontmatter.approval_count;
    const skipCount = parsed.frontmatter.skip_count;

    await ctx.db.patch(profile._id, { voiceProfileMd: updated });

    // Schedule reflection every 10 approvals or 10 skips (only positive multiples).
    if (
      (approvalCount > 0 && approvalCount % 10 === 0) ||
      (skipCount > 0 && skipCount % 10 === 0)
    ) {
      // TODO: voiceProfileReflection.runReflectionForUser will be added in Task 3.
      await ctx.scheduler.runAfter(
        0,
        internal.voiceProfileReflection.runReflectionForUser,
        { userId },
      );
    }
  },
});
