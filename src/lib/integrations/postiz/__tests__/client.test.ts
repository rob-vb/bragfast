import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock safeFetch so we don't hit real network or SSRF logic
// ---------------------------------------------------------------------------

const safeFetchMock = vi.fn();

vi.mock("../safe-fetch", () => ({
  safeFetch: safeFetchMock,
}));

import {
  listIntegrations,
  uploadFromUrl,
  createPost,
  findSlot,
  normalizeInstanceUrl,
  PostizAuthError,
  PostizApiError,
} from "../client";

const INSTANCE = "https://api.postiz.com";
const API_KEY = "test-api-key-12345";

// ---------------------------------------------------------------------------
// normalizeInstanceUrl
// ---------------------------------------------------------------------------

describe("normalizeInstanceUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeInstanceUrl("https://api.postiz.com/")).toBe(
      "https://api.postiz.com",
    );
    expect(normalizeInstanceUrl("https://self-hosted.example.com///")).toBe(
      "https://self-hosted.example.com",
    );
  });

  it("leaves clean URLs unchanged", () => {
    expect(normalizeInstanceUrl("https://api.postiz.com")).toBe(
      "https://api.postiz.com",
    );
  });

  it("throws if scheme is missing", () => {
    expect(() => normalizeInstanceUrl("api.postiz.com")).toThrow(
      "instanceUrl must include a scheme",
    );
  });

  it("accepts http:// (for self-hosted dev)", () => {
    expect(normalizeInstanceUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown) {
  safeFetchMock.mockResolvedValueOnce({
    status: 200,
    body: JSON.stringify(body),
  });
}

function mockStatus(status: number, body = "") {
  safeFetchMock.mockResolvedValueOnce({ status, body });
}

// ---------------------------------------------------------------------------
// listIntegrations
// ---------------------------------------------------------------------------

describe("listIntegrations", () => {
  beforeEach(() => safeFetchMock.mockReset());

  it("returns channel array on 200", async () => {
    const channels = [
      { id: "ch_1", identifier: "linkedin", name: "My LinkedIn", disabled: false },
      { id: "ch_2", identifier: "x", name: "My X", disabled: false },
    ];
    mockOk(channels);

    const result = await listIntegrations(INSTANCE, API_KEY);
    expect(result).toEqual(channels);
  });

  it("calls the correct endpoint with Authorization header (no Bearer)", async () => {
    mockOk([]);
    await listIntegrations(INSTANCE, API_KEY);

    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://api.postiz.com/public/v1/integrations",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: API_KEY,
        }),
      }),
    );

    // Explicitly verify NO "Bearer" prefix
    const calledHeaders = safeFetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders.Authorization).not.toMatch(/^Bearer /);
  });

  it("returns empty array when Postiz returns []", async () => {
    mockOk([]);
    const result = await listIntegrations(INSTANCE, API_KEY);
    expect(result).toEqual([]);
  });

  it("throws PostizAuthError on 401", async () => {
    mockStatus(401);
    await expect(listIntegrations(INSTANCE, API_KEY)).rejects.toThrow(
      PostizAuthError,
    );
  });

  it("throws PostizAuthError on 403", async () => {
    mockStatus(403);
    await expect(listIntegrations(INSTANCE, API_KEY)).rejects.toThrow(
      PostizAuthError,
    );
  });

  it("throws PostizApiError on 500", async () => {
    mockStatus(500, "Internal Server Error");
    await expect(listIntegrations(INSTANCE, API_KEY)).rejects.toThrow(
      PostizApiError,
    );
  });

  it("normalizes trailing slash in instanceUrl", async () => {
    mockOk([]);
    await listIntegrations("https://api.postiz.com/", API_KEY);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://api.postiz.com/public/v1/integrations",
      expect.anything(),
    );
  });

  it("works with self-hosted instance URL", async () => {
    mockOk([]);
    await listIntegrations("https://postiz.mycompany.com", API_KEY);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://postiz.mycompany.com/public/v1/integrations",
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// uploadFromUrl
// ---------------------------------------------------------------------------

describe("uploadFromUrl", () => {
  beforeEach(() => safeFetchMock.mockReset());

  it("sends POST with url body and returns id+path", async () => {
    const uploadResult = { id: "media_123", path: "/uploads/media_123.jpg" };
    mockOk(uploadResult);

    const result = await uploadFromUrl(
      INSTANCE,
      API_KEY,
      "https://cdn.example.com/image.jpg",
    );

    expect(result).toEqual(uploadResult);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://api.postiz.com/public/v1/upload-from-url",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://cdn.example.com/image.jpg" }),
      }),
    );
  });

  it("throws PostizAuthError on 401", async () => {
    mockStatus(401);
    await expect(
      uploadFromUrl(INSTANCE, API_KEY, "https://cdn.example.com/img.jpg"),
    ).rejects.toThrow(PostizAuthError);
  });
});

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

describe("createPost", () => {
  beforeEach(() => safeFetchMock.mockReset());

  it("sends POST to /posts with correct body", async () => {
    mockOk({ id: "post_abc" });

    const body = {
      type: "draft" as const,
      date: "2026-01-01T00:00:00.000Z",
      posts: [
        {
          integration: { id: "ch_1" },
          value: [{ content: "Hello world!" }],
          settings: { __type: "linkedin" },
        },
      ],
    };

    const result = await createPost(INSTANCE, API_KEY, body);
    expect(result).toEqual({ id: "post_abc" });
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://api.postiz.com/public/v1/posts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// findSlot
// ---------------------------------------------------------------------------

describe("findSlot", () => {
  beforeEach(() => safeFetchMock.mockReset());

  it("calls GET /find-slot/:integrationId", async () => {
    const slotResult = { date: "2026-01-02T10:00:00.000Z" };
    mockOk(slotResult);

    const result = await findSlot(INSTANCE, API_KEY, "ch_1");
    expect(result).toEqual(slotResult);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://api.postiz.com/public/v1/find-slot/ch_1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("URL-encodes integration IDs with special chars", async () => {
    mockOk({});
    await findSlot(INSTANCE, API_KEY, "ch/special id");
    expect(safeFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("ch%2Fspecial%20id"),
      expect.anything(),
    );
  });
});
