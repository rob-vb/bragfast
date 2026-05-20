import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepoContext } from "../repo-context";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-repo-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("getRepoContext (CLI-07)", () => {
  describe("non-git directory graceful fallback", () => {
    it("returns all-null object for a non-git directory (os.tmpdir())", () => {
      // os.tmpdir() is a real path that is not a git repository
      const ctx = getRepoContext(os.tmpdir());
      expect(ctx).toEqual({ tag: null, sha: null, name: null, version: null });
    });

    it("returns all-null object for a fresh empty temp directory", () => {
      const ctx = getRepoContext(tmp);
      expect(ctx).toEqual({ tag: null, sha: null, name: null, version: null });
    });
  });

  describe("real git repository (process.cwd() — bragfast monorepo)", () => {
    it("returns a non-null sha matching /^[0-9a-f]{7,}$/ for the bragfast repo", () => {
      // process.cwd() is the bragfast monorepo root — has a git repo
      const ctx = getRepoContext(process.cwd());
      expect(ctx.sha).not.toBeNull();
      expect(ctx.sha).toMatch(/^[0-9a-f]{7,}$/);
    });

    it("returns name 'bragfast' from the repo's root package.json", () => {
      const ctx = getRepoContext(process.cwd());
      expect(ctx.name).toBe("bragfast");
    });
  });

  describe("package.json without .git", () => {
    it("returns name and version from package.json, with null tag and sha, when no .git exists", () => {
      // Write a synthetic package.json into the tmp dir (no .git)
      writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({ name: "test-pkg", version: "1.2.3" }, null, 2)
      );

      const ctx = getRepoContext(tmp);
      expect(ctx.tag).toBeNull();
      expect(ctx.sha).toBeNull();
      expect(ctx.name).toBe("test-pkg");
      expect(ctx.version).toBe("1.2.3");
    });
  });

  describe("execSync throws (git not available)", () => {
    it("returns all-null object when execSync throws for every git command", async () => {
      vi.mock("child_process", () => ({
        execSync: vi.fn(() => {
          throw new Error("git not found");
        }),
      }));

      // Re-import to pick up the mock
      const { getRepoContext: getRepoContextMocked } = await import("../repo-context");

      const ctx = getRepoContextMocked(tmp);
      expect(ctx).toEqual({ tag: null, sha: null, name: null, version: null });

      vi.restoreAllMocks();
    });
  });
});
