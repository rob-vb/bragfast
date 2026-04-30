// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * S2.7: tier-cap gating in approveDraft.
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

const USER_ID = "user_tier_001";
const DRAFT_ID = "drf_tier_001";

function setupT() {
  const t = convexTest(schema, modules);
  return { t, asUser: t.withIdentity({ subject: USER_ID }) };
}

const BUFFER_EXTRA = JSON.stringify({
  orgId: "org1",
  channels: [
    { id: "ch_buf_x", service: "twitter", displayName: "X" },
    { id: "ch_buf_li", service: "linkedin", displayName: "LinkedIn" },
    { id: "ch_buf_3", service: "twitter", displayName: "X 2" },
    { id: "ch_buf_4", service: "linkedin", displayName: "LI 2" },
  ],
});

async function seedBuffer(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = new Date().toISOString();
    await ctx.db.insert("integrationSecrets", {
      userId: USER_ID,
      provider: "buffer",
      ciphertext: "x",
      iv: "x",
      tag: "x",
      extra: BUFFER_EXTRA,
      enabled: true,
      created_at: now,
      updated_at: now,
    });
  });
}

async function seedProfile(
  t: ReturnType<typeof convexTest>,
  plan:
    | "trial"
    | "starter"
    | "free"
    | "toast"
    | "plate"
    | "buffet",
  fields: { postsRemainingThisMonth?: number; postsLifetime?: number } = {},
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfiles", {
      userId: USER_ID,
      email: "u@example.com",
      creditsRemaining: 0,
      plan,
      ...fields,
    });
  });
}

async function readProfile(t: ReturnType<typeof convexTest>) {
  return t.query(api.userProfiles.getByUserId, { userId: USER_ID });
}

const baseArgs = (
  selections: Array<{
    format:
      | "square"
      | "landscape"
      | "portrait"
      | "video-square"
      | "video-landscape"
      | "video-portrait";
    provider: "buffer" | "postiz";
    channelId: string;
  }>,
  nonce = "n-1",
) => ({
  draftId: DRAFT_ID,
  title: "t",
  description: "d",
  selections,
  postState: "queue" as const,
  clientNonce: nonce,
});

describe("S2.7 approveDraft tier gating — happy paths", () => {
  it("Toast user approves square draft → success, decrements postsRemainingThisMonth", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast", { postsRemainingThisMonth: 30 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(true);
    const p = await readProfile(t);
    expect(p?.postsRemainingThisMonth).toBe(29);
  });

  it("Plate user approves square+landscape to 1 channel → success", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "plate", { postsRemainingThisMonth: 100 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
        { format: "landscape", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(true);
    const p = await readProfile(t);
    expect(p?.postsRemainingThisMonth).toBe(99);
  });

  it("Buffet user approves video-square → success", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "buffet", { postsRemainingThisMonth: 500 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "video-square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(true);
    const p = await readProfile(t);
    expect(p?.postsRemainingThisMonth).toBe(499);
  });

  it("Free user approves square draft → success, decrements postsLifetime", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "free", { postsLifetime: 30 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(true);
    const p = await readProfile(t);
    expect(p?.postsLifetime).toBe(29);
  });
});

describe("S2.7 approveDraft tier gating — rejections", () => {
  it("Toast user posting portrait → format_blocked, upgrade=plate", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast", { postsRemainingThisMonth: 30 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "portrait", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("format_blocked");
      expect(result.upgradeTier).toBe("plate");
    }
    const p = await readProfile(t);
    expect(p?.postsRemainingThisMonth).toBe(30); // not decremented
  });

  it("Toast user posting video → video_blocked, upgrade=buffet", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast", { postsRemainingThisMonth: 30 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "video-square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("video_blocked");
      expect(result.upgradeTier).toBe("buffet");
    }
  });

  it("Toast user picking 2 channels → platform_blocked, upgrade=plate", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast", { postsRemainingThisMonth: 30 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
        { format: "square", provider: "buffer", channelId: "ch_buf_li" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("platform_blocked");
      expect(result.upgradeTier).toBe("plate");
    }
  });

  it("Toast user with 0 posts → posts_exhausted, upgrade=plate", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast", { postsRemainingThisMonth: 0 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("posts_exhausted");
      expect(result.upgradeTier).toBe("plate");
    }
  });

  it("Free user with 0 lifetime → posts_exhausted, upgrade=toast", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "free", { postsLifetime: 0 });

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("posts_exhausted");
      expect(result.upgradeTier).toBe("toast");
    }
  });

  it("Toast user with no counter set → posts_pending", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "toast"); // no postsRemainingThisMonth

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("posts_pending");
  });
});

describe("S2.7 approveDraft tier gating — legacy bypass (R9)", () => {
  it("starter (legacy) user posting any format → bypasses cap, no decrement", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "starter");

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "portrait", provider: "buffer", channelId: "ch_buf_x" },
        { format: "video-landscape", provider: "buffer", channelId: "ch_buf_li" },
      ]),
    );

    expect(result.ok).toBe(true);
    const p = await readProfile(t);
    expect(p?.postsRemainingThisMonth).toBeUndefined();
    expect(p?.postsLifetime).toBeUndefined();
  });

  it("trial (legacy) user → bypasses cap", async () => {
    const { t, asUser } = setupT();
    await seedBuffer(t);
    await seedProfile(t, "trial");

    const result = await asUser.mutation(
      api.draftPushes.approveDraft,
      baseArgs([
        { format: "video-square", provider: "buffer", channelId: "ch_buf_x" },
      ]),
    );
    expect(result.ok).toBe(true);
  });
});
