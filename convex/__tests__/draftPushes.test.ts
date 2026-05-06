// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * Tests for convex/draftPushes.ts — approveDraft mutation.
 *
 * Uses convex-test to run mutations against an in-memory mock of the Convex
 * backend. The edge-runtime environment comment above is required by convex-test.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

// Provide the modules glob so convex-test can discover and load our functions.
const modules = import.meta.glob("../**/*.*s");

// ── Shared helpers ─────────────────────────────────────────────────────────────

const USER_ID = "user_test_001";
const DRAFT_ID = "drf_abc123";
const NONCE = "nonce-00000000-0000-0000-0000-000000000001";

function setupT() {
  const t = convexTest(schema, modules);
  return { t, asUser: t.withIdentity({ subject: USER_ID }) };
}

const BUFFER_EXTRA = JSON.stringify({
  orgId: "org1",
  orgName: "Acme",
  channels: [
    { id: "ch_buf_1", service: "twitter", displayName: "Acme on X" },
    { id: "ch_buf_2", service: "linkedin", displayName: "Acme LinkedIn" },
  ],
});

const POSTIZ_EXTRA = JSON.stringify({
  instanceUrl: "https://postiz.example.com",
  channels: [
    { id: "ch_ptz_1", identifier: "INSTAGRAM", name: "Acme IG" },
  ],
});

/** Insert a mock integrationSecrets row via t.run(). */
async function seedIntegration(
  t: ReturnType<typeof convexTest>,
  provider: "buffer" | "postiz",
  extra: string,
) {
  await t.run(async (ctx) => {
    const now = new Date().toISOString();
    await ctx.db.insert("integrationSecrets", {
      userId: USER_ID,
      provider,
      ciphertext: "fake",
      iv: "fake",
      tag: "fake",
      extra,
      enabled: true,
      created_at: now,
      updated_at: now,
    });
  });
}

// ── Test suites ────────────────────────────────────────────────────────────────

describe("approveDraft — happy path", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates N rows and schedules fanout when valid selections", async () => {
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);
    await seedIntegration(t, "postiz", POSTIZ_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "Big Launch",
      description: "We shipped something great",
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
        { format: "square", provider: "postiz", channelId: "ch_ptz_1" },
      ],
      postState: "queue",
      clientNonce: NONCE,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pushIds).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);

    // Verify rows were inserted.
    const rows = await asUser.query(api.draftPushes.listByDraft, {
      draftId: DRAFT_ID,
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.state === "pending")).toBe(true);
    expect(rows.every((r) => r.attempts === 0)).toBe(true);
    expect(rows.every((r) => r.title === "Big Launch")).toBe(true);
    expect(rows.every((r) => r.mediaUrl === "")).toBe(true);
  });
});

describe("approveDraft — edge cases", () => {
  it("returns nothing_selected when selections is empty", async () => {
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [],
      postState: "queue",
      clientNonce: NONCE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("nothing_selected");
  });

  it("returns no_providers_connected when no buffer/postiz integration exists", async () => {
    const { asUser } = setupT();
    // No integrations seeded.

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: NONCE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("no_providers_connected");
  });

  it("returns no_providers_connected when integrations exist but are all disabled", async () => {
    const { t, asUser } = setupT();

    await t.run(async (ctx) => {
      const now = new Date().toISOString();
      await ctx.db.insert("integrationSecrets", {
        userId: USER_ID,
        provider: "buffer",
        ciphertext: "fake",
        iv: "fake",
        tag: "fake",
        extra: BUFFER_EXTRA,
        enabled: false, // disabled
        created_at: now,
        updated_at: now,
      });
    });

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: NONCE,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("no_providers_connected");
  });

  it("skips stale channelId and returns it in skipped[]", async () => {
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        // Valid
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
        // Stale — this channel no longer exists in extra
        { format: "landscape", provider: "buffer", channelId: "ch_buf_GONE" },
      ],
      postState: "queue",
      clientNonce: NONCE,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pushIds).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].channelId).toBe("ch_buf_GONE");
    expect(result.skipped[0].reason).toBe("channel_not_found");
  });

  it("returns duplicate_approval for same nonce within 60s", async () => {
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const args = {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        { format: "square" as const, provider: "buffer" as const, channelId: "ch_buf_1" },
      ],
      postState: "queue" as const,
      clientNonce: NONCE,
    };

    // First call — should succeed
    const first = await asUser.mutation(api.draftPushes.approveDraft, args);
    expect(first.ok).toBe(true);

    // Second call with same nonce — should return duplicate_approval
    const second = await asUser.mutation(api.draftPushes.approveDraft, args);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBe("duplicate_approval");
  });
});

