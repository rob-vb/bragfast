import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    credits_used: v.number(),
    metadata: v.optional(v.string()),
    webhook_url: v.optional(v.string()),
    source: v.optional(v.union(v.literal("api"), v.literal("github"))),
    sourceMetadata: v.optional(v.string()),
    output: v.optional(v.union(v.literal("image"), v.literal("video"))),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("pending_review"),
    )),
    aiContent: v.optional(v.string()),
    pendingConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("releases", {
      ...args,
      output: args.output ?? "image",
      status: args.status ?? "pending",
      created_at: now,
    });
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect(),
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const markCompleted = mutation({
  args: {
    externalId: v.string(),
    images: v.optional(v.any()),
    videos: v.optional(v.any()),
    socialCopy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
    if (!r) throw new Error("Release not found");
    const patch: Record<string, unknown> = {
      status: "completed",
      completed_at: new Date().toISOString(),
    };
    if (args.images) patch.images = args.images;
    if (args.videos) patch.videos = args.videos;
    if (args.socialCopy) patch.socialCopy = args.socialCopy;
    await ctx.db.patch(r._id, patch);
  },
});

export const getBySourceMetadata = query({
  args: { sourceMetadata: v.string() },
  handler: async (ctx, { sourceMetadata }) =>
    ctx.db
      .query("releases")
      .withIndex("by_sourceMetadata", (q) =>
        q.eq("sourceMetadata", sourceMetadata)
      )
      .first(),
});

export const markFailed = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    await ctx.db.patch(r._id, {
      status: "failed",
      completed_at: new Date().toISOString(),
    });
  },
});

export const approve = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    aiContent: v.optional(v.string()),
    credits_used: v.number(),
  },
  handler: async (ctx, { externalId, userId, aiContent, credits_used }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    if (r.userId !== userId) throw new Error("Not authorized");
    if (r.status !== "pending_review") throw new Error("Release is not pending review");

    const patch: Record<string, unknown> = { status: "pending", credits_used };
    if (aiContent !== undefined) patch.aiContent = aiContent;
    await ctx.db.patch(r._id, patch);
  },
});

export const dismiss = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { externalId, userId }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    if (r.userId !== userId) throw new Error("Not authorized");
    if (r.status !== "pending_review") throw new Error("Release is not pending review");
    await ctx.db.patch(r._id, { status: "dismissed" });
  },
});

export const updateSocialCopy = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    socialCopy: v.string(),
  },
  handler: async (ctx, { externalId, userId, socialCopy }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    if (r.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(r._id, { socialCopy });
  },
});

export const scheduleVideoRender = mutation({
  args: {
    cookId: v.string(),
    userId: v.string(),
    request: v.string(), // JSON-serialized VideoRenderRequest
  },
  handler: async (ctx, { cookId, userId, request }) => {
    await ctx.scheduler.runAfter(0, internal.videoRender.render, {
      cookId,
      userId,
      request,
    });
  },
});

export const listPendingByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return all.filter((r) => r.status === "pending_review");
  },
});
