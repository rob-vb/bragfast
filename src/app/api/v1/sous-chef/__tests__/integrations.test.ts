import { beforeEach, describe, expect, it, vi } from "vitest";

const mutationMock = vi.fn();
const queryMock = vi.fn();
const actionMock = vi.fn();
const authenticateMock = vi.fn();
const sealMock = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    mutation = mutationMock;
    query = queryMock;
    action = actionMock;
  },
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    integrationSecrets: {
      listByUser: "api.integrationSecrets.listByUser",
      upsertAction: "api.integrationSecrets.upsertAction",
      disconnectAction: "api.integrationSecrets.disconnectAction",
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

describe("/api/v1/sous-chef/integrations", () => {
  beforeEach(() => {
    vi.resetModules();
    mutationMock.mockReset();
    queryMock.mockReset();
    actionMock.mockReset();
    authenticateMock.mockReset();
    sealMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
    sealMock.mockReturnValue({
      ciphertext: "ciphertext",
      iv: "iv",
      tag: "tag",
    });
  });

  it("rejects non-allowlisted PostHog hosts", async () => {
    const { validateBody } = await import("../integrations/route");
    expect(
      validateBody({
        provider: "posthog",
        apiKey: "phc_test_123456789",
        projectId: "123",
        host: "https://attacker.example",
      }),
    ).toEqual({ error: "host must be a known PostHog cloud URL" });
  });

  it("rejects invalid GA4 JSON payloads", async () => {
    const { validateBody } = await import("../integrations/route");
    expect(
      validateBody({
        provider: "ga4",
        propertyId: "123456",
        serviceAccountJson:
          "{not json......................................................}",
      }),
    ).toEqual({ error: "service account JSON is not valid JSON" });
  });

  it("returns 401 when auth fails", async () => {
    authenticateMock.mockResolvedValueOnce(null);
    const { POST } = await import("../integrations/route");

    const response = await POST(
      new Request("http://localhost/api/v1/sous-chef/integrations", {
        method: "POST",
        body: JSON.stringify({ provider: "stripe", apiKey: "rk_test_123456789" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mutationMock).not.toHaveBeenCalled();
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("disconnects and returns 502 when seeding fails after connect", async () => {
    actionMock.mockResolvedValueOnce({ created: true }); // upsertAction succeeds
    actionMock.mockRejectedValueOnce(new Error("seed blew up")); // seedAction fails
    actionMock.mockResolvedValueOnce(true); // disconnectAction

    const { POST } = await import("../integrations/route");
    const response = await POST(
      new Request("http://localhost/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "stripe", apiKey: "rk_test_123456789" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(actionMock).toHaveBeenNthCalledWith(
      1,
      "api.integrationSecrets.upsertAction",
      expect.objectContaining({
        userId: "user_123",
        provider: "stripe",
      }),
    );
    expect(actionMock).toHaveBeenNthCalledWith(2, "api.sousChef.seedAction", {
      userId: "user_123",
      provider: "stripe",
    });
    expect(actionMock).toHaveBeenNthCalledWith(
      3,
      "api.integrationSecrets.disconnectAction",
      { userId: "user_123", provider: "stripe" },
    );
  });

  it("stores the secret and seeds successfully for an allowlisted PostHog host", async () => {
    actionMock.mockResolvedValue({ seeded: [100] });

    const { POST } = await import("../integrations/route");
    const response = await POST(
      new Request("http://localhost/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "posthog",
          apiKey: "phc_test_123456789",
          projectId: "123",
          host: "https://us.posthog.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(actionMock).toHaveBeenCalledWith(
      "api.integrationSecrets.upsertAction",
      expect.objectContaining({
        userId: "user_123",
        provider: "posthog",
        extra: JSON.stringify({
          projectId: "123",
          host: "https://us.posthog.com",
        }),
      }),
    );
    expect(actionMock).toHaveBeenCalledWith("api.sousChef.seedAction", {
      userId: "user_123",
      provider: "posthog",
    });
  });
});
