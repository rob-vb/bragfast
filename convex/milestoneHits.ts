import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const sourceSystem = v.union(
  v.literal("github"),
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
);

// Seed a milestone as already-fired without creating a draft.
// Used on first-connect for Stripe/PostHog/GA4 so retroactively-satisfied
// thresholds don't flood the user on day one.
export const seedAlreadyHit = internalMutation({
  args: {
    userId: v.string(),
    sourceSystem,
    milestoneKey: v.string(),
  },
  handler: async (ctx, args) => {
    const idempotencyKey = `${args.userId}:${args.sourceSystem}:${args.milestoneKey}`;
    const existing = await ctx.db
      .query("milestoneHits")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing) {
      return { created: false };
    }
    await ctx.db.insert("milestoneHits", {
      userId: args.userId,
      sourceSystem: args.sourceSystem,
      milestoneKey: args.milestoneKey,
      idempotencyKey,
      firedAt: new Date().toISOString(),
      // draftExternalId omitted — empty string signals a retroactive seed.
    });
    return { created: true };
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("milestoneHits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({
      sourceSystem: r.sourceSystem,
      milestoneKey: r.milestoneKey,
      firedAt: r.firedAt,
      draftExternalId: r.draftExternalId ?? null,
    }));
  },
});

export const listByUserSource = query({
  args: {
    userId: v.string(),
    sourceSystem,
  },
  handler: async (ctx, { userId, sourceSystem: src }) => {
    const rows = await ctx.db
      .query("milestoneHits")
      .withIndex("by_userId_sourceSystem", (q) =>
        q.eq("userId", userId).eq("sourceSystem", src),
      )
      .collect();
    return rows.map((r) => r.milestoneKey);
  },
});
