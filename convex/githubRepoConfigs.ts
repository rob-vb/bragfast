import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";

// S0.4c: every public function verifies the caller's installation ownership.
// `userId` is a client-supplied arg (server-side `fetchQuery`/`fetchMutation`
// from Next.js doesn't yet carry Convex auth — that bridge is S0.4a.4,
// deferred). The ownership check at minimum drops the prior `repoFullName`-or-
// `installationId`-alone exfil path: the caller must also assert *which* user
// the config belongs to, and the installation must actually be theirs.
//
// Trusted internal callers (webhook signature-verified, cron scheduler) use
// the `internal*` variants below, which skip ownership because they operate
// from a server-trusted context.

async function assertOwnsInstallation(
  ctx: QueryCtx,
  userId: string,
  installationId: number,
): Promise<boolean> {
  const installation = await ctx.db
    .query("githubInstallations")
    .withIndex("by_installationId", (q) =>
      q.eq("installationId", installationId),
    )
    .first();
  if (!installation) return false;
  if (installation.userId !== userId) return false;
  if (installation.status && installation.status !== "active") return false;
  return true;
}

// ── Public (browser-callable) functions — ownership-scoped ────────────────────

export const upsert = mutation({
  args: {
    userId: v.string(),
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.optional(v.boolean()),
    notifyOnPrMerge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const owns = await assertOwnsInstallation(ctx, args.userId, args.installationId);
    if (!owns) return false;
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) =>
        q.eq("repoFullName", args.repoFullName),
      )
      .first();
    // Defense-in-depth: existing rows must also match the asserted installationId.
    if (existing && existing.installationId !== args.installationId) return false;
    if (existing) {
      const updates: Record<string, unknown> = { updated_at: now };
      if (args.enabled !== undefined) updates.enabled = args.enabled;
      if (args.notifyOnPrMerge !== undefined)
        updates.notifyOnPrMerge = args.notifyOnPrMerge;
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("githubRepoConfigs", {
        installationId: args.installationId,
        repoFullName: args.repoFullName,
        enabled: args.enabled ?? true,
        notifyOnPrMerge: args.notifyOnPrMerge,
        created_at: now,
        updated_at: now,
      });
    }
    return true;
  },
});

export const getByRepo = query({
  args: {
    userId: v.string(),
    installationId: v.number(),
    repoFullName: v.string(),
  },
  handler: async (ctx, { userId, installationId, repoFullName }) => {
    const owns = await assertOwnsInstallation(ctx, userId, installationId);
    if (!owns) return null;
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) => q.eq("repoFullName", repoFullName))
      .first();
    if (config && config.installationId !== installationId) return null;
    return config;
  },
});

export const listByInstallation = query({
  args: { userId: v.string(), installationId: v.number() },
  handler: async (ctx, { userId, installationId }) => {
    const owns = await assertOwnsInstallation(ctx, userId, installationId);
    if (!owns) return [];
    return ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId),
      )
      .collect();
  },
});

export const toggle = mutation({
  args: {
    userId: v.string(),
    repoFullName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { userId, repoFullName, enabled }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) => q.eq("repoFullName", repoFullName))
      .first();
    if (!config) return false;
    const owns = await assertOwnsInstallation(ctx, userId, config.installationId);
    if (!owns) return false;
    await ctx.db.patch(config._id, {
      enabled,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

// Sous-Chef: opt a repo into PR-merge drafting.
export const setNotifyOnPrMerge = mutation({
  args: {
    userId: v.string(),
    repoFullName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { userId, repoFullName, enabled }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) => q.eq("repoFullName", repoFullName))
      .first();
    if (!config) return false;
    const owns = await assertOwnsInstallation(ctx, userId, config.installationId);
    if (!owns) return false;
    await ctx.db.patch(config._id, {
      notifyOnPrMerge: enabled,
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

// ── Internal (server-trusted) functions ──────────────────────────────────────
// Used by the GitHub webhook (signature-verified) and the stars cron action.
// These callers do not have a user identity at hand; ownership is enforced by
// the upstream trust boundary (signature, scheduler) rather than per-call.

export const internalGetByRepo = internalQuery({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
  },
  handler: async (ctx, { installationId, repoFullName }) => {
    const config = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) => q.eq("repoFullName", repoFullName))
      .first();
    if (config && config.installationId !== installationId) return null;
    return config;
  },
});

export const internalListByInstallation = internalQuery({
  args: { installationId: v.number() },
  handler: async (ctx, { installationId }) =>
    ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", installationId),
      )
      .collect(),
});

// Dormant — kept for symmetry; no current internal upsert callers.
export const internalUpsert = internalMutation({
  args: {
    installationId: v.number(),
    repoFullName: v.string(),
    enabled: v.optional(v.boolean()),
    notifyOnPrMerge: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("githubRepoConfigs")
      .withIndex("by_repoFullName", (q) =>
        q.eq("repoFullName", args.repoFullName),
      )
      .first();
    if (existing && existing.installationId !== args.installationId) return false;
    if (existing) {
      const updates: Record<string, unknown> = { updated_at: now };
      if (args.enabled !== undefined) updates.enabled = args.enabled;
      if (args.notifyOnPrMerge !== undefined)
        updates.notifyOnPrMerge = args.notifyOnPrMerge;
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("githubRepoConfigs", {
        installationId: args.installationId,
        repoFullName: args.repoFullName,
        enabled: args.enabled ?? true,
        notifyOnPrMerge: args.notifyOnPrMerge,
        created_at: now,
        updated_at: now,
      });
    }
    return true;
  },
});
