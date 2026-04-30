// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_pref_001";

async function seedProfile(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfiles", {
      userId: USER_ID,
      email: "u@example.com",
      creditsRemaining: 30,
      plan: "trial",
    });
  });
}

describe("userProfiles disabledPlatforms", () => {
  it("returns [] when no profile exists", async () => {
    const t = convexTest(schema, modules);
    const out = await t.query(api.userProfiles.getDisabledPlatforms, {
      userId: "missing",
    });
    expect(out).toEqual([]);
  });

  it("returns [] when profile has no disabledPlatforms field", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t);
    const out = await t.query(api.userProfiles.getDisabledPlatforms, {
      userId: USER_ID,
    });
    expect(out).toEqual([]);
  });

  it("setDisabledPlatforms persists and dedupes valid values", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t);
    const saved = await t.mutation(api.userProfiles.setDisabledPlatforms, {
      userId: USER_ID,
      platforms: ["x", "x", "linkedin"],
    });
    expect(saved.sort()).toEqual(["linkedin", "x"]);

    const reread = await t.query(api.userProfiles.getDisabledPlatforms, {
      userId: USER_ID,
    });
    expect(reread.sort()).toEqual(["linkedin", "x"]);
  });

  it("setDisabledPlatforms drops unknown platform values", async () => {
    const t = convexTest(schema, modules);
    await seedProfile(t);
    const saved = await t.mutation(api.userProfiles.setDisabledPlatforms, {
      userId: USER_ID,
      platforms: ["x", "facebook", "tiktok"],
    });
    expect(saved).toEqual(["x"]);
  });

  it("setDisabledPlatforms throws when no profile exists", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.userProfiles.setDisabledPlatforms, {
        userId: "missing",
        platforms: ["x"],
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe("backfillToNewAccounting (S2.7)", () => {
  async function seed(
    t: ReturnType<typeof convexTest>,
    rows: Array<{
      userId: string;
      plan:
        | "trial"
        | "starter"
        | "pro"
        | "scale"
        | "free"
        | "toast"
        | "plate"
        | "buffet";
      postsRemainingThisMonth?: number;
      postsLifetime?: number;
    }>,
  ) {
    await t.run(async (ctx) => {
      for (const r of rows) {
        await ctx.db.insert("userProfiles", {
          userId: r.userId,
          email: `${r.userId}@example.com`,
          creditsRemaining: 100,
          plan: r.plan,
          ...(r.postsRemainingThisMonth !== undefined
            ? { postsRemainingThisMonth: r.postsRemainingThisMonth }
            : {}),
          ...(r.postsLifetime !== undefined
            ? { postsLifetime: r.postsLifetime }
            : {}),
        });
      }
    });
  }

  it("maps all 4 legacy tiers to new tiers", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [
      { userId: "u_trial", plan: "trial" },
      { userId: "u_starter", plan: "starter" },
      { userId: "u_pro", plan: "pro" },
      { userId: "u_scale", plan: "scale" },
    ]);

    const out = await t.mutation(internal.userProfiles.backfillToNewAccounting, {});
    expect(out.migrated).toBe(4);
    expect(out.skipped).toBe(0);
    expect(out.errors).toEqual([]);

    const trial = await t.query(api.userProfiles.getByUserId, { userId: "u_trial" });
    expect(trial?.plan).toBe("free");
    expect(trial?.postsLifetime).toBe(30);

    const starter = await t.query(api.userProfiles.getByUserId, { userId: "u_starter" });
    expect(starter?.plan).toBe("toast");
    expect(starter?.postsRemainingThisMonth).toBe(30);

    const pro = await t.query(api.userProfiles.getByUserId, { userId: "u_pro" });
    expect(pro?.plan).toBe("plate");
    expect(pro?.postsRemainingThisMonth).toBe(100);

    const scale = await t.query(api.userProfiles.getByUserId, { userId: "u_scale" });
    expect(scale?.plan).toBe("buffet");
    expect(scale?.postsRemainingThisMonth).toBe(500);

    // creditsRemaining preserved (R8)
    expect(starter?.creditsRemaining).toBe(100);
  });

  it("idempotent: 2nd run migrates 0 more", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ userId: "u_starter", plan: "starter" }]);
    await t.mutation(internal.userProfiles.backfillToNewAccounting, {});
    const second = await t.mutation(internal.userProfiles.backfillToNewAccounting, {});
    expect(second.migrated).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it("skips row that already has postsRemainingThisMonth", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [
      { userId: "u_already", plan: "starter", postsRemainingThisMonth: 5 },
    ]);
    const out = await t.mutation(internal.userProfiles.backfillToNewAccounting, {});
    expect(out.migrated).toBe(0);
    expect(out.skipped).toBe(1);
    const r = await t.query(api.userProfiles.getByUserId, { userId: "u_already" });
    expect(r?.plan).toBe("starter"); // unchanged
    expect(r?.postsRemainingThisMonth).toBe(5);
  });

  it("seeds counter for new-tier rows missing it", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ userId: "u_free", plan: "free" }]);
    const out = await t.mutation(internal.userProfiles.backfillToNewAccounting, {});
    expect(out.migrated).toBe(1);
    const r = await t.query(api.userProfiles.getByUserId, { userId: "u_free" });
    expect(r?.postsLifetime).toBe(30);
  });
});
