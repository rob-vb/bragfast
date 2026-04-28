import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * STUB — U8 will replace this body with the real fanout logic.
 *
 * Scheduled by approveDraft after all draftPushes rows are inserted.
 * Receives the draftId and userId so U8 can query the pending rows and
 * dispatch per-provider send actions.
 */
export const run = internalAction({
  args: {
    draftId: v.string(),
    userId: v.string(),
  },
  handler: async (_ctx, { draftId, userId }) => {
    console.log("[pushFanout] scheduled", { draftId, userId });
  },
});
