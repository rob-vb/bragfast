// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * Tests for the disconnect → routingDefaults cascade (U10).
 *
 * Covers:
 *  - Happy path: disconnect Buffer clears Buffer routing entries, Postiz untouched.
 *  - Edge: routing row becomes empty after disconnect → row deleted entirely.
 *  - Edge: disconnect when no routing entries exist → no-op, no error.
 *  - Integration: refresh-channels prune (pruneMissingChannels) removes stale
 *    entries while keeping entries for still-present channels.
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.*s");

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const USER_ID = "user_cascade_001";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

/** Insert an integrationSecrets row directly via ctx.db. */
async function seedIntegration(
  t: ReturnType<typeof convexTest>,
  userId: string,
  provider: "buffer" | "postiz",
) {
  await t.run(async (ctx) => {
    const now = new Date().toISOString();
    await ctx.db.insert("integrationSecrets", {
      userId,
      provider,
      ciphertext: "fake",
      iv: "fake",
      tag: "fake",
      extra: JSON.stringify({ channels: [] }),
      enabled: true,
      created_at: now,
      updated_at: now,
    });
  });
}

/** Insert a routingDefaults row directly via ctx.db. */
async function seedRoutingRow(
  t: ReturnType<typeof convexTest>,
  userId: string,
  format: "square" | "landscape" | "portrait",
  channels: Array<{ provider: "buffer" | "postiz"; channelId: string }>,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("routingDefaults", {
      userId,
      format,
      channels,
      updated_at: new Date().toISOString(),
    });
  });
}

