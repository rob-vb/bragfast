// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * Tests for convex/pushFanout.ts — internalAction run().
 *
 * Strategy: mock dispatchPush at the module level so we can control
 * success/failure without real HTTP calls. convex-test runs the Convex
 * action handler against an in-memory backend.
 *
 * Note: pushFanout uses "use node" and imports Node modules (crypto via secret-box).
 * convex-test runs in edge-runtime, so we mock the Node-only modules.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// Provide modules glob for convex-test
const modules = import.meta.glob("../**/*.*s");

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock secret-box (Node crypto) — open() returns ciphertext as plaintext
vi.mock("../../src/lib/crypto/secret-box", () => ({
  open: (sealed: { ciphertext: string }) => sealed.ciphertext,
  seal: (pt: string) => ({ ciphertext: pt, iv: "iv", tag: "tag" }),
}));

// Mock the push dispatcher — controlled per test
vi.mock("../../src/lib/integrations/push", () => ({
  dispatchPush: vi.fn(),
}));

// Mock Buffer oauth (refresh path — most tests won't reach it)
vi.mock("../../src/lib/integrations/buffer/oauth", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("../../src/lib/integrations/buffer/oauth")>();
  return {
    ...orig,
    refreshBufferToken: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { dispatchPush } from "../../src/lib/integrations/push";
import { PushError } from "../../src/lib/integrations/error-classes";

const mockDispatch = vi.mocked(dispatchPush);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const USER_ID = "user_fanout_001";
const DRAFT_ID = "drf_fanout_001";

type DraftPushDoc = {
  _id: Id<"draftPushes">;
  _creationTime: number;
  draftId: string;
  userId: string;
  format: string;
  provider: "buffer" | "postiz";
  channelId: string;
  channelLabel?: string;
  state: "pending" | "in_flight" | "queued" | "drafted" | "failed";
  postState: "queue" | "draft";
  providerPostId?: string;
  errorClass?: string;
  errorMessage?: string;
  mediaUrl: string;
  title: string;
  description: string;
  attempts: number;
  lastAttemptAt?: number;
  clientNonce?: string;
  created_at: string;
  updated_at: string;
};

type IntegrationDoc = {
  _id: Id<"integrationSecrets">;
  _creationTime: number;
  enabled: boolean;
  [key: string]: unknown;
};

/** Insert an integrationSecrets row with a sealed payload that open() can decode. */
async function seedIntegration(
  t: ReturnType<typeof convexTest>,
  provider: "buffer" | "postiz",
  extra?: string,
) {
  await t.run(async (ctx) => {
    const now = new Date().toISOString();
    // Ciphertext IS the plaintext under the test mock of open()
    const tokenPayload =
      provider === "buffer"
        ? JSON.stringify({
            accessToken: "buf_access",
            refreshToken: "buf_refresh",
            expiresAt: Date.now() + 3_600_000, // valid for 1h
          })
        : JSON.stringify({ apiKey: "ptz_api_key" });

    await ctx.db.insert("integrationSecrets", {
      userId: USER_ID,
      provider,
      ciphertext: tokenPayload,
      iv: "fake-iv",
      tag: "fake-tag",
      extra:
        extra ??
        (provider === "postiz"
          ? JSON.stringify({ instanceUrl: "https://postiz.example.com" })
          : undefined),
      enabled: true,
      created_at: now,
      updated_at: now,
    });
  });
}

/** Insert a draftPushes row directly. Returns the Convex Id. */
async function seedPushRow(
  t: ReturnType<typeof convexTest>,
  overrides: {
    provider?: "buffer" | "postiz";
    state?: "pending" | "in_flight" | "queued" | "drafted" | "failed";
    mediaUrl?: string;
    attempts?: number;
  } = {},
): Promise<Id<"draftPushes">> {
  return t.run(async (ctx) => {
    const now = new Date().toISOString();
    return ctx.db.insert("draftPushes", {
      draftId: DRAFT_ID,
      userId: USER_ID,
      format: "square",
      provider: overrides.provider ?? "buffer",
      channelId: "ch_1",
      channelLabel: "Test Channel",
      state: overrides.state ?? "pending",
      postState: "queue",
      mediaUrl: overrides.mediaUrl ?? "https://r2.example.com/image.jpg",
      title: "Test Title",
      description: "Test description",
      attempts: overrides.attempts ?? 0,
      clientNonce: `nonce-${Date.now()}-${Math.random()}`,
      created_at: now,
      updated_at: now,
    });
  });
}

/** Read a draftPushes row by its Convex Id. */
async function getRow(
  t: ReturnType<typeof convexTest>,
  id: Id<"draftPushes">,
): Promise<DraftPushDoc | null> {
  return t.run(async (ctx) => ctx.db.get(id) as Promise<DraftPushDoc | null>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pushFanout.run — happy path", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("claims pending row, dispatches, and finalizes as queued", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    const rowId = await seedPushRow(t);

    mockDispatch.mockResolvedValueOnce({ providerPostId: "buf_123" });

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("queued");
    expect(row?.providerPostId).toBe("buf_123");
    expect(row?.attempts).toBe(1);
  });

  it("finalizes as drafted when postState=draft", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "postiz");

    const rowId = await t.run(async (ctx): Promise<Id<"draftPushes">> => {
      const now = new Date().toISOString();
      return ctx.db.insert("draftPushes", {
        draftId: DRAFT_ID,
        userId: USER_ID,
        format: "square",
        provider: "postiz",
        channelId: "ch_ptz_1",
        channelLabel: "Postiz Channel",
        state: "pending",
        postState: "draft",
        mediaUrl: "https://r2.example.com/image.jpg",
        title: "T",
        description: "D",
        attempts: 0,
        clientNonce: "nonce-draft-001",
        created_at: now,
        updated_at: now,
      });
    });

    mockDispatch.mockResolvedValueOnce({ providerPostId: "ptz_456" });

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("drafted");
    expect(row?.providerPostId).toBe("ptz_456");
  });
});

