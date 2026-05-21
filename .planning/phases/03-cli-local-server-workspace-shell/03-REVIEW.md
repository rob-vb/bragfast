---
phase: 03-cli-local-server-workspace-shell
reviewed: 2026-05-21T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - packages/cli/src/proxy.ts
  - packages/cli/src/server.ts
  - packages/cli/src/repo-context.ts
  - packages/cli/src/index.ts
  - packages/cli/tsup.config.ts
  - packages/cli/src/__tests__/origin-lock.test.ts
  - packages/cli/src/__tests__/proxy.test.ts
  - packages/cli/src/__tests__/repo-context.test.ts
  - packages/cli/src/__tests__/server.test.ts
  - packages/workspace/src/api.ts
  - packages/workspace/src/App.tsx
  - packages/workspace/src/main.tsx
  - packages/workspace/src/types.ts
  - packages/workspace/vite.config.ts
  - packages/cli/package.json
  - packages/workspace/package.json
  - package.json
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-21
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed the CLI local server, reverse proxy, origin-lock middleware, repo-context reader, Workspace SPA shell, and their test suites. The AUTH-02 security surface (Bearer injection server-side, origin lock, 127.0.0.1 binding, no shell injection via `cwd`) is correctly implemented. Two blockers were found: a path-stripping bug that will cause all backend API proxying to 404, and a hostGuard gap that passes requests with an absent Host header. Three warnings cover defense-in-depth and robustness concerns.

## Critical Issues

### CR-01: Proxy strips `/api` prefix — all backend API calls will 404

**File:** `packages/cli/src/server.ts:102`

**Issue:** The proxy is mounted with `app.use("/api", createBackendProxy(...))`. When Express mounts middleware at a prefix, it strips that prefix from `req.url` before handing off to the middleware. `http-proxy-middleware` v4 uses `req.url` to construct the upstream path. This means a Workspace request to `/api/v1/cook/image` arrives at HPM with `req.url = /v1/cook/image`, which is forwarded to `https://bragfast.com/v1/cook/image`. The backend (Next.js App Router) mounts all routes under `/api/v1/...`, so every proxied call will receive a 404.

Confirmed by inspecting the HPM v4 source at `node_modules/http-proxy-middleware/dist/http-proxy-middleware.js` — it reads `req.url` directly with no originalUrl fallback. Standard Express behavior verified: prefix is always stripped before middleware receives the request.

**Fix:** Either mount the proxy at root and filter by path pattern, or add a `pathRewrite` to re-inject the prefix:

Option A — mount at root with a path filter (cleanest):
```typescript
// server.ts
app.use(
  createProxyMiddleware({
    target: getApiUrl(),
    changeOrigin: true,
    pathFilter: "/api",          // HPM matches on req.originalUrl, not req.url
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      },
    },
  })
);
```

Option B — keep `app.use("/api", ...)` but restore the stripped prefix:
```typescript
// proxy.ts
export function createBackendProxy(apiKey: string): RequestHandler {
  return createProxyMiddleware({
    target: getApiUrl(),
    changeOrigin: true,
    pathRewrite: { "^/": "/api/" },   // /v1/foo -> /api/v1/foo
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      },
    },
  });
}
```

---

### CR-02: hostGuard allows requests with no `Host` header

**File:** `packages/cli/src/server.ts:46`

**Issue:** The DNS-rebinding guard reads:

```typescript
if (host && host !== `127.0.0.1:${port}`) {
  res.status(401).json({ error: "forbidden" });
  return;
}
```

The `host &&` short-circuit means a request with no `Host` header is silently passed through. HTTP/1.0 clients and raw command-line tools (curl without `-H Host:`) omit the header. Any local process that can connect to 127.0.0.1 and send a raw HTTP/1.0 request without a Host header bypasses the host guard entirely. The CORS layer still protects browser-originated cross-origin requests, but the host guard is specifically documented as the DNS-rebinding defense; a gap here weakens that layer.

**Fix:**
```typescript
const hostGuard: RequestHandler = (req, res, next) => {
  const host = req.headers.host;
  if (!host || host !== `127.0.0.1:${port}`) {
    res.status(401).json({ error: "forbidden" });
    return;
  }
  next();
};
```

The test suite does not cover the no-Host case. Add a test:
```typescript
it("rejects GET /api/repo-context with no Host header with 401", async () => {
  const res = await request(app).get("/api/repo-context");
  // supertest sends no Host when not set explicitly
  expect(res.status).toBe(401);
});
```

---

## Warnings

### WR-01: No proxy error handler — backend connection failures produce verbose HTML error pages

**File:** `packages/cli/src/proxy.ts:17-27`

**Issue:** HPM v4 ships a default `errorResponsePlugin` that handles proxy errors by writing a plain-text response: `"Error occurred while trying to proxy: <host><url>"`. While HPM's `sanitize()` escapes `<` and `>`, there is no `on.error` handler registered. If the backend is unreachable (network error, DNS failure, TLS error), the user sees a raw HPM error string in the browser rather than a clean Workspace error message. This is a robustness gap rather than a security issue.

**Fix:**
```typescript
// proxy.ts
on: {
  proxyReq: (proxyReq) => {
    proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
  },
  error: (_err, _req, res) => {
    if (res && "writeHead" in res && !res.headersSent) {
      (res as import("node:http").ServerResponse)
        .writeHead(502)
        .end(JSON.stringify({ error: "backend_unavailable" }));
    }
  },
},
```

---

### WR-02: `login()` silently exits without starting the server — no user prompt

**File:** `packages/cli/src/index.ts:17-21`

**Issue:** When the user runs `brag` without credentials, `login()` is called and then the action returns silently. The server never starts; the user must re-run `brag` manually after authenticating. There is no output telling them to do this. If a user completes device-flow auth and waits, nothing happens — `login()` exits, the process terminates, no workspace opens.

**Fix:** Either start the server automatically after successful login, or print a clear prompt:

```typescript
if (!credentials) {
  await login();
  // Re-read credentials just written and start the server immediately
  const fresh = await readCredentials();
  if (!fresh) return;
  const { close } = await startServer(fresh);
  // ... register signal handlers
  return;
}
```

Or at minimum ensure `login()` prints "Run `brag` again to open the Workspace." before returning.

---

### WR-03: Workspace `vite dev` cannot reach any API endpoint — no dev proxy configured

**File:** `packages/workspace/vite.config.ts:1-11`

**Issue:** When developing the Workspace in isolation with `npm run dev` (inside `packages/workspace`), all `fetch("/api/...")` calls will fail with 404 or CORS errors because there is no `server.proxy` configured in `vite.config.ts`. This blocks Workspace UI development without running the full CLI server. The current SPA only calls `/api/repo-context`, so the breakage is limited today, but will grow as more API calls are added.

**Fix:**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: { outDir: "dist", assetsDir: "assets" },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3421",
        changeOrigin: false,
      },
    },
  },
});
```

---

## Info

### IN-01: Unused import `rmSync` in `repo-context.test.ts`

**File:** `packages/cli/src/__tests__/repo-context.test.ts:1`

**Issue:** `rmSync` is imported from `"fs"` but never called. The test teardown uses the async `rm` from `"fs/promises"`. This is a dead import.

**Fix:** Remove `rmSync` from the import:
```typescript
import { mkdtempSync, writeFileSync } from "fs";
```

---

_Reviewed: 2026-05-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
