/**
 * Buffer GraphQL client (API-key auth).
 *
 * Buffer no longer accepts new OAuth app registrations; the public path is the
 * "App Token" pattern: user generates a long-lived API key in Buffer's settings
 * and pastes it into bragfast. We send it as `Authorization: Bearer <apiKey>`.
 *
 * See: https://developers.buffer.com/guides/getting-started.html
 */

import { bufferGraphQL, BufferAuthError } from "./graphql";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BufferOrganization {
  id: string;
  name: string;
}

export interface BufferChannel {
  id: string;
  name: string;
  service: string; // "twitter" | "linkedin" | "instagram" | ...
}

export interface BufferAccountInfo {
  /** First organization — the one we'll associate channels and posts with. */
  organizationId: string;
  /** All organizations on the API key, for surfacing multi-org warnings. */
  organizations: BufferOrganization[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const ACCOUNT_QUERY = `
  query GetAccount {
    account {
      organizations {
        id
        name
      }
    }
  }
`;

const CHANNELS_QUERY = `
  query GetChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      name
      service
    }
  }
`;

interface AccountResponse {
  account: {
    organizations: Array<{ id: string; name: string }>;
  };
}

interface ChannelsResponse {
  channels: Array<{ id: string; name: string; service: string }>;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Probe a Buffer API key. Returns the user's organizations.
 *
 * Throws BufferAuthError when the key is rejected (401/403 or GraphQL UNAUTHORIZED).
 */
export async function validateApiKey(apiKey: string): Promise<BufferAccountInfo> {
  const data = await bufferGraphQL<AccountResponse>(apiKey, ACCOUNT_QUERY);

  const orgs = data.account?.organizations ?? [];
  if (orgs.length === 0) {
    throw new BufferAuthError(
      "Buffer API key valid but returned no organizations — cannot post without an org.",
    );
  }

  return {
    organizationId: orgs[0].id,
    organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
  };
}

/**
 * Fetch the channels (X, LinkedIn, IG, …) connected to the given organization.
 */
export async function fetchChannels(
  apiKey: string,
  organizationId: string,
): Promise<BufferChannel[]> {
  const data = await bufferGraphQL<ChannelsResponse>(apiKey, CHANNELS_QUERY, {
    input: { organizationId },
  });

  return (data.channels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    service: c.service,
  }));
}

// Re-export for callers that want to catch auth-specific failures.
export { BufferAuthError };
