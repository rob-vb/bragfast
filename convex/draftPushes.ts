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
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAuthedUser } from "./auth";
import { insertTriggerEvent } from "./triggerEvents";
import {
  TIER_CONFIG,
  tierFor,
  nextTierFor,
  type Format,
} from "./planTiers";

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

type Platform = "x" | "linkedin";

/**
 * Map a (provider, channelId) → platform copy bucket. Buffer's `service`
 * ("twitter" | "linkedin" | ...) and Postiz's `identifier` ("x" | "linkedin")
 * are the source of truth. Returns null if the channel isn't an X/LinkedIn
 * surface — caller falls back to top-level title/description.
 */
function platformForChannel(
  provider: "buffer" | "postiz",
  channelId: string,
  bufferExtra: BufferExtra | null,
  postizExtra: PostizExtra | null,
): Platform | null {
  if (provider === "buffer") {
    const ch = bufferExtra?.channels?.find((c) => c.id === channelId);
    const svc = ch?.service?.toLowerCase();
    if (svc === "twitter" || svc === "x") return "x";
    if (svc === "linkedin") return "linkedin";
    return null;
  }
  const ch = postizExtra?.channels?.find((c) => c.id === channelId);
  const id = ch?.identifier?.toLowerCase();
  if (id === "x" || id === "twitter") return "x";
  if (id === "linkedin") return "linkedin";
  return null;
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
    title: v.string(),
    description: v.string(),
    copyByPlatform: v.optional(
      v.object({
        x: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
        linkedin: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
      }),
    ),
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
    const userId = await requireAuthedUser(ctx);
    const { draftId, title, description, copyByPlatform, selections, postState, clientNonce } = args;

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

    // ── S2.7: Tier-cap gating (new accounting model only) ─────────────────────
    // Legacy plans (trial/starter/pro/scale) bypass — `tierFor` returns null,
    // preserving R9 until U6 backfill runs.
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const tier = profile ? tierFor(profile.plan) : null;

    if (tier && profile) {
      const caps = TIER_CONFIG[tier];

      // Derive base formats + video flag from selections (format may be
      // "video-square" etc. — these are video formats).
      const baseFormats = new Set<Format>();
      let includesVideo = false;
      for (const s of selections) {
        if (s.format.startsWith("video-")) {
          includesVideo = true;
          baseFormats.add(s.format.slice("video-".length) as Format);
        } else {
          baseFormats.add(s.format as Format);
        }
      }

      // Video gating
      if (includesVideo && !caps.video) {
        return {
          ok: false as const,
          error: "video_blocked" as const,
          upgradeTier: nextTierFor({ needsVideo: true }) ?? undefined,
        };
      }

      // Format gating
      for (const f of baseFormats) {
        if (!caps.formats.includes(f)) {
          return {
            ok: false as const,
            error: "format_blocked" as const,
            blockedFormat: f,
            upgradeTier: nextTierFor({ needsFormat: f }) ?? undefined,
          };
        }
      }

      // Platform/destination gating (distinct channels per approval)
      const distinctChannels = new Set(
        selections.map((s) => `${s.provider}:${s.channelId}`),
      );
      if (distinctChannels.size > caps.platforms) {
        return {
          ok: false as const,
          error: "platform_blocked" as const,
          upgradeTier:
            nextTierFor({ needsPlatforms: distinctChannels.size }) ?? undefined,
        };
      }

      // Counter availability
      const counter = profile[caps.counterField];
      if (counter === undefined) {
        // Free tier without seeded counter → block until backfill.
        // Paid tier without counter → webhook hasn't fired yet; surface distinct error.
        return {
          ok: false as const,
          error:
            tier === "free"
              ? ("posts_exhausted" as const)
              : ("posts_pending" as const),
          upgradeTier:
            tier === "free" ? ("toast" as const) : undefined,
        };
      }
      if (counter <= 0) {
        const upgrade =
          tier === "free"
            ? "toast"
            : tier === "toast"
              ? "plate"
              : tier === "plate"
                ? "buffet"
                : undefined;
        return {
          ok: false as const,
          error: "posts_exhausted" as const,
          upgradeTier: upgrade,
        };
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

      // Route per-platform copy when available; fall back to top-level title/description.
      const platform = platformForChannel(
        provider,
        channelId,
        bufferExtra,
        postizExtra,
      );
      const platformCopy = platform ? copyByPlatform?.[platform] : undefined;
      const rowTitle = platformCopy?.title ?? title;
      const rowDescription = platformCopy?.description ?? description;

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
        title: rowTitle,
        description: rowDescription,
        attempts: 0,
        clientNonce,
        created_at: now,
        updated_at: now,
      });
      pushIds.push(id);
    }

    // ── Schedule fanout (noop stub in U7, real logic in U8) ───────────────────
    if (pushIds.length > 0) {
      // S2.7: decrement post counter atomically with the inserts (same mutation tx).
      // 1 approval = 1 post regardless of fanout selection count (R7).
      if (tier && profile) {
        const field = TIER_CONFIG[tier].counterField;
        const current = profile[field] ?? 0;
        await ctx.db.patch(profile._id, { [field]: current - 1 });
      }

      await ctx.scheduler.runAfter(0, internal.pushFanout.run, {
        draftId,
        userId,
      });

      // Record the approval as a trigger event. We look up the draft's
      // sourceSystem/triggerType so the feed shows what was approved.
      const draftRow = await ctx.db
        .query("drafts")
        .withIndex("by_externalId", (q) => q.eq("externalId", draftId))
        .first();
      const triggerType = draftRow?.milestoneKey?.split(":")[0] ?? "manual";
      await insertTriggerEvent(ctx, {
        userId,
        sourceSystem: draftRow?.sourceSystem ?? "manual",
        triggerType,
        decision: "approved",
        confidence: draftRow?.confidence ?? undefined,
        sourceReference: draftRow?.eventReference ?? undefined,
        draftExternalId: draftId,
        metadata: JSON.stringify({
          pushCount: pushIds.length,
          postState,
        }),
      });
    }

    return {
      ok: true as const,
      pushIds: pushIds as string[],
      skipped,
    };
  },
});

