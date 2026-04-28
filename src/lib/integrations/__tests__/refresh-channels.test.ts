/**
 * Unit tests for src/lib/integrations/refresh-channels.ts
 *
 * All outbound HTTP is mocked — no real network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SealedSecret } from "@/lib/crypto/secret-box";

// ---------------------------------------------------------------------------
// Mocks — declared before the module under test is imported so vi.mock hoisting
// can rewrite require() paths.
// ---------------------------------------------------------------------------

// secret-box: open() returns a deterministic plaintext based on ciphertext value.
vi.mock("@/lib/crypto/secret-box", () => ({
  open: (sealed: SealedSecret) => sealed.ciphertext, // ciphertext IS the plaintext in tests
  seal: (pt: string) => ({ ciphertext: pt, iv: "iv", tag: "tag" }),
}));

// Buffer oauth helper
vi.mock("@/lib/integrations/buffer/oauth", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/integrations/buffer/oauth")>();
  return {
    ...orig,
    fetchOrgAndChannels: vi.fn(),
  };
});

// Postiz client
vi.mock("@/lib/integrations/postiz/client", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/integrations/postiz/client")>();
  return {
    ...orig,
    listIntegrations: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  refreshChannelsForProvider,
  refreshBufferChannels,
  refreshPostizChannels,
  classifyError,
} from "../refresh-channels";
import { fetchOrgAndChannels, BufferAuthError } from "../buffer/oauth";
import { listIntegrations, PostizAuthError } from "../postiz/client";

const mockFetchOrgAndChannels = vi.mocked(fetchOrgAndChannels);
const mockListIntegrations = vi.mocked(listIntegrations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a SealedSecret where `ciphertext` is the plaintext (our mock `open`
 * just returns ciphertext verbatim).
 */
function makeSealed(plaintext: string): SealedSecret {
  return { ciphertext: plaintext, iv: "iv", tag: "tag" };
}

// ---------------------------------------------------------------------------
// Buffer tests
// ---------------------------------------------------------------------------

describe("refreshBufferChannels", () => {
  beforeEach(() => {
    mockFetchOrgAndChannels.mockReset();
  });

  it("happy path: updates organizationId and channels in extra", async () => {
    mockFetchOrgAndChannels.mockResolvedValueOnce({
      organizationId: "org-123",
      channels: [
        { id: "ch-1", name: "Twitter", service: "twitter", serviceType: "profile" },
        { id: "ch-2", name: "LinkedIn", service: "linkedin", serviceType: "profile" },
      ],
    });

    const sealed = makeSealed(JSON.stringify({ accessToken: "tok-abc", refreshToken: "rtok", expiresAt: 9999999 }));
    const result = await refreshBufferChannels(sealed, null);
    const parsed = JSON.parse(result) as { organizationId: string; channels: unknown[] };

    expect(parsed.organizationId).toBe("org-123");
    expect(parsed.channels).toHaveLength(2);
    expect(parsed.channels[0]).toMatchObject({ id: "ch-1", service: "twitter" });
  });

  it("new channel appears in extra after refresh", async () => {
    // First call: 1 channel
    const initialExtra = JSON.stringify({
      organizationId: "org-123",
      channels: [{ id: "ch-1", name: "Twitter", service: "twitter", serviceType: "profile" }],
    });

    // Second call: 2 channels (new channel added in Buffer)
    mockFetchOrgAndChannels.mockResolvedValueOnce({
      organizationId: "org-123",
      channels: [
        { id: "ch-1", name: "Twitter", service: "twitter", serviceType: "profile" },
        { id: "ch-2", name: "LinkedIn Page", service: "linkedin", serviceType: "profile" },
      ],
    });

    const sealed = makeSealed(JSON.stringify({ accessToken: "tok-abc", refreshToken: "rtok", expiresAt: 9999999 }));
    const result = await refreshBufferChannels(sealed, initialExtra);
    const parsed = JSON.parse(result) as { channels: Array<{ id: string }> };

    expect(parsed.channels).toHaveLength(2);
    expect(parsed.channels.map((c) => c.id)).toContain("ch-2");
  });

  it("empty channel list stored without error", async () => {
    mockFetchOrgAndChannels.mockResolvedValueOnce({
      organizationId: "org-123",
      channels: [],
    });

    const sealed = makeSealed(JSON.stringify({ accessToken: "tok-abc", refreshToken: "rtok", expiresAt: 9999999 }));
    const result = await refreshBufferChannels(sealed, null);
    const parsed = JSON.parse(result) as { channels: unknown[] };

    expect(parsed.channels).toEqual([]);
  });

  it("preserves existing extra fields not owned by channel refresh", async () => {
    mockFetchOrgAndChannels.mockResolvedValueOnce({
      organizationId: "org-123",
      channels: [],
    });

    const existingExtra = JSON.stringify({
      organizationId: "org-old",
      channels: [],
      expiresAt: 1234567890,
      someOtherField: "keep-me",
    });

    const sealed = makeSealed(JSON.stringify({ accessToken: "tok-abc", refreshToken: "rtok", expiresAt: 9999999 }));
    const result = await refreshBufferChannels(sealed, existingExtra);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    expect(parsed.someOtherField).toBe("keep-me");
    expect(parsed.expiresAt).toBe(1234567890);
  });
});

// ---------------------------------------------------------------------------
// Postiz tests
// ---------------------------------------------------------------------------

