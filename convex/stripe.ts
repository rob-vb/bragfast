import { action, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

const stripeClient = new StripeSubscriptions(components.stripe, {});

// Map env var price IDs to plan IDs
function priceToPlan(priceId: string): "starter" | "pro" | "scale" | null {
  const map: Record<string, "starter" | "pro" | "scale"> = {
    [process.env.STRIPE_STARTER_PRICE_ID!]: "starter",
    [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
    [process.env.STRIPE_SCALE_PRICE_ID!]: "scale",
  };
  return map[priceId] ?? null;
}

const PLAN_CREDITS: Record<string, number> = {
  starter: 200,
  pro: 800,
  scale: 2_500,
};

// --- Actions (called from server actions) ---

export const createCheckoutSession = action({
  args: { userId: v.string(), email: v.string(), planId: v.string() },
  handler: async (ctx, { userId, email, planId }) => {
    const priceEnvMap: Record<string, string | undefined> = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      scale: process.env.STRIPE_SCALE_PRICE_ID,
    };
    const priceId = priceEnvMap[planId];
    if (!priceId) throw new Error(`No price ID configured for plan: ${planId}`);

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId,
      email,
    });

    const siteUrl = process.env.SITE_URL!;
    const session = await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${siteUrl}/admin/account/upgrade/success`,
      cancelUrl: `${siteUrl}/admin/account/upgrade/cancel`,
      subscriptionMetadata: { userId },
    });

    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId },
    );

    if (subscriptions.length === 0) return { url: null };

    const portal = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: subscriptions[0].stripeCustomerId,
      returnUrl: `${process.env.SITE_URL!}/admin/account`,
    });

    return { url: portal.url };
  },
});

export const cancelAllSubscriptions = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId },
    );

    for (const sub of subscriptions) {
      if (sub.status === "active" || sub.status === "trialing") {
        await stripeClient.cancelSubscription(ctx, {
          stripeSubscriptionId: sub.stripeSubscriptionId,
          cancelAtPeriodEnd: false, // immediate on account delete
        });
      }
    }
  },
});

// --- Internal mutations (called from webhook handlers) ---

export const handleSubscriptionChange = internalMutation({
  args: {
    userId: v.string(),
    priceId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { userId, priceId, status }) => {
    const planId = priceToPlan(priceId);
    if (!planId) return;
    if (status !== "active" && status !== "trialing") return;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;

    const isFirstSubscription = profile.plan === "trial";
    const newCredits = PLAN_CREDITS[planId];

    await ctx.db.patch(profile._id, {
      plan: planId,
      creditsRemaining: isFirstSubscription
        ? profile.creditsRemaining + newCredits // trial→paid: add on top
        : newCredits, // plan change: set to new amount
    });
  },
});

export const handleInvoicePaid = internalMutation({
  args: { userId: v.string(), priceId: v.string() },
  handler: async (ctx, { userId, priceId }) => {
    const planId = priceToPlan(priceId);
    if (!planId) return;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;

    // Monthly reset — no rollover
    await ctx.db.patch(profile._id, {
      plan: planId,
      creditsRemaining: PLAN_CREDITS[planId],
    });
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;

    await ctx.db.patch(profile._id, {
      plan: "trial",
      creditsRemaining: 0,
    });
  },
});
