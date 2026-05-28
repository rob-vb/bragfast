import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("../auth", () => ({
  getInstallationToken: vi.fn().mockResolvedValue("token-abc"),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { fetchLatestMergedPr, runRetroPrMergeDraft } from "../retro-pr";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
  mockCreate.mockReset();
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

  it("Sous-Chef retro surface: one Haiku call, records surfaced trigger", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonRes({ default_branch: "main" }))
      .mockResolvedValueOnce(
        jsonRes([
          {
            number: 200,
            title: "Add carousel template",
            body: "Carousel slides ship today.",
            html_url: "https://github.com/rob/test/pull/200",
            merged_at: "2026-04-30T10:00:00Z",
            base: { ref: "main" },
          },
        ]),
      );

    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"summary":"Screenshot the carousel editor — carousel slides ship today.","confidence":0.9}',
        },
      ],
    });

    const surfacedCalls: Array<Record<string, unknown>> = [];
    const convex = {
      action: vi.fn().mockImplementation(async (_ref, args) => {
        if (args && typeof args === "object" && "summary" in args) {
          surfacedCalls.push(args as Record<string, unknown>);
          return { created: true, externalId: "evt_retro1" };
        }
        return undefined;
      }),
    } as unknown as Parameters<typeof runRetroPrMergeDraft>[0];

    const out = await runRetroPrMergeDraft(convex, "user_1", 1, "rob/test");
    expect(out, JSON.stringify(out)).toEqual({ ok: true, mode: "surfaced" });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(surfacedCalls).toHaveLength(1);
    expect(surfacedCalls[0].summary).toContain("carousel");
    expect(surfacedCalls[0].confidence).toBe(0.9);
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
