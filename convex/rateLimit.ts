import { mutation } from "./_generated/server";
import { v } from "convex/values";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS: Record<string, number> = {
  trial: 10,
  starter: 30,
  pro: 60,
  scale: 120,
};
const DEFAULT_MAX = 10;

// Atomically check and increment the rate limit counter.
// Returns { allowed: true, remaining } or { allowed: false, retryAfterMs }.
export const check = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now = Date.now();

    // Look up the user's plan for their limit
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const max = MAX_REQUESTS[profile?.plan ?? "trial"] ?? DEFAULT_MAX;

    const entry = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!entry) {
      await ctx.db.insert("rateLimits", {
        userId,
        windowStart: now,
        requestCount: 1,
      });
      return { allowed: true, remaining: max - 1 };
    }

    // Window expired — reset
    if (now - entry.windowStart >= WINDOW_MS) {
      await ctx.db.patch(entry._id, {
        windowStart: now,
        requestCount: 1,
      });
      return { allowed: true, remaining: max - 1 };
    }

    // Within window — check limit
    if (entry.requestCount >= max) {
      const retryAfterMs = WINDOW_MS - (now - entry.windowStart);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    await ctx.db.patch(entry._id, {
      requestCount: entry.requestCount + 1,
    });
    return { allowed: true, remaining: max - 1 - entry.requestCount };
  },
});
