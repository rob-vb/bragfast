import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Credits and plan info (separate from component-managed user table)
  userProfiles: defineTable({
    userId: v.string(),
    creditsRemaining: v.number(),
    plan: v.union(
      v.literal("trial"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("scale")
    ),
  }).index("by_userId", ["userId"]),

  brands: defineTable({
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    logo_url: v.optional(v.string()),
    website: v.optional(v.string()),
    font: v.optional(v.string()),
    colors: v.object({
      background: v.string(),
      text: v.string(),
      primary: v.string(),
    }),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),

  templates: defineTable({
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    isDefault: v.boolean(),
    config: v.object({
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
    }),
    previewUrl: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),

  apiKeys: defineTable({
    userId: v.string(),
    name: v.string(),
    keyHash: v.string(),
    prefix: v.string(),
    created_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_keyHash", ["keyHash"]),

  rateLimits: defineTable({
    userId: v.string(),
    windowStart: v.number(),
    requestCount: v.number(),
  }).index("by_userId", ["userId"]),

  releases: defineTable({
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    images: v.optional(v.any()),
    credits_used: v.number(),
    transparent: v.boolean(),
    metadata: v.optional(v.string()),
    webhook_url: v.optional(v.string()),
    created_at: v.string(),
    completed_at: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),
});
