import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getTemplate = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const getBrand = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("brands")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const markReleaseCompleted = internalMutation({
  args: { externalId: v.string(), videos: v.any() },
  handler: async (ctx, { externalId, videos }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) throw new Error("Release not found");
    await ctx.db.patch(r._id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      videos,
    });
  },
});

export const markReleaseFailed = internalMutation({
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


export const updateProgress = internalMutation({
  args: { externalId: v.string(), progress: v.number() },
  handler: async (ctx, { externalId, progress }) => {
    const r = await ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!r) return;
    await ctx.db.patch(r._id, { progress });
  },
});

export const getRelease = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("releases")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});
