/**
 * Static-inspection tests for POST /api/v1/drafts (Shape B raw create).
 * Pattern matches cook-auth.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROUTE = path.resolve(process.cwd(), "src/app/api/v1/drafts/route.ts");

function read(): string {
  return readFileSync(ROUTE, "utf-8");
}

describe("POST /api/v1/drafts (Shape B raw create) contract", () => {
  it("exports POST handler in addition to existing GET", () => {
    const src = read();
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/);
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/);
  });

  it("uses authenticate() for Bearer/session auth", () => {
    const src = read();
    expect(src).toMatch(/await\s+authenticate\(request\)/);
  });

  it("returns 401 when unauthenticated", () => {
    expect(read()).toMatch(/Unauthorized.*?401|401.*?Unauthorized/s);
  });

  it("validates copy length 1-280 (400)", () => {
    const src = read();
    expect(src).toMatch(/copy.*?280/);
    expect(src).toMatch(/status:\s*400/);
  });

  it("validates templateId presence (400)", () => {
    expect(read()).toMatch(/templateId required/);
  });

  it("validates format is landscape|square|portrait (400)", () => {
    expect(read()).toMatch(/landscape\|square\|portrait/);
  });

  it("validates aiContent is array (400)", () => {
    expect(read()).toMatch(/aiContent must be an array/);
  });

  it("calls insertDraftIfNew with source=mcp-manual", () => {
    const src = read();
    expect(src).toMatch(/insertDraftIfNew/);
    expect(src).toMatch(/source:\s*"mcp-manual"/);
  });

  it("propagates dedup skip as 200 {skipped}", () => {
    expect(read()).toMatch(/skipped:\s*result\.reason/);
  });
});
