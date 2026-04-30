"use node";

import Stripe from "stripe";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { open } from "../../src/lib/crypto/secret-box";
import {
  computeMrrUsd,
  lineItemMonthlyUsd,
  type SubscriptionLike,
} from "../../src/lib/integrations/stripe-milestones";
import {
  buildIdempotencyKey,
  goalMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { typedMilestoneKey } from "../../src/lib/goals/types";
import type { GoalMetric } from "../../src/lib/goals/types";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";

type StripeGoal = {
  externalId: string;
  metric: GoalMetric;
  target: number | null;
  scope: string | null;
  label: string | null;
  enabled: boolean;
};

type StripeSnapshot = {
  mrrUsd: number;
  totalRevenueUsd: number;
  activeSubscriberCount: number;
  hasSuccessfulCharge: boolean;
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function readCredentials(
  ctx: ActionCtx,
  userId: string,
): Promise<{ stripe: Stripe; hitKeys: string[] } | null> {
  const sealed = await ctx.runQuery(
    internal.integrationSecrets.getSealedForScan,
    { userId, provider: "stripe" },
  );
  if (!sealed) return null;

  const apiKey = open({
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    tag: sealed.tag,
  });
  const stripe = new Stripe(apiKey, { apiVersion: "2026-02-25.clover" });

  const hitKeys = (await ctx.runQuery(api.milestoneHits.listByUserSource, {
    userId,
    sourceSystem: "stripe",
  })) as string[];

  return { stripe, hitKeys };
}

async function readStripeSnapshot(stripe: Stripe): Promise<StripeSnapshot> {
  const subs: SubscriptionLike[] = [];
  let activeSubscriberCount = 0;

  for await (const s of stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"],
  })) {
    subs.push({
      status: s.status,
      monthlyUsd: s.items.data.reduce((sum, item) => {
        const price = item.price;
        if (!price.recurring) return sum;
        return (
          sum +
          lineItemMonthlyUsd({
            unitAmountCents: price.unit_amount,
            currency: price.currency,
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
            quantity: item.quantity ?? 1,
          })
        );
      }, 0),
    });
    if (ACTIVE_STATUSES.has(s.status)) activeSubscriberCount++;
  }

  const mrrUsd = computeMrrUsd(subs);

  let totalRevenueUsd = 0;
  for await (const charge of stripe.charges.list({ limit: 100 })) {
    if (charge.status === "succeeded") {
      totalRevenueUsd += charge.amount / 100;
    }
  }

  const recentCharges = await stripe.charges.list({ limit: 1 });
  const hasSuccessfulCharge = recentCharges.data.some(
    (c) => c.status === "succeeded",
  );

  return { mrrUsd, totalRevenueUsd, activeSubscriberCount, hasSuccessfulCharge };
}

function isGoalCrossed(goal: StripeGoal, snapshot: StripeSnapshot): boolean {
  const target = goal.target ?? 0;
  switch (goal.metric) {
    case "mrr":
      return snapshot.mrrUsd >= target;
    case "total_revenue":
      return snapshot.totalRevenueUsd >= target;
    case "subscribers":
      return snapshot.activeSubscriberCount >= target;
    case "first_sale":
      return snapshot.hasSuccessfulCharge;
    default:
      return false;
  }
}

// Daily scan for one user.
export const scan = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      const creds = await readCredentials(ctx, userId);
      if (!creds) return { skipped: "not_connected" };

      const { stripe, hitKeys } = creds;
      const firedGoalIds = new Set(
        hitKeys
          .filter((k) => k.startsWith("goal:"))
          .map((k) => k.slice("goal:".length)),
      );

      const goals = (await ctx.runQuery(
        internal.goals.listEnabledByUserProvider,
        { userId, provider: "stripe" },
      )) as StripeGoal[];

      if (goals.length === 0) {
        await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
          userId, provider: "stripe", ok: true,
        });
        return { ok: true, fired: 0, reason: "no_goals" };
      }

      const snapshot = await readStripeSnapshot(stripe);

      let fired = 0;
      for (const goal of goals) {
        if (firedGoalIds.has(goal.externalId)) continue;
        if (!isGoalCrossed(goal, snapshot)) continue;
        await fireDraft(ctx, userId, goal, snapshot);
        fired++;
      }

      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId, provider: "stripe", ok: true,
        snapshotJson: JSON.stringify(snapshot),
      });
      return { ok: true, fired, snapshot: { mrrUsd: snapshot.mrrUsd } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId, provider: "stripe", ok: false, error: msg.slice(0, 500),
      });
      console.error(`[sous-chef] Stripe scan failed for ${userId}:`, err);
      return { ok: false, error: msg };
    }
  },
});

