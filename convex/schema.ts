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
    // Metadata used by Haiku template picker when drafting brag posts.
    // Backfilled for built-in templates via one-time migration; optional for custom.
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
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

  uploadTokens: defineTable({
    token: v.string(),           // "utk_" + 21-char random — primary lookup key
    userId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),   // declared at mint, may be absent
    maxSizeBytes: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("consumed"),
      v.literal("expired")
    ),
    uploadId: v.optional(v.string()),    // set when status=consumed
    expiresAt: v.number(),               // epoch ms
    created_at: v.string(),
    consumed_at: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"])
    .index("by_status_expires", ["status", "expiresAt"]),

  // Agent-drafted brag posts. Daily cron picks a brag-worthy commit, Haiku drafts
  // copy + image spec, row lands here with status="pending_review" for founder approval.
  // Approval promotes the draft to a rendered `releases` row.
  drafts: defineTable({
    userId: v.string(),
    source: v.union(
      v.literal("cron-commit"),
      v.literal("cron-release"),
      v.literal("mcp-manual")
    ),
    // Denormalized dedup fields. Paired with by_dedup index so a single transactional
    // mutation (insertDraftIfNew) can guard against retry-induced duplicates.
    repoFullName: v.optional(v.string()),
    windowStart: v.number(),
    windowEnd: v.number(),
    sourceCommitShas: v.optional(v.array(v.string())),
    sourceReleaseId: v.optional(v.string()),

    platform: v.literal("twitter"), // future: union when expanding
    copy: v.string(),
    originalCopy: v.string(),        // Haiku's initial draft — used for copyEditDistance metric
    copyEditDistance: v.optional(v.number()),

    suggestedTemplateId: v.string(),
    suggestedFormat: v.union(
      v.literal("landscape"),
      v.literal("square"),
      v.literal("portrait")
    ),
    aiContent: v.any(), // ObjectModifications[] — runtime-validated via Zod at insert

    imageReleaseId: v.optional(v.id("releases")), // set on approveDraft
    videoReleaseId: v.optional(v.id("releases")), // set on promoteDraftToVideo
    uploadId: v.optional(v.string()),             // optional user-supplied screenshot

    status: v.union(
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("dismissed"),
      v.literal("expired"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),

    postedAt: v.optional(v.number()), // user confirms "Posted? yes" — success-metric truth

    expiresAt: v.number(), // drafts rot after 7 days by default
    created_at: v.string(),
    approved_at: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_created", ["userId", "created_at"])
    .index("by_dedup", ["userId", "repoFullName", "windowStart"]),

  uploads: defineTable({
    userId: v.string(),
    externalId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("uploading"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("aborted"),
    ),
    url: v.optional(v.string()),
    expiresAt: v.number(),
    created_at: v.string(),
    completed_at: v.optional(v.string()),
    // multipart-only fields
    kind: v.optional(v.union(v.literal("single"), v.literal("multipart"))),
    finalKey: v.optional(v.string()),
    tempPrefix: v.optional(v.string()),
    partSizeBytes: v.optional(v.number()),
    totalParts: v.optional(v.number()),
    declaredSizeBytes: v.optional(v.number()),
    uploadedParts: v.optional(v.array(v.object({
      partNumber: v.number(),
      sizeBytes: v.number(),
      uploaded_at: v.string(),
    }))),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),
});