describe("refreshPostizChannels", () => {
  beforeEach(() => {
    mockListIntegrations.mockReset();
  });

  it("happy path: updates channels in extra", async () => {
    mockListIntegrations.mockResolvedValueOnce([
      {
        id: "int-1",
        identifier: "@handle",
        name: "My Twitter",
        disabled: false,
      },
    ]);

    const sealed = makeSealed("my-api-key");
    const currentExtra = JSON.stringify({ instanceUrl: "https://app.postiz.com" });

    const result = await refreshPostizChannels(sealed, currentExtra);
    const parsed = JSON.parse(result) as { channels: unknown[]; instanceUrl: string };

    expect(parsed.channels).toHaveLength(1);
    expect(parsed.instanceUrl).toBe("https://app.postiz.com");
  });

  it("disabled channel reflects in extra.channels[].disabled", async () => {
    mockListIntegrations.mockResolvedValueOnce([
      {
        id: "int-1",
        identifier: "@handle",
        name: "My Twitter",
        disabled: true,
      },
      {
        id: "int-2",
        identifier: "@biz",
        name: "Biz LinkedIn",
        disabled: false,
      },
    ]);

    const sealed = makeSealed("key");
    const result = await refreshPostizChannels(sealed, JSON.stringify({ instanceUrl: "https://api.postiz.com" }));
    const parsed = JSON.parse(result) as { channels: Array<{ disabled: boolean }> };

    expect(parsed.channels[0].disabled).toBe(true);
    expect(parsed.channels[1].disabled).toBe(false);
  });

  it("empty channel list stored without error", async () => {
    mockListIntegrations.mockResolvedValueOnce([]);

    const sealed = makeSealed("key");
    const result = await refreshPostizChannels(sealed, null);
    const parsed = JSON.parse(result) as { channels: unknown[] };

    expect(parsed.channels).toEqual([]);
  });

  it("falls back to cloud default instanceUrl when extra is null", async () => {
    mockListIntegrations.mockResolvedValueOnce([]);

    const sealed = makeSealed("key");
    await refreshPostizChannels(sealed, null);

    expect(mockListIntegrations).toHaveBeenCalledWith("https://api.postiz.com", "key");
  });
});

// ---------------------------------------------------------------------------
// refreshChannelsForProvider dispatcher
// ---------------------------------------------------------------------------

describe("refreshChannelsForProvider", () => {
  beforeEach(() => {
    mockFetchOrgAndChannels.mockReset();
    mockListIntegrations.mockReset();
  });

  it("Buffer: returns ok=true with channelCount and extra on success", async () => {
    mockFetchOrgAndChannels.mockResolvedValueOnce({
      organizationId: "org-x",
      channels: [
        { id: "c1", name: "TW", service: "twitter", serviceType: "profile" },
        { id: "c2", name: "IG", service: "instagram", serviceType: "profile" },
        { id: "c3", name: "LI", service: "linkedin", serviceType: "profile" },
      ],
    });

    const sealed = makeSealed(JSON.stringify({ accessToken: "tok", refreshToken: "rt", expiresAt: 99 }));
    const result = await refreshChannelsForProvider(sealed, "buffer", null);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.channelCount).toBe(3);
      const parsed = JSON.parse(result.extra) as { organizationId: string };
      expect(parsed.organizationId).toBe("org-x");
    }
  });

  it("Postiz: returns ok=true with channelCount on success", async () => {
    mockListIntegrations.mockResolvedValueOnce([
      { id: "i1", identifier: "@a", name: "A", disabled: false },
    ]);

    const sealed = makeSealed("key");
    const result = await refreshChannelsForProvider(
      sealed,
      "postiz",
      JSON.stringify({ instanceUrl: "https://api.postiz.com" }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.channelCount).toBe(1);
    }
  });

  it("Buffer: 401 → ok=false, errorClass=auth", async () => {
    mockFetchOrgAndChannels.mockRejectedValueOnce(
      new BufferAuthError("Buffer API returned 401 — token may be expired or revoked."),
    );

    const sealed = makeSealed(JSON.stringify({ accessToken: "expired", refreshToken: "rt", expiresAt: 0 }));
    const result = await refreshChannelsForProvider(sealed, "buffer", null);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorClass).toBe("auth");
    }
  });

  it("Postiz: 401 → ok=false, errorClass=auth", async () => {
    mockListIntegrations.mockRejectedValueOnce(
      new PostizAuthError("Postiz rejected the API key (HTTP 401)"),
    );

    const sealed = makeSealed("bad-key");
    const result = await refreshChannelsForProvider(
      sealed,
      "postiz",
      JSON.stringify({ instanceUrl: "https://api.postiz.com" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorClass).toBe("auth");
    }
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe("classifyError", () => {
  it("BufferAuthError → auth", () => {
    const r = classifyError(new BufferAuthError("expired"));
    expect(r.errorClass).toBe("auth");
  });

  it("PostizAuthError → auth", () => {
    const r = classifyError(new PostizAuthError("bad key"));
    expect(r.errorClass).toBe("auth");
  });

  it("ECONNREFUSED → transient", () => {
    const r = classifyError(new Error("ECONNREFUSED connect ECONNREFUSED 127.0.0.1:443"));
    expect(r.errorClass).toBe("transient");
  });

  it("fetch failed → transient", () => {
    const r = classifyError(new Error("fetch failed"));
    expect(r.errorClass).toBe("transient");
  });

  it("HTTP 503 → transient", () => {
    const r = classifyError(new Error("Postiz API returned HTTP 503"));
    expect(r.errorClass).toBe("transient");
  });

  it("unknown error → unknown", () => {
    const r = classifyError(new Error("something completely unexpected"));
    expect(r.errorClass).toBe("unknown");
  });

  it("non-Error thrown → unknown", () => {
    const r = classifyError("string error");
    expect(r.errorClass).toBe("unknown");
  });
});
