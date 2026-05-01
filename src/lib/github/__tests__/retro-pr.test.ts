import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../auth", () => ({
  getInstallationToken: vi.fn().mockResolvedValue("token-abc"),
}));

import { fetchLatestMergedPr } from "../retro-pr";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonRes(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

describe("fetchLatestMergedPr", () => {
  it("returns the first merged PR on the default branch", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ default_branch: "main" }))
      .mockResolvedValueOnce(
        jsonRes([
          {
            number: 102,
            title: "Unmerged",
            body: "",
            html_url: "u1",
            merged_at: null,
            base: { ref: "main" },
          },
          {
            number: 101,
            title: "Latest merged",
            body: "Body",
            html_url: "u2",
            merged_at: "2026-04-29T10:00:00Z",
            base: { ref: "main" },
          },
          {
            number: 100,
            title: "Older merged",
            body: "",
            html_url: "u3",
            merged_at: "2026-04-28T10:00:00Z",
            base: { ref: "main" },
          },
        ]),
      );

    const out = await fetchLatestMergedPr(123, "rob/test");
    expect(out).not.toBeNull();
    expect(out?.defaultBranch).toBe("main");
    expect(out?.pr.number).toBe(101);
    expect(out?.pr.title).toBe("Latest merged");
  });

  it("returns null when repo lookup fails", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonRes({}, false));
    const out = await fetchLatestMergedPr(1, "rob/test");
    expect(out).toBeNull();
  });

  it("returns null when no merged PRs in the listing", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ default_branch: "main" }))
      .mockResolvedValueOnce(
        jsonRes([
          {
            number: 5,
            title: "Open",
            body: "",
            html_url: "u",
            merged_at: null,
            base: { ref: "main" },
          },
        ]),
      );
    const out = await fetchLatestMergedPr(1, "rob/test");
    expect(out).toBeNull();
  });

  it("returns null when listing fails", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonRes([], false));
    const out = await fetchLatestMergedPr(1, "rob/test");
    expect(out).toBeNull();
  });

  it("requests the default branch in the listing query", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ default_branch: "trunk" }))
      .mockResolvedValueOnce(
        jsonRes([
          {
            number: 9,
            title: "M",
            body: "",
            html_url: "u",
            merged_at: "2026-04-29T10:00:00Z",
            base: { ref: "trunk" },
          },
        ]),
      );
    await fetchLatestMergedPr(1, "rob/test");
    const url = fetchMock.mock.calls[1][0] as string;
    expect(url).toContain("base=trunk");
    expect(url).toContain("state=closed");
  });
});
