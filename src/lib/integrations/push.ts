/**
 * Provider-agnostic push dispatcher.
 *
 * Receives a draftPushes row + unsealed credentials and routes to the correct
 * provider client. Returns { providerPostId } on success, throws PushError on failure.
 *
 * The caller (convex/pushFanout.ts) is responsible for:
 *  - Unsealing the credential payload (via secret-box.open)
 *  - Buffer refresh-lease logic (check expiresAt, claimRefreshLease, commitRefresh)
 *  - Finalizing the row state after dispatch
 */

import { PushError } from "./error-classes";
import { pushToBuffer } from "./buffer/push";
import { pushToPostiz } from "./postiz/push";

// ---------------------------------------------------------------------------
// Types matching the DB row shape passed from pushFanout
// ---------------------------------------------------------------------------

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

// Parsed Buffer token payload (matches BufferTokenPayload in oauth.ts)
interface BufferCreds {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Parsed Postiz creds (matches shape written during connect)
interface PostizCreds {
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Dispatch a push row to the appropriate provider.
 *
 * @param row - The draftPushes row (already claimed as in_flight)
 * @param sealedRow - The integrationSecrets row with encrypted creds + extra
 * @param openSecret - Function to unseal the credential (secret-box.open compatible)
 * @returns { providerPostId }
 * @throws PushError with classified errorClass on any failure
 */
export async function dispatchPush(
  row: PushRow,
  sealedRow: SealedRow,
  openSecret: (sealed: { ciphertext: string; iv: string; tag: string }) => string,
): Promise<{ providerPostId: string }> {
  if (row.provider === "buffer") {
    let creds: BufferCreds;
    try {
      creds = JSON.parse(openSecret(sealedRow)) as BufferCreds;
    } catch {
      throw new PushError("auth", "Failed to unseal Buffer credentials");
    }

    return pushToBuffer({
      accessToken: creds.accessToken,
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

    let creds: PostizCreds;
    try {
      creds = JSON.parse(openSecret(sealedRow)) as PostizCreds;
    } catch {
      throw new PushError("auth", "Failed to unseal Postiz credentials");
    }

    const instanceUrl = extra.instanceUrl ?? "https://api.postiz.com";

    return pushToPostiz({
      apiKey: creds.apiKey,
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
