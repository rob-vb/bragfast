/**
 * Auth-boundary regression test for /api/internal/github-token.
 * Mandatory per eng review — leaking this endpoint = GitHub App token leak.
 *
 * We test the route handler directly with mocked env + Convex + token exchange.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture originals so we can restore between tests.
const originalEnv = { ...process.env };

const getInstallationTokenMock = vi.fn();
const convexQueryMock = vi.fn();

// Mock the shared Convex + GitHub auth surface the route pulls in.
vi.mock("@/lib/github/auth", () => ({
  getInstallationToken: (...args: unknown[]) => getInstallationTokenMock(...args),
}));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = (...args: unknown[]) => convexQueryMock(...args);
  },
}));
vi.mock("@convex/_generated/api", () => ({
  api: { githubInstallations: { listByUserId: "listByUserId" } },
}));

async function loadRoute() {
  // Force a fresh import so env + mocks apply.
  vi.resetModules();
  return import("@/app/api/internal/github-token/route");
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    CONVEX_INTERNAL_SECRET: "test-secret",
    NEXT_PUBLIC_CONVEX_URL: "https://test.convex.cloud",
  };
  getInstallationTokenMock.mockReset();
  convexQueryMock.mockReset();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://app.test/api/internal/github-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/internal/github-token — auth boundary", () => {
  it("rejects calls without the x-internal-auth header", async () => {
    const { POST } = await loadRoute();
    const res = await POST(makeRequest({ userId: "u_1" }));
    expect(res.status).toBe(401);
    expect(getInstallationTokenMock).not.toHaveBeenCalled();
  });

  it("rejects calls with the wrong secret", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({ userId: "u_1" }, { "x-internal-auth": "not-the-secret" }),
    );
    expect(res.status).toBe(401);
    expect(getInstallationTokenMock).not.toHaveBeenCalled();
  });

  it("returns 503 when secret is not configured", async () => {
    process.env.CONVEX_INTERNAL_SECRET = "";
    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({ userId: "u_1" }, { "x-internal-auth": "anything" }),
    );
    expect(res.status).toBe(503);
  });

  it("accepts calls with the correct secret and returns a token", async () => {
    convexQueryMock.mockResolvedValue([
      { installationId: 42, status: "active", enabled: true },
    ]);
    getInstallationTokenMock.mockResolvedValue("ghs_fake_token");

    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({ userId: "u_1" }, { "x-internal-auth": "test-secret" }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { token: string; installationId: number };
    expect(data.token).toBe("ghs_fake_token");
    expect(data.installationId).toBe(42);
    expect(getInstallationTokenMock).toHaveBeenCalledWith(42);
  });

  it("returns 404 when user has no active installation", async () => {
    convexQueryMock.mockResolvedValue([
      { installationId: 7, status: "suspended", enabled: false },
    ]);

    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({ userId: "u_no_install" }, { "x-internal-auth": "test-secret" }),
    );
    expect(res.status).toBe(404);
    expect(getInstallationTokenMock).not.toHaveBeenCalled();
  });

  it("returns 502 when GitHub token exchange fails", async () => {
    convexQueryMock.mockResolvedValue([
      { installationId: 42, status: "active", enabled: true },
    ]);
    getInstallationTokenMock.mockRejectedValue(new Error("GitHub 500"));

    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({ userId: "u_1" }, { "x-internal-auth": "test-secret" }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 400 on malformed body", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      new Request("https://app.test/api/internal/github-token", {
        method: "POST",
        headers: { "x-internal-auth": "test-secret" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when userId is missing", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      makeRequest({}, { "x-internal-auth": "test-secret" }),
    );
    expect(res.status).toBe(400);
  });
});
