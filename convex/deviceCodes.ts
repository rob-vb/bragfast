import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";
import { createApiKeyForUser } from "./apiKeys";

const DEVICE_CODE_TTL_MS = 10 * 60 * 1000;
const POLL_INTERVAL_SECONDS = 5;

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const secretAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomChars(chars: string, length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += chars[byte % chars.length];
  return out;
}

function newDeviceCode(): string {
  return `dc_${randomChars(secretAlphabet, 48)}`;
}

function newUserCode(): string {
  return `${randomChars(alphabet, 4)}-${randomChars(alphabet, 4)}`;
}

async function expireIfNeeded(
  ctx: MutationCtx,
  row: Doc<"deviceCodes">,
  now: number,
): Promise<boolean> {
  if (row.expiresAt >= now || row.status === "consumed" || row.status === "expired") {
    return false;
  }
  await ctx.db.patch(row._id, { status: "expired" });
  return true;
}

export const issueCode = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let user_code = newUserCode();
    for (let i = 0; i < 5; i++) {
      const existing = await ctx.db
        .query("deviceCodes")
        .withIndex("by_user_code", (q) => q.eq("user_code", user_code))
        .first();
      if (!existing) break;
      user_code = newUserCode();
    }

    const device_code = newDeviceCode();
    await ctx.db.insert("deviceCodes", {
      device_code,
      user_code,
      status: "pending",
      expiresAt: now + DEVICE_CODE_TTL_MS,
      created_at: new Date(now).toISOString(),
    });

    return {
      device_code,
      user_code,
      expires_in: DEVICE_CODE_TTL_MS / 1000,
      interval: POLL_INTERVAL_SECONDS,
    };
  },
});

export const getByUserCode = query({
  args: { user_code: v.string() },
  handler: async (ctx, { user_code }) => {
    const row = await ctx.db
      .query("deviceCodes")
      .withIndex("by_user_code", (q) => q.eq("user_code", user_code))
      .first();

    if (!row) return null;
    const status = row.expiresAt < Date.now() && row.status === "pending" ? "expired" : row.status;
    return {
      user_code: row.user_code,
      status,
      expiresAt: row.expiresAt,
      approved_at: row.approved_at,
      denied_at: row.denied_at,
      consumed_at: row.consumed_at,
    };
  },
});

export const approveCode = mutation({
  args: { user_code: v.string() },
  handler: async (ctx, { user_code }) => {
    const userId = await requireAuthedUser(ctx);
    const row = await ctx.db
      .query("deviceCodes")
      .withIndex("by_user_code", (q) => q.eq("user_code", user_code))
      .first();

    if (!row) return { ok: false, error: "invalid_code" as const };
    const now = Date.now();
    if (await expireIfNeeded(ctx, row, now)) return { ok: false, error: "expired_token" as const };
    if (row.status !== "pending") return { ok: false, error: row.status };

    await ctx.db.patch(row._id, {
      userId,
      status: "approved",
      approved_at: new Date(now).toISOString(),
    });
    return { ok: true };
  },
});

export const denyCode = mutation({
  args: { user_code: v.string() },
  handler: async (ctx, { user_code }) => {
    await requireAuthedUser(ctx);
    const row = await ctx.db
      .query("deviceCodes")
      .withIndex("by_user_code", (q) => q.eq("user_code", user_code))
      .first();

    if (!row) return { ok: false, error: "invalid_code" as const };
    const now = Date.now();
    if (await expireIfNeeded(ctx, row, now)) return { ok: false, error: "expired_token" as const };
    if (row.status !== "pending") return { ok: false, error: row.status };

    await ctx.db.patch(row._id, {
      status: "denied",
      denied_at: new Date(now).toISOString(),
    });
    return { ok: true };
  },
});

export const exchangeToken = mutation({
  args: { device_code: v.string() },
  handler: async (ctx, { device_code }) => {
    const row = await ctx.db
      .query("deviceCodes")
      .withIndex("by_device_code", (q) => q.eq("device_code", device_code))
      .first();

    if (!row) return { ok: false, error: "expired_token" as const };
    const now = Date.now();
    if (await expireIfNeeded(ctx, row, now)) return { ok: false, error: "expired_token" as const };
    if (row.status === "pending") return { ok: false, error: "authorization_pending" as const };
    if (row.status === "denied") return { ok: false, error: "access_denied" as const };
    if (row.status === "consumed" || row.status === "expired") {
      return { ok: false, error: "expired_token" as const };
    }
    if (!row.userId) return { ok: false, error: "authorization_pending" as const };

    await ctx.db.patch(row._id, {
      status: "consumed",
      consumed_at: new Date(now).toISOString(),
    });
    const key = await createApiKeyForUser(ctx, { userId: row.userId, name: "CLI" });
    return {
      ok: true,
      access_token: key.key,
      token_type: "Bearer" as const,
      userId: row.userId,
    };
  },
});
