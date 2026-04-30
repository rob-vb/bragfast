/**
 * Provider-agnostic push dispatcher.
 *
 * Receives a draftPushes row + unsealed credentials and routes to the correct
 * provider client. Returns { providerPostId } on success, throws PushError on failure.
 *
 * Buffer + Postiz both seal a plain API-key string (no JSON wrapper). Buffer
 * was OAuth historically; pivoted 2026-04-29 to API key (see plan changelog).
 * The caller (convex/pushFanout.ts) unseals the secret and finalizes the row.
 */

import { PushError } from "./error-classes";
import { pushToBuffer } from "./buffer/push";
import { pushToPostiz } from "./postiz/push";

export interface SealedRow {
  ciphertext: string;
  iv: string;
  tag: string;
  extra: string | null;
}

export interface PushRow {
  _id: string;
  draftId: string;
  format: string;
  provider: "buffer" | "postiz";
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  postState: "queue" | "draft";
  attempts: number;
}

/**
 * Dispatch a push row to the appropriate provider.
 *
 * @param row - The draftPushes row (already claimed as in_flight)
 * @param sealedRow - The integrationSecrets row with encrypted apiKey + extra
 * @param openSecret - Function to unseal the credential (secret-box.open compatible).
 *   Returns the plain apiKey string for both Buffer and Postiz.
 */
export async function dispatchPush(
  row: PushRow,
  sealedRow: SealedRow,
  openSecret: (sealed: { ciphertext: string; iv: string; tag: string }) => string,
): Promise<{ providerPostId: string }> {
  let apiKey: string;
  try {
    apiKey = openSecret(sealedRow);
  } catch {
    throw new PushError(
      "auth",
      `Failed to unseal ${row.provider} credentials`,
    );
  }

  if (row.provider === "buffer") {
    return pushToBuffer({
      apiKey,
      channelId: row.channelId,
      title: row.title,
      description: row.description,
      mediaUrl: row.mediaUrl,
      format: row.format,
      postState: row.postState,
    });
  }

  if (row.provider === "postiz") {
    let extra: { instanceUrl?: string } = {};
    if (sealedRow.extra) {
      try {
        extra = JSON.parse(sealedRow.extra) as { instanceUrl?: string };
      } catch {
        // extra is best-effort; fall through to default
      }
    }

    const instanceUrl = extra.instanceUrl ?? "https://api.postiz.com";

    return pushToPostiz({
      apiKey,
      instanceUrl,
      channelId: row.channelId,
      title: row.title,
      description: row.description,
      mediaUrl: row.mediaUrl,
      postState: row.postState,
    });
  }

  throw new PushError("unknown", `Unsupported provider: ${row.provider}`);
}
