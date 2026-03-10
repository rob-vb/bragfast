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

const templateObjectValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("title"),
    v.literal("description"),
    v.literal("image"),
    v.literal("logo"),
    v.literal("productName")
  ),
  name: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  opacity: v.number(),
  zIndex: v.number(),
  fontFamily: v.optional(v.string()),
  fontSize: v.optional(v.number()),
  fontWeight: v.optional(v.number()),
  letterSpacing: v.optional(v.number()),
  lineHeight: v.optional(v.number()),
  textAlign: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
  verticalAlign: v.optional(v.union(v.literal("top"), v.literal("center"), v.literal("bottom"))),
  device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
  objectFit: v.optional(v.union(v.literal("cover"), v.literal("contain"))),
  previewText: v.optional(v.string()),
});

const formatLayoutValidator = v.object({
  objects: v.array(templateObjectValidator),
});

const canvasConfigValidator = v.object({
  version: v.literal(2),
  colors: v.object({
    background: v.string(),
    text: v.string(),
    primary: v.string(),
  }),
  brandId: v.optional(v.string()),
  formats: v.object({
    landscape: formatLayoutValidator,
    square: formatLayoutValidator,
    portrait: formatLayoutValidator,
  }),
});

export const create = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    config: v.union(configValidator, canvasConfigValidator),
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
    config: v.optional(v.union(configValidator, canvasConfigValidator)),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, userId, ...updates }) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (template.isDefault) throw new Error("Cannot modify default templates");
    if (template.userId !== userId) throw new Error("Not authorized");

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
    if (template.isDefault) throw new Error("Cannot delete default templates");
    if (template.userId !== userId) throw new Error("Not authorized");
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

export const clone = mutation({
  args: {
    sourceExternalId: v.string(),
    userId: v.string(),
    externalId: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { sourceExternalId, userId, externalId, name }) => {
    const source = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", sourceExternalId))
      .unique();
    if (!source) throw new Error("Source template not found");
    if (!source.isDefault && source.userId !== userId) throw new Error("Not authorized");

    const now = new Date().toISOString();
    const cloneName = name ?? `${source.name} (Copy)`;

    await ctx.db.insert("templates", {
      userId,
      externalId,
      name: cloneName,
      config: source.config,
      isDefault: false,
      created_at: now,
      updated_at: now,
    });

    return {
      id: externalId,
      name: cloneName,
      isDefault: false,
      config: source.config,
      created_at: now,
      updated_at: now,
    };
  },
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
            { type: "logo" as const, alignment: "left" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
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
            { type: "logo" as const, alignment: "left" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const, split: "left" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const, split: "right" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
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
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
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
