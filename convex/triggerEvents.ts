/**
 * triggerEvents.ts
 *
 * Append-only event log: every Sous-Chef trigger (PR merge, scan hit, manual
 * fire) records a row capturing the decision (drafted / auto_skipped /
 * user_skipped / approved / ignored_48h) plus the originating reference.
 * Powers the /admin/sous-chef/history feed.
 *
 * The internal `record` mutation is the single insertion point. Callers in
 * other Convex mutations (approveDraft, drafts.remove) use the
 * `insertTriggerEvent` helper below to inline the write into their own
 * transaction. Next.js webhook handlers go through `recordAction`.
 */
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";

export const sourceSystemValidator = v.union(
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
  v.literal("manual"),
  v.literal("cron"),
);

export const decisionValidator = v.union(
  v.literal("drafted"),
  v.literal("auto_skipped"),
  v.literal("user_skipped"),
  v.literal("approved"),
  v.literal("ignored_48h"),
);

const recordArgs = {
  userId: v.string(),
  sourceSystem: sourceSystemValidator,
  triggerType: v.string(),
  decision: decisionValidator,
  reason: v.optional(v.string()),
  confidence: v.optional(v.number()),
  sourceReference: v.optional(v.string()),
  draftExternalId: v.optional(v.string()),
  metadata: v.optional(v.string()),
};

type RecordArgs = {
  userId: string;
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual" | "cron";
  triggerType: string;
  decision:
    | "drafted"
    | "auto_skipped"
    | "user_skipped"
    | "approved"
    | "ignored_48h";
  reason?: string;
  confidence?: number;
  sourceReference?: string;
  draftExternalId?: string;
  metadata?: string;
};

/**
 * Inline insert helper — use from other mutations to keep the write inside the
 * caller's transaction (so an event row never lingers when the caller fails).
 */
export async function insertTriggerEvent(
  ctx: MutationCtx,
  args: RecordArgs,
): Promise<{ externalId: string; created_at: string }> {
  const externalId = `evt_${crypto.randomUUID().slice(0, 10)}`;
  const created_at = new Date().toISOString();
  await ctx.db.insert("triggerEvents", {
    userId: args.userId,
    externalId,
    sourceSystem: args.sourceSystem,
    triggerType: args.triggerType,
    decision: args.decision,
    reason: args.reason,
    confidence: args.confidence,
    sourceReference: args.sourceReference,
    draftExternalId: args.draftExternalId,
    metadata: args.metadata,
    created_at,
  });
  return { externalId, created_at };
}

export const record = internalMutation({
  args: recordArgs,
  handler: async (ctx, args) => insertTriggerEvent(ctx, args),
});

/**
 * Public action wrapper for Next.js callers (webhook route). Hidden behind an
 * action so the underlying mutation isn't exposed on the public Convex client.
 */
export const recordAction = action({
  args: recordArgs,
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.triggerEvents.record, args);
  },
});

// S6.3: override an auto_skipped trigger event. Finds a suppressed draft
// previously created for the same eventReference, flips its `suppressed` flag,
// and records a new "drafted / user_override" trigger event so the feed shows
// the user's intent. If no suppressed draft exists (e.g. content_filter or
// rate_cap path produced no draft at all), returns an error so the caller
// surfaces it — we don't silently re-run the original picker here.
export const overrideAutoSkippedEvent = mutation({
  args: { externalId: v.string() },
  handler: async (
    ctx,
    { externalId },
  ): Promise<
    | { ok: true; draftExternalId: string }
    | { ok: false; error: "not_found" | "not_skipped" | "no_draft" | "no_reference" }
  > => {
    const userId = await requireAuthedUser(ctx);
    const event = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("externalId"), externalId))
      .first();
    if (!event) return { ok: false, error: "not_found" };
    if (event.decision !== "auto_skipped")
      return { ok: false, error: "not_skipped" };
    if (!event.sourceReference)
      return { ok: false, error: "no_reference" };

    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const match = drafts.find(
      (d) => d.eventReference === event.sourceReference && d.suppressed,
    );
    if (!match) return { ok: false, error: "no_draft" };

    await ctx.db.patch(match._id, { suppressed: false });
    await insertTriggerEvent(ctx, {
      userId,
      sourceSystem: event.sourceSystem,
      triggerType: event.triggerType,
      decision: "drafted",
      reason: "user_override",
      confidence: event.confidence,
      sourceReference: event.sourceReference,
      draftExternalId: match.externalId,
    });
    return { ok: true, draftExternalId: match.externalId };
  },
});

