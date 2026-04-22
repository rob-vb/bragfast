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
  detectCrossedThresholds,
  shouldFireFirstSale,
  type SubscriptionLike,
} from "../../src/lib/integrations/stripe-milestones";
import {
  buildIdempotencyKey,
  mrrMilestoneKey,
  firstSaleMilestoneKey,
} from "../../src/lib/drafts/idempotency-key";
import { composeCopy } from "../../src/lib/drafts/compose-copy";
import { pickTemplate } from "../../src/lib/drafts/pick-template";
import type { DraftConfig } from "../../src/lib/drafts/types";

async function readState(
  ctx: ActionCtx,
  userId: string,
): Promise<{
  stripe: Stripe;
  alreadyHitMrr: number[];
  alreadyHitFirstSale: boolean;
} | null> {
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

  const hitKeys = await ctx.runQuery(api.milestoneHits.listByUserSource, {
    userId,
    sourceSystem: "stripe",
  });

  const alreadyHitMrr = (hitKeys as string[])
    .filter((k: string) => k.startsWith("mrr:"))
    .map((k: string) => parseInt(k.slice("mrr:".length), 10))
    .filter((n: number) => Number.isFinite(n));
  const alreadyHitFirstSale = (hitKeys as string[]).includes("first_sale");

  return { stripe, alreadyHitMrr, alreadyHitFirstSale };
}

async function readStripeSnapshot(
  stripe: Stripe,
): Promise<{ mrrUsd: number; hasSuccessfulCharge: boolean }> {
  const subsPage = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"],
  });
  const subs: SubscriptionLike[] = subsPage.data.map((s) => ({
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
  }));
  const mrrUsd = computeMrrUsd(subs);

  const charges = await stripe.charges.list({ limit: 1 });
  const hasSuccessfulCharge = charges.data.some(
    (c) => c.status === "succeeded",
  );

  return { mrrUsd, hasSuccessfulCharge };
}

// Daily scan for one user. Fans in from the cron job (Unit 11).
export const scan = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      const state = await readState(ctx, userId);
      if (!state) return { skipped: "not_connected" };

      const { stripe, alreadyHitMrr, alreadyHitFirstSale } = state;
      const { mrrUsd, hasSuccessfulCharge } = await readStripeSnapshot(stripe);

      const newMrrThresholds = detectCrossedThresholds(mrrUsd, alreadyHitMrr);
      const fireFirstSale = shouldFireFirstSale({
        hasSuccessfulCharge,
        alreadyHitFirstSale,
      });

      for (const threshold of newMrrThresholds) {
        await fireDraft(ctx, userId, mrrMilestoneKey(threshold), {
          type: "mrr",
          threshold,
        });
      }
      if (fireFirstSale) {
        await fireDraft(ctx, userId, firstSaleMilestoneKey(), {
          type: "first_sale",
        });
      }

      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "stripe",
        ok: true,
      });
      return {
        ok: true,
        mrrUsd,
        fired: { mrr: newMrrThresholds, firstSale: fireFirstSale },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.integrationSecrets.recordScanResult, {
        userId,
        provider: "stripe",
        ok: false,
        error: msg.slice(0, 500),
      });
      console.error(`[sous-chef] Stripe scan failed for ${userId}:`, err);
      return { ok: false, error: msg };
    }
  },
});

// Seed on first connect: record every currently-crossed threshold as already-fired
// so users don't get flooded with "hit $100 MRR!" drafts for old state.
export const seedFromCurrentState = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const state = await readState(ctx, userId);
    if (!state) return { skipped: "not_connected" };
    const { stripe } = state;
    const { mrrUsd, hasSuccessfulCharge } = await readStripeSnapshot(stripe);

    const crossed = detectCrossedThresholds(mrrUsd, []);
    for (const threshold of crossed) {
      await ctx.runMutation(api.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "stripe",
        milestoneKey: mrrMilestoneKey(threshold),
      });
    }
    if (hasSuccessfulCharge) {
      await ctx.runMutation(api.milestoneHits.seedAlreadyHit, {
        userId,
        sourceSystem: "stripe",
        milestoneKey: firstSaleMilestoneKey(),
      });
    }
    return { seeded: { mrr: crossed, firstSale: hasSuccessfulCharge } };
  },
});

// Fan out: schedule a per-user scan for every enabled Stripe integration.
// Called by the cron job (Unit 11). Each per-user scan is isolated — one user's
// auth error does not poison sibling users' scans.
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
  milestoneKey: string,
  composeInput:
    | { type: "mrr"; threshold: number }
    | { type: "first_sale" },
): Promise<void> {
  const idempotencyKey = buildIdempotencyKey(userId, "stripe", milestoneKey);
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
  await ctx.runMutation(api.drafts.insertDraftIfNew, {
    userId,
    idempotencyKey,
    sourceSystem: "stripe",
    milestoneKey,
    name: copy.title,
    config: JSON.stringify(draftConfig),
    createdBy: "sous-chef",
  });
}
