import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

const provider = v.union(
  v.literal("stripe"),
  v.literal("posthog"),
  v.literal("ga4"),
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
      lastScanAt: r.lastScanAt ?? null,
      lastScanOkAt: r.lastScanOkAt ?? null,
      lastScanError: r.lastScanError ?? null,
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
      updated_at: now,
    });
  },
});
