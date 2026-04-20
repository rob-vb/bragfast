import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    source: v.union(v.literal("agent"), v.literal("user")),
    createdBy: v.optional(v.string()),
    config: v.string(),
  },
  handler: async (ctx, args) => {
    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId: args.userId,
      externalId,
      name: args.name,
      source: args.source,
      createdBy: args.createdBy,
      config: args.config,
      created_at: now,
    });
    return { id: externalId, created_at: now };
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("drafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    rows.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    return rows.map((r) => ({
      id: r.externalId,
      name: r.name ?? null,
      source: r.source,
      config: r.config,
      created_at: r.created_at,
    }));
  },
});

export const getByExternalId = query({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return null;
    return {
      id: row.externalId,
      name: row.name ?? null,
      source: row.source,
      config: row.config,
      created_at: row.created_at,
    };
  },
});

export const remove = mutation({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
