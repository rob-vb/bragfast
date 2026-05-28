/**
 * triggerEvents.ts
 *
 * Append-only event log: every Sous-Chef trigger (PR merge, scan hit, manual
 * fire) records a row capturing the decision (surfaced / bragged / dismissed,
 * plus legacy drafted / auto_skipped / …) plus the originating reference.
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
import { pickTemplateByRules } from "../src/lib/drafts/pick-template";
import {
  buildIdempotencyKey,
  prMergedMilestoneKey,
} from "../src/lib/drafts/idempotency-key";
import type { DraftConfig } from "../src/lib/drafts/types";

export const sourceSystemValidator = v.union(
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
  v.literal("manual"),
  v.literal("cron"),
);

export const decisionValidator = v.union(
  v.literal("surfaced"),
  v.literal("bragged"),
  v.literal("dismissed"),
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
  summary: v.optional(v.string()),
  sourceReference: v.optional(v.string()),
  draftExternalId: v.optional(v.string()),
  metadata: v.optional(v.string()),
};

type RecordArgs = {
  userId: string;
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual" | "cron";
  triggerType: string;
  decision:
    | "surfaced"
    | "bragged"
    | "dismissed"
    | "drafted"
    | "auto_skipped"
    | "user_skipped"
    | "approved"
    | "ignored_48h";
  reason?: string;
  confidence?: number;
  summary?: string;
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
    summary: args.summary,
    sourceReference: args.sourceReference,
    draftExternalId: args.draftExternalId,
    metadata: args.metadata,
    created_at,
  });
  return { externalId, created_at };
}

/** Idempotent surface insert for PR merges (webhook redelivery). */
export const recordSurfacedIfNew = internalMutation({
  args: {
    userId: v.string(),
    sourceSystem: sourceSystemValidator,
    triggerType: v.string(),
    sourceReference: v.string(),
    summary: v.string(),
    confidence: v.number(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId_sourceReference", (q) =>
        q.eq("userId", args.userId).eq("sourceReference", args.sourceReference),
      )
      .filter((q) => q.eq(q.field("triggerType"), args.triggerType))
      .first();
    if (existing) {
      return { created: false as const, externalId: existing.externalId };
    }
    const { externalId } = await insertTriggerEvent(ctx, {
      userId: args.userId,
      sourceSystem: args.sourceSystem,
      triggerType: args.triggerType,
      decision: "surfaced",
      reason: args.reason,
      confidence: args.confidence,
      summary: args.summary,
      sourceReference: args.sourceReference,
      metadata: args.metadata,
    });
    return { created: true as const, externalId };
  },
});

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

/** Webhook path: idempotent surfaced row for a PR merge. */
export const recordSurfacedAction = action({
  args: {
    userId: v.string(),
    sourceSystem: sourceSystemValidator,
    triggerType: v.string(),
    sourceReference: v.string(),
    summary: v.string(),
    confidence: v.number(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.triggerEvents.recordSurfacedIfNew, args);
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

function sortFeedRows<T extends { confidence: number | null; created_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ca = a.confidence ?? -1;
    const cb = b.confidence ?? -1;
    if (cb !== ca) return cb - ca;
    return a.created_at > b.created_at ? -1 : 1;
  });
}

function mapTriggerRow(
  r: {
    externalId: string;
    sourceSystem: RecordArgs["sourceSystem"];
    triggerType: string;
    decision: RecordArgs["decision"];
    reason?: string;
    confidence?: number;
    summary?: string;
    sourceReference?: string;
    draftExternalId?: string;
    metadata?: string;
    created_at: string;
  },
  draftBackfill?: string | null,
): TriggerEventRow {
  return {
    id: r.externalId,
    sourceSystem: r.sourceSystem,
    triggerType: r.triggerType,
    decision: r.decision,
    reason: r.reason ?? null,
    confidence: r.confidence ?? null,
    summary: r.summary ?? null,
    sourceReference: r.sourceReference ?? null,
    draftExternalId: r.draftExternalId ?? draftBackfill ?? null,
    metadata: r.metadata ?? null,
    created_at: r.created_at,
  };
}

/** User dismissed a surfaced trigger from the activity feed. */
export const dismissTrigger = mutation({
  args: { externalId: v.string() },
  handler: async (
    ctx,
    { externalId },
  ): Promise<{ ok: true } | { ok: false; error: "not_found" | "already_dismissed" }> => {
    const userId = await requireAuthedUser(ctx);
    const event = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("externalId"), externalId))
      .first();
    if (!event) return { ok: false, error: "not_found" };
    if (event.decision === "dismissed" || event.decision === "user_skipped") {
      return { ok: false, error: "already_dismissed" };
    }
    await ctx.db.patch(event._id, { decision: "dismissed" });
    return { ok: true };
  },
});

/**
 * Brag: create a lightweight draft from a surfaced trigger and link it.
 * Opens in Kitchen via returned draftExternalId.
 */
