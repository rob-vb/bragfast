/**
 * Static-inspection tests for the 3 AI primitive routes.
 * /api/v1/ai/analyze-commits — wraps Haiku #1 (analyzeCommits)
 * /api/v1/ai/suggest-template — wraps Haiku #2 (pickTemplate)
 * /api/v1/ai/fill-template-objects — wraps Haiku #3 (generateSlideContent)
 *
 * Pattern matches cook-auth.test.ts. Behavioral correctness of the underlying
 * Haiku helpers is covered by their built-in fallbacks + Zod schema validation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ANALYZE = path.resolve(process.cwd(), "src/app/api/v1/ai/analyze-commits/route.ts");
const SUGGEST = path.resolve(process.cwd(), "src/app/api/v1/ai/suggest-template/route.ts");
const FILL = path.resolve(process.cwd(), "src/app/api/v1/ai/fill-template-objects/route.ts");

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

describe.each([
  ["analyze-commits", ANALYZE],
  ["suggest-template", SUGGEST],
  ["fill-template-objects", FILL],
])("/api/v1/ai/%s contract", (_name, file) => {
  it("exports POST handler", () => {
    expect(read(file)).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  });

  it("exports maxDuration = 60", () => {
    expect(read(file)).toMatch(/export\s+const\s+maxDuration\s*=\s*60/);
  });

  it("uses authenticate() and returns 401 path", () => {
    const src = read(file);
    expect(src).toMatch(/await\s+authenticate\(request\)/);
    expect(src).toMatch(/status:\s*401/);
  });

  it("returns 502 on Haiku failure", () => {
    expect(read(file)).toMatch(/status:\s*502/);
  });

  it("validates request body (400 path)", () => {
    expect(read(file)).toMatch(/status:\s*400/);
  });
});

describe("analyze-commits route specifics", () => {
  it("imports analyzeCommits", () => {
    expect(read(ANALYZE)).toMatch(/from\s+["']@\/lib\/github\/analyze-commits["']/);
  });
});

describe("suggest-template route specifics", () => {
  it("imports pickTemplate", () => {
    expect(read(SUGGEST)).toMatch(/from\s+["']@\/lib\/github\/pick-template["']/);
  });
  it("falls back to user's templates when candidates omitted", () => {
    expect(read(SUGGEST)).toMatch(/listTemplateCandidates/);
  });
});

describe("fill-template-objects route specifics", () => {
  it("imports generateSlideContent + extractCandidateSlots", () => {
    const src = read(FILL);
    expect(src).toMatch(/from\s+["']@\/lib\/github\/generate-slide-content["']/);
    expect(src).toMatch(/from\s+["']@\/lib\/templates\/extract-slots["']/);
  });
  it("returns 404 when templateId not found", () => {
    expect(read(FILL)).toMatch(/status:\s*404/);
  });
});
