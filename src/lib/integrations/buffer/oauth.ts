/**
 * Buffer OAuth 2.0 helpers.
 *
 * Covers:
 *  - Code → token exchange (exchangeCode)
 *  - Token refresh with rotation support (refreshBufferToken)
 *  - Organization + channel fetching via GraphQL (fetchOrgAndChannels)
 *
 * Env vars required: BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET, BUFFER_REDIRECT_URI
 */

import { seal, open } from "@/lib/crypto/secret-box";
import type { SealedSecret } from "@/lib/crypto/secret-box";
import { bufferGraphQL, BufferAuthError } from "./graphql";

// --- Types ---

export interface BufferTokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export interface BufferChannel {
  id: string;
  name: string;
  service: string; // "twitter", "linkedin", etc.
  serviceType: string;
}

export interface BufferOrgInfo {
  organizationId: string;
  channels: BufferChannel[];
}

export class BufferRefreshFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BufferRefreshFailed";
  }
}

// --- Constants ---

const TOKEN_ENDPOINT = "https://auth.buffer.com/token";
const AUTHORIZE_ENDPOINT = "https://auth.buffer.com/auth";

export const BUFFER_SCOPES = "posts:read posts:write account:read offline_access";

// --- URL builder ---

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", BUFFER_SCOPES);
  url.searchParams.set("state", params.state);
  return url.toString();
}

// --- Token exchange ---

interface RawTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
}

async function requestToken(body: URLSearchParams): Promise<BufferTokenPayload> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Buffer /token ${res.status}: ${text}`);
  }

  const data = (await res.json()) as RawTokenResponse;
  if (!data.access_token || !data.refresh_token) {
    throw new Error("Buffer /token response missing access_token or refresh_token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(code: string): Promise<BufferTokenPayload> {
  const clientId = process.env.BUFFER_CLIENT_ID;
  const clientSecret = process.env.BUFFER_CLIENT_SECRET;
  const redirectUri = process.env.BUFFER_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET, or BUFFER_REDIRECT_URI env vars.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  return requestToken(body);
}

/**
 * Refresh a Buffer token using the refresh token embedded in the sealed payload.
 *
 * Buffer rotates the refresh token on every call — the caller MUST store the
 * returned SealedSecret immediately (use the refresh-lease pattern in claimRefreshLease
 * + commitRefresh to avoid concurrent calls).
 *
 * Throws BufferRefreshFailed on 401 (revoked grant).
 */
export async function refreshBufferToken(
  currentSealed: SealedSecret,
): Promise<{ tokens: BufferTokenPayload; sealed: SealedSecret }> {
  const clientId = process.env.BUFFER_CLIENT_ID;
  const clientSecret = process.env.BUFFER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing BUFFER_CLIENT_ID or BUFFER_CLIENT_SECRET env vars.");
  }

  let payload: BufferTokenPayload;
  try {
    payload = JSON.parse(open(currentSealed)) as BufferTokenPayload;
  } catch {
    throw new Error("Failed to unseal current Buffer token payload.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: payload.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  let newTokens: BufferTokenPayload;
  try {
    newTokens = await requestToken(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401")) {
      throw new BufferRefreshFailed(
        `Buffer refresh token is revoked — user must reconnect. (${msg})`,
      );
    }
    throw err;
  }

  const newSealed = seal(JSON.stringify(newTokens));
  return { tokens: newTokens, sealed: newSealed };
}

// --- Org + channel fetch ---

const ORG_CHANNELS_QUERY = `
  query GetOrgAndChannels {
    currentUser {
      id
      currentOrganization {
        id
        channels {
          id
          name
          service
          serviceType
        }
      }
    }
  }
`;

interface OrgChannelsResponse {
  currentUser: {
    id: string;
    currentOrganization: {
      id: string;
      channels: Array<{
        id: string;
        name: string;
        service: string;
        serviceType: string;
      }>;
    };
  };
}

/**
 * Fetch the user's organization ID and connected channels.
 * Used during connect to populate extra metadata.
 */
export async function fetchOrgAndChannels(
  accessToken: string,
): Promise<BufferOrgInfo> {
  const data = await bufferGraphQL<OrgChannelsResponse>(
    accessToken,
    ORG_CHANNELS_QUERY,
  );

  const org = data.currentUser.currentOrganization;
  return {
    organizationId: org.id,
    channels: org.channels.map((c) => ({
      id: c.id,
      name: c.name,
      service: c.service,
      serviceType: c.serviceType,
    })),
  };
}

// Re-export for convenience
export { BufferAuthError };
