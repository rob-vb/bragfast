import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const provider = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
);

// Public thin wrapper over provider-specific seedFromCurrentState actions.
// Called after a user connects an integration so pre-existing thresholds are
// recorded as already-hit (no retroactive flood).
export const seed = action({
  args: { userId: v.string(), provider },
  handler: async (ctx, { userId, provider: prov }): Promise<unknown> => {
    if (prov === "stripe") {
      return await ctx.runAction(
        internal.integrations.stripe.seedFromCurrentState,
        { userId },
      );
    }
    if (prov === "posthog") {
      return await ctx.runAction(
        internal.integrations.posthog.seedFromCurrentState,
        { userId },
      );
    }
    return await ctx.runAction(
      internal.integrations.ga4.seedFromCurrentState,
      { userId },
    );
  },
});

// Public thin wrapper to kick off an on-demand scan (used by the admin UI's
// "scan now" button and for manual testing). Skips the daily cron cadence.
export const scanNow = action({
  args: { userId: v.string(), provider },
  handler: async (ctx, { userId, provider: prov }): Promise<unknown> => {
    if (prov === "stripe") {
      return await ctx.runAction(internal.integrations.stripe.scan, {
        userId,
      });
    }
    if (prov === "posthog") {
      return await ctx.runAction(internal.integrations.posthog.scan, {
        userId,
      });
    }
    return await ctx.runAction(internal.integrations.ga4.scan, { userId });
  },
});
