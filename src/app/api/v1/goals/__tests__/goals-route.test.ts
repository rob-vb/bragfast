import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMutationMock = vi.fn();
const fetchQueryMock = vi.fn();
const authenticateMock = vi.fn();

vi.mock("convex/nextjs", () => ({
  fetchMutation: fetchMutationMock,
  fetchQuery: fetchQueryMock,
}));

vi.mock("@convex/_generated/api", () => ({
  api: {
    goals: {
      listByUser: "api.goals.listByUser",
      create: "api.goals.create",
      remove: "api.goals.remove",
      setEnabled: "api.goals.setEnabled",
    },
    integrationSecrets: {
      listByUser: "api.integrationSecrets.listByUser",
    },
    githubInstallations: {
      listByUserId: "api.githubInstallations.listByUserId",
    },
  },
}));

vi.mock("@/lib/auth/authenticate", () => ({
  authenticate: authenticateMock,
}));

describe("GET /api/v1/goals", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchQueryMock.mockReset();
    fetchMutationMock.mockReset();
    authenticateMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
  });

  it("returns 401 when not authenticated", async () => {
    authenticateMock.mockResolvedValueOnce(null);
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/v1/goals"));
    expect(res.status).toBe(401);
  });

  it("returns goals list", async () => {
    fetchQueryMock.mockImplementation((ref: string) => {
      if (ref === "api.goals.listByUser") {
        return Promise.resolve([{ externalId: "goal_abc", provider: "stripe", metric: "mrr", scope: null, target: 1000 }]);
      }
      return Promise.resolve([]);
    });
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/v1/goals"));
    expect(res.status).toBe(200);
    const data = await res.json() as { goals: unknown[] };
    expect(data.goals).toHaveLength(1);
  });
});

describe("POST /api/v1/goals", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchQueryMock.mockReset();
    fetchMutationMock.mockReset();
    authenticateMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
  });

  it("returns 401 when not authenticated", async () => {
    authenticateMock.mockResolvedValueOnce(null);
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "stripe", metric: "mrr", target: 1000 }),
    }));
    expect(res.status).toBe(401);
  });

  it("creates a Stripe MRR goal → 201", async () => {
    fetchMutationMock.mockResolvedValue({ externalId: "goal_xyz", metric: "mrr", target: 1000 });
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "stripe", metric: "mrr", target: 1000 }),
    }));
    expect(res.status).toBe(201);
    const data = await res.json() as { externalId: string };
    expect(data.externalId).toBe("goal_xyz");
  });

  it("returns 400 for missing target on mrr", async () => {
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "stripe", metric: "mrr" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for stars without scope", async () => {
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "github", metric: "stars", target: 100 }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 403 with structured payload when goal cap reached (S5.4)", async () => {
    fetchMutationMock.mockRejectedValue(new Error("goal_cap_reached:toast:1"));
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "stripe", metric: "mrr", target: 1000 }),
    }));
    expect(res.status).toBe(403);
    const data = await res.json() as { error: string; tier: string; cap: number };
    expect(data.error).toBe("goal_cap_reached");
    expect(data.tier).toBe("toast");
    expect(data.cap).toBe(1);
  });

  it("returns 400 for invalid provider", async () => {
    const { POST } = await import("../route");
    const res = await POST(new Request("http://localhost/api/v1/goals", {
      method: "POST",
      body: JSON.stringify({ provider: "twitter", metric: "followers", target: 100 }),
    }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/goals/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchQueryMock.mockReset();
    fetchMutationMock.mockReset();
    authenticateMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
  });

  it("returns 204 on success", async () => {
    fetchMutationMock.mockResolvedValue({ deleted: true });
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/v1/goals/goal_abc", { method: "DELETE" }),
      { params: Promise.resolve({ id: "goal_abc" }) },
    );
    expect(res.status).toBe(204);
  });

  it("returns 401 when not authenticated", async () => {
    authenticateMock.mockResolvedValueOnce(null);
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/v1/goals/goal_abc", { method: "DELETE" }),
      { params: Promise.resolve({ id: "goal_abc" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when goal belongs to another user", async () => {
    fetchMutationMock.mockRejectedValue(new Error("Forbidden"));
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/v1/goals/goal_other", { method: "DELETE" }),
      { params: Promise.resolve({ id: "goal_other" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when goal not found", async () => {
    fetchMutationMock.mockResolvedValue({ deleted: false });
    const { DELETE } = await import("../[id]/route");
    const res = await DELETE(
      new Request("http://localhost/api/v1/goals/goal_missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "goal_missing" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/goals/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchQueryMock.mockReset();
    fetchMutationMock.mockReset();
    authenticateMock.mockReset();
    authenticateMock.mockResolvedValue({ userId: "user_123" });
  });

  it("toggles goal enabled=false", async () => {
    fetchMutationMock.mockResolvedValue({ updated: true });
    const { PATCH } = await import("../[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/v1/goals/goal_abc", {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      }),
      { params: Promise.resolve({ id: "goal_abc" }) },
    );
    expect(res.status).toBe(200);
    expect(fetchMutationMock).toHaveBeenCalledWith(
      "api.goals.setEnabled",
      { userId: "user_123", externalId: "goal_abc", enabled: false },
    );
  });

  it("returns 400 when enabled field missing", async () => {
    const { PATCH } = await import("../[id]/route");
    const res = await PATCH(
      new Request("http://localhost/api/v1/goals/goal_abc", {
        method: "PATCH",
        body: JSON.stringify({ someOtherField: true }),
      }),
      { params: Promise.resolve({ id: "goal_abc" }) },
    );
    expect(res.status).toBe(400);
  });
});
