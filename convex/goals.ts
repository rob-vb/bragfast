import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { GoalProvider, GoalMetric } from "../src/lib/goals/types";
import { isThresholdMetric, isScopedMetric } from "../src/lib/goals/types";
import {
  DEFAULT_GOALS_BY_PROVIDER,
  DEFAULT_STAR_THRESHOLDS,
} from "../src/lib/goals/defaults";

const providerV = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
  v.literal("github"),
);

const metricV = v.union(
  v.literal("mrr"),
  v.literal("total_revenue"),
  v.literal("subscribers"),
  v.literal("first_sale"),
  v.literal("visitors"),
  v.literal("stars"),
);

function makeExternalId(): string {
  return `goal_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function validateGoal(metric: GoalMetric, target: number | undefined, scope: string | undefined): void {
  if (isThresholdMetric(metric) && (target == null || target <= 0)) {
    throw new Error(`metric "${metric}" requires a positive target`);
  }
  if (isScopedMetric(metric) && !scope) {
    throw new Error(`metric "${metric}" requires a scope (owner/repo)`);
  }
}

// Public query — used by sous-chef-client to render the goals list.
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("goals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({
      externalId: r.externalId,
      provider: r.provider as GoalProvider,
      metric: r.metric as GoalMetric,
      target: r.target ?? null,
      scope: r.scope ?? null,
      label: r.label ?? null,
      enabled: r.enabled,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  },
});

// Internal query used by scan actions.
export const listEnabledByUserProvider = internalQuery({
  args: { userId: v.string(), provider: providerV },
  handler: async (ctx, { userId, provider }) => {
    const rows = await ctx.db
      .query("goals")
      .withIndex("by_userId_provider_enabled", (q) =>
        q.eq("userId", userId).eq("provider", provider).eq("enabled", true),
      )
      .collect();
    return rows.map((r) => ({
      externalId: r.externalId,
      provider: r.provider as GoalProvider,
      metric: r.metric as GoalMetric,
      target: r.target ?? null,
      scope: r.scope ?? null,
      label: r.label ?? null,
      enabled: r.enabled,
    }));
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    provider: providerV,
    metric: metricV,
    target: v.optional(v.number()),
    scope: v.optional(v.string()),
    label: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, { userId, provider, metric, target, scope, label, enabled }) => {
    validateGoal(metric as GoalMetric, target, scope);
    const externalId = makeExternalId();
    const now = new Date().toISOString();
    await ctx.db.insert("goals", {
      userId,
      externalId,
      provider,
      metric,
      target,
      scope,
      label,
      enabled,
      created_at: now,
      updated_at: now,
    });
    return {
      externalId,
      provider: provider as GoalProvider,
      metric: metric as GoalMetric,
      target: target ?? null,
      scope: scope ?? null,
      label: label ?? null,
      enabled,
      created_at: now,
      updated_at: now,
    };
  },
});

export const remove = mutation({
  args: { userId: v.string(), externalId: v.string() },
  handler: async (ctx, { userId, externalId }) => {
    const row = await ctx.db
      .query("goals")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row) return { deleted: false };
    if (row.userId !== userId) throw new Error("Forbidden");
    await ctx.db.delete(row._id);
    return { deleted: true };
  },
});

export const setEnabled = mutation({
  args: { userId: v.string(), externalId: v.string(), enabled: v.boolean() },
  handler: async (ctx, { userId, externalId, enabled }) => {
    const row = await ctx.db
      .query("goals")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row) return { updated: false };
    if (row.userId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(row._id, { enabled, updated_at: new Date().toISOString() });
    return { updated: true };
  },
});

// Idempotent seeder: creates default goals for the given provider.
// No-op if the user already has any goals for that provider.
export const seedDefaultsForProvider = internalMutation({
  args: {
    userId: v.string(),
    provider: providerV,
    repoFullNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { userId, provider, repoFullNames }) => {
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_userId_provider_enabled", (q) =>
        q.eq("userId", userId).eq("provider", provider as GoalProvider).eq("enabled", true),
      )
      .first();
    // Also check disabled goals to be truly idempotent
    const existingAny = existing ?? await ctx.db
      .query("goals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("provider"), provider))
      .first();
    if (existingAny) return { seeded: 0, skipped: true };

    const now = new Date().toISOString();
    let seeded = 0;

    if (provider === "github") {
      for (const repo of repoFullNames ?? []) {
        for (const threshold of DEFAULT_STAR_THRESHOLDS) {
          await ctx.db.insert("goals", {
            userId,
            externalId: makeExternalId(),
            provider: "github",
            metric: "stars",
            target: threshold,
            scope: repo,
            enabled: true,
            created_at: now,
            updated_at: now,
          });
          seeded++;
        }
      }
      return { seeded, skipped: false };
    }

    const templates =
      provider === "stripe"
        ? DEFAULT_GOALS_BY_PROVIDER.stripe
        : provider === "posthog"
          ? DEFAULT_GOALS_BY_PROVIDER.posthog
          : DEFAULT_GOALS_BY_PROVIDER.ga4;

    for (const tmpl of templates) {
      await ctx.db.insert("goals", {
        userId,
        externalId: makeExternalId(),
        provider: tmpl.provider,
        metric: tmpl.metric,
        target: tmpl.target,
        scope: tmpl.scope,
        enabled: tmpl.enabled,
        created_at: now,
        updated_at: now,
      });
      seeded++;
    }
    return { seeded, skipped: false };
  },
});