/** Return all routingDefaults rows for a user. */
async function fetchRoutingRows(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run(async (ctx) =>
    ctx.db
      .query("routingDefaults")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect(),
  );
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("disconnect cascade — happy path", () => {
  it("disconnecting Buffer clears Buffer routing entries; Postiz entries survive", async () => {
    const t = convexTest(schema, modules);

    // Connect both providers.
    await seedIntegration(t, USER_ID, "buffer");
    await seedIntegration(t, USER_ID, "postiz");

    // Set up routing defaults that reference both providers.
    await seedRoutingRow(t, USER_ID, "square", [
      { provider: "buffer", channelId: "buf_ch_1" },
      { provider: "postiz", channelId: "ptz_ch_1" },
    ]);
    await seedRoutingRow(t, USER_ID, "landscape", [
      { provider: "buffer", channelId: "buf_ch_2" },
    ]);
    await seedRoutingRow(t, USER_ID, "portrait", [
      { provider: "postiz", channelId: "ptz_ch_2" },
    ]);

    // Disconnect Buffer.
    const result = await t.mutation(internal.integrationSecrets.disconnect, {
      userId: USER_ID,
      provider: "buffer",
    });
    expect(result).toBe(true);

    // Buffer integrationSecrets row should be gone.
    const bufferSecret = await t.run(async (ctx) =>
      ctx.db
        .query("integrationSecrets")
        .withIndex("by_userId_provider", (q) =>
          q.eq("userId", USER_ID).eq("provider", "buffer"),
        )
        .first(),
    );
    expect(bufferSecret).toBeNull();

    // Postiz integration should still be present.
    const postizRow = await t.run(async (ctx) =>
      ctx.db
        .query("integrationSecrets")
        .withIndex("by_userId_provider", (q) =>
          q.eq("userId", USER_ID).eq("provider", "postiz"),
        )
        .first(),
    );
    expect(postizRow).not.toBeNull();

    const routing = await fetchRoutingRows(t, USER_ID);

    // "landscape" row had only Buffer entries → should be deleted.
    const landscape = routing.find((r) => r.format === "landscape");
    expect(landscape).toBeUndefined();

    // "square" row had both Buffer + Postiz → Buffer entry removed, Postiz kept.
    const square = routing.find((r) => r.format === "square");
    expect(square).toBeDefined();
    expect(square!.channels).toHaveLength(1);
    expect(square!.channels[0]).toEqual({ provider: "postiz", channelId: "ptz_ch_1" });

    // "portrait" row was Postiz-only → untouched.
    const portrait = routing.find((r) => r.format === "portrait");
    expect(portrait).toBeDefined();
    expect(portrait!.channels).toHaveLength(1);
    expect(portrait!.channels[0]).toEqual({ provider: "postiz", channelId: "ptz_ch_2" });
  });
});

// ---------------------------------------------------------------------------
// Edge: row becomes empty → deleted
// ---------------------------------------------------------------------------

describe("disconnect cascade — empty row deletion", () => {
  it("deletes a routing row that has only Buffer channels after disconnect", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, USER_ID, "buffer");

    // One row that only references Buffer.
    await seedRoutingRow(t, USER_ID, "square", [
      { provider: "buffer", channelId: "buf_ch_only" },
    ]);

    await t.mutation(internal.integrationSecrets.disconnect, {
      userId: USER_ID,
      provider: "buffer",
    });

    const routing = await fetchRoutingRows(t, USER_ID);
    expect(routing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge: no routing entries → no-op
// ---------------------------------------------------------------------------

describe("disconnect cascade — no routing entries", () => {
  it("disconnects cleanly when no routingDefaults exist for the user", async () => {
    const t = convexTest(schema, modules);

    await seedIntegration(t, USER_ID, "buffer");

    // No routing rows seeded.
    const result = await t.mutation(internal.integrationSecrets.disconnect, {
      userId: USER_ID,
      provider: "buffer",
    });

    expect(result).toBe(true);

    const routing = await fetchRoutingRows(t, USER_ID);
    expect(routing).toHaveLength(0);
  });

  it("returns false when provider was never connected", async () => {
    const t = convexTest(schema, modules);

    // Nothing seeded at all.
    const result = await t.mutation(internal.integrationSecrets.disconnect, {
      userId: USER_ID,
      provider: "buffer",
    });

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: pruneMissingChannels
// ---------------------------------------------------------------------------

describe("pruneMissingChannels — stale channel pruning", () => {
  it("removes routing entry for disappeared channel; keeps still-present channels", async () => {
    const t = convexTest(schema, modules);

    // Two Buffer channels in routing.
    await seedRoutingRow(t, USER_ID, "square", [
      { provider: "buffer", channelId: "buf_present" },
      { provider: "buffer", channelId: "buf_gone" },
    ]);

    // Also a Postiz channel that should be untouched.
    await seedRoutingRow(t, USER_ID, "landscape", [
      { provider: "postiz", channelId: "ptz_present" },
    ]);

    // Simulate refresh returning only "buf_present" as a valid channel.
    const removed = await t.mutation(internal.routingDefaults.pruneMissingChannels, {
      userId: USER_ID,
      provider: "buffer",
      validChannelIds: ["buf_present"],
    });

    // "buf_gone" should be reported as removed.
    expect(removed).toHaveLength(1);
    expect(removed[0]).toEqual({ format: "square", channelId: "buf_gone" });

    // Routing row still exists with only "buf_present".
    const routing = await fetchRoutingRows(t, USER_ID);
    const square = routing.find((r) => r.format === "square");
    expect(square).toBeDefined();
    expect(square!.channels).toHaveLength(1);
    expect(square!.channels[0].channelId).toBe("buf_present");

    // Postiz entry in landscape is untouched.
    const landscape = routing.find((r) => r.format === "landscape");
    expect(landscape).toBeDefined();
    expect(landscape!.channels).toHaveLength(1);
    expect(landscape!.channels[0].channelId).toBe("ptz_present");
  });

  it("deletes routing row when all channels for the provider have disappeared", async () => {
    const t = convexTest(schema, modules);

    await seedRoutingRow(t, USER_ID, "portrait", [
      { provider: "buffer", channelId: "buf_only" },
    ]);

    const removed = await t.mutation(internal.routingDefaults.pruneMissingChannels, {
      userId: USER_ID,
      provider: "buffer",
      validChannelIds: [], // all gone
    });

    expect(removed).toHaveLength(1);
    expect(removed[0].channelId).toBe("buf_only");

    const routing = await fetchRoutingRows(t, USER_ID);
    expect(routing).toHaveLength(0);
  });

  it("returns empty array and changes nothing when all channels are still valid", async () => {
    const t = convexTest(schema, modules);

    await seedRoutingRow(t, USER_ID, "square", [
      { provider: "buffer", channelId: "buf_a" },
      { provider: "buffer", channelId: "buf_b" },
    ]);

    const removed = await t.mutation(internal.routingDefaults.pruneMissingChannels, {
      userId: USER_ID,
      provider: "buffer",
      validChannelIds: ["buf_a", "buf_b", "buf_extra"],
    });

    expect(removed).toHaveLength(0);

    const routing = await fetchRoutingRows(t, USER_ID);
    expect(routing[0].channels).toHaveLength(2);
  });

  it("is a no-op when the user has no routing defaults at all", async () => {
    const t = convexTest(schema, modules);

    const removed = await t.mutation(internal.routingDefaults.pruneMissingChannels, {
      userId: USER_ID,
      provider: "buffer",
      validChannelIds: ["buf_whatever"],
    });

    expect(removed).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// clearChannelsForProvider
// ---------------------------------------------------------------------------

describe("clearChannelsForProvider — full provider wipe", () => {
  it("removes all entries for the provider across all formats", async () => {
    const t = convexTest(schema, modules);

    await seedRoutingRow(t, USER_ID, "square", [
      { provider: "buffer", channelId: "buf_sq" },
      { provider: "postiz", channelId: "ptz_sq" },
    ]);
    await seedRoutingRow(t, USER_ID, "landscape", [
      { provider: "buffer", channelId: "buf_ls" },
    ]);

    const result = await t.mutation(internal.routingDefaults.clearChannelsForProvider, {
      userId: USER_ID,
      provider: "buffer",
    });

    expect(result.clearedCount).toBe(2);

    const routing = await fetchRoutingRows(t, USER_ID);

    // "landscape" had only Buffer → deleted.
    expect(routing.find((r) => r.format === "landscape")).toBeUndefined();

    // "square" kept Postiz channel.
    const square = routing.find((r) => r.format === "square");
    expect(square).toBeDefined();
    expect(square!.channels).toEqual([{ provider: "postiz", channelId: "ptz_sq" }]);
  });
});