/**
 * S9.2: aggregate a user's trigger events for a calendar year. Powers
 * year-end recap rollups; no UI yet. Returns counts per decision +
 * approved-by-source breakdown + top sourceReferences.
 */
export const aggregateForYear = query({
  args: { year: v.number() },
  handler: async (ctx, { year }) => {
    const userId = await requireAuthedUser(ctx);
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const inYear = rows.filter(
      (r) => r.created_at >= start && r.created_at < end,
    );

    const byDecision: Record<string, number> = {};
    const approvedBySource: Record<string, number> = {};
    const refCounts = new Map<string, number>();

    for (const r of inYear) {
      byDecision[r.decision] = (byDecision[r.decision] ?? 0) + 1;
      if (r.decision === "approved") {
        approvedBySource[r.sourceSystem] =
          (approvedBySource[r.sourceSystem] ?? 0) + 1;
        if (r.sourceReference) {
          refCounts.set(
            r.sourceReference,
            (refCounts.get(r.sourceReference) ?? 0) + 1,
          );
        }
      }
    }

    const topReferences = [...refCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reference, count]) => ({ reference, count }));

    return {
      year,
      total: inYear.length,
      byDecision,
      approvedBySource,
      topReferences,
    };
  },
});

/**
 * S9.1: aggregate a user's trigger events between two ISO timestamps. Powers
 * the weekly digest email. Returns counts per decision + approved-by-source +
 * top sourceReferences for the window. Internal-only — fan-out from cron.
 */
export const aggregateForUserBetween = internalQuery({
  args: {
    userId: v.string(),
    startISO: v.string(),
    endISO: v.string(),
  },
  handler: async (ctx, { userId, startISO, endISO }) => {
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const inWindow = rows.filter(
      (r) => r.created_at >= startISO && r.created_at < endISO,
    );

    const byDecision: Record<string, number> = {};
    const approvedBySource: Record<string, number> = {};
    const refCounts = new Map<string, number>();

    for (const r of inWindow) {
      byDecision[r.decision] = (byDecision[r.decision] ?? 0) + 1;
      if (r.decision === "approved") {
        approvedBySource[r.sourceSystem] =
          (approvedBySource[r.sourceSystem] ?? 0) + 1;
        if (r.sourceReference) {
          refCounts.set(
            r.sourceReference,
            (refCounts.get(r.sourceReference) ?? 0) + 1,
          );
        }
      }
    }

    const topReferences = [...refCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reference, count]) => ({ reference, count }));

    return {
      total: inWindow.length,
      approved: byDecision["approved"] ?? 0,
      drafted: byDecision["drafted"] ?? 0,
      auto_skipped: byDecision["auto_skipped"] ?? 0,
      user_skipped: byDecision["user_skipped"] ?? 0,
      ignored_48h: byDecision["ignored_48h"] ?? 0,
      approvedBySource,
      topReferences,
    };
  },
});

type TriggerEventRow = {
  id: string;
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual" | "cron";
  triggerType: string;
  decision: "drafted" | "auto_skipped" | "user_skipped" | "approved" | "ignored_48h";
  reason: string | null;
  confidence: number | null;
  sourceReference: string | null;
  draftExternalId: string | null;
  metadata: string | null;
  created_at: string;
};

/**
 * Daily briefing: trigger events for the current user inside [startISO, endISO).
 * Bounded by the by_userId_created_at compound index so we never hit the 8192
 * collect() ceiling for heavy users. Newest first.
 */
