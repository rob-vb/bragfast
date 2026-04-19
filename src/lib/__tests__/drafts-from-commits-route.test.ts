/**
 * Static-inspection tests for POST /api/v1/drafts/from-commits.
 *
 * Matches the project pattern in cook-auth.test.ts: Next route handlers depend
 * on Convex/next-server/octokit and can't be unit-tested directly without a
 * full integration harness. We assert the route's contract by reading the file
 * and checking imports + control flow markers. End-to-end behavior is covered
 * by manual verification (see plan verification section).
 *
 * Behavioral coverage of the underlying pieces lives in:
 * - drafts-insert-dedup.test.ts          (dedup logic)
 * - haiku helpers' built-in fallbacks    (pickTemplate / generateSlideContent)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/drafts/from-commits/route.ts"
);

function read(): string {
  return readFileSync(ROUTE, "utf-8");
}

describe("/api/v1/drafts/from-commits route contract", () => {
  it("exports maxDuration = 60 (Vercel hobby default 10s is too short for Haiku x3)", () => {
    expect(read()).toMatch(/export\s+const\s+maxDuration\s*=\s*60/);
  });

  it("exports POST handler", () => {
    expect(read()).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  });

  it("uses authenticate() from @/lib/auth/authenticate (Bearer or session)", () => {
    const src = read();
    expect(src).toMatch(/from\s+["']@\/lib\/auth\/authenticate["']/);
    expect(src).toMatch(/await\s+authenticate\(request\)/);
  });

  it("returns 401 when authenticate returns null", () => {
    expect(read()).toMatch(/status:\s*401/);
  });

  it("validates repoFullName presence (400)", () => {
    const src = read();
    expect(src).toMatch(/repoFullName/);
    expect(src).toMatch(/status:\s*400/);
  });

  it("authorizes via listWatchedReposForUser, returns 403 when repo missing", () => {
    const src = read();
    expect(src).toMatch(/listWatchedReposForUser/);
    expect(src).toMatch(/status:\s*403/);
  });

  it("encodes 502 for GitHub failures (token + commits)", () => {
    expect(read()).toMatch(/status:\s*502/);
  });

  it("returns skipped:no-commits when commits array is empty", () => {
    expect(read()).toMatch(/skipped:\s*"no-commits"/);
  });

  it("returns skipped:not-worth-posting when Haiku says skip", () => {
    expect(read()).toMatch(/skipped:\s*"not-worth-posting"/);
  });

  it("calls insertDraftIfNew with source=mcp-manual", () => {
    const src = read();
    expect(src).toMatch(/insertDraftIfNew/);
    expect(src).toMatch(/source:\s*"mcp-manual"/);
  });

  it("propagates insertDraftIfNew skip reason (dedup) as skipped response", () => {
    const src = read();
    expect(src).toMatch(/skipped:\s*insertResult\.reason/);
  });
});
