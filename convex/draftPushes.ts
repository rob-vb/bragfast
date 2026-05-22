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
import { v, ConvexError } from "convex/values";
import { requireAuthedUser } from "./auth";
import { evaluatePostSelections } from "./planTiers";

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

type ChannelClass =
  | "x"
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "threads"
  | "facebook"
  | "youtube";

const BUFFER_SERVICE_TO_CLASS: Record<string, ChannelClass> = {
  twitter: "x",
  x: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  threads: "threads",
  facebook: "facebook",
  youtube: "youtube",
};

const POSTIZ_IDENTIFIER_TO_CLASS: Record<string, ChannelClass> = {
  twitter: "x",
  x: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  threads: "threads",
  facebook: "facebook",
  youtube: "youtube",
};

/**
 * Map a (provider, channelId) → channel class for copy-variant routing.
 * Returns null when the channel falls outside the named classes ("other"
 * bucket) — caller falls back to top-level title/description.
 */
function platformForChannel(
  provider: "buffer" | "postiz",
  channelId: string,
  bufferExtra: BufferExtra | null,
  postizExtra: PostizExtra | null,
): ChannelClass | null {
  if (provider === "buffer") {
    const ch = bufferExtra?.channels?.find((c) => c.id === channelId);
    const svc = ch?.service?.toLowerCase();
    return svc ? (BUFFER_SERVICE_TO_CLASS[svc] ?? null) : null;
  }
  const ch = postizExtra?.channels?.find((c) => c.id === channelId);
  const id = ch?.identifier?.toLowerCase();
  return id ? (POSTIZ_IDENTIFIER_TO_CLASS[id] ?? null) : null;
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

// S8.1: derive was_edited + edit_type by comparing the agent's original
// objectContent against the user's submitted title/description/platform copy.
// Returns editType=null when no change. Categories: title, description, both,
// platform_copy, multiple.
type EditDelta = {
  wasEdited: boolean;
  editType: "title" | "description" | "both" | "platform_copy" | "multiple" | null;
};

function computeEditDelta(
  originalConfigJson: string | null,
  submitted: {
    title: string;
    description: string;
    copyByPlatform: Partial<
      Record<ChannelClass, { title: string; description: string }>
    > | null;
  },
): EditDelta {
  if (!originalConfigJson) return { wasEdited: false, editType: null };
  let original: {
    objectContent?: { title?: { text?: string }; description?: { text?: string } };
    copyByPlatform?: typeof submitted.copyByPlatform;
  };
  try {
    original = JSON.parse(originalConfigJson);
  } catch {
    return { wasEdited: false, editType: null };
  }
  const origTitle = original?.objectContent?.title?.text ?? "";
  const origDescription = original?.objectContent?.description?.text ?? "";
  const titleChanged = origTitle.trim() !== submitted.title.trim();
  const descriptionChanged =
    origDescription.trim() !== submitted.description.trim();

  const origByPlatform = original?.copyByPlatform ?? null;
  const subByPlatform = submitted.copyByPlatform ?? null;
  let platformChanged = false;
  if (subByPlatform) {
    const allClasses: ChannelClass[] = [
      "x",
      "linkedin",
      "instagram",
      "tiktok",
      "threads",
      "facebook",
      "youtube",
    ];
    for (const p of allClasses) {
      const sub = subByPlatform[p];
      const orig = origByPlatform?.[p];
      if (!sub) continue;
      if (!orig) {
        // Original lacked per-platform copy; user added one — counts as edit
        // only if it differs from the top-level original copy.
        if (
          sub.title.trim() !== origTitle.trim() ||
          sub.description.trim() !== origDescription.trim()
        ) {
          platformChanged = true;
        }
      } else if (
        orig.title.trim() !== sub.title.trim() ||
        orig.description.trim() !== sub.description.trim()
      ) {
        platformChanged = true;
      }
    }
  }

  const flags = [titleChanged, descriptionChanged, platformChanged].filter(
    Boolean,
  ).length;
  if (flags === 0) return { wasEdited: false, editType: null };
  if (flags > 1) return { wasEdited: true, editType: "multiple" };
  if (titleChanged) return { wasEdited: true, editType: "title" };
  if (descriptionChanged) return { wasEdited: true, editType: "description" };
  return { wasEdited: true, editType: "platform_copy" };
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
        instagram: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
        tiktok: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
        threads: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
        facebook: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
        youtube: v.optional(
          v.object({ title: v.string(), description: v.string() }),
        ),
      }),
    ),
    // Per-channel copy keyed by `${provider}::${channelId}`. Lookup precedence:
    // copyByChannel[k] → copyByPlatform[class] → top-level title/description.
    // Malformed keys are silently ignored (fall through to the next phase).
    copyByChannel: v.optional(
      v.record(
        v.string(),
        v.object({ title: v.string(), description: v.string() }),
      ),
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
    mediaUrlByFormat: v.optional(v.record(v.string(), v.string())),
    // Trusted server override: the cook-and-approve endpoint already
    // authenticated the request, then needs to act as that user. Browser
    // clients omit this and the authed identity is used.
    trustedActor: v.optional(
      v.object({
        userId: v.string(),
        source: v.union(v.literal("api_key"), v.literal("session")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = args.trustedActor?.userId ?? (await requireAuthedUser(ctx));
    const { draftId, title, description, copyByPlatform, copyByChannel, selections, postState, clientNonce, mediaUrlByFormat } = args;

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

    // S8.1: fetch draftRow once for edit-delta + telemetry.
    const draftRow = await ctx.db
      .query("drafts")
      .withIndex("by_externalId", (q) => q.eq("externalId", draftId))
      .first();
    const isFirstApproved = false; // triggerEvents table removed; stub false

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

    // ── S2.7: allowance gating (new accounting model only) ─────────────────────
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (profile) {
      const allowance = evaluatePostSelections(profile.plan, selections);
      if (!allowance.ok) {
        return allowance;
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

      // Three-phase lookup: copyByChannel[`${provider}::${channelId}`] →
      // copyByPlatform[class] → top-level title/description.
      const channelKey = `${provider}::${channelId}`;
      const platform = platformForChannel(
        provider,
        channelId,
        bufferExtra,
        postizExtra,
      );
      const channelCopy =
        copyByChannel?.[channelKey] ??
        (platform ? copyByPlatform?.[platform] : undefined);
      const rowTitle = channelCopy?.title ?? title;
      const rowDescription = channelCopy?.description ?? description;

      const id = await ctx.db.insert("draftPushes", {
        draftId,
        userId,
        format,
        provider,
        channelId,
        channelLabel,
        state: "pending",
        postState,
        mediaUrl: mediaUrlByFormat?.[format] ?? "",
        title: rowTitle,
        description: rowDescription,
        attempts: 0,
        clientNonce,
        created_at: now,
        updated_at: now,
      });
      pushIds.push(id);
    }

    // ── Skip-all guard ─────────────────────────────────────────────────────────
    // If every selection got skipped (channels deleted, mismatched, etc.) the
    // caller would otherwise return ok with zero pushes — and the API caller
    // would still remove the draft. Throw so the caller can refund credits and
    // preserve the draft for retry.
    if (pushIds.length === 0 && skipped.length > 0) {
      throw new ConvexError({
        code: "all_selections_skipped",
        skipped,
      });
    }

    // ── Schedule fanout (noop stub in U7, real logic in U8) ───────────────────
    if (pushIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.pushFanout.run, {
        draftId,
        userId,
      });
    }

    // ── S8.1: edit-delta for post_approved telemetry ──────────────────────────
    const editDelta = computeEditDelta(
      draftRow?.originalConfig ?? null,
      { title, description, copyByPlatform: copyByPlatform ?? null },
    );
    const triggerType = draftRow?.milestoneKey?.split(":")[0] ?? "manual";

    return {
      ok: true as const,
      pushIds: pushIds as string[],
      skipped,
      meta: {
        wasEdited: editDelta.wasEdited,
        editType: editDelta.editType,
        triggerType,
        confidence: draftRow?.confidence ?? null,
        draftCreatedAt: draftRow?.created_at ?? null,
        isFirstPostForUser: isFirstApproved,
      },
    };
  },
});

// ── S7.2: Clipboard/X-intent approval (no draftPushes row) ────────────────────
//
// Approving via clipboard or X intent doesn't go through a posting provider, so
// we skip draftPushes entirely. We still:
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

    await ctx.db.patch(draftRow._id, { suppressed: true });

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
    // Modal mounts before auth resolves on first paint; return [] instead of
    // throwing so the panel silently hides until session is established.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
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
