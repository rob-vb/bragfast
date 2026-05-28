import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  surfaceTrigger,
  fallbackSurfaceTrigger,
} from "../surface-trigger";

vi.mock("../../haiku-call", () => ({
  callHaikuJson: vi.fn(),
}));

import { callHaikuJson } from "../../haiku-call";

describe("fallbackSurfaceTrigger", () => {
  it("includes PR title and repo", () => {
    const r = fallbackSurfaceTrigger({
      type: "pr_merged",
      title: "Add dark mode",
      body: "",
      repoFullName: "rob/brag.fast",
    });
    expect(r.summary).toContain("Add dark mode");
    expect(r.summary).toContain("rob/brag.fast");
    expect(r.confidence).toBe(0.35);
  });
});

describe("surfaceTrigger", () => {
  beforeEach(() => {
    vi.mocked(callHaikuJson).mockReset();
  });

  it("returns Haiku summary and confidence", async () => {
    vi.mocked(callHaikuJson).mockImplementation(async ({ fallback }) => ({
      summary: "Screenshot the billing page — you shipped usage-based pricing.",
      confidence: 0.82,
    }));
    const r = await surfaceTrigger({
      type: "pr_merged",
      title: "Usage-based pricing",
      body: "Adds metered billing UI",
      repoFullName: "acme/app",
    });
    expect(r.summary).toContain("billing");
    expect(r.confidence).toBe(0.82);
  });

  it("falls back when Haiku returns fallback path", async () => {
    vi.mocked(callHaikuJson).mockImplementation(async ({ fallback }) => fallback);
    const r = await surfaceTrigger({
      type: "pr_merged",
      title: "Fix login",
      body: "",
      repoFullName: "acme/app",
    });
    expect(r.summary).toContain("Fix login");
    expect(r.confidence).toBe(0.35);
  });
});
