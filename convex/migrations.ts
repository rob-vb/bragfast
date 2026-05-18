import { internalMutation } from "./_generated/server";
import type { GoalProvider, GoalMetric } from "../src/lib/goals/types";

// Parses an old-format milestoneKey into goal fields if possible.
// Returns null for keys that can't map to a goal (e.g. pr_merged:*).
function parseOldMilestoneKey(
  key: string,
): { provider: GoalProvider; metric: GoalMetric; target?: number; scope?: string } | null {
  const mrrMatch = key.match(/^mrr:(\d+(?:\.\d+)?)$/);
  if (mrrMatch) return { provider: "stripe", metric: "mrr", target: parseFloat(mrrMatch[1]) };

  if (key === "first_sale") return { provider: "stripe", metric: "first_sale" };

  const trMatch = key.match(/^total_revenue:(\d+(?:\.\d+)?)$/);
  if (trMatch) return { provider: "stripe", metric: "total_revenue", target: parseFloat(trMatch[1]) };

  const subMatch = key.match(/^subscribers:(\d+(?:\.\d+)?)$/);
  if (subMatch) return { provider: "stripe", metric: "subscribers", target: parseFloat(subMatch[1]) };

  const posthogMatch = key.match(/^visitors:(\d+(?:\.\d+)?)$/);
  if (posthogMatch) return { provider: "posthog", metric: "visitors", target: parseFloat(posthogMatch[1]) };

  const ga4Match = key.match(/^ga:visitors:(\d+(?:\.\d+)?)$/);
  if (ga4Match) return { provider: "ga4", metric: "visitors", target: parseFloat(ga4Match[1]) };

  const starMatch = key.match(/^star:(\d+(?:\.\d+)?):(.+)$/);
  if (starMatch) return { provider: "github", metric: "stars", target: parseFloat(starMatch[1]), scope: starMatch[2] };

  return null;
}

// One-time migration: backfill goal-based milestoneHits for existing users.
//
// For each old-format milestoneHit (mrr:N, visitors:N, etc.), finds or creates
// the matching goal and seeds a goal:<externalId> hit so the poller won't re-fire.
//
// Safe to re-run: all writes are idempotent.
export const backfillGoalHits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allHits = await ctx.db.query("milestoneHits").collect();
    const oldHits = allHits.filter(
      (h) => !h.milestoneKey.startsWith("goal:") && !h.milestoneKey.startsWith("pr_merged:"),
    );

    let backfilled = 0;

    for (const hit of oldHits) {
      const parsed = parseOldMilestoneKey(hit.milestoneKey);
      if (!parsed) continue;

      // Find existing matching goal
      let goal = await ctx.db
        .query("goals")
        .withIndex("by_userId", (q) => q.eq("userId", hit.userId))
        .filter((q) => {
          let match = q.eq(q.field("provider"), parsed.provider) &&
            q.eq(q.field("metric"), parsed.metric);
          if (parsed.target !== undefined) {
            match = q.and(match, q.eq(q.field("target"), parsed.target));
          }
          if (parsed.scope !== undefined) {
            match = q.and(match, q.eq(q.field("scope"), parsed.scope));
          }
          return match;
        })
        .first();

      if (!goal) {
        // Create a goal so the user retains their progress (will be manageable in the UI)
        const now = new Date().toISOString();
        const externalId = `goal_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const inserted = await ctx.db.insert("goals", {
          userId: hit.userId,
          externalId,
          provider: parsed.provider,
          metric: parsed.metric,
          target: parsed.target,
          scope: parsed.scope,
          enabled: true,
          created_at: now,
          updated_at: now,
        });
        goal = await ctx.db.get(inserted);
        if (!goal) continue;
      }

      // Seed the goal:<externalId> hit idempotently
      const goalKey = `goal:${goal.externalId}`;
      const idempotencyKey = `${hit.userId}:${hit.sourceSystem}:${goalKey}`;
      const existing = await ctx.db
        .query("milestoneHits")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
        .first();
      if (!existing) {
        await ctx.db.insert("milestoneHits", {
          userId: hit.userId,
          sourceSystem: hit.sourceSystem,
          milestoneKey: goalKey,
          idempotencyKey,
          firedAt: hit.firedAt,
        });
        backfilled++;
      }
    }

    return { processed: oldHits.length, backfilled };
  },
});

// One-time migration: remove legacy `previewUrls` field from templates.
// Run against dev: npx convex run migrations:removePreviewUrls --prod=false
export const removePreviewUrls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("templates").collect();
    let patched = 0;
    for (const t of templates) {
      if ("previewUrls" in t) {
        await ctx.db.patch(t._id, { previewUrls: undefined } as never);
        patched++;
      }
    }
    return { total: templates.length, patched };
  },
});
