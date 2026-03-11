import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteAccount = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Collect release externalIds for R2 cleanup
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const releaseIds = releases.map((r) => r.externalId);

    // Delete releases
    for (const r of releases) {
      await ctx.db.delete(r._id);
    }

    // Delete templates (non-system only — but all user templates have userId)
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const t of templates) {
      await ctx.db.delete(t._id);
    }

    // Delete brands
    const brands = await ctx.db
      .query("brands")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const b of brands) {
      await ctx.db.delete(b._id);
    }

    // Delete API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const k of apiKeys) {
      await ctx.db.delete(k._id);
    }

    // Delete rate limits
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const rl of rateLimits) {
      await ctx.db.delete(rl._id);
    }

    // Delete user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const p of profile) {
      await ctx.db.delete(p._id);
    }

    return { releaseIds };
  },
});
