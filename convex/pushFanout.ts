"use node";
/**
 * pushFanout.ts — U8 implementation.
 *
 * Scheduled by approveDraft after all draftPushes rows are inserted.
 * For each pending row:
 *  1. Atomically claim it (pending → in_flight).
 *  2. Check if mediaUrl is present — finalize as failed(media) if not.
 *  3. For Buffer: check token expiry, run refresh-lease if needed.
 *  4. Dispatch to provider (Buffer or Postiz).
 *  5. Finalize as queued/drafted on success, or handle error:
 *     - transient / rate_limit: scheduleRetry (attempts++) → re-schedule action
 *     - other: finalize as failed
 *
 * Retry policy: max 3 attempts, exponential backoff 2^(attempts-1) seconds,
 * capped at 30s. Auth failures for Buffer/Postiz also call setEnabled(false).
 *
 * TODO(post-U8): auto-cook on approve when renders are missing (see mediaUrl check below).
 */

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { open } from "../src/lib/crypto/secret-box";
import { dispatchPush } from "../src/lib/integrations/push";
import { PushError } from "../src/lib/integrations/error-classes";
import { refreshBufferToken, BufferRefreshFailed } from "../src/lib/integrations/buffer/oauth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;
/** Seconds to poll for a non-owner waiting for a Buffer refresh to finish. */
const REFRESH_POLL_INTERVAL_MS = 500;
const REFRESH_POLL_TIMEOUT_MS = 30_000;
/** Token must be valid for at least this many ms — if not, refresh first. */
const TOKEN_MIN_VALID_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function retryDelayMs(attempts: number): number {
  // Backoff: 2^(attempts-1) seconds, capped at 30s. attempts is BEFORE the failed attempt.
  const delaySeconds = Math.min(Math.pow(2, attempts - 1), 30);
  return delaySeconds * 1000;
}

function logPrefix(draftId: string, rowId: string): string {
  return `[push:${draftId}:${rowId}]`;
}

// ---------------------------------------------------------------------------
// Buffer refresh-lease logic
// ---------------------------------------------------------------------------

/**
 * Ensure the Buffer access token in the sealed row is valid for at least
 * TOKEN_MIN_VALID_MS. If it's about to expire, use the lease pattern to
 * refresh it safely.
 *
 * Returns the up-to-date sealed row (re-read from DB after any refresh).
 * Throws PushError("auth", …) if refresh fails.
 */