export const bragFromTrigger = mutation({
  args: { externalId: v.string() },
  handler: async (
    ctx,
    { externalId },
  ): Promise<
    | { ok: true; draftExternalId: string; created: boolean }
    | { ok: false; error: "not_found" | "not_braggable" | "no_reference" }
  > => {
    const userId = await requireAuthedUser(ctx);
    const event = await ctx.db
      .query("triggerEvents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("externalId"), externalId))
      .first();
    if (!event) return { ok: false, error: "not_found" };

    if (event.decision === "bragged" && event.draftExternalId) {
      return {
        ok: true,
        draftExternalId: event.draftExternalId,
        created: false,
      };
    }
    const braggable: RecordArgs["decision"][] = [
      "surfaced",
      "drafted",
      "auto_skipped",
    ];
    if (!braggable.includes(event.decision)) {
      return { ok: false, error: "not_braggable" };
    }
    if (!event.sourceReference) return { ok: false, error: "no_reference" };

    if (event.draftExternalId) {
      await ctx.db.patch(event._id, { decision: "bragged" });
      return {
        ok: true,
        draftExternalId: event.draftExternalId,
        created: false,
      };
    }

    const meta = event.metadata ? (JSON.parse(event.metadata) as { milestoneKey?: string; repoFullName?: string; prNumber?: number }) : {};
    const milestoneKey =
      meta.milestoneKey ??
      (meta.repoFullName && meta.prNumber != null
        ? prMergedMilestoneKey(meta.repoFullName, meta.prNumber)
        : `pr_merged:${event.sourceReference}`);
    const idempotencyKey = buildIdempotencyKey(userId, "github", milestoneKey);
    const existingDraft = await ctx.db
      .query("drafts")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();

    let draftExternalId: string;
    let created = false;

    if (existingDraft) {
      draftExternalId = existingDraft.externalId;
    } else {
      const pick = pickTemplateByRules({
        milestoneKey,
        prContext: meta.repoFullName
          ? { title: event.summary ?? "Merged PR", body: "" }
          : undefined,
      });
      const templateId =
        pick.templateId !== null ? pick.templateId : "standard-browser";
      const summary =
        event.summary?.trim() ||
        "Make a branded visual for this merged change.";
      const draftConfig: DraftConfig = {
        output: "image",
        templateId,
        notes: `${summary}\n\nSource: ${event.sourceReference}`,
      };
      draftExternalId = `drf_${crypto.randomUUID().slice(0, 10)}`;
      const now = new Date().toISOString();
      await ctx.db.insert("drafts", {
        userId,
        externalId: draftExternalId,
        name: summary.slice(0, 80),
        source: "agent",
        createdBy: "sous-chef-brag",
        config: JSON.stringify(draftConfig),
        originalConfig: JSON.stringify(draftConfig),
        sourceSystem: event.sourceSystem,
        milestoneKey,
        eventReference: event.sourceReference,
        idempotencyKey,
        confidence: event.confidence,
        suppressed: false,
        created_at: now,
      });
      created = true;
    }

    await ctx.db.patch(event._id, {
      decision: "bragged",
      draftExternalId,
    });

    return { ok: true, draftExternalId, created };
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
  decision:
    | "surfaced"
    | "bragged"
    | "dismissed"
    | "drafted"
    | "auto_skipped"
    | "user_skipped"
    | "approved"
    | "ignored_48h";
  reason: string | null;
  confidence: number | null;
  summary: string | null;
  sourceReference: string | null;
  draftExternalId: string | null;
  metadata: string | null;
  created_at: string;
};

/**
 * Resolve a missing draftExternalId from `metadata.milestoneKey`. Older
 * pr_merged events were inserted before the webhook had access to the
 * draft's externalId — they carry milestoneKey in metadata instead. Maps
 * back to the draft table by scanning the user's drafts (founder-scale).
 */
function resolveMissingDraftId(
  metadata: string | undefined,
  drafts: Array<{ externalId: string; milestoneKey?: string }>,
): string | null {
  if (!metadata) return null;
  let parsed: { milestoneKey?: unknown };
  try {
    parsed = JSON.parse(metadata) as { milestoneKey?: unknown };
  } catch {
    return null;
  }
  const key = parsed.milestoneKey;
  if (typeof key !== "string") return null;
  const match = drafts.find((d) => d.milestoneKey === key);
  return match?.externalId ?? null;
}

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
    const needsBackfill = rows.some(
      (r) => !r.draftExternalId && r.metadata,
    );
    const drafts = needsBackfill
      ? await ctx.db
          .query("drafts")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect()
      : [];
    return rows.map((r) =>
      mapTriggerRow(
        r,
        resolveMissingDraftId(r.metadata, drafts),
      ),
    );
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
    return rows.map((r) => mapTriggerRow(r));
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
 * Briefing-page badge: count of surfaced (or legacy drafted) trigger events
 * created after the user's last visit to /admin/briefing. Returns 0 unauthenticated
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
    return rows.filter(
      (r) => r.decision === "surfaced" || r.decision === "drafted",
    ).length;
  },
});

/**
 * Stamp the user's last-visit time on the briefing page. Idempotent.
 * No-ops (instead of throwing) when called before auth resolves, since the
 * client fires this from a useEffect that races session establishment.
 */
export const markBriefingSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const userId = identity.subject;
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
    const sorted = sortFeedRows(
      rows.map((r) => ({
        row: r,
        confidence: r.confidence ?? null,
        created_at: r.created_at,
      })),
    ).map((x) => x.row);
    const trimmed =
      typeof limit === "number" ? sorted.slice(0, limit) : sorted;
    return trimmed.map((r) => mapTriggerRow(r));
  },
});
