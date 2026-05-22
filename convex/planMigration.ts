import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// One-time migration: collapse legacy plan literals to the new 3-value union.
//
// Maps:
//   starter | pro | scale | toast | buffet → plate (all were paid/active subscribers)
//   trial   → trial (unchanged)
//   free    → free  (unchanged)
//   plate   → plate (unchanged)
//
// Safe to re-run: only patches rows that need changing.
// Run BEFORE deploying the schema plan union cleanup.
export const migratePlanLiterals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const PAID_LEGACY = new Set(["starter", "pro", "scale", "toast", "buffet"]);

    // Process in batches to stay within Convex mutation transaction limits.
    let migrated = 0;
    let cursor: string | null = null;

    while (true) {
      const batch = await ctx.db
        .query("userProfiles")
        .order("asc")
        .paginate({ numItems: 100, cursor: cursor ?? null });

      for (const profile of batch.page) {
        if (PAID_LEGACY.has(profile.plan)) {
          await ctx.db.patch(profile._id, { plan: "plate" });
          migrated++;
        }
      }

      if (batch.isDone) break;
      cursor = batch.continueCursor;
    }

    return { migrated };
  },
});
