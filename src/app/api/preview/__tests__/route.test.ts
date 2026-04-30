import { describe, it, expect, vi, beforeEach } from "vitest";

const mutation = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = vi.fn();
    action = vi.fn();
    mutation = mutation;
  },
}));

import { POST } from "../route";

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://app.test/api/preview", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  mutation.mockReset();
});

describe("POST /api/preview", () => {
  it("returns 400 invalid_json on malformed body", async () => {
    const req = new Request("https://app.test/api/preview", {
      method: "POST",
      body: "not json",
    }) as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_json" });
  });

  it("returns 400 missing_repo_url when field absent", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "missing_repo_url" });
  });

  it("returns 400 invalid_repo_url for non-github URL", async () => {
    const res = await POST(makeReq({ repoUrl: "https://gitlab.com/a/b" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_repo_url" });
  });

  it("returns 200 with parsed repo when within rate limit", async () => {
    mutation.mockResolvedValue({ allowed: true });
    const res = await POST(
      makeReq(
        { repoUrl: "https://github.com/rob/bragfast" },
        { "x-forwarded-for": "1.2.3.4" },
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "pending",
      repo: "rob/bragfast",
    });
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { ip: "1.2.3.4" });
  });

  it("returns 429 with retry-after header when rate-limited", async () => {
    mutation.mockResolvedValue({
      allowed: false,
      retryAfterMs: 60_000,
      scope: "hour",
    });
    const res = await POST(
      makeReq({ repoUrl: "https://github.com/rob/bragfast" }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await res.json()).toMatchObject({
      error: "rate_limited",
      scope: "hour",
      retryAfter: 60,
    });
  });
});