export const listByUserForDay = query({
  args: { startISO: v.string(), endISO: v.string() },
  handler: async (ctx, { startISO, endISO }): Promise<TriggerEventRow[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_created_at", (q) =>
        q.eq("userId", userId).gte("created_at", startISO).lt("created_at", endISO),
      )
      .order("desc")
      .collect();
    return rows.map((r) => ({
      id: r.externalId,
      sourceSystem: r.sourceSystem,
      triggerType: r.triggerType,
      decision: r.decision,
      reason: r.reason ?? null,
      confidence: r.confidence ?? null,
      sourceReference: r.sourceReference ?? null,
      draftExternalId: r.draftExternalId ?? null,
      metadata: r.metadata ?? null,
      created_at: r.created_at,
    }));
  },
});

/**
 * Weekly report: same shape as listByUserForDay but for a 7-day window.
 */
export const listByUserForWeek = query({
  args: { startISO: v.string(), endISO: v.string() },
  handler: async (ctx, { startISO, endISO }): Promise<TriggerEventRow[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_created_at", (q) =>
        q.eq("userId", userId).gte("created_at", startISO).lt("created_at", endISO),
      )
      .order("desc")
      .collect();
    return rows.map((r) => ({
      id: r.externalId,
      sourceSystem: r.sourceSystem,
      triggerType: r.triggerType,
      decision: r.decision,
      reason: r.reason ?? null,
      confidence: r.confidence ?? null,
      sourceReference: r.sourceReference ?? null,
      draftExternalId: r.draftExternalId ?? null,
      metadata: r.metadata ?? null,
      created_at: r.created_at,
    }));
  },
});

/**
 * Internal variant of listByUserForDay — used by briefings cron + tests.
 * No identity check; caller must supply userId.
 */
export const listByUserForDayInternal = internalQuery({
  args: { userId: v.string(), startISO: v.string(), endISO: v.string() },
  handler: async (ctx, { userId, startISO, endISO }) => {
    return await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_created_at", (q) =>
        q.eq("userId", userId).gte("created_at", startISO).lt("created_at", endISO),
      )
      .order("desc")
      .collect();
  },
});

/**
 * Internal variant of listByUserForWeek — used by the weekly summary cron.
 */
export const listByUserForWeekInternal = internalQuery({
  args: { userId: v.string(), startISO: v.string(), endISO: v.string() },
  handler: async (ctx, { userId, startISO, endISO }) => {
    return await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_created_at", (q) =>
        q.eq("userId", userId).gte("created_at", startISO).lt("created_at", endISO),
      )
      .order("desc")
      .collect();
  },
});

/**
 * Briefing-page badge: count of `decision=drafted` trigger events created
 * after the user's last visit to /admin/briefing. Returns 0 unauthenticated
 * so the sidebar badge silently hides during the auth-resolution flicker.
 */
export const countUnseenBriefingDrafts = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const userId = identity.subject;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const lastVisitMs = profile?.lastBriefingVisitAt ?? 0;
    const lastVisitISO = new Date(lastVisitMs).toISOString();
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_created_at", (q) =>
        q.eq("userId", userId).gte("created_at", lastVisitISO),
      )
      .collect();
    return rows.filter((r) => r.decision === "drafted").length;
  },
});

/**
 * Stamp the user's last-visit time on the briefing page. Idempotent.
 */
export const markBriefingSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthedUser(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, { lastBriefingVisitAt: Date.now() });
  },
});

/**
 * Authed list for the /admin/sous-chef/history feed. Newest first. Founder
 * scale: scans the user's index and sorts in JS.
 */
export const listByUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    // History page mounts before auth resolves on first paint; return [] instead
    // of throwing so the feed silently hides until session is established.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const rows = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    rows.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    const trimmed = typeof limit === "number" ? rows.slice(0, limit) : rows;
    return trimmed.map((r) => ({
      id: r.externalId,
      sourceSystem: r.sourceSystem,
      triggerType: r.triggerType,
      decision: r.decision,
      reason: r.reason ?? null,
      confidence: r.confidence ?? null,
      sourceReference: r.sourceReference ?? null,
      draftExternalId: r.draftExternalId ?? null,
      metadata: r.metadata ?? null,
      created_at: r.created_at,
    }));
  },
});
