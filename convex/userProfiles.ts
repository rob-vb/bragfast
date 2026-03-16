import { mutation, query } from "./_generated/server";
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
      creditsUsedThisMonth,
      totalReleases: releases.length,
      totalImages,
    };
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
