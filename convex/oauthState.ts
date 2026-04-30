import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { requireAuthedUser } from "./auth";

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
 * Public mutation wrapper for issueState — allows authed Next.js callers to
 * mint a CSRF nonce bound to their session. S0.4b: userId is derived from the
 * caller's session, never accepted as a client arg, so a nonce cannot be
 * forged for another user.
 */
export const issueStateAction = mutation({
  args: {
    provider: v.union(v.literal("buffer")),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireAuthedUser(ctx);
    await ctx.runMutation(internal.oauthState.issueState, {
      userId,
      provider: args.provider,
      state: args.state,
    });
  },
});

/**
 * Public mutation wrapper for consumeState. S0.4b: gated behind an authed
 * session, and only returns the consumed row if its userId matches the
 * caller. A foreign session that intercepts a nonce cannot complete the
 * OAuth flow under their own account.
 */
export const consumeStateAction = mutation({
  args: { state: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: string; provider: "buffer" } | null> => {
    const callerId = await requireAuthedUser(ctx);
    const result = await ctx.runMutation(internal.oauthState.consumeState, {
      state: args.state,
    });
    if (!result) return null;
    if (result.userId !== callerId) {
      throw new ConvexError("OAuth state mismatch");
    }
    return result;
  },
});