describe("approveDraft — video draft formats", () => {
  it("accepts video format strings without special handling", async () => {
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: "drf_video_001",
      title: "Video Launch",
      description: "Watch this",
      selections: [
        { format: "video-landscape", provider: "buffer", channelId: "ch_buf_2" },
        { format: "video-square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "draft",
      clientNonce: "nonce-video-0001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pushIds).toHaveLength(2);

    const rows = await asUser.query(api.draftPushes.listByDraft, {
      draftId: "drf_video_001",
    });
    expect(rows.map((r) => r.format)).toEqual(
      expect.arrayContaining(["video-landscape", "video-square"]),
    );
    expect(rows.every((r) => r.postState === "draft")).toBe(true);
  });
});

describe("approveDraft — fanout scheduling", () => {
  it("schedules the fanout action when at least one row is inserted", async () => {
    vi.useFakeTimers();
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-fanout-0001",
    });

    expect(result.ok).toBe(true);
    // Fanout is scheduled — finishAllScheduledFunctions verifies it can execute
    // the stub without throwing.
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });

  it("throws all_selections_skipped ConvexError when every selection is stale", async () => {
    vi.useFakeTimers();
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    let captured: unknown = null;
    try {
      await asUser.mutation(api.draftPushes.approveDraft, {
        draftId: DRAFT_ID,
        title: "T",
        description: "D",
        selections: [
          { format: "square", provider: "buffer", channelId: "ch_GONE_1" },
          { format: "landscape", provider: "buffer", channelId: "ch_GONE_2" },
        ],
        postState: "queue",
        clientNonce: "nonce-nofanout-0001",
      });
    } catch (err) {
      captured = err;
    }

    expect(captured).not.toBeNull();
    const data = (captured as { data?: { code?: string; skipped?: unknown[] } })
      .data;
    expect(data?.code).toBe("all_selections_skipped");
    expect(Array.isArray(data?.skipped)).toBe(true);
    expect(data?.skipped).toHaveLength(2);

    // No rows should have been inserted.
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows).toHaveLength(0);

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });
});

