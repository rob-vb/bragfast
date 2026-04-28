import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const provider = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
  v.literal("buffer"),
  v.literal("postiz"),
);

export const getByUserProvider = query({
  args: { userId: v.string(), provider },
  handler: async (ctx, { userId, provider: prov }) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", prov),
      )
      .first();
    if (!row) return null;
    return {
      userId: row.userId,
      provider: row.provider,
      enabled: row.enabled,
      extra: row.extra ?? null,
      lastScanAt: row.lastScanAt ?? null,
      lastScanOkAt: row.lastScanOkAt ?? null,
      lastScanError: row.lastScanError ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
});

// Internal: returns the sealed payload so scan actions can decrypt. Never expose to clients.
export const getSealedForScan = internalQuery({
  args: { userId: v.string(), provider },
  handler: async (ctx, { userId, provider: prov }) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", prov),
      )
      .first();
    if (!row || !row.enabled) return null;
    return {
      ciphertext: row.ciphertext,
      iv: row.iv,
      tag: row.tag,
      extra: row.extra ?? null,
    };
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({
      provider: r.provider,
      enabled: r.enabled,
      extra: r.extra ?? null,
      lastScanAt: r.lastScanAt ?? null,
      lastScanOkAt: r.lastScanOkAt ?? null,
      lastScanError: r.lastScanError ?? null,
      lastSnapshotJson: r.lastSnapshotJson ?? null,
    }));
  },
});

export const listEnabledByProvider = internalQuery({
  args: { provider },
  handler: async (ctx, { provider: prov }) => {
    const rows = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_provider_enabled", (q) =>
        q.eq("provider", prov).eq("enabled", true),
      )
      .collect();
    return rows.map((r) => ({ userId: r.userId }));
  },
});

// Upsert (create or replace) a sealed credential. Caller is responsible for encrypting
// via src/lib/crypto/secret-box.ts BEFORE calling this mutation — the raw value must
// never transit Convex as plaintext.
export const upsert = internalMutation({
  args: {
    userId: v.string(),
    provider,
    ciphertext: v.string(),
    iv: v.string(),
    tag: v.string(),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ciphertext: args.ciphertext,
        iv: args.iv,
        tag: args.tag,
        extra: args.extra,
        enabled: true,
        lastScanError: undefined,
        updated_at: now,
      });
      return { created: false };
    }
    await ctx.db.insert("integrationSecrets", {
      userId: args.userId,
      provider: args.provider,
      ciphertext: args.ciphertext,
      iv: args.iv,
      tag: args.tag,
      extra: args.extra,
      enabled: true,
      created_at: now,
      updated_at: now,
    });
    return { created: true };
  },
});

export const setEnabled = internalMutation({
  args: { userId: v.string(), provider, enabled: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row) return false;
    await ctx.db.patch(row._id, {
      enabled: args.enabled,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

export const disconnect = internalMutation({
  args: { userId: v.string(), provider },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});

export const recordScanResult = internalMutation({
  args: {
    userId: v.string(),
    provider,
    ok: v.boolean(),
    error: v.optional(v.string()),
    snapshotJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row) return;
    const now = new Date().toISOString();
    await ctx.db.patch(row._id, {
      lastScanAt: now,
      lastScanOkAt: args.ok ? now : row.lastScanOkAt,
      lastScanError: args.ok ? undefined : args.error,
      ...(args.snapshotJson !== undefined ? { lastSnapshotJson: args.snapshotJson } : {}),
      updated_at: now,
    });
  },
});

const REFRESH_LEASE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Atomic CAS for the Buffer refresh-lease pattern.
 * If no lease is held (or the existing lease has expired), claims the lease and
 * returns { owned: true, currentSealed: { ciphertext, iv, tag } }.
 * If another thread holds a valid lease, returns { owned: false }.
 *
 * Only one thread should call /token at a time — Buffer rotates the refresh token
 * on every call, so two concurrent requests will revoke the entire grant.
 */
export const claimRefreshLease = internalMutation({
  args: { userId: v.string(), provider },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row || !row.enabled) return { owned: false as const };

    const now = Date.now();
    const leaseActive =
      row.refreshInProgress === true &&
      row.leaseUntil !== undefined &&
      row.leaseUntil > now;

    if (leaseActive) return { owned: false as const };

    await ctx.db.patch(row._id, {
      refreshInProgress: true,
      leaseUntil: now + REFRESH_LEASE_TTL_MS,
      updated_at: new Date(now).toISOString(),
    });

    return {
      owned: true as const,
      currentSealed: {
        ciphertext: row.ciphertext,
        iv: row.iv,
        tag: row.tag,
        extra: row.extra ?? null,
      },
    };
  },
});

/**
 * Commit a completed token refresh — store the new sealed payload and clear the lease.
 * Only the owner thread (claimRefreshLease returned owned=true) should call this.
 */
export const commitRefresh = internalMutation({
  args: {
    userId: v.string(),
    provider,
    ciphertext: v.string(),
    iv: v.string(),
    tag: v.string(),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row) return false;

    await ctx.db.patch(row._id, {
      ciphertext: args.ciphertext,
      iv: args.iv,
      tag: args.tag,
      extra: args.extra,
      refreshInProgress: false,
      leaseUntil: undefined,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

/**
 * Internal query: returns the current sealed payload without exposing it to clients.
 * Used by non-owner threads polling for the freshly-committed token after a refresh.
 */
export const getSealed = internalQuery({
  args: { userId: v.string(), provider },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (!row || !row.enabled) return null;
    return {
      ciphertext: row.ciphertext,
      iv: row.iv,
      tag: row.tag,
      extra: row.extra ?? null,
      refreshInProgress: row.refreshInProgress ?? false,
      leaseUntil: row.leaseUntil ?? null,
    };
  },
});

// Public action wrappers — ConvexHttpClient cannot call internalMutation directly.
// These are called from Next.js API routes after the route authenticates the request.
export const upsertAction = action({
  args: {
    userId: v.string(),
    provider,
    ciphertext: v.string(),
    iv: v.string(),
    tag: v.string(),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.integrationSecrets.upsert, args);
  },
});

export const disconnectAction = action({
  args: { userId: v.string(), provider },
  handler: async (ctx, args): Promise<boolean> => {
    return ctx.runMutation(internal.integrationSecrets.disconnect, args);
  },
});