// ── S7.2: Clipboard/X-intent approval (no draftPushes row) ────────────────────
//
// Approving via clipboard or X intent doesn't go through a posting provider, so
// we skip draftPushes entirely. We still:
//  - enforce the posts/month tier counter (clipboard is still a "post"),
//  - mark the draft suppressed so it leaves the visible queue,
//  - record a triggerEvent decision="approved" so history reflects it.
export const approveDraftClipboard = mutation({
  args: {
    draftId: v.string(),
    destination: v.union(v.literal("clipboard"), v.literal("x_intent")),
  },
  handler: async (ctx, { draftId, destination }) => {
    const userId = await requireAuthedUser(ctx);
    const draftRow = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", draftId))
      .first();
    if (!draftRow || draftRow.userId !== userId) {
      return { ok: false as const, error: "not_found" as const };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const tier = profile ? tierFor(profile.plan) : null;

    if (tier && profile) {
      const caps = TIER_CONFIG[tier];
      const counter = profile[caps.counterField];
      if (counter === undefined) {
        return {
          ok: false as const,
          error:
            tier === "free"
              ? ("posts_exhausted" as const)
              : ("posts_pending" as const),
          upgradeTier: tier === "free" ? ("toast" as const) : undefined,
        };
      }
      if (counter <= 0) {
        const upgrade =
          tier === "free"
            ? "toast"
            : tier === "toast"
              ? "plate"
              : tier === "plate"
                ? "buffet"
                : undefined;
        return {
          ok: false as const,
          error: "posts_exhausted" as const,
          upgradeTier: upgrade,
        };
      }
      await ctx.db.patch(profile._id, { [caps.counterField]: counter - 1 });
    }

    await ctx.db.patch(draftRow._id, { suppressed: true });

    const triggerType = draftRow.milestoneKey?.split(":")[0] ?? "manual";
    await insertTriggerEvent(ctx, {
      userId,
      sourceSystem: draftRow.sourceSystem ?? "manual",
      triggerType,
      decision: "approved",
      confidence: draftRow.confidence ?? undefined,
      sourceReference: draftRow.eventReference ?? undefined,
      draftExternalId: draftId,
      metadata: JSON.stringify({ destination, pushCount: 0 }),
    });

    return { ok: true as const };
  },
});

// ── Internal queries and mutations used by pushFanout ─────────────────────────

const pushStateValidator = v.union(
  v.literal("pending"),
  v.literal("in_flight"),
  v.literal("queued"),
  v.literal("drafted"),
  v.literal("failed"),
);

const errorClassValidator = v.union(
  v.literal("auth"),
  v.literal("channel_gone"),
  v.literal("rate_limit"),
  v.literal("media"),
  v.literal("transient"),
  v.literal("unknown"),
);

/**
 * Return all pending rows for a draft. Used by pushFanout to find work.
 */
export const getPendingForDraft = internalQuery({
  args: { draftId: v.string() },
  handler: async (ctx, { draftId }) => {
    const rows = await ctx.db
      .query("draftPushes")
      .withIndex("by_draftId", (q) => q.eq("draftId", draftId))
      .collect();
    return rows.filter((r) => r.state === "pending");
  },
});

/**
 * Return the sealed integrationSecrets row for a user + provider, or null if
 * not found / disabled. Home here (rather than integrationSecrets.ts) because
 * this query shape is tightly coupled to the U8 fanout claim cycle.
 */
export const getSealedForUser = internalQuery({
  args: {
    userId: v.string(),
    provider: v.union(v.literal("buffer"), v.literal("postiz")),
  },
  handler: async (ctx, { userId, provider }) => {
    const row = await ctx.db
      .query("integrationSecrets")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider),
      )
      .first();
    if (!row || !row.enabled) return null;
    return {
      _id: row._id,
      ciphertext: row.ciphertext,
      iv: row.iv,
      tag: row.tag,
      extra: row.extra ?? null,
      // Buffer lease fields — needed for refresh-lease check in fanout
      refreshInProgress: row.refreshInProgress ?? false,
      leaseUntil: row.leaseUntil ?? null,
      // Buffer token expiry is embedded in the extra JSON but NOT stored separately —
      // the fanout decodes the sealed payload to get expiresAt.
    };
  },
});

