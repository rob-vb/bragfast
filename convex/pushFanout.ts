"use node";
/**
 * pushFanout.ts — U8 implementation.
 *
 * Scheduled by approveDraft after all draftPushes rows are inserted.
 * For each pending row:
 *  1. Atomically claim it (pending → in_flight).
 *  2. Check if mediaUrl is present — finalize as failed(media) if not.
 *  3. Dispatch to provider (Buffer or Postiz). Both use static API keys; no
 *     refresh path. (Pivoted 2026-04-29 from Buffer OAuth — see plan changelog.)
 *  4. Finalize as queued/drafted on success, or handle error:
 *     - transient / rate_limit: scheduleRetry (attempts++) → re-schedule action
 *     - other: finalize as failed
 *
 * Retry policy: max 3 attempts, exponential backoff 2^(attempts-1) seconds,
 * capped at 30s. Auth failures for Buffer/Postiz also call setEnabled(false).
 */

import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { open } from "../src/lib/crypto/secret-box";
import { dispatchPush } from "../src/lib/integrations/push";
import { PushError } from "../src/lib/integrations/error-classes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;

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

      // 2. Defensive guard: mediaUrl must be populated by approveDraft (cook-and-approve
      // endpoint resolves it before insert). An empty mediaUrl here means the caller
      // bypassed the orchestrator — fail loudly.
      if (!row.mediaUrl) {
        console.error(`${prefix} mediaUrl missing — caller bypassed cook-and-approve`);
        await ctx.runMutation(internal.draftPushes.finalizePush, {
          rowId: row._id,
          state: "failed",
          errorClass: "media",
          errorMessage: "media URL not resolved before push",
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
        // 4. Dispatch to provider (Buffer + Postiz both use static API keys)
        console.log(`${prefix} dispatching to provider=${row.provider} format=${row.format}`);
        const result = await dispatchPush(row, sealedRow, open);

        // 5. Finalize success.
        // Buffer queue-only constraint: createPost has no `draft` mode, so Buffer
        // pushes always finalize as "queued" regardless of user intent. Postiz
        // respects the user's choice. UI surfaces this asymmetry pre-confirm.
        const successState =
          row.provider === "buffer"
            ? "queued"
            : row.postState === "queue"
              ? "queued"
              : "drafted";
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
