/**
 * Regression test for insertDraftIfNew dedup + collision guard.
 * Mandatory per eng review. We exercise the pure predicate
 * src/lib/drafts/dedup.ts. The Convex mutation wraps the same logic
 * inside a single atomic transaction so retries cannot slip past it.
 */
import { describe, it, expect } from "vitest";
import { shouldInsertDraft } from "../drafts/dedup";

const BASE_WINDOW = Math.floor(Date.UTC(2026, 3, 19, 15, 0) / 1000) * 1000;

describe("shouldInsertDraft", () => {
  it("allows insert when no prior drafts or releases exist", () => {
    const result = shouldInsertDraft({
      input: { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
      existingDrafts: [],
      recentReleases: [],
    });
    expect(result).toEqual({ inserted: true });
  });

  it("blocks a second insert in the same (user, repo, window) — the retry case", () => {
    const existing = [
      { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
    ];
    const result = shouldInsertDraft({
      input: { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
      existingDrafts: existing,
      recentReleases: [],
    });
    expect(result).toEqual({ inserted: false, reason: "dedup" });
  });

  it("allows insert when windowStart differs (next day)", () => {
    const existing = [
      { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
    ];
    const nextDay = BASE_WINDOW + 24 * 60 * 60 * 1000;
    const result = shouldInsertDraft({
      input: { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: nextDay },
      existingDrafts: existing,
      recentReleases: [],
    });
    expect(result).toEqual({ inserted: true });
  });

  it("allows insert when repoFullName differs", () => {
    const existing = [
      { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
    ];
    const result = shouldInsertDraft({
      input: { userId: "u_1", repoFullName: "rob-vb/other-repo", windowStart: BASE_WINDOW },
      existingDrafts: existing,
      recentReleases: [],
    });
    expect(result).toEqual({ inserted: true });
  });

  it("blocks insert when a recent release already covers the chosen commit sha", () => {
    const releases = [
      {
        userId: "u_1",
        status: "pending_review",
        sourceMetadata: JSON.stringify({
          repoFullName: "rob-vb/bragfast",
          commitShas: ["abc1234abc1234"],
        }),
      },
    ];
    const result = shouldInsertDraft({
      input: {
        userId: "u_1",
        repoFullName: "rob-vb/bragfast",
        windowStart: BASE_WINDOW,
        sourceCommitShas: ["abc1234abc1234"],
      },
      existingDrafts: [],
      recentReleases: releases,
    });
    expect(result).toEqual({ inserted: false, reason: "collision" });
  });

  it("ignores releases with unrelated status (e.g. failed, dismissed)", () => {
    const releases = [
      {
        userId: "u_1",
        status: "dismissed",
        sourceMetadata: JSON.stringify({
          repoFullName: "rob-vb/bragfast",
          commitShas: ["abc1234abc1234"],
        }),
      },
    ];
    const result = shouldInsertDraft({
      input: {
        userId: "u_1",
        repoFullName: "rob-vb/bragfast",
        windowStart: BASE_WINDOW,
        sourceCommitShas: ["abc1234abc1234"],
      },
      existingDrafts: [],
      recentReleases: releases,
    });
    expect(result.inserted).toBe(true);
  });

  it("ignores releases for a different repo even when SHAs overlap", () => {
    const releases = [
      {
        userId: "u_1",
        status: "pending_review",
        sourceMetadata: JSON.stringify({
          repoFullName: "some/other",
          commitShas: ["abc1234abc1234"],
        }),
      },
    ];
    const result = shouldInsertDraft({
      input: {
        userId: "u_1",
        repoFullName: "rob-vb/bragfast",
        windowStart: BASE_WINDOW,
        sourceCommitShas: ["abc1234abc1234"],
      },
      existingDrafts: [],
      recentReleases: releases,
    });
    expect(result.inserted).toBe(true);
  });

  it("ignores releases with malformed sourceMetadata JSON", () => {
    const releases = [
      { userId: "u_1", status: "pending_review", sourceMetadata: "not json but contains \"repoFullName\":\"rob-vb/bragfast\" somehow" },
    ];
    const result = shouldInsertDraft({
      input: {
        userId: "u_1",
        repoFullName: "rob-vb/bragfast",
        windowStart: BASE_WINDOW,
        sourceCommitShas: ["abc1234abc1234"],
      },
      existingDrafts: [],
      recentReleases: releases,
    });
    expect(result.inserted).toBe(true);
  });

  it("allows insert when repoFullName is missing (mcp-manual source)", () => {
    const result = shouldInsertDraft({
      input: { userId: "u_1", windowStart: BASE_WINDOW },
      existingDrafts: [{ userId: "u_1", repoFullName: undefined, windowStart: BASE_WINDOW }],
      recentReleases: [],
    });
    // No repoFullName = no dedup key = always allow. MCP-manual source relies on
    // the caller to be intentional rather than on the window-based dedup.
    expect(result.inserted).toBe(true);
  });

  it("scopes dedup per-user (user B never blocks user A)", () => {
    const existing = [
      { userId: "u_other", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
    ];
    const result = shouldInsertDraft({
      input: { userId: "u_1", repoFullName: "rob-vb/bragfast", windowStart: BASE_WINDOW },
      existingDrafts: existing,
      recentReleases: [],
    });
    expect(result.inserted).toBe(true);
  });
});
