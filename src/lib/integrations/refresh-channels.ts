/**
 * Provider-agnostic channel refresh dispatcher.
 *
 * Given a sealed credential blob + provider, fetches the latest channel list
 * from the upstream API and returns the new `extra` JSON string to persist.
 *
 * This module is a pure Node-side helper — it performs outbound HTTP but has no
 * Convex imports. The Convex "use node" action (convex/refreshChannelsAction.ts)
 * is responsible for:
 *   1. Querying integrationSecrets for sealed creds (ctx.runQuery).
 *   2. Calling refreshChannelsForProvider (this module) to do the HTTP work.
 *   3. Writing the new extra back via ctx.runMutation.
 *   4. Calling setEnabled(false) on 401.
 *
 * Called:
 *  - On connect (after storing creds) — to populate the initial channel cache.
 *  - On every approve attempt — to ensure the cache is fresh before routing.
 *  - From the daily cron sweep — to keep all enabled integrations up-to-date.
 *
 * Buffer + Postiz both use static API keys (Buffer pivoted from OAuth on
 * 2026-04-29 — see plan changelog). A 401 surfaces as errorClass "auth" and
 * the integration is disabled; the user reconnects by pasting a fresh key.
 */

import { open } from "@/lib/crypto/secret-box";
import type { SealedSecret } from "@/lib/crypto/secret-box";
import {
  validateApiKey as validateBufferKey,
  fetchChannels as fetchBufferChannels,
  BufferAuthError,
} from "./buffer/client";
import { listIntegrations, PostizAuthError } from "./postiz/client";

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export type RefreshOk = { ok: true; channelCount: number; extra: string };
export type RefreshError = {
  ok: false;
  errorClass: "auth" | "transient" | "unknown";
  message: string;
};
export type RefreshResult = RefreshOk | RefreshError;

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Refresh the channel cache for one integration.
 *
 * @param sealed       - The sealed credential payload from integrationSecrets.
 * @param provider     - "buffer" | "postiz"
 * @param currentExtra - Current value of integrationSecrets.extra (may be null).
 * @returns            RefreshResult — on ok=true, `extra` is the new JSON string
 *                     to persist. On ok=false, `errorClass` signals auth vs transient.
 */
export async function refreshChannelsForProvider(
  sealed: SealedSecret,
  provider: "buffer" | "postiz",
  currentExtra: string | null,
): Promise<RefreshResult> {
  try {
    let newExtra: string;

    if (provider === "buffer") {
      newExtra = await refreshBufferChannels(sealed, currentExtra);
    } else {
      newExtra = await refreshPostizChannels(sealed, currentExtra);
    }

    return { ok: true, channelCount: countChannels(newExtra), extra: newExtra };
  } catch (err) {
    return classifyError(err);
  }
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

/**
 * Fetch Buffer channels using the API key inside the sealed payload.
 * Re-resolves the organizationId via validateApiKey (in case the user's first
 * org changed) and merges with existing extra to preserve unrelated fields.
 */
export async function refreshBufferChannels(
  sealed: SealedSecret,
  currentExtra: string | null,
): Promise<string> {
  const apiKey = open(sealed);

  const account = await validateBufferKey(apiKey);
  const channels = await fetchBufferChannels(apiKey, account.organizationId);

  const existing = parseExtra(currentExtra);
  const newExtra = {
    ...existing,
    organizationId: account.organizationId,
    channels,
  };

  return JSON.stringify(newExtra);
}

/**
 * Fetch Postiz integrations using the API key inside the sealed payload.
 * Instance URL is read from currentExtra.instanceUrl (falls back to cloud default).
 */
export async function refreshPostizChannels(
  sealed: SealedSecret,
  currentExtra: string | null,
): Promise<string> {
  const apiKey = open(sealed);

  const existing = parseExtra(currentExtra);
  const instanceUrl =
    typeof existing.instanceUrl === "string"
      ? existing.instanceUrl
      : "https://api.postiz.com";

  const channels = await listIntegrations(instanceUrl, apiKey);

  const newExtra = {
    ...existing,
    instanceUrl,
    channels,
  };

  return JSON.stringify(newExtra);
}

// ---------------------------------------------------------------------------
// Error classifier
// ---------------------------------------------------------------------------

export function classifyError(err: unknown): RefreshError {
  if (err instanceof BufferAuthError || err instanceof PostizAuthError) {
    return {
      ok: false,
      errorClass: "auth",
      message: err.message,
    };
  }

  const message = err instanceof Error ? err.message : String(err);

  // 5xx / network timeout / DNS failure → transient.
  if (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("timeout") ||
    /HTTP 5\d\d/.test(message)
  ) {
    return { ok: false, errorClass: "transient", message };
  }

  return { ok: false, errorClass: "unknown", message };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function parseExtra(extra: string | null): Record<string, unknown> {
  if (!extra) return {};
  try {
    return JSON.parse(extra) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function countChannels(extraJson: string): number {
  try {
    const parsed = JSON.parse(extraJson) as { channels?: unknown[] };
    return Array.isArray(parsed.channels) ? parsed.channels.length : 0;
  } catch {
    return 0;
  }
}
