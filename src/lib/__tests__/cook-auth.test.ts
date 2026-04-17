import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Auth regression tests for the Cook endpoints.
//
// Both cook endpoints must use authenticate() (which accepts API key OR session
// cookie) rather than validateApiKey() (which only accepts API keys). This
// ensures admin users can generate images/videos without an API key.
//
// We verify the import/call chain in the route files — static inspection is
// the minimal, reliable approach for Next.js route handlers that can't be
// unit-tested directly (they depend on Convex, next/server, etc.).

const COOK_IMAGE_ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/image/route.ts"
);

const COOK_VIDEO_ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/video/route.ts"
);

const COOK_SHARED = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/_shared.ts"
);

const COOK_ID_ROUTE = path.resolve(
  process.cwd(),
  "src/app/api/v1/cook/[id]/route.ts"
);

function readFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

describe("cook route auth — shared helper", () => {
  it("_shared.ts imports authenticate from @/lib/auth/authenticate", () => {
    const src = readFile(COOK_SHARED);
    expect(src).toContain('import { authenticate } from "@/lib/auth/authenticate"');
  });

  it("_shared.ts does not import validateApiKey directly", () => {
    const src = readFile(COOK_SHARED);
    expect(src).not.toContain("validate-api-key");
  });

  it("_shared.ts calls authenticate(request) in the pre-flight helper", () => {
    const src = readFile(COOK_SHARED);
    expect(src).toContain("authenticate(request)");
  });
});

describe("POST /api/v1/cook/image — auth", () => {
  it("delegates auth to authenticateAndCheckRateLimit from _shared", () => {
    const src = readFile(COOK_IMAGE_ROUTE);
    expect(src).toContain("authenticateAndCheckRateLimit");
    expect(src).toContain('from "../_shared"');
  });

  it("calls authenticateAndCheckRateLimit(request) at the top of the handler", () => {
    const src = readFile(COOK_IMAGE_ROUTE);
    expect(src).toContain("authenticateAndCheckRateLimit(request)");
  });

  it("does not import from @/lib/auth/validate-api-key", () => {
    const src = readFile(COOK_IMAGE_ROUTE);
    expect(src).not.toContain("validate-api-key");
  });
});

describe("POST /api/v1/cook/video — auth", () => {
  it("delegates auth to authenticateAndCheckRateLimit from _shared", () => {
    const src = readFile(COOK_VIDEO_ROUTE);
    expect(src).toContain("authenticateAndCheckRateLimit");
    expect(src).toContain('from "../_shared"');
  });

  it("calls authenticateAndCheckRateLimit(request) at the top of the handler", () => {
    const src = readFile(COOK_VIDEO_ROUTE);
    expect(src).toContain("authenticateAndCheckRateLimit(request)");
  });

  it("does not import from @/lib/auth/validate-api-key", () => {
    const src = readFile(COOK_VIDEO_ROUTE);
    expect(src).not.toContain("validate-api-key");
  });
});

describe("GET /api/v1/cook/[id] — auth", () => {
  it("imports authenticate from @/lib/auth/authenticate (not validateApiKey)", () => {
    const src = readFile(COOK_ID_ROUTE);
    expect(src).toContain('import { authenticate } from "@/lib/auth/authenticate"');
  });

  it("does not import from @/lib/auth/validate-api-key", () => {
    const src = readFile(COOK_ID_ROUTE);
    expect(src).not.toContain("validate-api-key");
  });

  it("calls authenticate(request) at the top of the handler", () => {
    const src = readFile(COOK_ID_ROUTE);
    expect(src).toContain("authenticate(request)");
  });
});

describe("authenticate() function — dual auth support", () => {
  it("authenticate.ts imports validateApiKey (API key path)", () => {
    const authenticateSrc = readFile(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts")
    );
    expect(authenticateSrc).toContain("validateApiKey");
  });

  it("authenticate.ts imports getSessionUser (session cookie path)", () => {
    const authenticateSrc = readFile(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts")
    );
    expect(authenticateSrc).toContain("getSessionUser");
  });

  it("authenticate.ts returns userId for both auth paths", () => {
    const authenticateSrc = readFile(
      path.resolve(process.cwd(), "src/lib/auth/authenticate.ts")
    );
    // Both paths return { userId }
    const userIdMatches = (authenticateSrc.match(/userId/g) ?? []).length;
    expect(userIdMatches).toBeGreaterThanOrEqual(2);
  });
});
