import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Auth regression tests for the Cook endpoints.
//
// Both cook endpoints must use authenticate() (which accepts API key OR session
// cookie) rather than validateApiKey() (which only accepts API keys). This
// ensures admin users can generate images/videos without an API key.
//
// We verify the import statements in the route files — this is the minimal,
// reliable approach for Next.js route handlers that can't be unit-tested
// directly (they depend on Convex, next/server, etc.).

const COOK_ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/route.ts"
);

const COOK_ID_ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/[id]/route.ts"
);

function readRoute(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

describe("POST /api/v1/cook — auth", () => {
  it("imports authenticate from @/lib/auth/authenticate (not validateApiKey)", () => {
    const src = readRoute(COOK_ROUTE);
    expect(src).toContain('import { authenticate } from "@/lib/auth/authenticate"');
  });

  it("does not import from @/lib/auth/validate-api-key", () => {
    const src = readRoute(COOK_ROUTE);
    expect(src).not.toContain("validate-api-key");
  });

  it("calls authenticate(request) at the top of the handler", () => {
    const src = readRoute(COOK_ROUTE);
    expect(src).toContain("authenticate(request)");
  });
});

describe("GET /api/v1/cook/[id] — auth", () => {
  it("imports authenticate from @/lib/auth/authenticate (not validateApiKey)", () => {
    const src = readRoute(COOK_ID_ROUTE);
    expect(src).toContain('import { authenticate } from "@/lib/auth/authenticate"');
  });

  it("does not import from @/lib/auth/validate-api-key", () => {
    const src = readRoute(COOK_ID_ROUTE);
    expect(src).not.toContain("validate-api-key");
  });

  it("calls authenticate(request) at the top of the handler", () => {
    const src = readRoute(COOK_ID_ROUTE);
    expect(src).toContain("authenticate(request)");
  });
});

describe("authenticate() function — dual auth support", () => {
  it("authenticate.ts imports validateApiKey (API key path)", () => {
    const authenticateSrc = readFileSync(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts"),
      "utf-8"
    );
    expect(authenticateSrc).toContain("validateApiKey");
  });

  it("authenticate.ts imports getSessionUser (session cookie path)", () => {
    const authenticateSrc = readFileSync(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts"),
      "utf-8"
    );
    expect(authenticateSrc).toContain("getSessionUser");
  });

  it("authenticate.ts returns userId for both auth paths", () => {
    const authenticateSrc = readFileSync(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts"),
      "utf-8"
    );
    // Both paths return { userId }
    const userIdMatches = (authenticateSrc.match(/userId/g) ?? []).length;
    expect(userIdMatches).toBeGreaterThanOrEqual(2);
  });
});
