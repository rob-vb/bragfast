import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  apikey: defineTable({
    name: v.optional(v.union(v.null(), v.string())),
    start: v.optional(v.union(v.null(), v.string())),
    prefix: v.optional(v.union(v.null(), v.string())),
    key: v.string(),
    userId: v.string(),
    refillInterval: v.optional(v.union(v.null(), v.number())),
    refillAmount: v.optional(v.union(v.null(), v.number())),
    lastRefillAt: v.optional(v.union(v.null(), v.number())),
    enabled: v.optional(v.union(v.null(), v.boolean())),
    rateLimitEnabled: v.optional(v.union(v.null(), v.boolean())),
    rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
    rateLimitMax: v.optional(v.union(v.null(), v.number())),
    requestCount: v.optional(v.union(v.null(), v.number())),
    remaining: v.optional(v.union(v.null(), v.number())),
    lastRequest: v.optional(v.union(v.null(), v.number())),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
    permissions: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())),
  })
    .index("key", ["key"])
    .index("userId", ["userId"]),
});
