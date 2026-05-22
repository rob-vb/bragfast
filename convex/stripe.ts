import { action, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

const stripeClient = new StripeSubscriptions(components.stripe, {});

// --- Actions (called from server actions) ---

export const createCheckoutSession = action({
  args: { userId: v.string(), email: v.string(), planId: v.string() },
  handler: async (ctx, { userId, email, planId }) => {
    if (planId !== "plate") throw new Error(`Unknown plan: ${planId}`);

    const priceId = process.env.STRIPE_PLATE_PRICE_ID;
    if (!priceId) throw new Error("STRIPE_PLATE_PRICE_ID not configured");

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
    if (status !== "active" && status !== "trialing") return;

    // Only handle the single configured price ID.
    const configuredPriceId = process.env.STRIPE_PLATE_PRICE_ID;
    if (!configuredPriceId || priceId !== configuredPriceId) return;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;

    await ctx.db.patch(profile._id, { plan: "plate" });
  },
});

// No-op: invoice renewal has no credit reset in the single-plan model.
export const handleInvoicePaid = internalMutation({
  args: { userId: v.string(), priceId: v.string() },
  handler: async (_ctx, _args) => {
    // Single-plan model has no credits to reset on renewal. No-op.
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

    await ctx.db.patch(profile._id, { plan: "free" });
  },
});
