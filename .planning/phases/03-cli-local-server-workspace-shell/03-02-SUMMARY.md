---
phase: 03-cli-local-server-workspace-shell
plan: "02"
subsystem: cli-tests
tags:
  - tdd
  - red-state
  - unit-tests
  - server
  - proxy
  - origin-lock
  - repo-context
dependency_graph:
  requires:
    - 03-01
  provides:
    - test-contracts-for-03-03
    - test-contracts-for-03-04
  affects:
    - packages/cli/src/__tests__/
tech_stack:
  added:
    - supertest (integration test HTTP requests, devDep)
  patterns:
    - vitest vi.mock for http-proxy-middleware isolation
    - injectable-options pattern (openBrowser, stdout, spaDir) for server tests
    - vi.fn spy on setHeader for Bearer injection assertion
key_files:
  created:
    - packages/cli/src/__tests__/server.test.ts
    - packages/cli/src/__tests__/origin-lock.test.ts
    - packages/cli/src/__tests__/proxy.test.ts
    - packages/cli/src/__tests__/repo-context.test.ts
  modified: []
decisions:
  - "spaDir injected as ServerOptions field to avoid real workspace-dist dependency in tests"
  - "proxy.test.ts uses vi.mock('http-proxy-middleware') to isolate setHeader assertion without network calls"
  - "repo-context test for execSync-throws uses dynamic import to pick up vi.mock after mocking child_process"
metrics:
  duration: "2 minutes"
  completed_date: "2026-05-20T21:31:11Z"
  tasks_completed: 3
  files_created: 4
---

# Phase 3 Plan 02: Wave 0 RED-State Test Harnesses Summary

**One-liner:** Four failing vitest test files that define contracts for CLI-05, CLI-06, CLI-07, and AUTH-02 — server lifecycle, origin-lock, proxy Bearer injection, and repo-context extraction.

## What Was Built

Four test files written in RED state. All four suites fail with "Failed to resolve import" because the implementation modules (`server.ts`, `proxy.ts`, `repo-context.ts`) do not exist yet — Plans 03-03 and 03-04 will create them. These tests define the behavioral contracts those implementations must satisfy.

### Task 1: `server.test.ts` (CLI-05, CLI-06, SPA fallback) — commit `036cae9`

7 `it()` blocks across 4 `describe` groups:

- **port binding and URL print (CLI-05):** binds to 127.0.0.1, returns positive port; writes `Workspace: http://127.0.0.1:<PORT>` to injected stdout; calls `openBrowser` with the correct URL
- **port conflict fallback (CLI-06):** occupies port 3421 via `node:net` createServer, asserts `startServer` returns a different port
- **SPA static fallback:** GET `/` returns 200; GET `/nonexistent-path` returns 200 (SPA router fallback)
- **lifecycle:** `close()` resolves without error

Uses injectable `openBrowser` (vi.fn), `stdout.write` (vi.fn), and `spaDir` (mkdtempSync with minimal index.html) from `ServerOptions` so no real browser opens and no workspace-dist is required.

### Task 2: `origin-lock.test.ts` + `proxy.test.ts` (AUTH-02) — commit `ec403ff`

**origin-lock.test.ts** (4 `it()` blocks):

- Rejects GET `/api/repo-context` with `Origin: http://evil.com` + correct Host → 401
- Rejects GET `/api/repo-context` with `Origin: http://evil.com` + wrong Host → 401
- Passes GET with no Origin header + correct Host (same-origin, not rejected at CORS level)
- Passes GET with `Origin: http://127.0.0.1:<PORT>` + correct Host → 200

Builds a minimal Express app with `originLockMiddleware(PORT)` applied and a test route; uses supertest.

**proxy.test.ts** (3 `it()` blocks):

- Mocks `http-proxy-middleware` via `vi.mock` to capture the `on.proxyReq` callback
- Asserts `setHeader("Authorization", "Bearer bf_test_key_1234")` is called on the mock proxyReq
- Asserts `setHeader("Authorization", ...)` is NOT called on the response object (Information Disclosure mitigation)

### Task 3: `repo-context.test.ts` (CLI-07) — commit `53a1b0d`

6 `it()` blocks:

- `getRepoContext(os.tmpdir())` → all-null (non-git)
- `getRepoContext(tmp)` (empty tmpdir) → all-null
- `getRepoContext(process.cwd())` → `sha` matches `/^[0-9a-f]{7,}$/`, `name === "bragfast"` (real repo)
- `getRepoContext(tmpDir)` with synthetic package.json → `name === "test-pkg"`, `version === "1.2.3"`, tag/sha null
- `vi.mock("child_process", ...)` to make execSync throw → all-null (graceful fallback)
- `getRepoContext(tmp)` fresh empty dir → all-null

## Deviations from Plan

None — plan executed exactly as written. RED state achieved as specified.

## RED State Confirmation

```
4 suites failed (expected):
  - origin-lock.test.ts: "Failed to resolve import ../server"
  - proxy.test.ts: "Failed to resolve import ../proxy"
  - repo-context.test.ts: "Failed to resolve import ../repo-context"
  - server.test.ts: "Failed to resolve import ../server"
```

All failures are "Cannot find module" — not logic errors. This is the correct RED state for Wave 0 tests.

## Known Stubs

None. These are test files only; no implementation stubs introduced.

## Threat Flags

None. Test files only — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] `packages/cli/src/__tests__/server.test.ts` — exists, 142 lines
- [x] `packages/cli/src/__tests__/origin-lock.test.ts` — exists, 71 lines
- [x] `packages/cli/src/__tests__/proxy.test.ts` — exists, 102 lines
- [x] `packages/cli/src/__tests__/repo-context.test.ts` — exists, 79 lines
- [x] Task 1 commit `036cae9` — verified in git log
- [x] Task 2 commit `ec403ff` — verified in git log
- [x] Task 3 commit `53a1b0d` — verified in git log
- [x] All 4 suites fail with "Failed to resolve import" (RED state correct)
- [x] No modifications to STATE.md or ROADMAP.md (worktree mode)
