import { beforeEach, describe, expect, it, vi } from "vitest";

const validateApiKeyMock = vi.fn();
const getSessionUserMock = vi.fn();
const approveDraftPostMock = vi.fn();

vi.mock("@/lib/auth/validate-api-key", () => ({
  validateApiKey: validateApiKeyMock,
}));

vi.mock("@/lib/auth/get-session-user", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/posts/approve-draft", () => ({
  approveDraftPost: approveDraftPostMock,
}));

describe("POST /api/v1/drafts/[id]/approve", () => {
  beforeEach(() => {
    vi.resetModules();
    validateApiKeyMock.mockReset();
    getSessionUserMock.mockReset();
    approveDraftPostMock.mockReset();
    approveDraftPostMock.mockResolvedValue({
      status: 200,
      body: { ok: true },
    });
  });

  it("passes API-key callers as an explicit Post approval actor", async () => {
    validateApiKeyMock.mockResolvedValue({ userId: "user_api" });
    getSessionUserMock.mockResolvedValue(null);

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/drafts/drf_123/approve", {
        method: "POST",
        body: JSON.stringify({
          title: "Title",
          description: "Description",
          selections: [{ format: "square", provider: "buffer", channelId: "ch_1" }],
          postState: "queue",
          clientNonce: "nonce_1",
        }),
      }),
      { params: Promise.resolve({ id: "drf_123" }) },
    );

    expect(res.status).toBe(200);
    expect(approveDraftPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: "user_api", source: "api_key" },
        draftId: "drf_123",
      }),
    );
  });

  it("passes session callers as an explicit Post approval actor", async () => {
    validateApiKeyMock.mockResolvedValue(null);
    getSessionUserMock.mockResolvedValue({ _id: "user_session" });

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/drafts/drf_123/approve", {
        method: "POST",
        body: JSON.stringify({
          title: "Title",
          description: "Description",
          selections: [{ format: "square", provider: "buffer", channelId: "ch_1" }],
          postState: "queue",
          clientNonce: "nonce_1",
        }),
      }),
      { params: Promise.resolve({ id: "drf_123" }) },
    );

    expect(res.status).toBe(200);
    expect(approveDraftPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: "user_session", source: "session" },
        draftId: "drf_123",
      }),
    );
  });

  it("returns 401 when neither auth path resolves", async () => {
    validateApiKeyMock.mockResolvedValue(null);
    getSessionUserMock.mockResolvedValue(null);

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/drafts/drf_123/approve", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "drf_123" }) },
    );

    expect(res.status).toBe(401);
    expect(approveDraftPostMock).not.toHaveBeenCalled();
  });
});
