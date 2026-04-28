import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { CANVAS_DEFAULTS, getCanvasDefaultConfig } from "../src/lib/templates/canvas-defaults";

const configValidator = v.object({
  background: v.string(),
  spacing: v.union(v.literal("compact"), v.literal("normal"), v.literal("spacious")),
  blocks: v.array(v.object({
    type: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("image"),
      v.literal("logo")
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
    v.literal("text"),
    v.literal("title"),
    v.literal("description"),
    v.literal("image"),
    v.literal("logo")
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
  visualFrame: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
  visualFrameColor: v.optional(v.string()),
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
  background: v.optional(v.any()),
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
    config: v.any(),
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
    config: v.optional(v.any()),
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
      ...(source.previewUrl ? { previewUrl: source.previewUrl } : {}),
    });

    return {
      id: externalId,
      name: cloneName,
      isDefault: false,
      config: source.config,
      previewUrl: source.previewUrl,
      created_at: now,
      updated_at: now,
    };
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    const slugs = [
      "standard-browser",
      "standard-mobile",
      "split-browser",
      "split-mobile",
      "hero",
      "carousel-cover",
      "carousel-content-text",
      "carousel-content-image",
      "carousel-outro",
    ];
    const defaults = slugs.map((slug) => ({
      userId: "",
      externalId: slug,
      name: CANVAS_DEFAULTS[slug]?.name ?? slug,
      isDefault: true,
      config: getCanvasDefaultConfig(slug),
      created_at: now,
      updated_at: now,
    }));

    let inserted = 0;
    let updated = 0;
    for (const template of defaults) {
      const existing = await ctx.db
        .query("templates")
        .withIndex("by_externalId", (q) => q.eq("externalId", template.externalId))
        .unique();
      if (!existing) {
        await ctx.db.insert("templates", template);
        inserted++;
      } else {
        await ctx.db.patch(existing._id, {
          name: template.name,
          config: template.config,
          updated_at: now,
        });
        updated++;
      }
    }

    // Clean up old tmpl_* default records
    const allDefaults = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();
    let deleted = 0;
    for (const tmpl of allDefaults) {
      if (tmpl.externalId.startsWith("tmpl_")) {
        await ctx.db.delete(tmpl._id);
        deleted++;
      }
    }

    return { message: `Seeded ${inserted} new, updated ${updated} existing, deleted ${deleted} old` };
  },
});
