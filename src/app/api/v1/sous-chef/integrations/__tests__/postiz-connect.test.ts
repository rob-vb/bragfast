import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const actionMock = vi.fn();
const authenticateMock = vi.fn();
const sealMock = vi.fn();
const listIntegrationsMock = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    action = actionMock;
    query = vi.fn();
    mutation = vi.fn();
  },
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    integrationSecrets: {
      upsertAction: "api.integrationSecrets.upsertAction",
      disconnectAction: "api.integrationSecrets.disconnectAction",
      listByUser: "api.integrationSecrets.listByUser",
    },
    sousChef: {
      seedAction: "api.sousChef.seedAction",
    },
  },
}));

vi.mock("@/lib/auth/authenticate", () => ({
  authenticate: authenticateMock,
}));

vi.mock("@/lib/crypto/secret-box", () => ({
  seal: sealMock,
}));

vi.mock("@/lib/integrations/postiz/client", () => ({
  listIntegrations: listIntegrationsMock,
  normalizeInstanceUrl: (u: string) => u.replace(/\/+$/, ""),
  PostizAuthError: class PostizAuthError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "PostizAuthError";
    }
  },
  PostizApiError: class PostizApiError extends Error {
    constructor(msg: string, public status: number) {
      super(msg);
      this.name = "PostizApiError";
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/v1/sous-chef/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_POSTIZ_BODY = {
  provider: "postiz",
  instanceUrl: "https://api.postiz.com",
  apiKey: "postiz-api-key-12345",
};

const SAMPLE_CHANNELS = [
  { id: "ch_1", identifier: "linkedin", name: "My LinkedIn", disabled: false },
  { id: "ch_2", identifier: "x", name: "My X", disabled: false },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/sous-chef/integrations — Postiz branch", () => {
  beforeEach(() => {
    vi.resetModules();
    actionMock.mockReset();
    authenticateMock.mockReset();
    sealMock.mockReset();
    listIntegrationsMock.mockReset();

    authenticateMock.mockResolvedValue({ userId: "user_123" });
    sealMock.mockReturnValue({ ciphertext: "ct", iv: "iv", tag: "tg" });
  });

  it("happy path: probes, stores, returns 200 with channelCount", async () => {
    listIntegrationsMock.mockResolvedValueOnce(SAMPLE_CHANNELS);
    actionMock.mockResolvedValueOnce(undefined); // upsertAction

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, provider: "postiz", channelCount: 2 });
  });

  it("stores sealed apiKey and extra with instanceUrl + channels", async () => {
    listIntegrationsMock.mockResolvedValueOnce(SAMPLE_CHANNELS);
    actionMock.mockResolvedValueOnce(undefined);

    const { POST } = await import("../route");
    await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(actionMock).toHaveBeenCalledWith(
      "api.integrationSecrets.upsertAction",
      expect.objectContaining({
        userId: "user_123",
        provider: "postiz",
        ciphertext: "ct",
        iv: "iv",
        tag: "tg",
        extra: JSON.stringify({
          instanceUrl: "https://api.postiz.com",
          channels: SAMPLE_CHANNELS,
        }),
      }),
    );
  });

  it("does NOT call seedAction for postiz", async () => {
    listIntegrationsMock.mockResolvedValueOnce(SAMPLE_CHANNELS);
    actionMock.mockResolvedValueOnce(undefined);

    const { POST } = await import("../route");
    await POST(makeRequest(VALID_POSTIZ_BODY));

    const seedCalls = actionMock.mock.calls.filter(
      ([key]) => key === "api.sousChef.seedAction",
    );
    expect(seedCalls).toHaveLength(0);
  });

  it("normalizes trailing slash in instanceUrl", async () => {
    listIntegrationsMock.mockResolvedValueOnce([]);
    actionMock.mockResolvedValueOnce(undefined);

    const { POST } = await import("../route");
    await POST(
      makeRequest({ ...VALID_POSTIZ_BODY, instanceUrl: "https://api.postiz.com/" }),
    );

    expect(actionMock).toHaveBeenCalledWith(
      "api.integrationSecrets.upsertAction",
      expect.objectContaining({
        extra: JSON.stringify({
          instanceUrl: "https://api.postiz.com",
          channels: [],
        }),
      }),
    );
  });

  it("returns 200 with channelCount:0 when Postiz returns empty channels", async () => {
    listIntegrationsMock.mockResolvedValueOnce([]);
    actionMock.mockResolvedValueOnce(undefined);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.channelCount).toBe(0);
  });

  it("returns 400 with 'key rejected' when probe throws PostizAuthError", async () => {
    const { PostizAuthError } = await import(
      "@/lib/integrations/postiz/client"
    );
    listIntegrationsMock.mockRejectedValueOnce(
      new PostizAuthError("Postiz rejected the API key (HTTP 401)"),
    );

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/key rejected/);
    // No row should be stored
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when instanceUrl is missing scheme", async () => {
    const { validateBody } = await import("../route");
    const result = validateBody({
      provider: "postiz",
      instanceUrl: "api.postiz.com",
      apiKey: "postiz-api-key-12345",
    });
    expect(result).toEqual({
      error: "instanceUrl must include a scheme (https:// or http://)",
    });
  });

  it("returns 400 when instanceUrl is empty", async () => {
    const { validateBody } = await import("../route");
    const result = validateBody({
      provider: "postiz",
      instanceUrl: "",
      apiKey: "postiz-api-key-12345",
    });
    expect(result).toEqual({ error: "instanceUrl required" });
  });

  it("returns 400 when apiKey is too short", async () => {
    const { validateBody } = await import("../route");
    const result = validateBody({
      provider: "postiz",
      instanceUrl: "https://api.postiz.com",
      apiKey: "ab",
    });
    expect(result).toEqual({ error: "apiKey required" });
  });

  it("returns 504 when probe times out", async () => {
    listIntegrationsMock.mockRejectedValueOnce(
      new Error("Request to api.postiz.com timed out after 10000ms"),
    );

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(504);
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when probe fails with SSRF guard (IMDS)", async () => {
    listIntegrationsMock.mockRejectedValueOnce(
      new Error("instance URL not reachable: resolved to blocked IP 169.254.169.254"),
    );

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/instance URL not reachable/);
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 504 for generic network error during probe (no row stored)", async () => {
    listIntegrationsMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(504);
    const disconnectCalls = actionMock.mock.calls.filter(
      ([key]) => key === "api.integrationSecrets.disconnectAction",
    );
    // No upsert happened, so no rollback needed
    expect(actionMock).not.toHaveBeenCalled();
    expect(disconnectCalls).toHaveLength(0);
  });

  it("returns 401 when auth fails", async () => {
    authenticateMock.mockResolvedValueOnce(null);

    const { POST } = await import("../route");
    const res = await POST(makeRequest(VALID_POSTIZ_BODY));

    expect(res.status).toBe(401);
    expect(actionMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// validateBody tests
// ---------------------------------------------------------------------------

describe("validateBody — postiz", () => {
  it("accepts valid postiz body", async () => {
    const { validateBody } = await import("../route");
    const result = validateBody({
      provider: "postiz",
      instanceUrl: "https://api.postiz.com",
      apiKey: "abcd1234",
    });
    expect(result).toEqual({
      provider: "postiz",
      instanceUrl: "https://api.postiz.com",
      apiKey: "abcd1234",
    });
  });

  it("strips trailing slash from instanceUrl", async () => {
    const { validateBody } = await import("../route");
    const result = validateBody({
      provider: "postiz",
      instanceUrl: "https://api.postiz.com/",
      apiKey: "abcd1234",
    });
    expect("error" in result ? result.error : (result as { instanceUrl: string }).instanceUrl).toBe(
      "https://api.postiz.com",
    );
  });
});
