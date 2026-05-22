import {
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";

const sourceSystem = v.union(
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
);

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    source: v.union(v.literal("agent"), v.literal("user")),
    createdBy: v.optional(v.string()),
    config: v.string(),
  },
  handler: async (ctx, args) => {
    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId: args.userId,
      externalId,
      name: args.name,
      source: args.source,
      createdBy: args.createdBy,
      config: args.config,
      created_at: now,
    });
    return { id: externalId, created_at: now };
  },
});

// Session-aware: creates a draft for the currently authenticated user. Used by
// the Kitchen flow to materialize a draft on-demand when the user clicks
// "Send to ..." after a non-draft cook, so the existing approve/push pipeline
// can run unchanged.
export const createUserDraft = mutation({
  args: {
    name: v.optional(v.string()),
    config: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthedUser(ctx);
    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId,
      externalId,
      name: args.name,
      source: "user",
      createdBy: "dashboard",
      config: args.config,
      created_at: now,
    });
    return { id: externalId, created_at: now };
  },
});

// Patch an existing draft owned by `userId`. Used by the Kitchen Save flow
// when re-saving a draft that was loaded via ?draft=<id>.
export const update = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    config: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, userId, name, config }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return null;
    const patch: { name?: string; config?: string } = {};
    if (name !== undefined) patch.name = name;
    if (config !== undefined) patch.config = config;
    if (Object.keys(patch).length > 0) await ctx.db.patch(row._id, patch);
    return { id: row.externalId, created_at: row.created_at };
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("drafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Suppressed (low-confidence agent) drafts only surface via Briefing /
    // Sous-Chef History, where "Draft anyway" promotes them. They aren't
    // user-facing drafts until then, so omit from the Drafts page, dashboard
    // widget, and public GET /api/v1/drafts.
    const visible = rows.filter((r) => !r.suppressed);
    visible.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    return visible.map((r) => ({
      id: r.externalId,
      name: r.name ?? null,
      source: r.source,
      sourceSystem: r.sourceSystem ?? null,
      milestoneKey: r.milestoneKey ?? null,
      eventReference: r.eventReference ?? null,
      config: r.config,
      confidence: r.confidence ?? null,
      suppressed: r.suppressed ?? false,
      created_at: r.created_at,
    }));
  },
});

export const getByExternalId = query({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return null;
    return {
      id: row.externalId,
      name: row.name ?? null,
      source: row.source,
      sourceSystem: row.sourceSystem ?? null,
      milestoneKey: row.milestoneKey ?? null,
      eventReference: row.eventReference ?? null,
      config: row.config,
      confidence: row.confidence ?? null,
      suppressed: row.suppressed ?? false,
      generationError: row.generationError ?? null,
      created_at: row.created_at,
    };
  },
});

// Session-scoped variant: looks up by the caller's identity instead of an arg.
// Returns null when unauthenticated so cards inside LazyMount don't throw
// during the brief auth-resolution flicker on first paint.
export const getByExternalIdAuthed = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return null;
    return {
      id: row.externalId,
      name: row.name ?? null,
      source: row.source,
      sourceSystem: row.sourceSystem ?? null,
      milestoneKey: row.milestoneKey ?? null,
      eventReference: row.eventReference ?? null,
      config: row.config,
      confidence: row.confidence ?? null,
      suppressed: row.suppressed ?? false,
      generationError: row.generationError ?? null,
      created_at: row.created_at,
    };
  },
});

// Sous-Chef: idempotent draft insert paired with a milestoneHit.
// Guards against webhook redelivery and cron overlap double-firing.
// Callers build idempotencyKey via src/lib/drafts/idempotency-key.ts.
export const insertDraftIfNew = internalMutation({
  args: {
    userId: v.string(),
    idempotencyKey: v.string(),
    sourceSystem,
    milestoneKey: v.string(),
    eventReference: v.optional(v.string()),
    name: v.optional(v.string()),
    config: v.string(),
    createdBy: v.optional(v.string()),
    confidence: v.optional(v.number()),
    suppressed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .first();
    if (existing) {
      return {
        created: false,
        id: existing.externalId,
        created_at: existing.created_at,
      };
    }

    const externalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    await ctx.db.insert("drafts", {
      userId: args.userId,
      externalId,
      name: args.name,
      source: "agent",
      createdBy: args.createdBy ?? "sous-chef",
      config: args.config,
      originalConfig: args.config,
      sourceSystem: args.sourceSystem,
      milestoneKey: args.milestoneKey,
      eventReference: args.eventReference,
      idempotencyKey: args.idempotencyKey,
      confidence: args.confidence,
      suppressed: args.suppressed,
      created_at: now,
    });
    await ctx.db.insert("milestoneHits", {
      userId: args.userId,
      sourceSystem: args.sourceSystem,
      milestoneKey: args.milestoneKey,
      idempotencyKey: args.idempotencyKey,
      firedAt: now,
      draftExternalId: externalId,
    });
    return { created: true, id: externalId, created_at: now };
  },
});

// Override: flip a suppressed draft to visible. Auth-gated to caller's drafts.
export const unsuppressDraft = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const userId = await requireAuthedUser(ctx);
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return false;
    if (!row.suppressed) return true;
    await ctx.db.patch(row._id, { suppressed: false });
    return true;
  },
});

// Count drafts created after the user's last visit to /admin/drafts.
// Founder-scale: scans all drafts for the user, then filters in JS.
export const unseenCount = query({
  args: {},
  handler: async (ctx) => {
    // Sidebar mounts before auth resolves on first paint; return 0 instead of
    // throwing so the badge silently hides until session is established.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const userId = identity.subject;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const lastVisit = profile?.lastDraftsVisitAt ?? 0;
    const rows = await ctx.db
      .query("drafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.filter((r) => r._creationTime > lastVisit).length;
  },
});

// Stamp the user's last-visit time. Idempotent; safe to call on every mount.
export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthedUser(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, { lastDraftsVisitAt: Date.now() });
  },
});

export const remove = mutation({
  // S6.3: optional `reason` lets the drafts UI capture *why* the user skipped
  // — surfaced on the Sous-Chef history feed as the trigger event's reason.
  args: {
    externalId: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, userId, reason }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
