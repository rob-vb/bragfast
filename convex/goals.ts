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

const providerArgV = v.optional(providerV);

const metricV = v.union(
  v.literal("mrr"),
  v.literal("total_revenue"),
  v.literal("subscribers"),
  v.literal("first_sale"),
  v.literal("visitors"),
  v.literal("stars"),
  v.literal("custom"),
);

function makeExternalId(): string {
  return `goal_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function validateGoal(
  metric: GoalMetric,
  provider: GoalProvider | undefined,
  target: number | undefined,
  scope: string | undefined,
  label: string | undefined,
): void {
  if (metric === "custom") {
    if (provider != null) throw new Error(`metric "custom" must not have a provider`);
    if (!label || !label.trim()) throw new Error(`metric "custom" requires a label`);
    return;
  }
  if (provider == null) {
    throw new Error(`metric "${metric}" requires a provider`);
  }
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
    const [rows, hits] = await Promise.all([
      ctx.db
        .query("goals")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("milestoneHits")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    const firedIds = new Set(
      hits
        .map((h) => h.milestoneKey)
        .filter((k) => k.startsWith("goal:"))
        .map((k) => k.slice("goal:".length)),
    );

    return rows.map((r) => ({
      externalId: r.externalId,
      provider: (r.provider ?? null) as GoalProvider | null,
      metric: r.metric as GoalMetric,
      target: r.target ?? null,
      scope: r.scope ?? null,
      label: r.label ?? null,
      enabled: r.enabled,
      fired: firedIds.has(r.externalId) || r.firedAt != null,
      firedAt: r.firedAt ?? null,
      firstHitAt: r.firstHitAt ?? null,
      recurring: r.recurring ?? false,
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
      provider: (r.provider ?? null) as GoalProvider | null,
      metric: r.metric as GoalMetric,
      target: r.target ?? null,
      scope: r.scope ?? null,
      label: r.label ?? null,
      enabled: r.enabled,
      recurring: r.recurring ?? false,
      firedAt: r.firedAt ?? null,
      firstHitAt: r.firstHitAt ?? null,
    }));
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    provider: providerArgV,
    metric: metricV,
    target: v.optional(v.number()),
    scope: v.optional(v.string()),
    label: v.optional(v.string()),
    enabled: v.boolean(),
    recurring: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, provider, metric, target, scope, label, enabled, recurring }) => {
    validateGoal(metric as GoalMetric, provider as GoalProvider | undefined, target, scope, label);
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
      recurring,
      created_at: now,
      updated_at: now,
    });
    return {
      externalId,
      provider: (provider ?? null) as GoalProvider | null,
      metric: metric as GoalMetric,
      target: target ?? null,
      scope: scope ?? null,
      label: label ?? null,
      enabled,
      recurring: recurring ?? false,
      firedAt: null,
      firstHitAt: null,
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

// Legacy: hard-disable a goal. Retained for non-fire disable paths if needed.
export const disableGoal = internalMutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const row = await ctx.db
      .query("goals")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row) return;
    await ctx.db.patch(row._id, { enabled: false, updated_at: new Date().toISOString() });
  },
});

// S5.3 fire path: stamp firedAt + firstHitAt; disable only when !recurring.
// Replaces the legacy auto-disable-on-fire behaviour. firstHitAt is set once
// and never overwritten — drives celebration/first-fire prompts downstream.
export const markFired = internalMutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const row = await ctx.db
      .query("goals")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
    if (!row) return;
    const now = new Date().toISOString();
    const patch: {
      firedAt: string;
      updated_at: string;
      firstHitAt?: string;
      enabled?: boolean;
    } = {
      firedAt: now,
      updated_at: now,
    };
    if (!row.firstHitAt) patch.firstHitAt = now;
    if (!row.recurring) patch.enabled = false;
    await ctx.db.patch(row._id, patch);
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
