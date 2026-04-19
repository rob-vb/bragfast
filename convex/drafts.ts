import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { shouldInsertDraft } from "../src/lib/drafts/dedup";

// Shared schema fragments
const draftStatusLiterals = v.union(
  v.literal("pending_review"),
  v.literal("approved"),
  v.literal("dismissed"),
  v.literal("expired"),
  v.literal("error"),
);

const formatLiterals = v.union(
  v.literal("landscape"),
  v.literal("square"),
  v.literal("portrait"),
);

const sourceLiterals = v.union(
  v.literal("cron-commit"),
  v.literal("cron-release"),
  v.literal("mcp-manual"),
);

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ────────────────────────────────────────────────────────────
// QUERIES (user-facing, scoped by userId on caller side via API auth)
// ────────────────────────────────────────────────────────────

export const listByUser = query({
  args: {
    userId: v.string(),
    status: v.optional(draftStatusLiterals),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, status, limit }) => {
    const index = status
      ? ctx.db
          .query("drafts")
          .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
      : ctx.db.query("drafts").withIndex("by_userId", (q) => q.eq("userId", userId));

    return index.order("desc").take(limit ?? 50);
  },
});

export const getById = query({
  args: { id: v.id("drafts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// ────────────────────────────────────────────────────────────
// INTERNAL QUERIES (action-side reads)
// ────────────────────────────────────────────────────────────

export const internalGetById = internalQuery({
  args: { id: v.id("drafts") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Reads used by cron action. Must live outside "use node" files
// because Convex runs queries/mutations in the V8 runtime only.
export const listWatchedReposForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const installs = await ctx.db
      .query("githubInstallations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const activeInstallIds = installs
      .filter((i) => i.status === "active" && i.enabled)
      .map((i) => i.installationId);
    if (activeInstallIds.length === 0) return [];

    const repos = await Promise.all(
      activeInstallIds.map((id) =>
        ctx.db
          .query("githubRepoConfigs")
          .withIndex("by_installationId", (q) => q.eq("installationId", id))
          .collect(),
      ),
    );
    return repos.flat().filter((r) => r.enabled);
  },
});

export const listTemplateCandidates = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // User's custom templates + built-ins (stored with userId="system").
    const own = await ctx.db
      .query("templates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const defaults = await ctx.db
      .query("templates")
      .withIndex("by_userId", (q) => q.eq("userId", "system"))
      .collect();
    const seen = new Set<string>();
    const merged: typeof own = [];
    for (const t of [...own, ...defaults]) {
      if (seen.has(t.externalId)) continue;
      seen.add(t.externalId);
      merged.push(t);
    }
    return merged;
  },
});

// ────────────────────────────────────────────────────────────
// MUTATIONS — user-facing
// ────────────────────────────────────────────────────────────

/**
 * Approve a draft: promote to a real `releases` row + schedule the image render.
 * Ownership + status enforced inside the mutation to close races with cron.
 */
export const approveDraft = mutation({
  args: {
    userId: v.string(),
    id: v.id("drafts"),
    uploadId: v.optional(v.string()), // optional user-supplied screenshot reference
    editedCopy: v.optional(v.string()), // if user tweaked copy in the approval modal
  },
  handler: async (ctx, { userId, id, uploadId, editedCopy }) => {
    const draft = await ctx.db.get(id);
    if (!draft) throw new Error("Draft not found");
    if (draft.userId !== userId) throw new Error("Forbidden");
    if (draft.status !== "pending_review") {
      throw new Error(`Draft already ${draft.status}`);
    }

    const finalCopy = editedCopy ?? draft.copy;
    const copyEditDistance = computeEditDistance(draft.originalCopy, finalCopy);

    // Placeholder: the real cook pipeline consumes `releases`. We insert the row
    // with status=pending and let the existing render pipeline pick it up via
    // whatever trigger path the image-cook uses (API route today; for drafts we
    // schedule an internal action below once it's built out).
    // For v1, we write the release row here and flip the draft to `approved`.
    const externalId = `rel_draft_${id.slice(-10)}_${Date.now()}`;
    const now = new Date().toISOString();
    // Insert with pending_review so the existing releases.approve mutation can
    // flip it → pending and set credits_used. Keeps draft-approval plumbing
    // consistent with the GitHub App webhook's approve flow.
    const releaseId: Id<"releases"> = await ctx.db.insert("releases", {
      userId,
      externalId,
      template: draft.suggestedTemplateId,
      status: "pending_review",
      output: "image",
      credits_used: 0,
      source: "dashboard",
      sourceMetadata: JSON.stringify({
        draftId: id,
        repoFullName: draft.repoFullName,
        commitShas: draft.sourceCommitShas,
      }),
      aiContent: JSON.stringify({ slides: [{ objects: draft.aiContent }] }),
      socialCopy: JSON.stringify({ twitter: finalCopy }),
      created_at: now,
    });

    await ctx.db.patch(id, {
      status: "approved",
      copy: finalCopy,
      copyEditDistance,
      imageReleaseId: releaseId,
      uploadId,
      approved_at: now,
    });

    return { releaseId, externalId };
  },
});

/**
 * Promote an approved draft to a showcase video. Creates a second pending_review
 * release row referencing the same copy/template/content. The API route then
 * runs the standard approve + scheduleVideoRender path.
 */
export const promoteDraftToVideo = mutation({
  args: { userId: v.string(), id: v.id("drafts") },
  handler: async (ctx, { userId, id }) => {
    const draft = await ctx.db.get(id);
    if (!draft) throw new Error("Draft not found");
    if (draft.userId !== userId) throw new Error("Forbidden");
    if (draft.status !== "approved") throw new Error("Draft must be approved first");
    if (draft.videoReleaseId) {
      // Idempotent: already promoted. Return existing reference instead of
      // charging credits twice.
      const existing = await ctx.db.get(draft.videoReleaseId);
      if (existing) return { releaseId: draft.videoReleaseId, externalId: existing.externalId };
    }

    const externalId = `rel_video_${id.slice(-10)}_${Date.now()}`;
    const now = new Date().toISOString();
    const releaseId: Id<"releases"> = await ctx.db.insert("releases", {
      userId,
      externalId,
      template: draft.suggestedTemplateId,
      status: "pending_review",
      output: "video",
      credits_used: 0,
      source: "dashboard",
      sourceMetadata: JSON.stringify({
        draftId: id,
        promotedFrom: draft.imageReleaseId,
      }),
      aiContent: JSON.stringify({ slides: [{ objects: draft.aiContent }] }),
      socialCopy: JSON.stringify({ twitter: draft.copy }),
      created_at: now,
    });

    await ctx.db.patch(id, { videoReleaseId: releaseId });
    return { releaseId, externalId };
  },
});

export const dismissDraft = mutation({
  args: { userId: v.string(), id: v.id("drafts") },
  handler: async (ctx, { userId, id }) => {
    const draft = await ensureOwnedPending(ctx, userId, id);
    await ctx.db.patch(draft._id, { status: "dismissed" });
  },
});

export const updateDraftCopy = mutation({
  args: { userId: v.string(), id: v.id("drafts"), copy: v.string() },
  handler: async (ctx, { userId, id, copy }) => {
    if (copy.length === 0 || copy.length > 280) {
      throw new Error("Copy must be 1-280 chars");
    }
    const draft = await ensureOwnedPending(ctx, userId, id);
    await ctx.db.patch(draft._id, { copy });
  },
});

export const markPosted = mutation({
  args: { userId: v.string(), id: v.id("drafts"), posted: v.boolean() },
  handler: async (ctx, { userId, id, posted }) => {
    const draft = await ctx.db.get(id);
    if (!draft || draft.userId !== userId) throw new Error("Forbidden");
    if (draft.status !== "approved") throw new Error("Draft must be approved first");
    await ctx.db.patch(id, { postedAt: posted ? Date.now() : undefined });
  },
});

async function ensureOwnedPending(
  ctx: { db: { get: (id: Id<"drafts">) => Promise<Doc<"drafts"> | null> } },
  userId: string,
  id: Id<"drafts">,
): Promise<Doc<"drafts">> {
  const draft = await ctx.db.get(id);
  if (!draft) throw new Error("Draft not found");
  if (draft.userId !== userId) throw new Error("Forbidden");
  if (draft.status !== "pending_review") throw new Error(`Draft is ${draft.status}`);
  return draft;
}

// Very small Levenshtein implementation — 280-char tweets = trivial cost.
function computeEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// ────────────────────────────────────────────────────────────
// INTERNAL MUTATIONS — called from actions/crons
// ────────────────────────────────────────────────────────────

/**
 * Transactional dedup-guarded insert. Checks `by_dedup` index and releases
 * collision within a single Convex mutation so retries do not create duplicates.
 * Returns `{ inserted: true, draftId }` or `{ inserted: false, reason }`.
 */
export const insertDraftIfNew = internalMutation({
  args: {
    userId: v.string(),
    source: sourceLiterals,
    repoFullName: v.optional(v.string()),
    windowStart: v.number(),
    windowEnd: v.number(),
    sourceCommitShas: v.optional(v.array(v.string())),
    sourceReleaseId: v.optional(v.string()),
    platform: v.literal("twitter"),
    copy: v.string(),
    originalCopy: v.string(),
    suggestedTemplateId: v.string(),
    suggestedFormat: formatLiterals,
    aiContent: v.any(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Load rows needed for dedup + collision checks, then hand off to the pure
    // predicate. Keeping that logic in src/lib/drafts/dedup.ts lets the
    // regression test cover it without spinning up convex-test.
    const existingDrafts = args.repoFullName
      ? await ctx.db
          .query("drafts")
          .withIndex("by_dedup", (q) =>
            q
              .eq("userId", args.userId)
              .eq("repoFullName", args.repoFullName)
              .eq("windowStart", args.windowStart),
          )
          .collect()
      : [];

    const recentReleases = await ctx.db
      .query("releases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    const decision = shouldInsertDraft({
      input: {
        userId: args.userId,
        repoFullName: args.repoFullName,
        windowStart: args.windowStart,
        sourceCommitShas: args.sourceCommitShas,
      },
      existingDrafts: existingDrafts.map((d) => ({
        userId: d.userId,
        repoFullName: d.repoFullName,
        windowStart: d.windowStart,
      })),
      recentReleases: recentReleases.map((r) => ({
        userId: r.userId,
        status: r.status,
        sourceMetadata: r.sourceMetadata,
      })),
    });

    if (!decision.inserted) {
      return { inserted: false as const, reason: decision.reason };
    }

    const now = new Date().toISOString();
    const expiresAt = args.expiresAt ?? Date.now() + DEFAULT_EXPIRY_MS;

    const draftId = await ctx.db.insert("drafts", {
      userId: args.userId,
      source: args.source,
      repoFullName: args.repoFullName,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
      sourceCommitShas: args.sourceCommitShas,
      sourceReleaseId: args.sourceReleaseId,
      platform: args.platform,
      copy: args.copy,
      originalCopy: args.originalCopy,
      suggestedTemplateId: args.suggestedTemplateId,
      suggestedFormat: args.suggestedFormat,
      aiContent: args.aiContent,
      status: "pending_review",
      expiresAt,
      created_at: now,
    });

    return { inserted: true as const, draftId };
  },
});

export const recordDraftError = internalMutation({
  args: {
    userId: v.string(),
    repoFullName: v.optional(v.string()),
    windowStart: v.number(),
    windowEnd: v.number(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId: args.userId,
      source: "cron-commit",
      repoFullName: args.repoFullName,
      windowStart: args.windowStart,
      windowEnd: args.windowEnd,
      platform: "twitter",
      copy: "",
      originalCopy: "",
      suggestedTemplateId: "",
      suggestedFormat: "landscape",
      aiContent: [],
      status: "error",
      errorMessage: args.errorMessage.slice(0, 2000),
      expiresAt: Date.now() + DEFAULT_EXPIRY_MS,
      created_at: now,
    });
  },
});

export const markExpired = internalMutation({
  args: { id: v.id("drafts") },
  handler: async (ctx, { id }) => {
    const draft = await ctx.db.get(id);
    if (!draft) return;
    if (draft.status === "pending_review") {
      await ctx.db.patch(id, { status: "expired" });
    }
  },
});

export const recordCronRun = internalMutation({
  args: {
    userId: v.string(),
    startedAt: v.number(),
    outcome: v.union(v.literal("success"), v.literal("silent"), v.literal("error")),
    draftsCreated: v.number(),
    draftsSkippedDedup: v.number(),
    draftsSkippedCollision: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cronRuns", {
      job: "runDailyDraftJob",
      userId: args.userId,
      startedAt: args.startedAt,
      finishedAt: Date.now(),
      outcome: args.outcome,
      draftsCreated: args.draftsCreated,
      draftsSkippedDedup: args.draftsSkippedDedup,
      draftsSkippedCollision: args.draftsSkippedCollision,
      errorMessage: args.errorMessage,
    });
  },
});
