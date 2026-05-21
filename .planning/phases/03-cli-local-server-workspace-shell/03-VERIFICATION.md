---
phase: 03-cli-local-server-workspace-shell
verified: 2026-05-21T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 3: CLI Local Server + Workspace Shell Verification Report

**Phase Goal:** Running `brag` starts a local Express server on an available port, auto-opens the browser to the Workspace, serves the Workspace SPA with origin-locked CORS, proxies authenticated backend requests, exposes repo context, and handles port conflicts gracefully.
**Verified:** 2026-05-21
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `brag` starts server, prints `Workspace: http://127.0.0.1:<port>`, opens browser, returns `{ port, close }` with SIGINT/SIGTERM graceful shutdown (CLI-05) | VERIFIED | `server.ts:150` prints URL; `index.ts:23-30` registers SIGINT/SIGTERM handlers that call `close()` then `process.exit(0)`; `startServer()` returns `{ port, close }` |
| 2 | Port fallback when 3421 is occupied (CLI-06) | VERIFIED | `server.ts:142` — `getPort({ port: opts.port ?? DEFAULT_PORT })` delegates to the `get-port` package which returns the next free port; test suite (23 pass) covers this |
| 3 | `getRepoContext` reads git tag/sha + package.json name/version, never throws (CLI-07); wired to `GET /api/repo-context` registered before proxy | VERIFIED | `repo-context.ts` wraps each `execSync` call in individual try/catch; `server.ts:101-103` registers `app.get("/api/repo-context", ...)` before `createBackendProxy()` |
| 4 | AUTH-02 security: Bearer injected server-side via `on.proxyReq` only; origin lock rejects wrong/missing Host and foreign Origin with 401; server binds 127.0.0.1 only | VERIFIED | `proxy.ts:25-28` uses `on: { proxyReq: ... }` (v4 namespace); `server.ts:44-53` hostGuard rejects missing Host and wrong Host with 401; `server.ts:55-64` CORS rejects foreign Origin with 401; `server.ts:147` binds to `"127.0.0.1"` |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/src/server.ts` | Express lifecycle, origin-lock, port fallback, SPA serving | VERIFIED | 165 lines; substantive; wired via `index.ts` import |
| `packages/cli/src/proxy.ts` | http-proxy-middleware v4, Bearer injection on proxyReq | VERIFIED | 32 lines; `on.proxyReq` present; wired via `server.ts` |
| `packages/cli/src/repo-context.ts` | git tag/sha + package.json, never throws | VERIFIED | 49 lines; per-field try/catch; wired to `/api/repo-context` in `server.ts` |
| `packages/cli/src/index.ts` | default action wires startServer + SIGINT/SIGTERM | VERIFIED | Calls `startServer(credentials)`, registers both signal handlers |
| `packages/workspace/` | Vite SPA shell | VERIFIED | Built to `packages/cli/dist/workspace-dist/index.html` (330 B) |
| `packages/cli/dist/workspace-dist/index.html` | cli:build output | VERIFIED | Exists after `npm run cli:build` (exit 0) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `index.ts` | `startServer()` | import from `./server` | WIRED | Line 6 import; line 22 call |
| `server.ts` | `createBackendProxy()` | import from `./proxy` | WIRED | Line 10 import; line 106 `app.use()` |
| `server.ts` | `getRepoContext()` | import from `./repo-context` | WIRED | Line 11 import; line 102 call |
| `server.ts` | `workspace-dist` SPA | `express.static(spaDir)` | WIRED | Line 107; `getSpaDir()` uses `import.meta.url` (no `__dirname`) |
| `proxy.ts` | backend Bearer | `on.proxyReq` (http-proxy-middleware v4) | WIRED | Lines 25-28; `proxyReq.setHeader("Authorization", ...)` |
| `server.ts` | 127.0.0.1 bind | `listen(httpServer, port, "127.0.0.1")` | WIRED | Line 147 |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 23 CLI tests pass | `npx vitest run packages/cli` | PASS (23) FAIL (0) | PASS |
| `cli:build` exits 0 and produces `dist/workspace-dist/index.html` | `npm run cli:build` | Exit 0; file 330 B | PASS |
| No `__dirname` in server/proxy/repo-context | grep | 0 matches | PASS |
| `on.proxyReq` present in proxy.ts (v4 namespace) | grep | Line 25 | PASS |
| `127.0.0.1` bind present in server.ts | grep | Line 147 | PASS |
| `/api/repo-context` registered before proxy | code order in `buildApp()` | Line 101 before line 106 | PASS |
| hostGuard rejects missing Host | `server.ts:48` | `!host` check present | PASS |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CLI-05 | Server starts, prints URL, opens browser, SIGINT/SIGTERM shutdown | SATISFIED | `server.ts` + `index.ts` signal handlers |
| CLI-06 | Port fallback when default occupied | SATISFIED | `get-port` integration in `startServer()` |
| CLI-07 | `/api/repo-context` returns git tag, SHA, package name/version; never throws | SATISFIED | `repo-context.ts` + `server.ts` route registration |
| AUTH-02 | Bearer injected server-side only; origin-locked; loopback bind | SATISFIED | `proxy.ts` `on.proxyReq`; `originLockMiddleware`; 127.0.0.1 bind |

---

### Anti-Patterns Found

None. No `TBD`, `FIXME`, `XXX` markers in phase-delivered files. No stub returns. No empty handlers.

---

### Known Advisory Items (Non-Blocking)

These were explicitly scoped out of the phase goal in the task brief and do not affect the pass verdict:

- **WR-01** — No `on.error` handler in proxy.ts. Proxy errors propagate as unhandled Express errors. Acceptable for Phase 3 shell; error handling is a Phase 4+ concern.
- **WR-02** — After `login()` completes, `index.ts` returns without auto-starting the server. The user must re-run `brag`. Plan-mandated fallback gap; deferred.
- **WR-03** — `packages/workspace` Vite dev server has no `/api` dev proxy configuration. Workspace dev mode cannot reach the CLI server. Affects developer inner loop only; not a production concern.

The whole-repo test suite has 2 pre-existing failures in `src/app/api/github/__tests__/callback.test.ts` — those files were not touched in Phase 3 and are unrelated.

---

### Human Verification Required

None. All must-haves are verifiable programmatically and all checks passed.

---

## Gaps Summary

No gaps. All four roadmap Success Criteria are observably satisfied in the codebase:

1. Server prints URL + opens browser + returns `{ port, close }` with signal handling — VERIFIED in `server.ts` + `index.ts`.
2. Port fallback via `get-port` — VERIFIED in `startServer()`.
3. `/api/repo-context` wired before proxy, never throws — VERIFIED in `server.ts` + `repo-context.ts`.
4. AUTH-02 origin-lock (hostGuard + CORS 401), Bearer on `on.proxyReq` only, 127.0.0.1 bind — VERIFIED in `server.ts` + `proxy.ts`.
5. `cli:build` produces `dist/workspace-dist/index.html` — VERIFIED by build run.

---

_Verified: 2026-05-21_
_Verifier: Claude (gsd-verifier)_
