/**
 * Buffer GraphQL helper.
 *
 * Buffer uses GraphQL for account / channel data.
 * Endpoint: POST https://api.buffer.com/graphql
 */

export class BufferAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BufferAuthError";
  }
}

export class BufferGraphQLError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ message: string; extensions?: Record<string, unknown> }>,
  ) {
    super(message);
    this.name = "BufferGraphQLError";
  }
}

const GRAPHQL_ENDPOINT = "https://api.buffer.com/graphql";

export async function bufferGraphQL<T = unknown>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new BufferAuthError(
      `Buffer API returned ${res.status} — token may be expired or revoked.`,
    );
  }

  if (!res.ok) {
    throw new Error(`Buffer GraphQL HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
  };

  if (json.errors && json.errors.length > 0) {
    // Check for auth errors at the GraphQL layer
    const firstErr = json.errors[0];
    const code = firstErr.extensions?.code as string | undefined;
    if (code === "UNAUTHORIZED" || code === "UNAUTHENTICATED") {
      throw new BufferAuthError(`Buffer GraphQL auth error: ${firstErr.message}`);
    }
    throw new BufferGraphQLError(
      `Buffer GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`,
      json.errors,
    );
  }

  if (json.data === undefined) {
    throw new Error("Buffer GraphQL response missing data field");
  }

  return json.data;
}
