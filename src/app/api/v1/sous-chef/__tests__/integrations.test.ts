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
    userProfiles: {
      getByUserId: "api.userProfiles.getByUserId",
    },
  },
}));

vi.mock("@/lib/auth/authenticate", () => ({
  authenticate: authenticateMock,
}));

vi.mock("@/lib/crypto/secret-box", () => ({
  seal: sealMock,
}));

// captureServer is a fire-and-forget side effect — mock it to avoid network calls
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServer: vi.fn().mockResolvedValue(undefined),
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
    queryMock.mockImplementation((name: string) => {
      if (name === "api.integrationSecrets.listByUser") {
        return Promise.resolve([]);
      }
      return Promise.resolve(null);
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

  it("stores the secret for an analytics provider (no seedAction)", async () => {
    actionMock.mockResolvedValue(undefined);

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
    // Route calls upsertAction only — seedAction was removed with sousChef.ts
    expect(actionMock).toHaveBeenCalledTimes(1);
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
  });

  it("stores stripe secret and returns 200", async () => {
    actionMock.mockResolvedValue(undefined);

    const { POST } = await import("../integrations/route");
    const response = await POST(
      new Request("http://localhost/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "stripe", apiKey: "rk_test_123456789" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(actionMock).toHaveBeenCalledWith(
      "api.integrationSecrets.upsertAction",
      expect.objectContaining({
        userId: "user_123",
        provider: "stripe",
      }),
    );
  });
});
