import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { VIDEO_DEFAULTS, getVideoDefaultConfig, VIDEO_DEFAULT_SLUGS } from "../src/lib/templates/video-defaults";

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoTemplates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const listDefaults = query({
  args: {},
  handler: async (ctx) =>
    ctx.db
      .query("videoTemplates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect(),
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("videoTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
});

export const seedVideoDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    let inserted = 0;
    let updated = 0;

    for (const slug of VIDEO_DEFAULT_SLUGS) {
      const def = VIDEO_DEFAULTS[slug];
      const config = getVideoDefaultConfig(slug);
      const existing = await ctx.db
        .query("videoTemplates")
        .withIndex("by_externalId", (q) => q.eq("externalId", slug))
        .unique();

      if (!existing) {
        await ctx.db.insert("videoTemplates", {
          userId: "",
          externalId: slug,
          name: def.name,
          isDefault: true,
          config,
          created_at: now,
          updated_at: now,
        });
        inserted++;
      } else {
        await ctx.db.patch(existing._id, {
          name: def.name,
          config,
          isDefault: true,
          updated_at: now,
        });
        updated++;
      }
    }

    return {
      message: `Seeded ${inserted} new, updated ${updated} existing video-native layouts`,
    };
  },
});
