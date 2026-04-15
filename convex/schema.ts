import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Credits and plan info (separate from component-managed user table)
  userProfiles: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    creditsRemaining: v.number(),
    plan: v.union(
      v.literal("trial"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("scale")
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  brands: defineTable({
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    logo_url: v.optional(v.string()),
    website: v.optional(v.string()),
    font_family: v.optional(v.string()),
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
    config: v.any(),
    previewUrl: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  }).index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),

  apiKeys: defineTable({
    userId: v.string(),
    name: v.string(),
    key: v.optional(v.string()),
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
      v.literal("pending_review"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("dismissed")
    ),
    output: v.optional(v.union(v.literal("image"), v.literal("video"))),
    images: v.optional(v.any()),
    videos: v.optional(v.any()),
    credits_used: v.number(),
    transparent: v.optional(v.boolean()),
    metadata: v.optional(v.string()),
    webhook_url: v.optional(v.string()),
    progress: v.optional(v.number()), // 0-100 for video renders
    source: v.optional(v.union(v.literal("api"), v.literal("dashboard"), v.literal("github"))),
    sourceMetadata: v.optional(v.string()),
    aiContent: v.optional(v.string()),
    socialCopy: v.optional(v.string()), // JSON string: { twitter: string, linkedin: string }
    pendingConfig: v.optional(v.string()),
    previewImages: v.optional(v.any()),
    created_at: v.string(),
    completed_at: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"])
    .index("by_sourceMetadata", ["sourceMetadata"]),

  githubInstallations: defineTable({
    userId: v.string(),
    installationId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    enabled: v.boolean(),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("removed")
    ),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_installationId", ["installationId"]),

  githubRepoConfigs: defineTable({
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.boolean(),
    brandId: v.optional(v.string()),
    template: v.optional(v.string()),
    formats: v.optional(v.array(v.string())),
    skipPrereleases: v.boolean(),
    tagFilter: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),
    maxSlides: v.optional(v.number()),
    generateImages: v.optional(v.boolean()),
    generateVideo: v.optional(v.boolean()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_installationId", ["installationId"])
    .index("by_repoFullName", ["repoFullName"]),

  githubSkippedReleases: defineTable({
    userId: v.string(),
    repoFullName: v.string(),
    releaseTag: v.string(),
    releaseName: v.optional(v.string()),
    reason: v.union(
      v.literal("account_disabled"),
      v.literal("repo_disabled"),
      v.literal("insufficient_credits"),
      v.literal("prerelease"),
      v.literal("filtered"),
      v.literal("duplicate")
    ),
    created_at: v.string(),
  }).index("by_userId", ["userId"]),

  uploads: defineTable({
    userId: v.string(),
    externalId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired")
    ),
    url: v.optional(v.string()),
    expiresAt: v.number(),
    created_at: v.string(),
    completed_at: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),
});
