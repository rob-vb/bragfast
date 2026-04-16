import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MiB — stays under Vercel 4.5 MB cap

export const mint = mutation({
  args: {
    userId: v.string(),
    token: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;

    await ctx.db.insert("uploadTokens", {
      token: args.token,
      userId: args.userId,
      filename: args.filename,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      maxSizeBytes: MAX_SIZE_BYTES,
      status: "pending",
      expiresAt,
      created_at: new Date(now).toISOString(),
    });

    return { expiresAt, maxSizeBytes: MAX_SIZE_BYTES };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) =>
    ctx.db
      .query("uploadTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first(),
});

/**
 * Atomically transition pending → consumed.
 * Returns the token doc on success, or a string error code on failure.
 * Callers should upload to R2 first, then call this; if it returns an error,
 * delete the temp R2 key.
 */
export const consume = mutation({
  args: {
    token: v.string(),
    uploadId: v.string(),
  },
  handler: async (ctx, { token, uploadId }) => {
    const doc = await ctx.db
      .query("uploadTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!doc) return { ok: false as const, reason: "not_found" as const };

    if (doc.status === "consumed") return { ok: false as const, reason: "consumed" as const };

    if (doc.status === "expired" || doc.expiresAt <= Date.now()) {
      if (doc.status !== "expired") {
        await ctx.db.patch(doc._id, { status: "expired" });
      }
      return { ok: false as const, reason: "expired" as const };
    }

    await ctx.db.patch(doc._id, {
      status: "consumed",
      uploadId,
      consumed_at: new Date().toISOString(),
    });

    return { ok: true as const, doc };
  },
});

/**
 * Expire stale pending tokens — run from a cron or on-demand sweep.
 * Returns count of rows updated.
 */
export const expireStale = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("uploadTokens")
      .withIndex("by_status_expires", (q) =>
        q.eq("status", "pending").lt("expiresAt", now)
      )
      .collect();

    await Promise.all(stale.map((doc) => ctx.db.patch(doc._id, { status: "expired" })));
    return stale.length;
  },
});
