import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Check and increment demo rate limit. Returns true if allowed. */
export const checkAndIncrement = mutation({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    const existing = await ctx.db
      .query("demoRateLimits")
      .withIndex("by_ip", (q) => q.eq("ip", ip))
      .first();

    if (!existing) {
      await ctx.db.insert("demoRateLimits", {
        ip,
        windowStart: now,
        requestCount: 1,
      });
      return true;
    }

    // Window expired — reset
    if (existing.windowStart < windowStart) {
      await ctx.db.patch(existing._id, {
        windowStart: now,
        requestCount: 1,
      });
      return true;
    }

    // Within window — check limit
    if (existing.requestCount >= RATE_LIMIT) {
      return false;
    }

    await ctx.db.patch(existing._id, {
      requestCount: existing.requestCount + 1,
    });
    return true;
  },
});

/** Delete expired rate limit entries (called by cron). */
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - RATE_WINDOW_MS * 2;
    const all = await ctx.db.query("demoRateLimits").collect();
    let deleted = 0;
    for (const entry of all) {
      if (entry.windowStart < cutoff) {
        await ctx.db.delete(entry._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
