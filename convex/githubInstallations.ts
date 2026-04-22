import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const upsert = internalMutation({
  args: {
    installationId: v.number(),
    userId: v.string(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", args.installationId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        status: "active",
        enabled: true,
        lastScanError: undefined,
        updated_at: now,
      });
    } else {
      await ctx.db.insert("githubInstallations", {
        ...args,
        enabled: true,
        status: "active",
        created_at: now,
        updated_at: now,
      });
    }
  },
});

export const remove = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first();
    if (inst) {
      await ctx.db.patch(inst._id, {
        status: "removed",
        enabled: false,
        updated_at: new Date().toISOString(),
      });
    }
  },
});

export const suspend = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first();
    if (inst) {
      await ctx.db.patch(inst._id, {
        status: "suspended",
        enabled: false,
        updated_at: new Date().toISOString(),
      });
    }
  },
});

export const unsuspend = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first();
    if (inst) {
      await ctx.db.patch(inst._id, {
        status: "active",
        enabled: true,
        updated_at: new Date().toISOString(),
      });
    }
  },
});

// Public action wrappers — callable from Next.js webhook route (signature
// already verified there). Internal mutations stay unreachable from outside.
export const upsertAction = action({
  args: {
    installationId: v.number(),
    userId: v.string(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.githubInstallations.upsert, args);
  },
});

export const removeAction = action({
  args: { installationId: v.number() },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.githubInstallations.remove, args);
  },
});

export const suspendAction = action({
  args: { installationId: v.number() },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.githubInstallations.suspend, args);
  },
});

export const unsuspendAction = action({
  args: { installationId: v.number() },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(internal.githubInstallations.unsuspend, args);
  },
});

export const getByInstallationId = query({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) =>
    ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first(),
});

export const listByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("githubInstallations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((row) => ({
      ...row,
      lastScanAt: row.lastScanAt ?? null,
      lastScanOkAt: row.lastScanOkAt ?? null,
      lastScanError: row.lastScanError ?? null,
    }));
  },
});

// Sous-Chef: fan-out source for the stars cron. Returns only enabled + active installations.
export const listAllEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("githubInstallations").collect();
    return rows
      .filter((r) => r.enabled && r.status === "active" && r.userId)
      .map((r) => ({ installationId: r.installationId, userId: r.userId }));
  },
});

export const toggle = mutation({
  args: {
    installationId: v.number(),
    userId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { installationId, userId, enabled }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId)
      )
      .first();
    if (!inst || inst.userId !== userId) {
      throw new Error("Installation not found");
    }
    await ctx.db.patch(inst._id, {
      enabled,
      updated_at: new Date().toISOString(),
    });
  },
});

export const recordScanResult = internalMutation({
  args: {
    installationId: v.number(),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { installationId, ok, error }) => {
    const inst = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installationId", (q) => q.eq("installationId", installationId))
      .first();
    if (!inst) return;
    const now = new Date().toISOString();
    await ctx.db.patch(inst._id, {
      lastScanAt: now,
      lastScanOkAt: ok ? now : inst.lastScanOkAt,
      lastScanError: ok ? undefined : error,
      updated_at: now,
    });
  },
});