// Seed on first connect: create default goals, then record every already-crossed
// goal as already-fired so users don't get flooded with retroactive drafts.
export const seedFromCurrentState = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const creds = await readCredentials(ctx, userId);
    if (!creds) return { skipped: "not_connected" };
    const { stripe } = creds;

    await ctx.runMutation(internal.goals.seedDefaultsForProvider, {
      userId,
      provider: "stripe",
    });

    const snapshot = await readStripeSnapshot(stripe);

    const goals = (await ctx.runQuery(
      internal.goals.listEnabledByUserProvider,
      { userId, provider: "stripe" },
    )) as StripeGoal[];

    const seeded: string[] = [];
    for (const goal of goals) {
      if (!isGoalCrossed(goal, snapshot)) continue;
      await ctx.runMutation(internal.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "stripe",
        milestoneKey: goalMilestoneKey(goal.externalId),
      });
      seeded.push(goal.externalId);
    }

    await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
      userId, provider: "stripe", ok: true,
      snapshotJson: JSON.stringify(snapshot),
    });

    return { seeded };
  },
});

// Fan out: schedule a per-user scan for every enabled Stripe integration.
export const scanAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const enabled = await ctx.runQuery(
      internal.integrationSecrets.listEnabledByProvider,
      { provider: "stripe" },
    );
    for (const row of enabled as Array<{ userId: string }>) {
      await ctx.scheduler.runAfter(0, internal.integrations.stripe.scan, {
        userId: row.userId,
      });
    }
    return { scheduled: enabled.length };
  },
});

async function fireDraft(
  ctx: ActionCtx,
  userId: string,
  goal: StripeGoal,
  snapshot: StripeSnapshot,
): Promise<void> {
  const milestoneKey = typedMilestoneKey({
    metric: goal.metric,
    target: goal.target ?? undefined,
    scope: goal.scope ?? undefined,
    provider: "stripe",
  });
  const idempotencyKey = buildIdempotencyKey(
    userId,
    "stripe",
    goalMilestoneKey(goal.externalId),
  );

  const composeInput = buildComposeInput(goal, snapshot);
  const [pick, copy] = await Promise.all([
    pickTemplate({ milestoneKey }),
    composeCopy(composeInput),
  ]);

  const draftConfig: DraftConfig = {
    output: "image",
    templateId: pick.templateId,
    objectContent: {
      title: { text: copy.title },
      description: { text: copy.description },
    },
    notes: `Sous-Chef: ${milestoneKey}`,
  };

  await ctx.runMutation(internal.drafts.insertDraftIfNew, {
    userId,
    idempotencyKey,
    sourceSystem: "stripe",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
  await ctx.runMutation(internal.goals.markFired, { externalId: goal.externalId });
}

function buildComposeInput(goal: StripeGoal, snapshot: StripeSnapshot) {
  switch (goal.metric) {
    case "mrr":
      return { type: "mrr" as const, threshold: goal.target ?? snapshot.mrrUsd };
    case "total_revenue":
      return { type: "total_revenue" as const, threshold: goal.target ?? snapshot.totalRevenueUsd };
    case "subscribers":
      return { type: "subscribers" as const, threshold: goal.target ?? snapshot.activeSubscriberCount };
    case "first_sale":
    default:
      return { type: "first_sale" as const };
  }
}
