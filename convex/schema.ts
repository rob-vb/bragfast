import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Credits and plan info (separate from component-managed user table)
  userProfiles: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    creditsRemaining: v.optional(v.number()),
    plan: v.union(
      v.literal("trial"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("scale"),
      v.literal("free"),
      v.literal("toast"),
      v.literal("plate"),
      v.literal("buffet")
    ),
    trialEnd: v.optional(v.number()),
    lastDraftsVisitAt: v.optional(v.number()),
    lastBriefingVisitAt: v.optional(v.number()),
    // Sous-Chef draft generation skips composeCopy for these platforms.
    // Values: "x" | "linkedin". Empty/missing = both enabled.
    disabledPlatforms: v.optional(v.array(v.string())),
    // S8.2: voice preset shapes Haiku draft tone.
    // Values: "casual_builder" | "dry_technical" | "earnest_milestone" | "deadpan".
    voicePreset: v.optional(v.string()),
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
    importedFromTemplateId: v.optional(v.string()),
    medium: v.optional(v.union(v.literal("image"), v.literal("video"), v.literal("both"))),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
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

  deviceCodes: defineTable({
    device_code: v.string(),
    user_code: v.string(),
    userId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("consumed"),
      v.literal("expired")
    ),
    expiresAt: v.number(),
    created_at: v.string(),
    approved_at: v.optional(v.string()),
    denied_at: v.optional(v.string()),
    consumed_at: v.optional(v.string()),
  })
    .index("by_device_code", ["device_code"])
    .index("by_user_code", ["user_code"])
    .index("by_status_and_expires", ["status", "expiresAt"]),

  rateLimits: defineTable({
    userId: v.string(),
    windowStart: v.number(),
    requestCount: v.number(),
  }).index("by_userId", ["userId"]),

  previewRateLimits: defineTable({
    ip: v.string(),
    hourStart: v.number(),
    hourCount: v.number(),
    dayStart: v.number(),
    dayCount: v.number(),
  }).index("by_ip", ["ip"]),

  releases: defineTable({
    userId: v.string(),
    externalId: v.string(),
    template: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("scheduled"),
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
    lastSnapshotJson: v.optional(v.string()),
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
    // S8.1: snapshot of the agent's first-pass copy. Frozen at insert; never
    // patched. Compared against `config` at approve-time to compute
    // post_approved.was_edited / edit_type. Optional for legacy rows.
    originalConfig: v.optional(v.string()),
    // Sous-Chef agent provenance (all optional; set only for agent-fired drafts).
    sourceSystem: v.optional(
      v.union(
        v.literal("github"),
        v.literal("stripe"),
        v.literal("posthog"),
        v.literal("ga4"),
        v.literal("cron")
      )
    ),
    milestoneKey: v.optional(v.string()),      // e.g. "mrr:1000", "pr_merged:owner/repo#42"
    eventReference: v.optional(v.string()),    // human pointer (PR URL, Stripe evt id, etc.)
    idempotencyKey: v.optional(v.string()),    // `${userId}:${sourceSystem}:${milestoneKey}`
    // Haiku self-rated brag-worthiness ∈ [0,1]. Drafts below SUPPRESS_THRESHOLD
    // (see src/lib/drafts/compose-copy.ts) land with `suppressed=true` and
    // don't surface by default. Override via `unsuppressDraft`.
    confidence: v.optional(v.number()),
    suppressed: v.optional(v.boolean()),
    generationError: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  // Sous-Chef + posting backbone: encrypted third-party credentials per user per provider.
  // Raw key is never stored — only sealed via src/lib/crypto/secret-box.ts.
  integrationSecrets: defineTable({
    userId: v.string(),
    provider: v.union(
      v.literal("stripe"),
      v.literal("posthog"),
      v.literal("ga4"),
      v.literal("buffer"),
      v.literal("postiz"),
    ),
    ciphertext: v.string(),
    iv: v.string(),
    tag: v.string(),
    // Provider-specific non-secret config (JSON): projectId/host for PostHog, propertyId
    // for GA4, organizationId/channels/expiresAt for Buffer, instanceUrl/channels for Postiz.
    extra: v.optional(v.string()),
    enabled: v.boolean(),
    lastScanAt: v.optional(v.string()),
    lastScanOkAt: v.optional(v.string()),
    lastScanError: v.optional(v.string()),
    lastSnapshotJson: v.optional(v.string()),
    // Buffer refresh-lease: prevents concurrent /token calls from racing rotated refresh tokens.
    refreshInProgress: v.optional(v.boolean()),
    leaseUntil: v.optional(v.number()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider", ["userId", "provider"])
    .index("by_provider_enabled", ["provider", "enabled"]),

  // Posting backbone: per-user per-format default channel selection across providers.
  routingDefaults: defineTable({
    userId: v.string(),
    format: v.union(
      v.literal("square"),
      v.literal("landscape"),
      v.literal("portrait"),
      v.literal("video-square"),
      v.literal("video-landscape"),
      v.literal("video-portrait"),
    ),
    channels: v.array(
      v.object({
        provider: v.union(v.literal("buffer"), v.literal("postiz")),
        channelId: v.string(),
      }),
    ),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_format", ["userId", "format"]),

  // Posting backbone: one row per (draft, format, provider, channel) push attempt.
  draftPushes: defineTable({
    draftId: v.string(),                  // drafts.externalId ("drf_*")
    userId: v.string(),
    format: v.string(),                   // "square" | "landscape" | ... (matches routingDefaults.format)
    provider: v.union(v.literal("buffer"), v.literal("postiz")),
    channelId: v.string(),
    channelLabel: v.optional(v.string()), // denormalized at create-time for status panel
    state: v.union(
      v.literal("pending"),
      v.literal("in_flight"),
      v.literal("queued"),
      v.literal("drafted"),
      v.literal("failed"),
    ),
    postState: v.union(v.literal("queue"), v.literal("draft")), // user choice at approve time
    providerPostId: v.optional(v.string()),
    errorClass: v.optional(
      v.union(
        v.literal("auth"),
        v.literal("channel_gone"),
        v.literal("rate_limit"),
        v.literal("media"),
        v.literal("transient"),
        v.literal("unknown"),
      ),
    ),
    errorMessage: v.optional(v.string()),
    mediaUrl: v.string(),                 // R2 URL of the rendered asset for this format
    title: v.string(),
    description: v.string(),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    clientNonce: v.optional(v.string()),  // approve-time idempotency
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_draftId", ["draftId"])
    .index("by_userId_state", ["userId", "state"])
    .index("by_clientNonce", ["clientNonce"]),

  // Posting backbone: short-lived OAuth state nonces for Buffer connect flow CSRF defense.
  oauthStates: defineTable({
    userId: v.string(),
    provider: v.union(v.literal("buffer")),
    state: v.string(),
    expiresAt: v.number(),
    created_at: v.string(),
  })
    .index("by_state", ["state"])
    .index("by_expires", ["expiresAt"]),

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
  // S5.3: provider optional (null = custom user goal, no integration scan).
  // firedAt/firstHitAt/recurring replace the legacy auto-disable-on-fire pattern.
  goals: defineTable({
    userId: v.string(),
    externalId: v.string(),          // "goal_*"
    provider: v.optional(
      v.union(
        v.literal("stripe"),
        v.literal("posthog"),
        v.literal("ga4"),
        v.literal("github"),
      ),
    ),
    metric: v.union(
      v.literal("mrr"),
      v.literal("total_revenue"),
      v.literal("subscribers"),
      v.literal("first_sale"),
      v.literal("visitors"),
      v.literal("stars"),
      v.literal("custom"),
    ),
    target: v.optional(v.number()),  // required for threshold metrics; omitted for first_sale
    scope: v.optional(v.string()),   // owner/repo for stars
    label: v.optional(v.string()),
    enabled: v.boolean(),
    firedAt: v.optional(v.string()),     // last fire timestamp (recurring) or final fire (one-shot)
    firstHitAt: v.optional(v.string()),  // first fire ever — drives celebration; never overwritten
    recurring: v.optional(v.boolean()),  // when true, goal stays enabled after fire
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider_enabled", ["userId", "provider", "enabled"])
    .index("by_externalId", ["externalId"]),

  // Sous-Chef: append-only event log of every trigger seen + decision taken.
  // Powers the /admin/sous-chef/history feed. Decision enum:
  //   drafted        — a draft (fresh or rolled-up) was inserted
  //   auto_skipped   — system declined (content filter, rate cap, low confidence)
  //   user_skipped   — user deleted/dismissed an agent-fired draft
  //   approved       — user approved & dispatched pushes
  //   ignored_48h    — draft sat untouched for 48h (reserved; no auto-emitter yet)
  triggerEvents: defineTable({
    userId: v.string(),
    externalId: v.string(),                  // "evt_*"
    sourceSystem: v.union(
      v.literal("github"),
      v.literal("stripe"),
      v.literal("posthog"),
      v.literal("ga4"),
      v.literal("manual"),
      v.literal("cron"),                     // weekly-summary drafts approved through report page
    ),
    triggerType: v.string(),                 // "pr_merged", "mrr", "first_sale", ...
    decision: v.union(
      v.literal("drafted"),
      v.literal("auto_skipped"),
      v.literal("user_skipped"),
      v.literal("approved"),
      v.literal("ignored_48h"),
    ),
    reason: v.optional(v.string()),          // "content_filter", "rate_cap", "low_confidence", "rollup", ...
    confidence: v.optional(v.number()),
    sourceReference: v.optional(v.string()), // PR URL, milestoneKey, etc.
    draftExternalId: v.optional(v.string()),
    metadata: v.optional(v.string()),        // JSON blob for trigger-specific extras
    created_at: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_created_at", ["userId", "created_at"])
    .index("by_draftExternalId", ["draftExternalId"]),

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
