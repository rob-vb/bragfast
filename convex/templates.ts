import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  CANVAS_DEFAULTS,
  getCanvasDefaultConfig,
  TEMPLATE_MEDIUMS,
  type TemplateMedium,
} from "../src/lib/templates/canvas-defaults";

type TemplateRow = {
  externalId: string;
  name: string;
  isDefault: boolean;
  config: unknown;
  previewUrls?: { landscape: string; square: string; portrait: string };
  medium?: TemplateMedium;
  visibility?: "public" | "private";
  authorUserId?: string;
};

// DTO for the public Template Library. `config` is surfaced because public
// templates are, by definition, viewable — and the gallery/detail pages need
// it to render a live preview when previewUrls haven't been seeded yet.
type PublicTemplateDTO = {
  externalId: string;
  name: string;
  isDefault: boolean;
  medium: TemplateMedium;
  formats: ("landscape" | "square" | "portrait")[];
  previewUrls?: { landscape: string; square: string; portrait: string };
  palette: { background: string; text: string; primary: string };
  config: unknown;
  authorUserId?: string;
};

function toPublicDTO(row: TemplateRow): PublicTemplateDTO {
  const config = (row.config ?? {}) as {
    formats?: Record<string, unknown>;
    colors?: { background?: string; text?: string; primary?: string };
  };
  const formatsObj = config.formats ?? {};
  const formats = (["landscape", "square", "portrait"] as const).filter(
    (k) => formatsObj[k] !== undefined,
  );
  const colors = config.colors ?? {};
  return {
    externalId: row.externalId,
    name: row.name,
    isDefault: row.isDefault,
    // Built-ins anchor on the in-process map so a stale DB row (pre-seed)
    // can't surface video for an image-only template like carousel-slide.
    medium: TEMPLATE_MEDIUMS[row.externalId] ?? row.medium ?? "both",
    formats,
    previewUrls: row.previewUrls,
    palette: {
      background: colors.background ?? "#ffffff",
      text: colors.text ?? "#000000",
      primary: colors.primary ?? "#000000",
    },
    config: row.config,
    ...(row.authorUserId ? { authorUserId: row.authorUserId } : {}),
  };
}

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

// Used by `scripts/generate-template-og.ts` to populate seeded OG images on
// default rows. Restricted to default templates so non-default rows can't be
// rewritten without auth.
export const setPreviewUrls = mutation({
  args: {
    externalId: v.string(),
    previewUrls: v.object({
      landscape: v.string(),
      square: v.string(),
      portrait: v.string(),
    }),
  },
  handler: async (ctx, { externalId, previewUrls }) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (!template.isDefault) {
      throw new Error("setPreviewUrls only supported for default templates");
    }
    await ctx.db.patch(template._id, {
      previewUrls,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
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
      "carousel-slide",
    ];
    const slugSet = new Set(slugs);

    // Parity check: every seeded slug must have a TEMPLATE_MEDIUMS entry.
    // Catches drift between in-process medium gate and DB column at deploy time.
    for (const slug of slugs) {
      if (!TEMPLATE_MEDIUMS[slug]) {
        throw new Error(
          `Seed parity error: TEMPLATE_MEDIUMS missing entry for "${slug}". Update src/lib/templates/canvas-defaults.ts.`,
        );
      }
    }

    const defaults = slugs.map((slug) => ({
      userId: "",
      externalId: slug,
      name: CANVAS_DEFAULTS[slug]?.name ?? slug,
      isDefault: true,
      config: getCanvasDefaultConfig(slug),
      medium: TEMPLATE_MEDIUMS[slug]!,
      visibility: "public" as const,
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
          medium: template.medium,
          visibility: template.visibility,
          updated_at: now,
        });
        updated++;
      }
    }

    // Clean up default rows whose slug is no longer in the seed list
    // (covers both legacy tmpl_* rows and orphaned slugs from removed defaults)
    const allDefaults = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();
    let deleted = 0;
    for (const tmpl of allDefaults) {
      if (!slugSet.has(tmpl.externalId)) {
        await ctx.db.delete(tmpl._id);
        deleted++;
      }
    }

    return { message: `Seeded ${inserted} new, updated ${updated} existing, deleted ${deleted} old` };
  },
});

// Public Template Library: list every template marked visibility=public,
// plus all default rows (defaults are public by definition). Returns a trimmed
// DTO — never the raw config — so the editable layout stays private.
export const listPublicTemplates = query({
  args: {},
  handler: async (ctx) => {
    const publicRows = await ctx.db
      .query("templates")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();
    const defaults = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();

    const seen = new Set<string>();
    const merged: TemplateRow[] = [];
    for (const row of [...defaults, ...publicRows]) {
      if (seen.has(row.externalId)) continue;
      seen.add(row.externalId);
      merged.push(row as TemplateRow);
    }
    return merged.map(toPublicDTO);
  },
});

export const getPublicTemplate = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const row = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!row) return null;
    if (!row.isDefault && row.visibility !== "public") return null;
    return toPublicDTO(row as TemplateRow);
  },
});

// Idempotent import: copy a public template's config into a new private
// row owned by `userId`. If the user has already imported this source
// (compound by_user_import_source index), return the existing row instead.
// No rate limit — idempotency is the gate.
export const importTemplate = mutation({
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
    if (!source.isDefault && source.visibility !== "public") {
      throw new Error("Source template is not public");
    }

    const existing = await ctx.db
      .query("templates")
      .withIndex("by_user_import_source", (q) =>
        q.eq("userId", userId).eq("importedFromTemplateId", sourceExternalId),
      )
      .first();
    if (existing) {
      return {
        id: existing.externalId,
        name: existing.name,
        isDefault: existing.isDefault,
        config: existing.config,
        previewUrl: existing.previewUrl,
        previewUrls: existing.previewUrls,
        medium: existing.medium,
        visibility: existing.visibility,
        importedFromTemplateId: existing.importedFromTemplateId,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
        alreadyImported: true,
      };
    }

    const now = new Date().toISOString();
    const importName = name ?? source.name;
    const medium: TemplateMedium = (source.medium as TemplateMedium | undefined) ?? "both";

    await ctx.db.insert("templates", {
      userId,
      externalId,
      name: importName,
      config: source.config,
      isDefault: false,
      medium,
      visibility: "private",
      authorUserId: source.authorUserId ?? (source.isDefault ? undefined : source.userId),
      importedFromTemplateId: sourceExternalId,
      created_at: now,
      updated_at: now,
      ...(source.previewUrl ? { previewUrl: source.previewUrl } : {}),
      ...(source.previewUrls ? { previewUrls: source.previewUrls } : {}),
    });

    return {
      id: externalId,
      name: importName,
      isDefault: false,
      config: source.config,
      previewUrl: source.previewUrl,
      previewUrls: source.previewUrls,
      medium,
      visibility: "private" as const,
      importedFromTemplateId: sourceExternalId,
      created_at: now,
      updated_at: now,
      alreadyImported: false,
    };
  },
});
