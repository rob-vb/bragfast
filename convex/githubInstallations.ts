import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
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

export const remove = mutation({
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

export const suspend = mutation({
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

export const unsuspend = mutation({
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
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("githubInstallations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
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
