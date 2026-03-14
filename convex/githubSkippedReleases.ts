import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    userId: v.string(),
    repoFullName: v.string(),
    releaseTag: v.string(),
    releaseName: v.optional(v.string()),
    reason: v.union(
      v.literal("account_disabled"),
      v.literal("repo_disabled"),
      v.literal("insufficient_credits"),
      v.literal("prerelease"),
      v.literal("filtered"),
      v.literal("duplicate")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubSkippedReleases", {
      ...args,
      created_at: new Date().toISOString(),
    });
  },
});

export const listByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("githubSkippedReleases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect(),
});
