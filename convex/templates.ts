import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const configValidator = v.object({
  background: v.string(),
  spacing: v.union(v.literal("compact"), v.literal("normal"), v.literal("spacious")),
  blocks: v.array(v.object({
    type: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("image"),
      v.literal("logo"),
      v.literal("productName")
    ),
    alignment: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
    fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
    device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
    display: v.optional(v.union(v.literal("inline"), v.literal("fullBleed"))),
    split: v.optional(v.union(v.literal("left"), v.literal("right"))),
  })),
});

export const create = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    config: configValidator,
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("templates", {
      ...args,
      isDefault: false,
      created_at: now,
      updated_at: now,
    });
    return {
      id: args.externalId,
      name: args.name,
      isDefault: false,
      config: args.config,
      created_at: now,
      updated_at: now,
    };
  },
});

export const update = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    config: v.optional(configValidator),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, userId, ...updates }) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (template.userId !== userId) throw new Error("Not authorized");
    if (template.isDefault) throw new Error("Cannot modify default templates");

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.config !== undefined) patch.config = updates.config;
    if (updates.previewUrl !== undefined) patch.previewUrl = updates.previewUrl;

    await ctx.db.patch(template._id, patch);
    const updated = await ctx.db.get(template._id);
    return updated
      ? {
          id: updated.externalId,
          name: updated.name,
          isDefault: updated.isDefault,
          config: updated.config,
          previewUrl: updated.previewUrl,
          created_at: updated.created_at,
          updated_at: updated.updated_at,
        }
      : null;
  },
});

export const remove = mutation({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (template.userId !== userId) throw new Error("Not authorized");
    if (template.isDefault) throw new Error("Cannot delete default templates");
    await ctx.db.delete(template._id);
    return true;
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique(),
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("templates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
});

export const listDefaults = query({
  args: {},
  handler: async (ctx) =>
    ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect(),
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (existing) {
      return { seeded: false, message: "Defaults already exist" };
    }

    const now = new Date().toISOString();

    const defaults = [
      {
        userId: "system",
        externalId: "tmpl_classic",
        name: "Classic",
        isDefault: true,
        config: {
          background: "brand",
          spacing: "normal" as const,
          blocks: [
            { type: "logo" as const, alignment: "center" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const },
            { type: "title" as const, alignment: "center" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "center" as const, fontSize: "medium" as const },
          ],
        },
        created_at: now,
        updated_at: now,
      },
      {
        userId: "system",
        externalId: "tmpl_split",
        name: "Split",
        isDefault: true,
        config: {
          background: "brand",
          spacing: "normal" as const,
          blocks: [
            { type: "logo" as const, alignment: "center" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const, split: "left" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const, split: "right" as const },
            { type: "description" as const, alignment: "center" as const, fontSize: "medium" as const },
          ],
        },
        created_at: now,
        updated_at: now,
      },
      {
        userId: "system",
        externalId: "tmpl_hero",
        name: "Hero",
        isDefault: true,
        config: {
          background: "brand",
          spacing: "normal" as const,
          blocks: [
            { type: "image" as const, alignment: "center" as const, device: "none" as const, display: "fullBleed" as const },
            { type: "title" as const, alignment: "center" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "center" as const, fontSize: "medium" as const },
          ],
        },
        created_at: now,
        updated_at: now,
      },
    ];

    for (const template of defaults) {
      await ctx.db.insert("templates", template);
    }

    return { seeded: true, message: "Seeded 3 default templates" };
  },
});