describe("pushFanout.run — race condition (claim)", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("skips rows already in_flight from concurrent invocation", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    // Seed row already in_flight (simulates concurrent claim)
    const rowId = await seedPushRow(t, { state: "in_flight" });

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    // Should remain in_flight — fanout didn't claim it (getPendingForDraft only returns pending)
    expect(row?.state).toBe("in_flight");
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe("pushFanout.run — retry (transient)", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("transient failure: scheduleRetry (state=pending) and re-schedules action", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    const rowId = await seedPushRow(t, { attempts: 0 });

    mockDispatch.mockRejectedValueOnce(new PushError("transient", "network error"));

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    // After transient failure with 0 previous attempts → reset to pending, attempts=1
    expect(row?.state).toBe("pending");
    expect(row?.attempts).toBe(1);
    expect(row?.errorClass).toBe("transient");
    expect(row?.errorMessage).toContain("network error");
  });

  it("exhausted retries (attempts=2): transient failure → state=failed", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    const rowId = await seedPushRow(t, { attempts: 2 }); // already at limit

    mockDispatch.mockRejectedValueOnce(new PushError("transient", "still failing"));

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("failed");
    expect(row?.attempts).toBe(3);
    expect(row?.errorClass).toBe("transient");
  });
});

describe("pushFanout.run — auth failure", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("auth failure → state=failed, no retry, integration disabled", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    const rowId = await seedPushRow(t);

    mockDispatch.mockRejectedValueOnce(new PushError("auth", "token revoked"));

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("failed");
    expect(row?.errorClass).toBe("auth");

    // Integration should be disabled
    const integration = await t.run(async (ctx) => {
      const r = await ctx.db
        .query("integrationSecrets")
        .withIndex("by_userId_provider", (q) =>
          q.eq("userId", USER_ID).eq("provider", "buffer"),
        )
        .first();
      return r as IntegrationDoc | null;
    });
    expect(integration?.enabled).toBe(false);
  });
});

describe("pushFanout.run — mediaUrl missing", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("empty mediaUrl → state=failed with errorClass=media", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    const rowId = await seedPushRow(t, { mediaUrl: "" });

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("failed");
    expect(row?.errorClass).toBe("media");
    expect(row?.errorMessage).toContain("not yet rendered");
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe("pushFanout.run — disconnected integration", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("no integration row → state=failed with errorClass=auth", async () => {
    const t = convexTest(schema, modules);
    // No integration seeded
    const rowId = await seedPushRow(t);

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const row = await getRow(t, rowId);
    expect(row?.state).toBe("failed");
    expect(row?.errorClass).toBe("auth");
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe("pushFanout.run — mixed rows", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.resetAllMocks());

  it("3 rows: one succeeds, one auth-fails, one retries", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, "buffer");
    await seedIntegration(t, "postiz");

    // Row 1: buffer, will succeed
    const row1Id = await seedPushRow(t, { provider: "buffer" });
    // Row 2: postiz, will auth-fail
    const row2Id = await seedPushRow(t, { provider: "postiz" });
    // Row 3: buffer, will transient-fail (first attempt)
    const row3Id = await seedPushRow(t, { provider: "buffer", attempts: 0 });

    mockDispatch
      .mockResolvedValueOnce({ providerPostId: "buf_ok" })
      .mockRejectedValueOnce(new PushError("auth", "postiz key invalid"))
      .mockRejectedValueOnce(new PushError("transient", "timeout"));

    await t.action(internal.pushFanout.run, { draftId: DRAFT_ID, userId: USER_ID });

    const [r1, r2, r3] = await t.run(async (ctx) =>
      Promise.all([
        ctx.db.get(row1Id) as Promise<DraftPushDoc | null>,
        ctx.db.get(row2Id) as Promise<DraftPushDoc | null>,
        ctx.db.get(row3Id) as Promise<DraftPushDoc | null>,
      ]),
    );

    expect(r1?.state).toBe("queued");
    expect(r2?.state).toBe("failed");
    expect(r2?.errorClass).toBe("auth");
    expect(r3?.state).toBe("pending"); // reset for retry
    expect(r3?.attempts).toBe(1);
  });
});
