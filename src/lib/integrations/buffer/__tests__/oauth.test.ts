/**
 * Tests for Buffer OAuth helpers.
 *
 * Covers:
 *  - Happy path: exchangeCode returns parsed token payload
 *  - Refresh happy path: rotated tokens are returned and can be re-sealed
 *  - Refresh 401 (revoked grant): throws BufferRefreshFailed
 *  - fetchOrgAndChannels: returns parsed org/channel data
 *  - fetchOrgAndChannels: throws BufferAuthError on 401
 *  - buildAuthorizeUrl: correct query parameters
 *
 * Additional callback-route test scenarios (state, session-binding) are covered
 * as integration tests or by the route handler's inline logic; the OAuth helper
 * tests here exercise the pure HTTP / crypto layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exchangeCode, refreshBufferToken, fetchOrgAndChannels, buildAuthorizeUrl, BufferRefreshFailed } from "../oauth";
import { seal } from "@/lib/crypto/secret-box";
import type { BufferTokenPayload } from "../oauth";

// --- Helpers ---

function makeTokenResponse(overrides: Partial<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> = {}) {
  return {
    access_token: overrides.access_token ?? "at_abc",
    refresh_token: overrides.refresh_token ?? "rt_xyz",
    expires_in: overrides.expires_in ?? 3600,
  };
}

function makeOrgResponse() {
  return {
    data: {
      currentUser: {
        id: "user_1",
        currentOrganization: {
          id: "org_1",
          channels: [
            { id: "ch_tw", name: "My Twitter", service: "twitter", serviceType: "profile" },
            { id: "ch_li", name: "My LinkedIn", service: "linkedin", serviceType: "profile" },
          ],
        },
      },
    },
  };
}

// Seed env vars required by the helpers
beforeEach(() => {
  process.env.BUFFER_CLIENT_ID = "test_client_id";
  process.env.BUFFER_CLIENT_SECRET = "test_client_secret";
  process.env.BUFFER_REDIRECT_URI = "http://localhost:3000/api/integrations/buffer/callback";
  // SECRET_BOX_KEY must be 32 bytes base64-encoded
  process.env.SECRET_BOX_KEY = Buffer.alloc(32).toString("base64");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- exchangeCode ---

describe("exchangeCode", () => {
  it("exchanges code and returns parsed token payload", async () => {
    const tokenResp = makeTokenResponse();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(tokenResp), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const before = Date.now();
    const result = await exchangeCode("code_abc");
    const after = Date.now();

    expect(result.accessToken).toBe("at_abc");
    expect(result.refreshToken).toBe("rt_xyz");
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(result.expiresAt).toBeLessThanOrEqual(after + 3600 * 1000);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://auth.buffer.com/token");
    const body = new URLSearchParams(init?.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code_abc");
  });

  it("throws on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("invalid_code", { status: 400 }),
    );

    await expect(exchangeCode("bad_code")).rejects.toThrow("400");
  });
});

// --- refreshBufferToken ---

describe("refreshBufferToken", () => {
  it("rotates tokens and returns new sealed payload", async () => {
    const oldPayload: BufferTokenPayload = {
      accessToken: "old_at",
      refreshToken: "old_rt",
      expiresAt: Date.now() + 60_000,
    };
    const currentSealed = seal(JSON.stringify(oldPayload));

    const newTokenResp = makeTokenResponse({
      access_token: "new_at",
      refresh_token: "new_rt",
      expires_in: 7200,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(newTokenResp), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { tokens, sealed } = await refreshBufferToken(currentSealed);

    expect(tokens.accessToken).toBe("new_at");
    expect(tokens.refreshToken).toBe("new_rt");
    // The sealed payload must contain the new tokens
    expect(sealed.ciphertext).toBeTruthy();
    expect(sealed.iv).toBeTruthy();
    expect(sealed.tag).toBeTruthy();
    // Sealed value is different from the original
    expect(sealed.ciphertext).not.toBe(currentSealed.ciphertext);
  });

  it("throws BufferRefreshFailed on 401 (revoked grant)", async () => {
    const oldPayload: BufferTokenPayload = {
      accessToken: "old_at",
      refreshToken: "revoked_rt",
      expiresAt: Date.now() - 1000, // already expired
    };
    const currentSealed = seal(JSON.stringify(oldPayload));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(refreshBufferToken(currentSealed)).rejects.toThrow(BufferRefreshFailed);
  });

  it("detects rotated refresh token reuse — old refresh is rejected with 401", async () => {
    // If the old refresh token was already rotated away, the server returns 401.
    // This simulates: first refresh succeeded somewhere else, now we're using the stale one.
    const stalePayload: BufferTokenPayload = {
      accessToken: "stale_at",
      refreshToken: "stale_rt_already_rotated",
      expiresAt: Date.now() - 1000,
    };
    const staleSealed = seal(JSON.stringify(stalePayload));

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response('{"error":"invalid_grant"}', { status: 401 }),
    );

    await expect(refreshBufferToken(staleSealed)).rejects.toThrow(BufferRefreshFailed);
  });
});

// --- fetchOrgAndChannels ---

describe("fetchOrgAndChannels", () => {
  it("returns organizationId and channels on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(makeOrgResponse()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchOrgAndChannels("at_valid");

    expect(result.organizationId).toBe("org_1");
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0]).toMatchObject({
      id: "ch_tw",
      name: "My Twitter",
      service: "twitter",
    });
  });

  it("throws BufferAuthError on 401 from GraphQL endpoint", async () => {
    const { BufferAuthError } = await import("../graphql");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(fetchOrgAndChannels("expired_token")).rejects.toThrow(BufferAuthError);
  });

  it("throws BufferGraphQLError when response contains errors[]", async () => {
    const { BufferGraphQLError } = await import("../graphql");
    const errorResp = {
      errors: [{ message: "Something went wrong", extensions: { code: "INTERNAL" } }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(errorResp), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchOrgAndChannels("at_valid")).rejects.toThrow(BufferGraphQLError);
  });
});

// --- buildAuthorizeUrl ---

describe("buildAuthorizeUrl", () => {
  it("builds a correct authorize URL with required params", () => {
    const url = buildAuthorizeUrl({
      clientId: "cid",
      redirectUri: "https://example.com/callback",
      state: "nonce123",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://auth.buffer.com/auth");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("cid");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://example.com/callback");
    expect(parsed.searchParams.get("state")).toBe("nonce123");
    const scopes = parsed.searchParams.get("scope")!.split(" ");
    expect(scopes).toContain("offline_access");
    expect(scopes).toContain("posts:write");
  });
});
