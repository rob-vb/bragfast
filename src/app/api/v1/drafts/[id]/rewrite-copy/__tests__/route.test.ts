import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUserMock = vi.fn();
const rewriteCopyForClassMock = vi.fn();
const fetchQueryMock = vi.fn();

vi.mock("@/lib/auth/get-session-user", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/drafts/compose-copy", () => ({
  rewriteCopyForClass: rewriteCopyForClassMock,
}));

vi.mock("convex/nextjs", () => ({
  fetchQuery: fetchQueryMock,
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/drafts/drf_1/rewrite-copy", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const draftRow = { id: "drf_1", config: "{}" };

describe("POST /api/v1/drafts/[id]/rewrite-copy", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionUserMock.mockReset();
    rewriteCopyForClassMock.mockReset();
    fetchQueryMock.mockReset();
    fetchQueryMock.mockResolvedValue(draftRow);
  });

  it("returns rewritten copy for an authenticated session caller", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    rewriteCopyForClassMock.mockResolvedValue({
      ok: true,
      title: "IG title",
      description: "IG desc",
    });

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        class: "instagram",
        title: "Carousel template",
        description: "You can now ship carousel posts.",
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "IG title", description: "IG desc" });
    expect(rewriteCopyForClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channelClass: "instagram",
        seedTitle: "Carousel template",
        seedDescription: "You can now ship carousel posts.",
      }),
    );
  });

  it("returns 401 when no session is present", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        class: "instagram",
        title: "X",
        description: "Y",
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(401);
    expect(rewriteCopyForClassMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the draft does not belong to the caller", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    fetchQueryMock.mockResolvedValue(null);

    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        class: "instagram",
        title: "X",
        description: "Y",
      }),
      { params: Promise.resolve({ id: "drf_other" }) },
    );

    expect(res.status).toBe(404);
    expect(rewriteCopyForClassMock).not.toHaveBeenCalled();
    expect(fetchQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ externalId: "drf_other", userId: "user_1" }),
    );
  });

  it("returns 400 for an invalid class value", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        class: "pinterest",
        title: "X",
        description: "Y",
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(400);
    expect(rewriteCopyForClassMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({ class: "x" }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid JSON body", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/drafts/drf_1/rewrite-copy", {
        method: "POST",
        body: "{not json",
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 502 when the helper reports Haiku unavailable", async () => {
    getSessionUserMock.mockResolvedValue({ _id: "user_1" });
    rewriteCopyForClassMock.mockResolvedValue({
      ok: false,
      error: "haiku_unavailable",
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest({
        class: "x",
        title: "X",
        description: "Y",
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(502);
  });

  it("does not accept API-key auth — session only", async () => {
    // No session user; even if upstream had an API key, this route ignores it.
    getSessionUserMock.mockResolvedValue(null);
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/drafts/drf_1/rewrite-copy", {
        method: "POST",
        headers: {
          authorization: "Bearer some_api_key",
          "content-type": "application/json",
        },
        body: JSON.stringify({ class: "x", title: "X", description: "Y" }),
      }),
      { params: Promise.resolve({ id: "drf_1" }) },
    );
    expect(res.status).toBe(401);
  });
});
