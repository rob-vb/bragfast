import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMock = vi.fn();
const authenticateMock = vi.fn();
const createPresignedUploadUrlMock = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    action = actionMock;
  },
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    schedulePush: {
      run: "api.schedulePush.run",
    },
  },
}));

vi.mock("@/lib/auth/authenticate", () => ({
  authenticate: authenticateMock,
}));

vi.mock("@/lib/storage/r2", () => ({
  createPresignedUploadUrl: createPresignedUploadUrlMock,
}));

describe("/api/v1/schedule/upload-url", () => {
  beforeEach(() => {
    vi.resetModules();
    actionMock.mockReset();
    authenticateMock.mockReset();
    createPresignedUploadUrlMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
    createPresignedUploadUrlMock.mockImplementation(
      async (key: string, contentType: string) => ({
        uploadUrl: `https://uploads.example/${key}?contentType=${contentType}`,
        publicUrl: `https://cdn.example/${key}`,
      }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    authenticateMock.mockResolvedValueOnce(null);
    const { POST } = await import("../upload-url/route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule/upload-url", {
        method: "POST",
        body: JSON.stringify({ draftId: "drf_1", formats: ["landscape"] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createPresignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects video formats", async () => {
    const { POST } = await import("../upload-url/route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule/upload-url", {
        method: "POST",
        body: JSON.stringify({ draftId: "drf_1", formats: ["video-landscape"] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("format"),
    });
    expect(createPresignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("returns scoped upload and public URLs for image formats", async () => {
    const { POST } = await import("../upload-url/route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule/upload-url", {
        method: "POST",
        body: JSON.stringify({
          draftId: "drf_1",
          formats: ["landscape", "square", "portrait"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createPresignedUploadUrlMock).toHaveBeenNthCalledWith(
      1,
      "scheduled/user_123/drf_1/landscape.jpg",
      "image/jpeg",
      300,
    );
    expect(createPresignedUploadUrlMock).toHaveBeenNthCalledWith(
      2,
      "scheduled/user_123/drf_1/square.jpg",
      "image/jpeg",
      300,
    );
    expect(createPresignedUploadUrlMock).toHaveBeenNthCalledWith(
      3,
      "scheduled/user_123/drf_1/portrait.jpg",
      "image/jpeg",
      300,
    );
    expect(await response.json()).toEqual({
      uploads: [
        {
          format: "landscape",
          key: "scheduled/user_123/drf_1/landscape.jpg",
          uploadUrl:
            "https://uploads.example/scheduled/user_123/drf_1/landscape.jpg?contentType=image/jpeg",
          publicUrl: "https://cdn.example/scheduled/user_123/drf_1/landscape.jpg",
        },
        {
          format: "square",
          key: "scheduled/user_123/drf_1/square.jpg",
          uploadUrl:
            "https://uploads.example/scheduled/user_123/drf_1/square.jpg?contentType=image/jpeg",
          publicUrl: "https://cdn.example/scheduled/user_123/drf_1/square.jpg",
        },
        {
          format: "portrait",
          key: "scheduled/user_123/drf_1/portrait.jpg",
          uploadUrl:
            "https://uploads.example/scheduled/user_123/drf_1/portrait.jpg?contentType=image/jpeg",
          publicUrl: "https://cdn.example/scheduled/user_123/drf_1/portrait.jpg",
        },
      ],
    });
  });
});

describe("/api/v1/schedule", () => {
  beforeEach(() => {
    vi.resetModules();
    actionMock.mockReset();
    authenticateMock.mockReset();
    createPresignedUploadUrlMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
    actionMock.mockResolvedValue({ ok: true, releaseId: "rel_123", scheduled: [] });
  });

  it("rejects empty selections", async () => {
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule", {
        method: "POST",
        body: JSON.stringify({
          draftId: "drf_1",
          urls: { landscape: "https://cdn.example/landscape.jpg" },
          keys: { landscape: "scheduled/user_123/drf_1/landscape.jpg" },
          selections: [],
          caption: "Ship it",
          scheduling: { type: "queue" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("rejects custom timing without a valid ISO scheduledAt", async () => {
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule", {
        method: "POST",
        body: JSON.stringify({
          draftId: "drf_1",
          urls: { landscape: "https://cdn.example/landscape.jpg" },
          keys: { landscape: "scheduled/user_123/drf_1/landscape.jpg" },
          selections: [
            {
              format: "landscape",
              provider: "buffer",
              channelId: "buf_channel_1",
            },
          ],
          caption: "Ship it",
          scheduling: { type: "custom" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("calls schedulePush with authenticated user and validated payload", async () => {
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule", {
        method: "POST",
        body: JSON.stringify({
          draftId: "drf_1",
          urls: { landscape: "https://cdn.example/landscape.jpg" },
          keys: { landscape: "scheduled/user_123/drf_1/landscape.jpg" },
          selections: [
            {
              format: "landscape",
              provider: "buffer",
              channelId: "buf_channel_1",
              channelName: "Launch",
            },
          ],
          caption: "Ship it",
          scheduling: {
            type: "custom",
            scheduledAt: "2026-06-01T12:00:00.000Z",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(actionMock).toHaveBeenCalledWith("api.schedulePush.run", {
      userId: "user_123",
      draftId: "drf_1",
      urls: { landscape: "https://cdn.example/landscape.jpg" },
      keys: { landscape: "scheduled/user_123/drf_1/landscape.jpg" },
      selections: [
        {
          format: "landscape",
          provider: "buffer",
          channelId: "buf_channel_1",
          channelName: "Launch",
        },
      ],
      caption: "Ship it",
      scheduling: {
        type: "custom",
        scheduledAt: "2026-06-01T12:00:00.000Z",
      },
    });
    expect(await response.json()).toEqual({
      ok: true,
      releaseId: "rel_123",
      scheduled: [],
    });
  });

  it("maps upload_missing to an actionable non-2xx response", async () => {
    actionMock.mockResolvedValueOnce({
      ok: false,
      error: "upload_missing",
      missing: ["landscape"],
    });
    const { POST } = await import("../route");

    const response = await POST(
      new Request("http://localhost/api/v1/schedule", {
        method: "POST",
        body: JSON.stringify({
          draftId: "drf_1",
          urls: { landscape: "https://cdn.example/landscape.jpg" },
          keys: { landscape: "scheduled/user_123/drf_1/landscape.jpg" },
          selections: [
            {
              format: "landscape",
              provider: "buffer",
              channelId: "buf_channel_1",
            },
          ],
          caption: "Ship it",
          scheduling: { type: "queue" },
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "upload_missing",
      message: "One or more selected uploads are missing. Re-upload and retry scheduling.",
      missing: ["landscape"],
    });
  });
});
