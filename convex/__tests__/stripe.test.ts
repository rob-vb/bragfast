// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_stripe_001";

beforeEach(() => {
  process.env.STRIPE_PLATE_PRICE_ID = "price_plate_single";
  process.env.SITE_URL = "https://brag.fast";
});

async function seedTrial(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfiles", {
      userId: USER_ID,
      email: "u@example.com",
      plan: "trial",
    });
  });
}

async function readProfile(t: ReturnType<typeof convexTest>) {
  return t.query(api.userProfiles.getByUserId, { userId: USER_ID });
}

describe("handleSubscriptionChange — single-plan model", () => {
  it("STRIPE_PLATE_PRICE_ID active → plan=plate, no creditsRemaining", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_plate_single",
      status: "active",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("plate");
    // creditsRemaining should NOT be set (no credit model)
    expect(p?.creditsRemaining).toBeUndefined();
  });

  it("trialing status → plan=plate", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_plate_single",
      status: "trialing",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("plate");
  });

  it("non-active status is ignored", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_plate_single",
      status: "past_due",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("trial");
  });

  it("unknown price ID is ignored", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionChange, {
      userId: USER_ID,
      priceId: "price_unknown_zzz",
      status: "active",
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("trial");
  });
});

describe("handleSubscriptionDeleted", () => {
  it("plate subscriber → free, no creditsRemaining", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: USER_ID,
        email: "u@example.com",
        plan: "plate",
      });
    });
    await t.mutation(internal.stripe.handleSubscriptionDeleted, {
      userId: USER_ID,
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("free");
    expect(p?.creditsRemaining).toBeUndefined();
  });

  it("trial subscriber deleted → free", async () => {
    const t = convexTest(schema, modules);
    await seedTrial(t);
    await t.mutation(internal.stripe.handleSubscriptionDeleted, {
      userId: USER_ID,
    });
    const p = await readProfile(t);
    expect(p?.plan).toBe("free");
  });
});

describe("planMigration.migratePlanLiterals", () => {
  it("migrates old paid plan literals to plate", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", { userId: "u1", email: "a@x.com", plan: "plate" });
      await ctx.db.insert("userProfiles", { userId: "u2", email: "b@x.com", plan: "trial" });
      await ctx.db.insert("userProfiles", { userId: "u3", email: "c@x.com", plan: "free" });
    });
    const result = await t.mutation(internal.planMigration.migratePlanLiterals, {});
    expect(result.migrated).toBe(0); // all already valid
    const u1 = await t.query(api.userProfiles.getByUserId, { userId: "u1" });
    const u2 = await t.query(api.userProfiles.getByUserId, { userId: "u2" });
    const u3 = await t.query(api.userProfiles.getByUserId, { userId: "u3" });
    expect(u1?.plan).toBe("plate");
    expect(u2?.plan).toBe("trial");
    expect(u3?.plan).toBe("free");
  });
});
