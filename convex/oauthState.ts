import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Issue a short-lived CSRF nonce for an OAuth flow.
 * The nonce is single-use — it MUST be consumed via consumeState before it can be used.
 */
export const issueState = internalMutation({
  args: {
    userId: v.string(),
    provider: v.union(v.literal("buffer")),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    await ctx.db.insert("oauthStates", {
      userId: args.userId,
      provider: args.provider,
      state: args.state,
      expiresAt: now + STATE_TTL_MS,
      created_at: new Date(now).toISOString(),
    });
  },
});

/**
 * Atomically consume a state nonce (single-use delete).
 * Returns the row if valid and not expired, or null if not found/expired.
 * The row is always deleted on a successful find so it cannot be reused.
 */
export const consumeState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (
    ctx,
    { state },
  ): Promise<{ userId: string; provider: "buffer" } | null> => {
    const row = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();

    if (!row) return null;

    // Always delete even if expired — prevents replay after TTL.
    await ctx.db.delete(row._id);

    if (row.expiresAt < Date.now()) return null;

    return {
      userId: row.userId,
      provider: row.provider,
    };
  },
});

/**
 * Public mutation wrapper for issueState — allows Next.js route handlers to issue
 * a state nonce via ConvexHttpClient (which cannot call internalMutation directly).
 */
export const issueStateAction = mutation({
  args: {
    userId: v.string(),
    provider: v.union(v.literal("buffer")),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.oauthState.issueState, args);
  },
});

/**
 * Public mutation wrapper for consumeState — allows Next.js route handlers to
 * consume a state nonce atomically.
 */
export const consumeStateAction = mutation({
  args: { state: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: string; provider: "buffer" } | null> => {
    return ctx.runMutation(internal.oauthState.consumeState, { state: args.state });
  },
});
