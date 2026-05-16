import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMutationMock = vi.fn();
const fetchQueryMock = vi.fn();
const authenticateMock = vi.fn();

vi.mock("convex/nextjs", () => ({
  fetchMutation: fetchMutationMock,
  fetchQuery: fetchQueryMock,
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    brands: {
      create: "api.brands.create",
      listByUser: "api.brands.listByUser",
    },
    rateLimit: {
      check: "api.rateLimit.check",
    },
  },
}));

vi.mock("@/lib/auth/authenticate", () => ({
  authenticate: authenticateMock,
}));

describe("POST /api/v1/brands", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMutationMock.mockReset();
    fetchQueryMock.mockReset();
    authenticateMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authenticateMock.mockResolvedValue({ userId: "user_123" });
    fetchMutationMock.mockImplementation((ref: string) => {
      if (ref === "api.rateLimit.check") return Promise.resolve({ allowed: true });
      if (ref === "api.brands.create") {
        return Promise.resolve({
          id: "brand_abc",
          name: "Acme",
          colors: {
            background: "#ffffff",
            text: "#1a1a2e",
            primary: "#ffcc00",
          },
          created_at: "2026-05-16T00:00:00.000Z",
          updated_at: "2026-05-16T00:00:00.000Z",
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("creates a brand", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/brands", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          colors: {
            background: "#ffffff",
            text: "#1a1a2e",
            primary: "#ffcc00",
          },
        }),
      }),
    );

    expect(res.status).toBe(201);
  });

  it("returns JSON instead of throwing when rate limit storage is unavailable", async () => {
    fetchMutationMock.mockRejectedValueOnce(new Error("network error"));

    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/v1/brands", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme",
          colors: {
            background: "#ffffff",
            text: "#1a1a2e",
            primary: "#ffcc00",
          },
        }),
      }),
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Failed to create brand" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to rate limit brand create:",
      expect.any(Error),
    );
  });
});