async function ensureValidBufferSealed(
  ctx: ActionCtx,
  userId: string,
  currentSealedRow: { ciphertext: string; iv: string; tag: string; extra: string | null },
  prefix: string,
): Promise<{ ciphertext: string; iv: string; tag: string; extra: string | null }> {
  // Decode the current payload to check expiry
  let currentTokens: { accessToken: string; refreshToken: string; expiresAt: number };
  try {
    currentTokens = JSON.parse(
      open({ ciphertext: currentSealedRow.ciphertext, iv: currentSealedRow.iv, tag: currentSealedRow.tag }),
    ) as typeof currentTokens;
  } catch {
    throw new PushError("auth", "Failed to unseal Buffer credentials");
  }

  const needsRefresh = currentTokens.expiresAt < Date.now() + TOKEN_MIN_VALID_MS;
  if (!needsRefresh) {
    return currentSealedRow;
  }

  console.log(`${prefix} Buffer token expires soon — attempting refresh`);

  // Try to claim the refresh lease
  const leaseResult = await ctx.runMutation(
    internal.integrationSecrets.claimRefreshLease,
    { userId, provider: "buffer" },
  );

  if (leaseResult.owned && leaseResult.currentSealed) {
    // We own the lease — do the refresh
    try {
      const { tokens, sealed } = await refreshBufferToken(leaseResult.currentSealed);
      await ctx.runMutation(internal.integrationSecrets.commitRefresh, {
        userId,
        provider: "buffer",
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        tag: sealed.tag,
        extra: currentSealedRow.extra ?? undefined,
      });
      console.log(`${prefix} Buffer token refreshed successfully`);
      // Return a synthetic sealed row with the fresh token
      return {
        ciphertext: JSON.stringify(tokens),
        iv: sealed.iv,
        tag: sealed.tag,
        extra: currentSealedRow.extra,
      };
    } catch (err) {
      if (err instanceof BufferRefreshFailed) {
        // Revoked grant — disable integration
        await ctx.runMutation(internal.integrationSecrets.setEnabled, {
          userId,
          provider: "buffer",
          enabled: false,
        });
        throw new PushError("auth", `Buffer refresh token revoked: ${err.message}`);
      }
      throw new PushError(
        "transient",
        `Buffer token refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Not the owner — poll until the refreshing thread commits or times out
  console.log(`${prefix} Buffer refresh lease held by another thread — polling`);
  const deadline = Date.now() + REFRESH_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, REFRESH_POLL_INTERVAL_MS));

    const latest = await ctx.runQuery(internal.integrationSecrets.getSealed, {
      userId,
      provider: "buffer",
    });

    if (!latest) {
      throw new PushError("auth", "Buffer integration disappeared during refresh poll");
    }

    const leaseExpired = !latest.refreshInProgress ||
      (latest.leaseUntil !== null && latest.leaseUntil < Date.now());

    if (leaseExpired) {
      // Re-read the token to see if it's been refreshed
      try {
        const fresh = JSON.parse(
          open({ ciphertext: latest.ciphertext, iv: latest.iv, tag: latest.tag }),
        ) as { accessToken: string; expiresAt: number };
        if (fresh.expiresAt > Date.now() + TOKEN_MIN_VALID_MS) {
          return {
            ciphertext: latest.ciphertext,
            iv: latest.iv,
            tag: latest.tag,
            extra: latest.extra,
          };
        }
      } catch {
        throw new PushError("auth", "Failed to unseal refreshed Buffer credentials");
      }
    }
  }

  throw new PushError("transient", "Timed out waiting for Buffer token refresh");
}

// ---------------------------------------------------------------------------
// Main action
// ---------------------------------------------------------------------------

type PendingRow = {
  _id: Id<"draftPushes">;
  draftId: string;
  format: string;
  provider: "buffer" | "postiz";
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  postState: "queue" | "draft";
  attempts: number;
};

type SealedRow = {
  _id: Id<"integrationSecrets">;
  ciphertext: string;
  iv: string;
  tag: string;
  extra: string | null;
  refreshInProgress: boolean;
  leaseUntil: number | null;
};

export const run = internalAction({
  args: {
    draftId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { draftId, userId }) => {
    console.log(`[pushFanout] run draftId=${draftId} userId=${userId}`);

    const rows = (await ctx.runQuery(internal.draftPushes.getPendingForDraft, {
      draftId,
    })) as PendingRow[];

    console.log(`[pushFanout] found ${rows.length} pending rows for draftId=${draftId}`);

    for (const row of rows) {
      const prefix = logPrefix(draftId, row._id);

      // 1. Atomically claim the row
      const claimed = (await ctx.runMutation(internal.draftPushes.claimPush, {
        rowId: row._id,
      })) as boolean;

      if (!claimed) {
        console.log(`${prefix} row already claimed — skipping`);
        continue;
      }

      // 2. Check mediaUrl — if empty, no render exists yet.
      // TODO(post-U8): auto-cook on approve when renders are missing.
      // For now, fail immediately so the status panel can surface a clear message.
      if (!row.mediaUrl) {
        console.warn(`${prefix} mediaUrl is empty — draft not yet rendered for format ${row.format}`);
        await ctx.runMutation(internal.draftPushes.finalizePush, {
          rowId: row._id,
          state: "failed",
          errorClass: "media",
          errorMessage:
            "draft not yet rendered for this format — cook before approving",
        });
        continue;
      }

      // 3. Get sealed creds
      const sealedRow = (await ctx.runQuery(internal.draftPushes.getSealedForUser, {
        userId,
        provider: row.provider,
      })) as SealedRow | null;

      if (!sealedRow) {
        console.warn(`${prefix} integration not found or disabled for provider=${row.provider}`);
        await ctx.runMutation(internal.draftPushes.finalizePush, {
          rowId: row._id,
          state: "failed",
          errorClass: "auth",
          errorMessage: "integration disconnected or disabled",
        });
        continue;
      }

      try {
        // 4. Buffer-specific: ensure token is fresh before dispatch
        let effectiveSealedForDispatch: {
          ciphertext: string;
          iv: string;
          tag: string;
          extra: string | null;
        } = sealedRow;

        if (row.provider === "buffer") {
          effectiveSealedForDispatch = await ensureValidBufferSealed(
            ctx,
            userId,
            sealedRow,
            prefix,
          );
        }

        // 5. Dispatch to provider
        console.log(`${prefix} dispatching to provider=${row.provider} format=${row.format}`);
        const result = await dispatchPush(row, effectiveSealedForDispatch, open);

        // 6. Finalize success
        const successState = row.postState === "queue" ? "queued" : "drafted";
        await ctx.runMutation(internal.draftPushes.finalizePush, {
          rowId: row._id,
          state: successState,
          providerPostId: result.providerPostId,
        });
        console.log(
          `${prefix} success → state=${successState} providerPostId=${result.providerPostId}`,
        );
      } catch (err) {
        const pushErr =
          err instanceof PushError ? err : new PushError("unknown", String(err));

        console.warn(
          `${prefix} error class=${pushErr.class} message=${pushErr.message}`,
        );

        // Auth failure for Buffer: disable integration so future operations short-circuit
        if (pushErr.class === "auth" && row.provider === "buffer") {
          await ctx.runMutation(internal.integrationSecrets.setEnabled, {
            userId,
            provider: "buffer",
            enabled: false,
          }).catch((e: unknown) =>
            console.error(`${prefix} failed to disable buffer integration:`, e),
          );
        }

        // Auth failure for Postiz: same
        if (pushErr.class === "auth" && row.provider === "postiz") {
          await ctx.runMutation(internal.integrationSecrets.setEnabled, {
            userId,
            provider: "postiz",
            enabled: false,
          }).catch((e: unknown) =>
            console.error(`${prefix} failed to disable postiz integration:`, e),
          );
        }

        const isRetryable =
          pushErr.class === "transient" || pushErr.class === "rate_limit";

        if (isRetryable && row.attempts + 1 < MAX_ATTEMPTS) {
          // Reset to pending with incremented attempts so next scheduled invocation picks it up
          await ctx.runMutation(internal.draftPushes.scheduleRetry, {
            rowId: row._id,
            errorClass: pushErr.class,
            errorMessage: pushErr.message,
          });
          const delay = retryDelayMs(row.attempts + 1);
          console.log(
            `${prefix} scheduling retry in ${delay}ms (attempt ${row.attempts + 1}/${MAX_ATTEMPTS})`,
          );
          await ctx.scheduler.runAfter(delay, internal.pushFanout.run, {
            draftId,
            userId,
          });
        } else {
          // Non-retryable or exhausted retries — finalize as failed
          await ctx.runMutation(internal.draftPushes.finalizePush, {
            rowId: row._id,
            state: "failed",
            errorClass: pushErr.class,
            errorMessage: pushErr.message,
          });
          console.log(`${prefix} finalized as failed (non-retryable or max attempts)`);
        }
      }
    }

    console.log(`[pushFanout] done draftId=${draftId}`);
  },
});
