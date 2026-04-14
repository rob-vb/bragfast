import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const externalId = `upl_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const expiresAt = Date.now() + 300_000; // 5 minutes

    await ctx.db.insert("uploads", {
      ...args,
      externalId,
      status: "pending",
      expiresAt,
      created_at: now,
    });

    return { externalId, expiresAt };
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const markCompleted = mutation({
  args: {
    externalId: v.string(),
    url: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { externalId, url, sizeBytes }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload || upload.status !== "pending") return null;

    await ctx.db.patch(upload._id, {
      status: "completed",
      url,
      sizeBytes,
      completed_at: new Date().toISOString(),
    });

    return { externalId, url, sizeBytes };
  },
});

