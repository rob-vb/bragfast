import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMutationMock = vi.fn();
const fetchQueryMock = vi.fn();
const createReleaseMock = vi.fn();
const renderReleaseAsyncMock = vi.fn();
const getReleaseMock = vi.fn();

vi.mock("convex/nextjs", () => ({
  fetchMutation: fetchMutationMock,
  fetchQuery: fetchQueryMock,
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    drafts: {
      getByExternalId: "api.drafts.getByExternalId",
      remove: "api.drafts.remove",
    },
    userProfiles: {
      reserve: "api.userProfiles.reserve",
      refund: "api.userProfiles.refund",
    },
    draftPushes: {
      approveDraft: "api.draftPushes.approveDraft",
    },
  },
}));

vi.mock("@/lib/pipeline/render", () => ({
  createRelease: createReleaseMock,
  renderReleaseAsync: renderReleaseAsyncMock,
  getRelease: getReleaseMock,
}));

describe("approveDraftPost", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMutationMock.mockReset();
    fetchQueryMock.mockReset();
    createReleaseMock.mockReset();
    renderReleaseAsyncMock.mockReset();
    getReleaseMock.mockReset();
  });

  it("rejects empty selections before touching storage or Convex", async () => {
    const { approveDraftPost } = await import("../approve-draft");

    const result = await approveDraftPost({
      actor: { userId: "user_123", source: "api_key" },
      draftId: "drf_123",
      body: {
        title: "Ship",
        description: "Done",
        selections: [],
        postState: "queue",
        clientNonce: "nonce_1",
      },
    });

    expect(result).toEqual({
      status: 400,
      body: { error: "selections must be a non-empty array" },
    });
    expect(fetchQueryMock).not.toHaveBeenCalled();
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("rejects video selections while the approval renderer is image-only", async () => {
    const { approveDraftPost } = await import("../approve-draft");

    const result = await approveDraftPost({
      actor: { userId: "user_123", source: "api_key" },
      draftId: "drf_123",
      body: {
        title: "Ship",
        description: "Done",
        selections: [
          { format: "video-square", provider: "postiz", channelId: "ch_1" },
        ],
        postState: "queue",
        clientNonce: "nonce_1",
      },
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toContain("Video formats");
    expect(fetchQueryMock).not.toHaveBeenCalled();
    expect(fetchMutationMock).not.toHaveBeenCalled();
  });

  it("renders once, removes the Draft, and approves the Post with media URLs", async () => {
    fetchQueryMock.mockResolvedValue({
      externalId: "drf_123",
      config: JSON.stringify({
        output: "image",
        templateId: "standard-browser",
        objectContent: {
          title: { text: "Original title" },
          hero: { image_url: "https://example.com/hero.png" },
        },
      }),
    });
    fetchMutationMock.mockImplementation((ref: string) => {
      if (ref === "api.userProfiles.reserve") return Promise.resolve(29);
      if (ref === "api.drafts.remove") return Promise.resolve({ removed: true });
      if (ref === "api.draftPushes.approveDraft") {
        return Promise.resolve({ ok: true, pushIds: ["push_1"], skipped: [] });
      }
      return Promise.resolve(null);
    });
    createReleaseMock.mockResolvedValue({ cook_id: "cook_123" });
    renderReleaseAsyncMock.mockResolvedValue(undefined);
    getReleaseMock.mockResolvedValue({
      cook_id: "cook_123",
      status: "completed",
      images: {
        square: { slides: ["https://cdn.example.com/square.jpg"] },
      },
    });

    const { approveDraftPost } = await import("../approve-draft");
    const result = await approveDraftPost({
      actor: { userId: "user_123", source: "api_key" },
      draftId: "drf_123",
      body: {
        title: "Edited title",
        description: "Edited description",
        selections: [
          { format: "square", provider: "buffer", channelId: "ch_1" },
        ],
        postState: "queue",
        clientNonce: "nonce_1",
      },
    });

    expect(result).toEqual({
      status: 200,
      body: { ok: true, pushIds: ["push_1"], skipped: [], credits_remaining: 29 },
    });
    expect(createReleaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "standard-browser",
        formats: [
          {
            name: "square",
            slides: [
              {
                objects: [
                  { id: "title", text: "Original title" },
                  { id: "hero", image_url: "https://example.com/hero.png" },
                ],
              },
            ],
          },
        ],
      }),
      "user_123",
      { source: "api" },
    );
    expect(renderReleaseAsyncMock).toHaveBeenCalledWith(
      "cook_123",
      expect.objectContaining({ template: "standard-browser" }),
      "user_123",
    );
    expect(fetchMutationMock).toHaveBeenCalledWith("api.drafts.remove", {
      externalId: "drf_123",
      userId: "user_123",
    });
    expect(fetchMutationMock).toHaveBeenCalledWith(
      "api.draftPushes.approveDraft",
      expect.objectContaining({
        draftId: "drf_123",
        mediaUrlByFormat: { square: "https://cdn.example.com/square.jpg" },
        trustedActor: { userId: "user_123", source: "api_key" },
      }),
    );
  });

  it("refunds the reservation when rendering fails", async () => {
    fetchQueryMock.mockResolvedValue({
      externalId: "drf_123",
      config: JSON.stringify({ output: "image", objectContent: {} }),
    });
    fetchMutationMock.mockImplementation((ref: string) => {
      if (ref === "api.userProfiles.reserve") return Promise.resolve(28);
      if (ref === "api.userProfiles.refund") return Promise.resolve(30);
      return Promise.resolve(null);
    });
    createReleaseMock.mockResolvedValue({ cook_id: "cook_123" });
    renderReleaseAsyncMock.mockRejectedValue(new Error("render failed"));

    const { approveDraftPost } = await import("../approve-draft");
    const result = await approveDraftPost({
      actor: { userId: "user_123", source: "api_key" },
      draftId: "drf_123",
      body: {
        title: "Edited title",
        description: "Edited description",
        selections: [
          { format: "square", provider: "buffer", channelId: "ch_1" },
        ],
        postState: "queue",
        clientNonce: "nonce_1",
      },
    });

    expect(result).toEqual({ status: 500, body: { error: "Render failed." } });
    expect(fetchMutationMock).toHaveBeenCalledWith("api.userProfiles.refund", {
      userId: "user_123",
      amount: 1,
    });
    expect(fetchMutationMock).not.toHaveBeenCalledWith(
      "api.draftPushes.approveDraft",
      expect.anything(),
    );
  });
});
