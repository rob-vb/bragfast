import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoTemplates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});
