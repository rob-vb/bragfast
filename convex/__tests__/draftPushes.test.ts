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

  it("does not schedule fanout when all selections are skipped", async () => {
    vi.useFakeTimers();
    const { t, asUser } = setupT();

    await seedIntegration(t, "buffer", BUFFER_EXTRA);

    const result = await asUser.mutation(api.draftPushes.approveDraft, {
      draftId: DRAFT_ID,
      title: "T",
      description: "D",
      selections: [
        // Both channels are stale
        { format: "square", provider: "buffer", channelId: "ch_GONE_1" },
        { format: "landscape", provider: "buffer", channelId: "ch_GONE_2" },
      ],
      postState: "queue",
      clientNonce: "nonce-nofanout-0001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pushIds).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);

    // No scheduled functions — finishAllScheduledFunctions should complete immediately.
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.useRealTimers();
  });
});
