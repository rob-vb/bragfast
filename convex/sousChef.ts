import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sousChefProvider = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
  v.literal("github"),
);

function assertNever(value: never): never {
  throw new Error(`unknown provider: ${value}`);
}

export const seed = internalAction({
  args: {
    userId: v.string(),
    provider: sousChefProvider,
    installationId: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { userId, provider: prov, installationId },
  ): Promise<unknown> => {
    switch (prov) {
      case "stripe":
        return await ctx.runAction(
          internal.integrations.stripe.seedFromCurrentState,
          { userId },
        );
      case "posthog":
        return await ctx.runAction(
          internal.integrations.posthog.seedFromCurrentState,
          { userId },
        );
      case "ga4":
        return await ctx.runAction(
          internal.integrations.ga4.seedFromCurrentState,
          { userId },
        );
      case "github": {
        if (typeof installationId !== "number") {
          throw new Error("installationId is required for github seed");
        }
        return await ctx.runAction(
          internal.integrations.githubStars.seedFromCurrentState,
          { userId, installationId },
        );
      }
      default:
        return assertNever(prov);
    }
  },
});

export const scanNow = internalAction({
  args: { userId: v.string(), provider: sousChefProvider },
  handler: async (ctx, { userId, provider: prov }): Promise<unknown> => {
    switch (prov) {
      case "stripe":
        return await ctx.runAction(internal.integrations.stripe.scan, {
          userId,
        });
      case "posthog":
        return await ctx.runAction(internal.integrations.posthog.scan, {
          userId,
        });
      case "ga4":
        return await ctx.runAction(internal.integrations.ga4.scan, { userId });
      case "github":
        throw new Error("scanNow does not support github");
      default:
        return assertNever(prov);
    }
  },
});
