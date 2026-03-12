import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "checkout.session.completed": async (
      ctx,
      event: Stripe.CheckoutSessionCompletedEvent,
    ) => {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) return;

      // Subscription is created — handled by customer.subscription.created
    },

    "customer.subscription.created": async (
      ctx,
      event: Stripe.CustomerSubscriptionCreatedEvent,
    ) => {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      const priceId = sub.items.data[0]?.price?.id;
      if (!userId || !priceId) return;

      await ctx.runMutation(internal.stripe.handleSubscriptionChange, {
        userId,
        priceId,
        status: sub.status,
      });
    },

    "customer.subscription.updated": async (
      ctx,
      event: Stripe.CustomerSubscriptionUpdatedEvent,
    ) => {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      const priceId = sub.items.data[0]?.price?.id;
      if (!userId || !priceId) return;

      await ctx.runMutation(internal.stripe.handleSubscriptionChange, {
        userId,
        priceId,
        status: sub.status,
      });
    },

    "customer.subscription.deleted": async (
      ctx,
      event: Stripe.CustomerSubscriptionDeletedEvent,
    ) => {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) return;

      await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, {
        userId,
      });
    },

    "invoice.paid": async (ctx, event: Stripe.InvoicePaidEvent) => {
      const invoice = event.data.object;
      const userId =
        invoice.parent?.subscription_details?.metadata?.userId;
      const priceDetails =
        invoice.lines.data[0]?.pricing?.price_details;
      const priceId =
        typeof priceDetails?.price === "string"
          ? priceDetails.price
          : priceDetails?.price?.id;
      if (!userId || !priceId) return;

      // Skip the first invoice (handled by subscription.created)
      if (invoice.billing_reason === "subscription_create") return;

      await ctx.runMutation(internal.stripe.handleInvoicePaid, {
        userId,
        priceId,
      });
    },
  },
});

export default http;
