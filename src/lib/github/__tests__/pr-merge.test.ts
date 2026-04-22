import { describe, it, expect } from "vitest";
import {
  shouldHandlePrMerge,
  buildPrMergeDraftInput,
  type GitHubPullRequestPayload,
} from "../pr-merge";

function payload(overrides: Partial<GitHubPullRequestPayload> = {}): GitHubPullRequestPayload {
  return {
    action: "closed",
    installation: { id: 999 },
    pull_request: {
      number: 42,
      merged: true,
      title: "Add dashboard widget",
      body: "Adds per-repo stats widget.",
      html_url: "https://github.com/rob/brag.fast/pull/42",
      base: { ref: "main" },
    },
    repository: {
      full_name: "rob/brag.fast",
      default_branch: "main",
    },
    ...overrides,
  };
}

describe("shouldHandlePrMerge", () => {
  it("true for PR merged into default branch", () => {
    expect(shouldHandlePrMerge(payload())).toBe(true);
  });

  it("false for closed without merge", () => {
    const p = payload();
    p.pull_request.merged = false;
    expect(shouldHandlePrMerge(p)).toBe(false);
  });

  it("false for non-closed actions (opened, reopened, synchronize)", () => {
    expect(shouldHandlePrMerge(payload({ action: "opened" }))).toBe(false);
    expect(shouldHandlePrMerge(payload({ action: "reopened" }))).toBe(false);
    expect(shouldHandlePrMerge(payload({ action: "synchronize" }))).toBe(false);
  });

  it("false for merge into a non-default branch", () => {
    const p = payload();
    p.pull_request.base.ref = "develop";
    expect(shouldHandlePrMerge(p)).toBe(false);
  });

  it("handles repos with master as default", () => {
    const p = payload();
    p.pull_request.base.ref = "master";
    p.repository.default_branch = "master";
    expect(shouldHandlePrMerge(p)).toBe(true);
  });
});

describe("buildPrMergeDraftInput", () => {
  it("composes canonical idempotency key", () => {
    const input = buildPrMergeDraftInput(payload(), "u1");
    expect(input.idempotencyKey).toBe(
      "u1:github:pr_merged:rob/brag.fast#42",
    );
  });

  it("surfaces PR context for the template picker", () => {
    const input = buildPrMergeDraftInput(payload(), "u1");
    expect(input.pickTemplateInput.prContext?.title).toBe(
      "Add dashboard widget",
    );
    expect(input.pickTemplateInput.prContext?.body).toBe(
      "Adds per-repo stats widget.",
    );
  });

  it("passes brand voice into compose input when provided", () => {
    const input = buildPrMergeDraftInput(payload(), "u1", {
      brandName: "Acme",
      brandVoice: "dry and nerdy",
    });
    if (input.composeCopyInput.type !== "pr_merged") {
      throw new Error("expected pr_merged");
    }
    expect(input.composeCopyInput.brandName).toBe("Acme");
    expect(input.composeCopyInput.brandVoice).toBe("dry and nerdy");
  });

  it("handles empty PR body", () => {
    const p = payload();
    p.pull_request.body = null;
    const input = buildPrMergeDraftInput(p, "u1");
    if (input.composeCopyInput.type !== "pr_merged") throw new Error();
    expect(input.composeCopyInput.body).toBe("");
    expect(input.pickTemplateInput.prContext?.body).toBe("");
  });

  it("sets eventReference to the PR HTML URL", () => {
    const input = buildPrMergeDraftInput(payload(), "u1");
    expect(input.eventReference).toBe(
      "https://github.com/rob/brag.fast/pull/42",
    );
  });
});
