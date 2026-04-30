// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_stripe_001";

beforeEach(() => {
  process.env.STRIPE_STARTER_PRICE_ID = "price_legacy_starter";
  process.env.STRIPE_PRO_PRICE_ID = "price_legacy_pro";
  process.env.STRIPE_SCALE_PRICE_ID = "price_legacy_scale";
  process.env.STRIPE_TOAST_PRICE_ID = "price_new_toast";
  process.env.STRIPE_PLATE_PRICE_ID = "price_new_plate";
  process.env.STRIPE_BUFFET_PRICE_ID = "price_new_buffet";
});

async function seedTrial(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfiles", {
      userId: USER_ID,
      email: "u@example.com",
      creditsRemaining: 30,
      plan: "trial",
    });
  });
}

async function readProfile(t: ReturnType<typeof convexTest>) {
  return t.query(api.userProfiles.getByUserId, { userId: USER_ID });
}

describe("handleInvoicePaid — new tiers", () => {
  it("Toast → plan=toast, postsRemainingThisMonth=30", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_new_toast",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("toast");
    expect(p?.postsRemainingThisMonth).toBe(30);
  });

  it("Plate → 100 posts", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_new_plate",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("plate");
    expect(p?.postsRemainingThisMonth).toBe(100);
  });

  it("Buffet → 500 posts", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_new_buffet",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("buffet");
    expect(p?.postsRemainingThisMonth).toBe(500);
  });

  it("downgrade Buffet→Toast resets to 30, no rollover", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_new_buffet",
    });
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_new_toast",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("toast");
    expect(p?.postsRemainingThisMonth).toBe(30);
  });
});

describe("handleInvoicePaid — legacy tiers (R4)", () => {
  it("Starter → creditsRemaining=200, posts untouched", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_legacy_starter",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("starter");
    expect(p?.creditsRemaining).toBe(200);
    expect(p?.postsRemainingThisMonth).toBeUndefined();
  });

  it("unknown price → no patch", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleInvoicePaid, {
      userId: USER_ID,
      priceId: "price_unknown_zzz",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("trial");
    expect(p?.creditsRemaining).toBe(30);
  });
});

describe("handleSubscriptionChange", () => {
  it("Toast active → plan=toast, posts=30", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_new_toast",
      status: "active",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("toast");
    expect(p?.postsRemainingThisMonth).toBe(30);
  });

  it("non-active status is ignored", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_new_toast",
      status: "past_due",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("trial");
  });
});

describe("handleSubscriptionDeleted", () => {
  it("new-tier subscriber → free + posts=0", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: USER_ID,
        email: "u@example.com",
        creditsRemaining: 0,
        plan: "buffet",
        postsRemainingThisMonth: 250,
      });
    });
    await t.mutation(internal.stripe.handleSubscriptionDeleted, {
      userId: USER_ID,
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("free");
    expect(p?.postsRemainingThisMonth).toBe(0);
  });

  it("legacy subscriber → trial + credits=0", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: USER_ID,
        email: "u@example.com",
        creditsRemaining: 100,
        plan: "starter",
      });
    });
    await t.mutation(internal.stripe.handleSubscriptionDeleted, {
      userId: USER_ID,
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("trial");
    expect(p?.creditsRemaining).toBe(0);
  });
});
