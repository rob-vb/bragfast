// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_pref_001";

async function seedProfile(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfiles", {
      userId: USER_ID,
      email: "u@example.com",
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

describe("userProfiles create — trialEnd", () => {
  it("create mutation sets trialEnd approximately 14 days from now", async () => {
    const t = convexTest(schema, modules);
    const expectedTrialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
    await t.mutation(api.userProfiles.create, {
      userId: "user_trial_001",
      email: "trial@example.com",
    });
    const profile = await t.query(api.userProfiles.getByUserId, {
      userId: "user_trial_001",
    });
    expect(
      Math.abs((profile?.trialEnd ?? 0) - expectedTrialEnd),
    ).toBeLessThan(5000);
  });

});