describe("approveDraft — copyByPlatform routing", () => {
  it("uses X copy for Buffer twitter channel and LinkedIn copy for Buffer linkedin channel", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "FALLBACK T",
      description: "FALLBACK D",
      copyByPlatform: {
        x: { title: "X title", description: "X desc" },
        linkedin: { title: "LI title", description: "LI desc" },
      },
      selections: [
        { format: "landscape", provider: "buffer", channelId: "ch_buf_1" },
        { format: "landscape", provider: "buffer", channelId: "ch_buf_2" },
      ],
      postState: "queue",
      clientNonce: "nonce-platform-0001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pushIds).toHaveLength(2);

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    const xRow = rows.find((r) => r.channelId === "ch_buf_1");
    const liRow = rows.find((r) => r.channelId === "ch_buf_2");
    expect(xRow?.title).toBe("X title");
    expect(xRow?.description).toBe("X desc");
    expect(liRow?.title).toBe("LI title");
    expect(liRow?.description).toBe("LI desc");
  });

  it("falls back to top-level title/description when channel platform is unmapped", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "postiz", POSTIZ_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "Generic T",
      description: "Generic D",
      copyByPlatform: {
        x: { title: "X title", description: "X desc" },
        linkedin: { title: "LI title", description: "LI desc" },
      },
      selections: [
        { format: "square", provider: "postiz", channelId: "ch_ptz_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-platform-0002",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("Generic T");
    expect(rows[0].description).toBe("Generic D");
  });

  it("uses Instagram copy for a Buffer instagram channel", async () => {
    const { t, asUser } = setupT();
    const BUFFER_IG_EXTRA = JSON.stringify({
      orgId: "org1",
      orgName: "Acme",
      channels: [
        { id: "ch_buf_ig", service: "instagram", displayName: "Acme on IG" },
      ],
    });
    await seedIntegration(t, "buffer", BUFFER_IG_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "FALLBACK T",
      description: "FALLBACK D",
      copyByPlatform: {
        instagram: { title: "IG title", description: "IG desc" },
      },
      selections: [
        { format: "portrait", provider: "buffer", channelId: "ch_buf_ig" },
      ],
      postState: "queue",
      clientNonce: "nonce-ig-0001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("IG title");
    expect(rows[0].description).toBe("IG desc");
  });

  it("uses Instagram copy for a Postiz instagram channel (case-insensitive identifier)", async () => {
    const { t, asUser } = setupT();
    // POSTIZ_EXTRA already has identifier: "INSTAGRAM" (uppercase).
    await seedIntegration(t, "postiz", POSTIZ_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "FALLBACK T",
      description: "FALLBACK D",
      copyByPlatform: {
        instagram: { title: "IG title", description: "IG desc" },
      },
      selections: [
        { format: "portrait", provider: "postiz", channelId: "ch_ptz_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-postiz-ig-0001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("IG title");
    expect(rows[0].description).toBe("IG desc");
  });

  it.each([
    { svc: "twitter", className: "x" as const },
    { svc: "x", className: "x" as const },
    { svc: "linkedin", className: "linkedin" as const },
    { svc: "instagram", className: "instagram" as const },
    { svc: "tiktok", className: "tiktok" as const },
    { svc: "threads", className: "threads" as const },
    { svc: "facebook", className: "facebook" as const },
    { svc: "youtube", className: "youtube" as const },
  ])(
    "routes Buffer service '$svc' to copyByPlatform.$className",
    async ({ svc, className }) => {
      const { t, asUser } = setupT();
      const extra = JSON.stringify({
        orgId: "org1",
        channels: [{ id: "ch_x", service: svc, displayName: `Acme on ${svc}` }],
      });
      await seedIntegration(t, "buffer", extra);

      await asUser.mutation(api.draftPushes.approveDraft, {
        draftId: DRAFT_ID,
        title: "FALLBACK T",
        description: "FALLBACK D",
        copyByPlatform: {
          [className]: { title: `${className} title`, description: `${className} desc` },
        },
        selections: [{ format: "square", provider: "buffer", channelId: "ch_x" }],
        postState: "queue",
        clientNonce: `nonce-buf-${svc}`,
      });

      const rows = await t.run(async (ctx) =>
        ctx.db
          .query("draftPushes")
          .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
          .collect(),
      );
      expect(rows[0].title).toBe(`${className} title`);
      expect(rows[0].description).toBe(`${className} desc`);
    },
  );

  it("falls back to top-level copy for an unmapped Buffer service (other bucket)", async () => {
    const { t, asUser } = setupT();
    const extra = JSON.stringify({
      orgId: "org1",
      channels: [
        { id: "ch_pin", service: "pinterest", displayName: "Acme Pinterest" },
      ],
    });
    await seedIntegration(t, "buffer", extra);

    await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "Top T",
      description: "Top D",
      copyByPlatform: {
        instagram: { title: "IG title", description: "IG desc" },
      },
      selections: [{ format: "square", provider: "buffer", channelId: "ch_pin" }],
      postState: "queue",
      clientNonce: "nonce-other-pin",
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("Top T");
    expect(rows[0].description).toBe("Top D");
  });

  it("prefers copyByChannel over copyByPlatform when both are present", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "TOP T",
      description: "TOP D",
      copyByPlatform: {
        x: { title: "X-class title", description: "X-class desc" },
      },
      copyByChannel: {
        "buffer::ch_buf_1": {
          title: "X-channel title",
          description: "X-channel desc",
        },
      },
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-channel-precedence",
    });

    expect(result.ok).toBe(true);
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("X-channel title");
    expect(rows[0].description).toBe("X-channel desc");
  });

  it("falls back to copyByPlatform when copyByChannel is missing for a channel", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "TOP T",
      description: "TOP D",
      copyByPlatform: {
        linkedin: { title: "LI-class title", description: "LI-class desc" },
      },
      copyByChannel: {
        // Only buf_1 has a per-channel entry; buf_2 falls through to platform.
        "buffer::ch_buf_1": {
          title: "X-channel title",
          description: "X-channel desc",
        },
      },
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_2" },
      ],
      postState: "queue",
      clientNonce: "nonce-channel-fallback-platform",
    });

    expect(result.ok).toBe(true);
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("LI-class title");
    expect(rows[0].description).toBe("LI-class desc");
  });

  it("falls back to top-level copy when neither copyByChannel nor copyByPlatform matches", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "TOP T",
      description: "TOP D",
      copyByChannel: {
        "buffer::ch_other": { title: "stale", description: "stale" },
      },
      selections: [
        { format: "square", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-channel-fallback-top",
    });

    expect(result.ok).toBe(true);
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("TOP T");
    expect(rows[0].description).toBe("TOP D");
  });

  it("uses top-level copy when copyByPlatform is omitted", async () => {
    const { t, asUser } = setupT();
    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "Plain T",
      description: "Plain D",
      selections: [
        { format: "landscape", provider: "buffer", channelId: "ch_buf_1" },
      ],
      postState: "queue",
      clientNonce: "nonce-platform-0003",
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("draftPushes")
        .withIndex("by_draftId", (q) => q.eq("draftId", DRAFT_ID))
        .collect(),
    );
    expect(rows[0].title).toBe("Plain T");
    expect(rows[0].description).toBe("Plain D");
  });
});
