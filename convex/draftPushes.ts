/**
 * draftPushes.ts
 *
 * Mutation: approveDraft
 * ─────────────────────
 * Creates draftPushes rows for each (format × provider × channel) selection
 * and schedules the pushFanout action to execute them.
 *
 * mediaUrl decision
 * ─────────────────
 * Drafts do NOT have pre-rendered assets at approve time — the render pipeline
 * is triggered separately via the cook endpoint. Rather than block approve on a
 * render, we store mediaUrl = "" here and have U8 (pushFanout) resolve the URL
 * during fanout (either polling the cook result or triggering a fresh render).
 * This keeps U7 narrow and avoids coupling approve to the render pipeline.
 */
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const formatValidator = v.union(
  v.literal("square"),
  v.literal("landscape"),
  v.literal("portrait"),
  v.literal("video-square"),
  v.literal("video-landscape"),
  v.literal("video-portrait"),
);

const providerValidator = v.union(v.literal("buffer"), v.literal("postiz"));

// ── Types for extra JSON parsing ───────────────────────────────────────────────

interface BufferExtra {
  orgId?: string;
  orgName?: string;
  channels?: Array<{ id: string; service?: string; displayName?: string }>;
}

interface PostizExtra {
  instanceUrl?: string;
  channels?: Array<{ id: string; identifier?: string; name?: string }>;
}

function channelLabelFromBuffer(
  extra: BufferExtra,
  channelId: string,
): string | undefined {
  const ch = extra.channels?.find((c) => c.id === channelId);
  return ch?.displayName ?? ch?.service;
}

function channelLabelFromPostiz(
  extra: PostizExtra,
  channelId: string,
): string | undefined {
  const ch = extra.channels?.find((c) => c.id === channelId);
  return ch?.name ?? ch?.identifier;
}

function parseExtra<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── approveDraft mutation ──────────────────────────────────────────────────────

export const approveDraft = mutation({
  args: {
    draftId: v.string(),
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    selections: v.array(
      v.object({
        format: formatValidator,
        provider: providerValidator,
        channelId: v.string(),
      }),
    ),
    postState: v.union(v.literal("queue"), v.literal("draft")),
    clientNonce: v.string(),
  },
  handler: async (ctx, args) => {
    const { draftId, userId, title, description, selections, postState, clientNonce } = args;

    // ── Validation: nothing selected ──────────────────────────────────────────
    if (selections.length === 0) {
      return { ok: false as const, error: "nothing_selected" as const };
    }

    // ── Validation: no providers connected ────────────────────────────────────
    const integrations = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const postingProviders = integrations.filter(
      (r) =>
        r.enabled &&
        (r.provider === "buffer" || r.provider === "postiz"),
    );

    if (postingProviders.length === 0) {
      return { ok: false as const, error: "no_providers_connected" as const };
    }

    // ── Idempotency: duplicate nonce within 60 seconds ────────────────────────
    const existing = await ctx.db
      .query("draftPushes")
      .withIndex("by_clientNonce", (q) => q.eq("clientNonce", clientNonce))
      .first();

    if (existing) {
      const createdAt = new Date(existing.created_at).getTime();
      const nowMs = Date.now();
      if (nowMs - createdAt < 60_000) {
        return { ok: false as const, error: "duplicate_approval" as const };
      }
    }

    // ── Build provider extra maps for channel validation ──────────────────────
    const bufferRow = postingProviders.find((r) => r.provider === "buffer");
    const postizRow = postingProviders.find((r) => r.provider === "postiz");

    const bufferExtra = parseExtra<BufferExtra>(bufferRow?.extra ?? null);
    const postizExtra = parseExtra<PostizExtra>(postizRow?.extra ?? null);

    // ── Process selections ────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const pushIds: string[] = [];
    const skipped: Array<{
      format: string;
      provider: string;
      channelId: string;
      reason: string;
    }> = [];

    for (const sel of selections) {
      const { format, provider, channelId } = sel;

      // Verify channel still exists in the provider's extra.channels
      let channelLabel: string | undefined;
      let channelFound = false;

      if (provider === "buffer") {
        if (bufferExtra) {
          const ch = bufferExtra.channels?.find((c) => c.id === channelId);
          if (ch) {
            channelFound = true;
            channelLabel = channelLabelFromBuffer(bufferExtra, channelId);
          }
        } else if (bufferRow) {
          // Provider is connected but has no extra yet — treat as found (channels may
          // not be cached yet). U8 will revalidate.
          channelFound = true;
        }
      } else if (provider === "postiz") {
        if (postizExtra) {
          const ch = postizExtra.channels?.find((c) => c.id === channelId);
          if (ch) {
            channelFound = true;
            channelLabel = channelLabelFromPostiz(postizExtra, channelId);
          }
        } else if (postizRow) {
          // Same as above — provider connected but cache empty.
          channelFound = true;
        }
      }

      if (!channelFound) {
        skipped.push({ format, provider, channelId, reason: "channel_not_found" });
        continue;
      }

      const id = await ctx.db.insert("draftPushes", {
        draftId,
        userId,
        format,
        provider,
        channelId,
        channelLabel,
        state: "pending",
        postState,
        mediaUrl: "", // TBD: U8 resolves this during fanout
        title,
        description,
        attempts: 0,
        clientNonce,
        created_at: now,
        updated_at: now,
      });
      pushIds.push(id);
    }

    // ── Schedule fanout (noop stub in U7, real logic in U8) ───────────────────
    if (pushIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.pushFanout.run, {
        draftId,
        userId,
      });
    }

    return {
      ok: true as const,
      pushIds: pushIds as string[],
      skipped,
    };
  },
});

// ── listByDraft query ─────────────────────────────────────────────────────────

export const listByDraft = query({
  args: { draftId: v.string(), userId: v.string() },
  handler: async (ctx, { draftId, userId }) => {
    const rows = await ctx.db
      .query("draftPushes")
      .withIndex("by_draftId", (q) => q.eq("draftId", draftId))
      .collect();
    return rows.filter((r) => r.userId === userId);
  },
});
