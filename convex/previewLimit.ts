import { mutation } from "./_generated/server";
import { v } from "convex/values";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOURLY_MAX = 10;
const DAILY_MAX = 50;

// Atomically check + increment IP-based preview rate limit.
// Returns { allowed: true } or { allowed: false, retryAfterMs, scope }.
export const check = mutation({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const now = Date.now();
    const entry = await ctx.db
      .query("previewRateLimits")
      .withIndex("by_ip", (q) => q.eq("ip", ip))
      .first();

    if (!entry) {
      await ctx.db.insert("previewRateLimits", {
        ip,
        hourStart: now,
        hourCount: 1,
        dayStart: now,
        dayCount: 1,
      });
      return { allowed: true as const };
    }

    let hourStart = entry.hourStart;
    let hourCount = entry.hourCount;
    let dayStart = entry.dayStart;
    let dayCount = entry.dayCount;

    if (now - hourStart >= HOUR_MS) {
      hourStart = now;
      hourCount = 0;
    }
    if (now - dayStart >= DAY_MS) {
      dayStart = now;
      dayCount = 0;
    }

    if (dayCount >= DAILY_MAX) {
      return {
        allowed: false as const,
        retryAfterMs: DAY_MS - (now - dayStart),
        scope: "day" as const,
      };
    }
    if (hourCount >= HOURLY_MAX) {
      return {
        allowed: false as const,
        retryAfterMs: HOUR_MS - (now - hourStart),
        scope: "hour" as const,
      };
    }

    await ctx.db.patch(entry._id, {
      hourStart,
      hourCount: hourCount + 1,
      dayStart,
      dayCount: dayCount + 1,
    });
    return { allowed: true as const };
  },
});
