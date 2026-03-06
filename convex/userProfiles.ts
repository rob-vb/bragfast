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
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("userProfiles", {
      userId,
      creditsRemaining: 30,
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
