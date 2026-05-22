import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const providerPostValidator = v.object({
  format: v.union(v.literal("landscape"), v.literal("square"), v.literal("portrait")),
  provider: v.literal("buffer"),
  channelId: v.string(),
  channelName: v.optional(v.string()),
  providerPostId: v.string(),
  scheduledAt: v.optional(v.string()),
});

function parseMetadata(metadata: string | undefined): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function providerPostsFrom(metadata: Record<string, unknown>) {
  return Array.isArray(metadata.providerPosts) ? metadata.providerPosts : [];
}

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

// Thin owner lookup for ownership checks. Avoids pulling the full release
// (which includes large `images`/`videos` blobs) when the caller just needs
// to verify the cook belongs to the authenticated user.
export const getOwnerId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    return r ? r.userId : null;
  },
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

export const insertScheduled = internalMutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    images: v.any(),
    socialCopy: v.string(),
    metadata: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("releases", {
      ...args,
      status: "scheduled",
      output: "image",
      credits_used: 0,
      created_at: new Date().toISOString(),
    });
  },
});

export const insertScheduledAttempt = internalMutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    images: v.any(),
    socialCopy: v.string(),
    metadata: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
    if (existing) {
      return {
        releaseId: existing.externalId,
        status: existing.status,
        metadata: existing.metadata ?? "{}",
      };
    }

    await ctx.db.insert("releases", {
      ...args,
      status: "pending",
      output: "image",
      credits_used: 0,
      created_at: new Date().toISOString(),
    });
    return {
      releaseId: args.externalId,
      status: "pending" as const,
      metadata: args.metadata,
    };
  },
});

export const recordScheduledProviderPost = internalMutation({
  args: {
    externalId: v.string(),
    post: providerPostValidator,
  },
  handler: async (ctx, { externalId, post }) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!release) throw new Error("Release not found");

    const metadata = parseMetadata(release.metadata);
    const providerPosts = providerPostsFrom(metadata).filter((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
      const candidate = entry as Record<string, unknown>;
      return !(
        candidate.format === post.format &&
        candidate.provider === post.provider &&
        candidate.channelId === post.channelId
      );
    });
    providerPosts.push(post);
    const nextMetadata = { ...metadata, providerPosts };

    await ctx.db.patch(release._id, {
      metadata: JSON.stringify(nextMetadata),
    });
    return { metadata: JSON.stringify(nextMetadata) };
  },
});

export const markScheduledSuccess = internalMutation({
  args: {
    externalId: v.string(),
    metadata: v.string(),
  },
  handler: async (ctx, { externalId, metadata }) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!release) throw new Error("Release not found");

    await ctx.db.patch(release._id, {
      status: "scheduled",
      metadata,
      completed_at: new Date().toISOString(),
    });
    return { releaseId: release.externalId };
  },
});

export const markScheduledFailure = internalMutation({
  args: {
    externalId: v.string(),
    error: v.object({
      errorClass: v.string(),
      message: v.string(),
    }),
  },
  handler: async (ctx, { externalId, error }) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!release) throw new Error("Release not found");

    const metadata = parseMetadata(release.metadata);
    await ctx.db.patch(release._id, {
      status: "failed",
      metadata: JSON.stringify({ ...metadata, error }),
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
