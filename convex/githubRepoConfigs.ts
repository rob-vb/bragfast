import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    brandId: v.optional(v.string()),
    template: v.optional(v.string()),
    formats: v.optional(v.array(v.string())),
    skipPrereleases: v.optional(v.boolean()),
    tagFilter: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),
    maxSlides: v.optional(v.number()),
    generateImages: v.optional(v.boolean()),
    generateVideo: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
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
      if (args.brandId !== undefined) updates.brandId = args.brandId;
      if (args.template !== undefined) updates.template = args.template;
      if (args.formats !== undefined) updates.formats = args.formats;
      if (args.skipPrereleases !== undefined)
        updates.skipPrereleases = args.skipPrereleases;
      if (args.tagFilter !== undefined) updates.tagFilter = args.tagFilter;
      if (args.webhookUrl !== undefined) updates.webhookUrl = args.webhookUrl;
      if (args.autoApprove !== undefined) updates.autoApprove = args.autoApprove;
      if (args.maxSlides !== undefined) updates.maxSlides = args.maxSlides;
      if (args.generateImages !== undefined) updates.generateImages = args.generateImages;
      if (args.generateVideo !== undefined) updates.generateVideo = args.generateVideo;
      if (args.enabled !== undefined) updates.enabled = args.enabled;
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("githubRepoConfigs", {
        installationId: args.installationId,
        repoFullName: args.repoFullName,
        enabled: args.enabled ?? true,
        brandId: args.brandId,
        template: args.template,
        formats: args.formats,
        skipPrereleases: args.skipPrereleases ?? true,
        tagFilter: args.tagFilter,
        webhookUrl: args.webhookUrl,
        autoApprove: args.autoApprove,
        maxSlides: args.maxSlides,
        generateImages: args.generateImages,
        generateVideo: args.generateVideo,
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
