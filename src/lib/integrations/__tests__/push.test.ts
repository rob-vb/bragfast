/**
 * Unit tests for the push dispatcher + provider clients.
 *
 * All outbound HTTP is mocked via vi.mock — no real network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PushError } from "../error-classes";

// ---------------------------------------------------------------------------
// Mocks — declared before imports so vi.mock hoisting applies
// ---------------------------------------------------------------------------

// Buffer GraphQL helper mock
vi.mock("@/lib/integrations/buffer/graphql", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/lib/integrations/buffer/graphql")>();
  return {
    ...orig,
    bufferGraphQL: vi.fn(),
  };
});

// Postiz client mock
vi.mock("@/lib/integrations/postiz/client", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/lib/integrations/postiz/client")>();
  return {
    ...orig,
    uploadFromUrl: vi.fn(),
    createPost: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { bufferGraphQL, BufferAuthError, BufferRateLimitError, BufferGraphQLError } from "../buffer/graphql";
import { uploadFromUrl, createPost, PostizAuthError, PostizApiError } from "../postiz/client";
import { pushToBuffer } from "../buffer/push";
import { pushToPostiz } from "../postiz/push";
import { dispatchPush, type PushRow, type SealedRow } from "../push";

const mockBufferGraphQL = vi.mocked(bufferGraphQL);
const mockUploadFromUrl = vi.mocked(uploadFromUrl);
const mockCreatePost = vi.mocked(createPost);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBufferRow(overrides: Partial<PushRow> = {}): PushRow {
  return {
    _id: "row_buf_1",
    draftId: "drf_test",
    format: "square",
    provider: "buffer",
    channelId: "ch_buf_1",
    title: "Big Launch",
    description: "We shipped it",
    mediaUrl: "https://r2.example.com/image.jpg",
    postState: "queue",
    attempts: 0,
    ...overrides,
  };
}

function makePostizRow(overrides: Partial<PushRow> = {}): PushRow {
  return {
    _id: "row_ptz_1",
    draftId: "drf_test",
    format: "square",
    provider: "postiz",
    channelId: "ch_ptz_1",
    title: "Big Launch",
    description: "We shipped it",
    mediaUrl: "https://r2.example.com/image.jpg",
    postState: "queue",
    attempts: 0,
    ...overrides,
  };
}

const BUFFER_SEALED: SealedRow = {
  ciphertext: "buf_api_key",
  iv: "fake-iv",
  tag: "fake-tag",
  extra: JSON.stringify({ organizationId: "org-1", channels: [] }),
};

const POSTIZ_SEALED: SealedRow = {
  ciphertext: "ptz_api_key",
  iv: "fake-iv",
  tag: "fake-tag",
  extra: JSON.stringify({ instanceUrl: "https://postiz.example.com" }),
};

// Fake openSecret: ciphertext IS the plaintext in tests
function openSecret(sealed: { ciphertext: string; iv: string; tag: string }): string {
  return sealed.ciphertext;
}

// ---------------------------------------------------------------------------
// Buffer tests
// ---------------------------------------------------------------------------

describe("pushToBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — returns providerPostId from GraphQL response", async () => {
    mockBufferGraphQL.mockResolvedValueOnce({
      createPost: { __typename: "PostActionSuccess", post: { id: "buf_post_123" } },
    });

    const result = await pushToBuffer({
      apiKey: "tok",
      channelId: "ch_1",
      title: "Hello",
      description: "World",
      mediaUrl: "https://example.com/img.jpg",
      format: "square",
      postState: "queue",
    });

    expect(result.providerPostId).toBe("buf_post_123");
    expect(mockBufferGraphQL).toHaveBeenCalledOnce();
  });

  it("video format → throws PushError(media)", async () => {
    await expect(
      pushToBuffer({
        apiKey: "tok",
        channelId: "ch_1",
        title: "Video",
        description: "",
        mediaUrl: "https://example.com/video.mp4",
        format: "video-landscape",
        postState: "queue",
      }),
    ).rejects.toThrow(PushError);

    await expect(
      pushToBuffer({
        apiKey: "tok",
        channelId: "ch_1",
        title: "Video",
        description: "",
        mediaUrl: "https://example.com/video.mp4",
        format: "video-landscape",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "media" });

    expect(mockBufferGraphQL).not.toHaveBeenCalled();
  });

  it("401 from GraphQL → throws PushError(auth)", async () => {
    mockBufferGraphQL.mockRejectedValueOnce(
      new BufferAuthError("Buffer API returned 401"),
    );

    await expect(
      pushToBuffer({
        apiKey: "expired",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://example.com/img.jpg",
        format: "square",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "auth" });
  });

  it("ChannelReconnectRequired GraphQL error → throws PushError(channel_gone)", async () => {
    mockBufferGraphQL.mockRejectedValueOnce(
      new BufferGraphQLError("GraphQL error", [
        { message: "ChannelReconnectRequired: please reconnect your channel" },
      ]),
    );

    await expect(
      pushToBuffer({
        apiKey: "tok",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://example.com/img.jpg",
        format: "square",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "channel_gone" });
  });

  it("429 → throws PushError(rate_limit)", async () => {
    mockBufferGraphQL.mockRejectedValueOnce(
      new BufferRateLimitError("Buffer API rate limited (HTTP 429)"),
    );

    await expect(
      pushToBuffer({
        apiKey: "tok",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://example.com/img.jpg",
        format: "square",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "rate_limit" });
  });
});

// ---------------------------------------------------------------------------
// Postiz tests
// ---------------------------------------------------------------------------

describe("pushToPostiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("image happy path — upload + createPost → returns providerPostId", async () => {
    mockUploadFromUrl.mockResolvedValueOnce({ id: "upload_1", path: "/media/img.jpg" });
    mockCreatePost.mockResolvedValueOnce({ id: "pz_post_123" });

    const result = await pushToPostiz({
      apiKey: "ptz_key",
      instanceUrl: "https://postiz.example.com",
      channelId: "ch_ptz_1",
      title: "Hello",
      description: "World",
      mediaUrl: "https://r2.example.com/image.jpg",
      postState: "queue",
    });

    expect(result.providerPostId).toBe("pz_post_123");
    expect(mockUploadFromUrl).toHaveBeenCalledOnce();
    expect(mockCreatePost).toHaveBeenCalledOnce();
  });

  it("video happy path — upload + createPost → returns providerPostId", async () => {
    mockUploadFromUrl.mockResolvedValueOnce({ id: "upload_v1", path: "/media/vid.mp4" });
    mockCreatePost.mockResolvedValueOnce({ id: "pz_video_456" });

    const result = await pushToPostiz({
      apiKey: "ptz_key",
      instanceUrl: "https://postiz.example.com",
      channelId: "ch_ptz_1",
      title: "Video post",
      description: "",
      mediaUrl: "https://r2.example.com/video.mp4",
      postState: "draft",
    });

    expect(result.providerPostId).toBe("pz_video_456");
  });

  it("401 on upload → throws PushError(auth)", async () => {
    mockUploadFromUrl.mockRejectedValueOnce(
      new PostizAuthError("Postiz rejected the API key (HTTP 401)"),
    );

    await expect(
      pushToPostiz({
        apiKey: "bad_key",
        instanceUrl: "https://postiz.example.com",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://r2.example.com/image.jpg",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "auth" });
  });

  it("429 on createPost → throws PushError(rate_limit)", async () => {
    mockUploadFromUrl.mockResolvedValueOnce({ id: "upload_1", path: "/media/img.jpg" });
    mockCreatePost.mockRejectedValueOnce(
      new PostizApiError("Postiz API returned HTTP 429: Too Many Requests", 429),
    );

    await expect(
      pushToPostiz({
        apiKey: "ptz_key",
        instanceUrl: "https://postiz.example.com",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://r2.example.com/image.jpg",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "rate_limit" });
  });

  it("4xx with 'media' in message → throws PushError(media)", async () => {
    mockUploadFromUrl.mockRejectedValueOnce(
      new PostizApiError("Postiz API returned HTTP 422: media format not supported", 422),
    );

    await expect(
      pushToPostiz({
        apiKey: "ptz_key",
        instanceUrl: "https://postiz.example.com",
        channelId: "ch_1",
        title: "T",
        description: "",
        mediaUrl: "https://r2.example.com/image.jpg",
        postState: "queue",
      }),
    ).rejects.toMatchObject({ class: "media" });
  });
});

// ---------------------------------------------------------------------------
// dispatchPush router tests
// ---------------------------------------------------------------------------

describe("dispatchPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes Buffer row to Buffer client", async () => {
    mockBufferGraphQL.mockResolvedValueOnce({
      createPost: { __typename: "PostActionSuccess", post: { id: "buf_dispatch_1" } },
    });

    const result = await dispatchPush(makeBufferRow(), BUFFER_SEALED, openSecret);
    expect(result.providerPostId).toBe("buf_dispatch_1");
  });

  it("routes Postiz row to Postiz client", async () => {
    mockUploadFromUrl.mockResolvedValueOnce({ id: "up1", path: "/p" });
    mockCreatePost.mockResolvedValueOnce({ id: "ptz_dispatch_1" });

    const result = await dispatchPush(makePostizRow(), POSTIZ_SEALED, openSecret);
    expect(result.providerPostId).toBe("ptz_dispatch_1");
  });

  it("Buffer video row → PushError(media) without calling GraphQL", async () => {
    await expect(
      dispatchPush(makeBufferRow({ format: "video-square" }), BUFFER_SEALED, openSecret),
    ).rejects.toMatchObject({ class: "media" });

    expect(mockBufferGraphQL).not.toHaveBeenCalled();
  });

  it("openSecret throws → PushError(auth)", async () => {
    const sealed: SealedRow = {
      ciphertext: "x",
      iv: "iv",
      tag: "tag",
      extra: null,
    };
    const failingOpen = () => {
      throw new Error("decryption failed");
    };

    await expect(
      dispatchPush(makeBufferRow(), sealed, failingOpen),
    ).rejects.toMatchObject({ class: "auth" });
  });
});
