import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    logo_url: v.optional(v.string()),
    website: v.optional(v.string()),
    font: v.optional(v.string()),
    colors: v.object({
      background: v.string(),
      text: v.string(),
      primary: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const externalId = `brand_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("brands", {
      ...args,
      externalId,
      created_at: now,
      updated_at: now,
    });
    return {
      id: externalId,
      name: args.name,
      logo_url: args.logo_url,
      website: args.website,
      font: args.font,
      colors: args.colors,
      created_at: now,
      updated_at: now,
    };
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("brands")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("brands")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
});

export const update = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    logo_url: v.optional(v.string()),
    website: v.optional(v.string()),
    font: v.optional(v.string()),
    colors: v.optional(
      v.object({
        background: v.optional(v.string()),
        text: v.optional(v.string()),
        primary: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { externalId, userId, ...updates }) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!brand || brand.userId !== userId) return null;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.logo_url !== undefined) patch.logo_url = updates.logo_url;
    if (updates.website !== undefined) patch.website = updates.website;
    if (updates.font !== undefined) patch.font = updates.font;
    if (updates.colors) {
      patch.colors = { ...brand.colors, ...updates.colors };
    }

    await ctx.db.patch(brand._id, patch);
    const updated = await ctx.db.get(brand._id);
    return updated
      ? {
          id: updated.externalId,
          name: updated.name,
          logo_url: updated.logo_url,
          website: updated.website,
          font: updated.font,
          colors: updated.colors,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        }
      : null;
  },
});

export const remove = mutation({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!brand || brand.userId !== userId) return false;
    await ctx.db.delete(brand._id);
    return true;
  },
});
