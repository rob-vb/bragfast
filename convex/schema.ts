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
      v.literal("completed"),
      v.literal("failed")
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
    socialCopy: v.optional(v.string()), // JSON string: { twitter: string, linkedin: string }
    created_at: v.string(),
    completed_at: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),

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
    lastScanAt: v.optional(v.string()),
    lastScanOkAt: v.optional(v.string()),
    lastScanError: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_installationId", ["installationId"]),

  githubRepoConfigs: defineTable({
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.boolean(),
    notifyOnPrMerge: v.optional(v.boolean()), // Sous-Chef: draft on PR merge to default branch
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_installationId", ["installationId"])
    .index("by_repoFullName", ["repoFullName"]),

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

  drafts: defineTable({
    userId: v.string(),
    externalId: v.string(),          // "drf_*"
    name: v.optional(v.string()),
    source: v.union(v.literal("agent"), v.literal("user")),
    createdBy: v.optional(v.string()), // apiKey externalId or "dashboard"
    config: v.string(),               // JSON.stringify of DraftConfig
    // Sous-Chef agent provenance (all optional; set only for agent-fired drafts).
    sourceSystem: v.optional(
      v.union(
        v.literal("github"),
        v.literal("stripe"),
        v.literal("posthog"),
        v.literal("ga4")
      )
    ),
    milestoneKey: v.optional(v.string()),      // e.g. "mrr:1000", "pr_merged:owner/repo#42"
    eventReference: v.optional(v.string()),    // human pointer (PR URL, Stripe evt id, etc.)
    idempotencyKey: v.optional(v.string()),    // `${userId}:${sourceSystem}:${milestoneKey}`
    created_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  // Sous-Chef: encrypted third-party credentials per user per provider.
  // Raw key is never stored — only sealed via src/lib/crypto/secret-box.ts.
  integrationSecrets: defineTable({
    userId: v.string(),
    provider: v.union(
      v.literal("stripe"),
      v.literal("posthog"),
      v.literal("ga4")
    ),
    ciphertext: v.string(),
    iv: v.string(),
    tag: v.string(),
    // Provider-specific non-secret config (JSON): projectId/host for PostHog, propertyId for GA4, etc.
    extra: v.optional(v.string()),
    enabled: v.boolean(),
    lastScanAt: v.optional(v.string()),
    lastScanOkAt: v.optional(v.string()),
    lastScanError: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider", ["userId", "provider"])
    .index("by_provider_enabled", ["provider", "enabled"]),

  // Sous-Chef: per-user record of milestones already fired, for idempotency.
  milestoneHits: defineTable({
    userId: v.string(),
    sourceSystem: v.union(
      v.literal("github"),
      v.literal("stripe"),
      v.literal("posthog"),
      v.literal("ga4")
    ),
    milestoneKey: v.string(),       // e.g. "mrr:1000", "pr_merged:owner/repo#42", "star:100:owner/repo"
    idempotencyKey: v.string(),     // `${userId}:${sourceSystem}:${milestoneKey}` — canonical, unique
    firedAt: v.string(),
    draftExternalId: v.optional(v.string()), // empty when seeded on first connect (retroactive skip)
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_userId", ["userId"])
    .index("by_userId_sourceSystem", ["userId", "sourceSystem"]),

  // Sous-Chef: user-defined goals that trigger draft creation when crossed.
  goals: defineTable({
    userId: v.string(),
    externalId: v.string(),          // "goal_*"
    provider: v.union(
      v.literal("stripe"),
      v.literal("posthog"),
      v.literal("ga4"),
      v.literal("github"),
    ),
    metric: v.union(
      v.literal("mrr"),
      v.literal("total_revenue"),
      v.literal("subscribers"),
      v.literal("first_sale"),
      v.literal("visitors"),
      v.literal("stars"),
    ),
    target: v.optional(v.number()),  // required for threshold metrics; omitted for first_sale
    scope: v.optional(v.string()),   // owner/repo for stars
    label: v.optional(v.string()),
    enabled: v.boolean(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider_enabled", ["userId", "provider", "enabled"])
    .index("by_externalId", ["externalId"]),

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
