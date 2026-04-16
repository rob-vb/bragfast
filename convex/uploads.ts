import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const create = mutation({
  args: {
    userId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.optional(v.number()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const externalId = `upl_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const expiresAt = Date.now() + 300_000; // 5 minutes

    await ctx.db.insert("uploads", {
      ...args,
      externalId,
      status: "pending",
      expiresAt,
      created_at: now,
    });

    return { externalId, expiresAt };
  },
});

/**
 * Create an upload record that is already completed (used by the token-upload flow
 * where the file is streamed directly to R2 before the record is persisted).
 */
export const createCompleted = mutation({
  args: {
    userId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    url: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("uploads", {
      userId: args.userId,
      externalId: args.externalId,
      filename: args.filename,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      url: args.url,
      status: "completed",
      expiresAt: Date.now() + 300_000,
      created_at: now,
      completed_at: now,
    });
    return { externalId: args.externalId, url: args.url };
  },
});

export const completeByExternalId = mutation({
  args: {
    externalId: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { externalId, sizeBytes }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload || upload.status !== "pending" || !upload.url) return null;

    await ctx.db.patch(upload._id, {
      status: "completed",
      sizeBytes,
      completed_at: new Date().toISOString(),
    });

    return { externalId, url: upload.url, sizeBytes };
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) =>
    ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first(),
});

export const markCompleted = mutation({
  args: {
    externalId: v.string(),
    url: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { externalId, url, sizeBytes }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload || upload.status !== "pending") return null;

    await ctx.db.patch(upload._id, {
      status: "completed",
      url,
      sizeBytes,
      completed_at: new Date().toISOString(),
    });

    return { externalId, url, sizeBytes };
  },
});

export const createMultipart = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    declaredSizeBytes: v.number(),
    totalParts: v.number(),
    partSizeBytes: v.number(),
    finalKey: v.string(),
    tempPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const expiresAt = Date.now() + 15 * 60_000; // 15 minutes

    await ctx.db.insert("uploads", {
      userId: args.userId,
      externalId: args.externalId,
      filename: args.filename,
      contentType: args.contentType,
      status: "uploading",
      kind: "multipart",
      expiresAt,
      created_at: now,
      finalKey: args.finalKey,
      tempPrefix: args.tempPrefix,
      partSizeBytes: args.partSizeBytes,
      totalParts: args.totalParts,
      declaredSizeBytes: args.declaredSizeBytes,
      uploadedParts: [],
    });

    return { externalId: args.externalId, expiresAt };
  },
});

export const recordPart = mutation({
  args: {
    externalId: v.string(),
    partNumber: v.number(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { externalId, partNumber, sizeBytes }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload) throw new ConvexError({ code: "NOT_FOUND", message: "Upload not found" });
    if (upload.status !== "uploading") throw new ConvexError({ code: "CONFLICT", message: "Upload not in uploading state" });
    if (upload.expiresAt < Date.now()) throw new ConvexError({ code: "EXPIRED", message: "Upload has expired" });
    if (partNumber < 1 || partNumber > (upload.totalParts ?? 0)) {
      throw new ConvexError({ code: "INVALID_PART", message: `Part number out of range: ${partNumber}` });
    }

    const existing = upload.uploadedParts ?? [];
    const filtered = existing.filter((p) => p.partNumber !== partNumber);
    const updated = [...filtered, { partNumber, sizeBytes, uploaded_at: new Date().toISOString() }];

    await ctx.db.patch(upload._id, { uploadedParts: updated });

    return {
      partNumber,
      totalParts: upload.totalParts ?? 0,
      uploadedCount: updated.length,
    };
  },
});

export const completeMultipart = mutation({
  args: {
    externalId: v.string(),
    url: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { externalId, url, sizeBytes }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload) return null;

    // Idempotent: already completed with matching url
    if (upload.status === "completed" && upload.url === url) {
      return { externalId, url, sizeBytes: upload.sizeBytes ?? sizeBytes };
    }

    if (upload.status !== "uploading") {
      throw new ConvexError({ code: "CONFLICT", message: "Upload not in uploading state" });
    }

    await ctx.db.patch(upload._id, {
      status: "completed",
      url,
      sizeBytes,
      completed_at: new Date().toISOString(),
    });

    return { externalId, url, sizeBytes };
  },
});

export const abortMultipart = mutation({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();

    if (!upload) return null;
    if (upload.status === "completed") return null; // route returns 409
    if (upload.status === "aborted" || upload.status === "expired") return { tempPrefix: upload.tempPrefix };

    await ctx.db.patch(upload._id, { status: "aborted" });
    return { tempPrefix: upload.tempPrefix };
  },
});

