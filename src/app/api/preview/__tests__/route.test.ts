import { describe, it, expect, vi, beforeEach } from "vitest";

const mutation = vi.fn();
const optedOut = vi.fn();
const publicPr = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = vi.fn();
    action = vi.fn();
    mutation = mutation;
  },
}));

vi.mock("@/lib/preview/opt-out", () => ({
  isRepoOptedOut: (...args: unknown[]) => optedOut(...args),
}));

vi.mock("@/lib/preview/public-pr", () => ({
  fetchPublicLatestPr: (...args: unknown[]) => publicPr(...args),
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
  optedOut.mockReset();
  optedOut.mockResolvedValue(false);
  publicPr.mockReset();
  publicPr.mockResolvedValue({
    ok: true,
    pr: {
      number: 7,
      title: "Add feature",
      body: null,
      html_url: "https://github.com/rob/bragfast/pull/7",
      merged_at: "2026-04-29T00:00:00Z",
    },
    defaultBranch: "main",
  });
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

  it("returns 200 with parsed repo + PR when within rate limit", async () => {
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
      pr: { number: 7, title: "Add feature" },
    });
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { ip: "1.2.3.4" });
  });

  it("returns 404 repo_not_found when GitHub 404s", async () => {
    mutation.mockResolvedValue({ allowed: true });
    publicPr.mockResolvedValue({ ok: false, code: "not_found" });
    const res = await POST(makeReq({ repoUrl: "https://github.com/rob/x" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "repo_not_found" });
  });

  it("returns 404 no_merged_pr when repo has no merged PR", async () => {
    mutation.mockResolvedValue({ allowed: true });
    publicPr.mockResolvedValue({ ok: false, code: "no_pr" });
    const res = await POST(makeReq({ repoUrl: "https://github.com/rob/x" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "no_merged_pr" });
  });

  it("returns 503 with retry-after when GitHub rate-limits", async () => {
    mutation.mockResolvedValue({ allowed: true });
    publicPr.mockResolvedValue({ ok: false, code: "rate_limited" });
    const res = await POST(makeReq({ repoUrl: "https://github.com/rob/x" }));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(await res.json()).toMatchObject({ error: "github_rate_limited" });
  });

  it("returns 403 opted_out when repo has bragfast.txt", async () => {
    mutation.mockResolvedValue({ allowed: true });
    optedOut.mockResolvedValue(true);
    const res = await POST(
      makeReq({ repoUrl: "https://github.com/rob/bragfast" }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ reason: "opted_out" });
    expect(optedOut).toHaveBeenCalledWith("rob/bragfast");
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
