import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.optional(v.boolean()),
    notifyOnPrMerge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) =>
        q.eq("repoFullName", args.repoFullName)
      )
      .first();
    if (existing) {
      const updates: Record<string, unknown> = { updated_at: now };
      if (args.enabled !== undefined) updates.enabled = args.enabled;
      if (args.notifyOnPrMerge !== undefined) updates.notifyOnPrMerge = args.notifyOnPrMerge;
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("githubRepoConfigs", {
        installationId: args.installationId,
        repoFullName: args.repoFullName,
        enabled: args.enabled ?? true,
        notifyOnPrMerge: args.notifyOnPrMerge,
        created_at: now,
        updated_at: now,
      });
    }
  },
});

export const getByRepo = query({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
  },
  handler: async (ctx, { installationId, repoFullName }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) =>
        q.eq("repoFullName", repoFullName)
      )
      .first();
    if (config && config.installationId !== installationId) return null;
    return config;
  },
});

export const listByInstallation = query({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) =>
    ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .collect(),
});

export const toggle = mutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { repoFullName, enabled }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) =>
        q.eq("repoFullName", repoFullName)
      )
      .first();
    if (config) {
      await ctx.db.patch(config._id, {
        enabled,
        updated_at: new Date().toISOString(),
      });
    }
  },
});

// Sous-Chef: opt a repo into PR-merge drafting.
export const setNotifyOnPrMerge = mutation({
  args: {
    repoFullName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { repoFullName, enabled }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) => q.eq("repoFullName", repoFullName))
      .first();
    if (!config) return false;
    await ctx.db.patch(config._id, {
      notifyOnPrMerge: enabled,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});
