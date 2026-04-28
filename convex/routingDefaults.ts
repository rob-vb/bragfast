import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const postingProvider = v.union(v.literal("buffer"), v.literal("postiz"));

const formatValidator = v.union(
  v.literal("square"),
  v.literal("landscape"),
  v.literal("portrait"),
  v.literal("video-square"),
  v.literal("video-landscape"),
  v.literal("video-portrait"),
);

const channelEntryValidator = v.object({
  provider: postingProvider,
  channelId: v.string(),
});

/**
 * Return all routing-default rows for a user (across all formats).
 * Called from the REST shim (GET /api/v1/routing-defaults) and the server
 * component for the routing page.
 */
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("routingDefaults")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({
      format: r.format,
      channels: r.channels,
      updated_at: r.updated_at,
    }));
  },
});

/**
 * Upsert the channel array for a single (userId, format) pair.
 * Replaces the existing channel list entirely — caller sends the full desired
 * set (toggling a checkbox sends the new complete list for that format).
 */
export const upsert = mutation({
  args: {
    userId: v.string(),
    format: formatValidator,
    channels: v.array(channelEntryValidator),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("routingDefaults")
      .withIndex("by_userId_format", (q) =>
        q.eq("userId", args.userId).eq("format", args.format),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        channels: args.channels,
        updated_at: now,
      });
      return { created: false };
    }

    await ctx.db.insert("routingDefaults", {
      userId: args.userId,
      format: args.format,
      channels: args.channels,
      updated_at: now,
    });
    return { created: true };
  },
});

/**
 * Remove all channel entries for a given provider across every format for
 * this user. Called by the disconnect cascade (U10).
 *
 * TODO(U10): call this from integrationSecrets.disconnect when provider is
 * "buffer" or "postiz" so routing defaults are cleaned up on disconnect.
 */
export const clearChannelsForProvider = internalMutation({
  args: { userId: v.string(), provider: postingProvider },
  handler: async (ctx, { userId, provider }) => {
    const rows = await ctx.db
      .query("routingDefaults")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let clearedCount = 0;
    for (const row of rows) {
      const filtered = row.channels.filter((ch) => ch.provider !== provider);
      if (filtered.length !== row.channels.length) {
        clearedCount += row.channels.length - filtered.length;
        if (filtered.length === 0) {
          await ctx.db.delete(row._id);
        } else {
          await ctx.db.patch(row._id, {
            channels: filtered,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
    return { clearedCount };
  },
});

/**
 * Remove channel entries for a given provider whose channelId is NOT in the
 * provided valid set. Used by the channel-refresh cron (U10) to prune stale
 * channels after a refresh.
 *
 * Returns an array of removed {format, channelId} pairs for telemetry.
 */
export const pruneMissingChannels = internalMutation({
  args: {
    userId: v.string(),
    provider: postingProvider,
    validChannelIds: v.array(v.string()),
  },
  handler: async (ctx, { userId, provider, validChannelIds }) => {
    const validSet = new Set(validChannelIds);
    const rows = await ctx.db
      .query("routingDefaults")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const removed: Array<{ format: string; channelId: string }> = [];

    for (const row of rows) {
      const kept: typeof row.channels = [];
      for (const ch of row.channels) {
        if (ch.provider === provider && !validSet.has(ch.channelId)) {
          removed.push({ format: row.format, channelId: ch.channelId });
        } else {
          kept.push(ch);
        }
      }
      if (kept.length !== row.channels.length) {
        if (kept.length === 0) {
          await ctx.db.delete(row._id);
        } else {
          await ctx.db.patch(row._id, {
            channels: kept,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    return removed;
  },
});
