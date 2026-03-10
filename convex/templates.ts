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
      // v2 canvas defaults
      {
        userId: "system",
        externalId: "tmpl_classic_v2",
        name: "Classic",
        isDefault: true,
        config: {
          version: 2,
          colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
          formats: {
            landscape: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 24, width: 200, height: 48, fontSize: 14 },
                { id: "image", type: "image", name: "image", x: 40, y: 88, width: 1120, height: 380, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 488, width: 1120, height: 80, fontSize: 36 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 576, width: 1120, height: 60, fontSize: 18 },
              ],
            },
            square: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 32, width: 200, height: 48, fontSize: 14 },
                { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 720, width: 984, height: 120, fontSize: 48 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 856, width: 984, height: 80, fontSize: 22 },
              ],
            },
            portrait: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 32, width: 200, height: 48, fontSize: 14 },
                { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 750, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 876, width: 984, height: 150, fontSize: 56 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 1044, width: 984, height: 100, fontSize: 24 },
              ],
            },
          },
        },
        created_at: now,
        updated_at: now,
      },
      {
        userId: "system",
        externalId: "tmpl_split_v2",
        name: "Split",
        isDefault: true,
        config: {
          version: 2,
          colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
          formats: {
            landscape: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 24, width: 200, height: 48, fontSize: 14 },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 200, width: 540, height: 200, fontSize: 36 },
                { id: "image", type: "image", name: "image", x: 620, y: 88, width: 540, height: 480, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 40, y: 580, width: 540, height: 60, fontSize: 18 },
              ],
            },
            square: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 32, width: 200, height: 48, fontSize: 14 },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 200, width: 480, height: 300, fontSize: 42 },
                { id: "image", type: "image", name: "image", x: 556, y: 96, width: 476, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 880, width: 984, height: 80, fontSize: 22 },
              ],
            },
            portrait: {
              objects: [
                { id: "logo", type: "productName", name: "logo", opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 32, width: 200, height: 48, fontSize: 14 },
                { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 726, width: 984, height: 200, fontSize: 56 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", x: 48, y: 944, width: 984, height: 100, fontSize: 24 },
              ],
            },
          },
        },
        created_at: now,
        updated_at: now,
      },
      {
        userId: "system",
        externalId: "tmpl_hero_v2",
        name: "Hero",
        isDefault: true,
        config: {
          version: 2,
          colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
          formats: {
            landscape: {
              objects: [
                { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 100, y: 400, width: 1000, height: 120, fontSize: 48 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 200, y: 530, width: 800, height: 80, fontSize: 20 },
              ],
            },
            square: {
              objects: [
                { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 80, y: 720, width: 920, height: 160, fontSize: 56 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 140, y: 900, width: 800, height: 100, fontSize: 24 },
              ],
            },
            portrait: {
              objects: [
                { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1350, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
                { id: "title", type: "title", name: "title", opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 80, y: 950, width: 920, height: 160, fontSize: 60 },
                { id: "description", type: "description", name: "description", opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top", x: 140, y: 1130, width: 800, height: 100, fontSize: 26 },
              ],
            },
          },
        },
        created_at: now,
        updated_at: now,
      },
    ];

    let seededCount = 0;
    for (const template of defaults) {
      const existing = await ctx.db
        .query("templates")
        .withIndex("by_externalId", (q) => q.eq("externalId", template.externalId))
        .unique();
      if (!existing) {
        await ctx.db.insert("templates", template);
        seededCount++;
      }
    }

    return { seeded: seededCount > 0, message: `Seeded ${seededCount} default templates` };
  },
});
