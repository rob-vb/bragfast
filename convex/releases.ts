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
    source: v.optional(v.union(v.literal("api"), v.literal("dashboard"), v.literal("github"))),
    output: v.optional(v.union(v.literal("image"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("releases", {
      ...args,
      output: args.output ?? "image",
      status: "pending",
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

/**
 * Atomically inserts a video release record AND schedules the render action.
 * Convex mutations are transactional — if the scheduler.runAfter succeeds, the
 * insert is committed; if anything throws, neither happens. This prevents
 * orphaned pending records when the route handler would otherwise make two
 * separate mutations.
 */
export const createAndScheduleVideo = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    credits_used: v.number(),
    metadata: v.optional(v.string()),
    webhook_url: v.optional(v.string()),
    source: v.optional(v.union(v.literal("api"), v.literal("dashboard"), v.literal("github"))),
    request: v.string(), // JSON-serialized VideoRenderRequest
  },
  handler: async (ctx, { request, ...releaseArgs }) => {
    const now = new Date().toISOString();
    await ctx.db.insert("releases", {
      ...releaseArgs,
      output: "video",
      status: "pending",
      created_at: now,
    });
    await ctx.scheduler.runAfter(0, internal.videoRender.render, {
      cookId: releaseArgs.externalId,
      userId: releaseArgs.userId,
      request,
    });
  },
});
