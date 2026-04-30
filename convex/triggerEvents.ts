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
  sourceSystem: "github" | "stripe" | "posthog" | "ga4" | "manual";
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

/**
 * Authed list for the /admin/sous-chef/history feed. Newest first. Founder
 * scale: scans the user's index and sorts in JS.
 */
export const listByUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireAuthedUser(ctx);
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
