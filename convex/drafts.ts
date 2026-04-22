import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("drafts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    rows.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    return rows.map((r) => ({
      id: r.externalId,
      name: r.name ?? null,
      source: r.source,
      config: r.config,
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
      config: row.config,
      created_at: row.created_at,
    };
  },
});

// Sous-Chef: idempotent draft insert paired with a milestoneHit.
// Guards against webhook redelivery and cron overlap double-firing.
// Callers build idempotencyKey via src/lib/drafts/idempotency-key.ts.
export const insertDraftIfNew = mutation({
  args: {
    userId: v.string(),
    idempotencyKey: v.string(),
    sourceSystem,
    milestoneKey: v.string(),
    eventReference: v.optional(v.string()),
    name: v.optional(v.string()),
    config: v.string(),
    createdBy: v.optional(v.string()),
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
      sourceSystem: args.sourceSystem,
      milestoneKey: args.milestoneKey,
      eventReference: args.eventReference,
      idempotencyKey: args.idempotencyKey,
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

export const remove = mutation({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, { externalId, userId }) => {
    const row = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row || row.userId !== userId) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});