/**
 * Atomically claim a pending row by transitioning it to in_flight.
 * Returns true if the claim succeeded (row was still pending).
 * Returns false if the row was already claimed by another invocation (state != pending).
 *
 * Convex's serialized mutation lane ensures no two mutations can both observe
 * state=pending for the same row.
 */
export const claimPush = internalMutation({
  args: { rowId: v.id("draftPushes") },
  handler: async (ctx, { rowId }) => {
    const row = await ctx.db.get(rowId);
    if (!row || row.state !== "pending") return false;
    await ctx.db.patch(rowId, {
      state: "in_flight",
      updated_at: new Date().toISOString(),
    });
    return true;
  },
});

/**
 * Set a row to a terminal or final state after dispatch.
 * Used for success (queued/drafted) and non-retryable failures (failed).
 */
export const finalizePush = internalMutation({
  args: {
    rowId: v.id("draftPushes"),
    state: pushStateValidator,
    providerPostId: v.optional(v.string()),
    errorClass: v.optional(errorClassValidator),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { rowId, state, providerPostId, errorClass, errorMessage }) => {
    const row = await ctx.db.get(rowId);
    if (!row) return;
    await ctx.db.patch(rowId, {
      state,
      attempts: row.attempts + 1,
      lastAttemptAt: Date.now(),
      ...(providerPostId !== undefined ? { providerPostId } : {}),
      ...(errorClass !== undefined ? { errorClass } : {}),
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      updated_at: new Date().toISOString(),
    });
  },
});

/**
 * Reset a retryable row back to pending so the next scheduled fanout pick-up
 * can reclaim it. Increments attempts and stores the last-error breadcrumb.
 */
export const scheduleRetry = internalMutation({
  args: {
    rowId: v.id("draftPushes"),
    errorClass: errorClassValidator,
    errorMessage: v.string(),
  },
  handler: async (ctx, { rowId, errorClass, errorMessage }) => {
    const row = await ctx.db.get(rowId);
    if (!row) return;
    await ctx.db.patch(rowId, {
      state: "pending", // reset so the next scheduled action can claim it
      attempts: row.attempts + 1,
      lastAttemptAt: Date.now(),
      errorClass,
      errorMessage,
      updated_at: new Date().toISOString(),
    });
  },
});

// ── listByDraft query ─────────────────────────────────────────────────────────

export const listByDraft = query({
  args: { draftId: v.string() },
  handler: async (ctx, { draftId }) => {
    const userId = await requireAuthedUser(ctx);
    const rows = await ctx.db
      .query("draftPushes")
      .withIndex("by_draftId", (q) => q.eq("draftId", draftId))
      .collect();
    return rows.filter((r) => r.userId === userId);
  },
});

// ── retryPush mutation ────────────────────────────────────────────────────────

/**
 * User-initiated retry for a failed push row.
 *
 * Design rationale:
 * - A row reaching `failed` state means the fanout exhausted its automatic retry
 *   budget (3 attempts with exponential backoff). The failure may be transient
 *   (network blip, provider hiccup) or permanent (auth expired, channel gone).
 *   We give the user an explicit escape hatch rather than letting the row sit
 *   forever in `failed`.
 * - Attempts is reset to 0: a user-initiated retry is an intentional action,
 *   so it deserves a fresh 3-attempt budget rather than inheriting exhausted
 *   attempts. This prevents a single permanent failure from eating all retries
 *   before a transient cause is even debugged.
 * - Only `failed` rows may be retried (not pending/in_flight/queued/drafted).
 *   Retrying a success state makes no sense, and retrying in_flight could
 *   duplicate the push.
 * - userId ownership is verified server-side before any mutation is applied.
 */
export const retryPush = mutation({
  args: {
    rowId: v.id("draftPushes"),
  },
  handler: async (ctx, { rowId }) => {
    const userId = await requireAuthedUser(ctx);
    const row = await ctx.db.get(rowId);
    if (!row) {
      return { ok: false as const, error: "not_found" as const };
    }
    if (row.userId !== userId) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (row.state !== "failed") {
      return { ok: false as const, error: "not_failed" as const };
    }

    const now = new Date().toISOString();
    await ctx.db.patch(rowId, {
      state: "pending",
      attempts: 0, // fresh retry budget (see rationale above)
      errorClass: undefined,
      errorMessage: undefined,
      updated_at: now,
    });

    // Re-schedule fanout — it will pick up this row (now pending) and dispatch.
    await ctx.scheduler.runAfter(0, internal.pushFanout.run, {
      draftId: row.draftId,
      userId,
    });

    return { ok: true as const };
  },
});
