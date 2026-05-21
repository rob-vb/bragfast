---
phase: 03-cli-local-server-workspace-shell
plan: "03"
subsystem: cli
tags:
  - tdd
  - green-state-deferred
  - server
  - proxy
  - origin-lock
  - security
  - express
dependency_graph:
  requires:
    - 03-02
  provides:
    - startServer
    - originLockMiddleware
    - createBackendProxy
  affects:
    - packages/cli/src/server.ts
    - packages/cli/src/proxy.ts
tech_stack:
  added:
    - get-port (gated — installed by 03-05)
    - http-proxy-middleware v4 (gated — installed by 03-05)
  patterns:
    - http-proxy-middleware v4 on.proxyReq hook (NOT top-level proxyReq)
    - per-port origin lock built after get-port (hostGuard + cors)
    - closeAllConnections() before close() for prompt port release
    - ESM SPA dir via fileURLToPath(new URL('.', import.meta.url))
    - injectable ServerOptions (openBrowser, stdout, spaDir) mirroring LoginOptions
key_files:
  created:
    - packages/cli/src/proxy.ts
    - packages/cli/src/server.ts
  modified: []
decisions:
  - "originLockMiddleware lives in server.ts (not proxy.ts) because origin-lock.test.ts imports it from '../server'"
  - "proxy.ts is strictly createBackendProxy — single responsibility"
  - "runtime/build verification deferred to 03-05 — get-port, http-proxy-middleware, supertest are gated by the package-legitimacy checkpoint and not yet installed"
metrics:
  completed_date: "2026-05-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 3 Plan 03: CLI Local Server + Proxy Summary

**One-liner:** `server.ts` (Express lifecycle + origin lock + SPA serving) and `proxy.ts` (authenticated reverse proxy with server-side Bearer injection) — the AUTH-02 security core and CLI-05/CLI-06 UX modules.

## What Was Built

### Task 1: `packages/cli/src/proxy.ts` — commit `71be86c`

`createBackendProxy(apiKey)` returns an http-proxy-middleware handler targeting `getApiUrl()` (reused from `./http`, not redefined) with `changeOrigin: true`. The API key is injected as `Authorization: Bearer <apiKey>` inside the v4 `on.proxyReq` hook — set on the **outbound** request only, never on the browser-facing response (T-03-06). Uses the v4 `on:` namespace, not the legacy top-level `proxyReq` option (a silent no-op in v4).

### Task 2: `packages/cli/src/server.ts` — commit `37b3691`

- **`startServer(credentials, opts?)`** → `getPort({ port: opts.port ?? 3421 })` (CLI-06 fallback), binds via `createServer(app).listen(port, "127.0.0.1")`, writes `Workspace: http://127.0.0.1:<port>\n` to stdout (CLI-05), opens the browser (`.catch(() => undefined)`), returns `{ port, close }`.
- **`close()`** calls `closeAllConnections()` then `close()` so the port avoids TIME_WAIT (T-03-07 prompt release).
- **`originLockMiddleware(port)`** → `[hostGuard, cors]`: hostGuard 401s any `Host != 127.0.0.1:<port>` (DNS-rebinding, T-03-04); cors rejects any `Origin != http://127.0.0.1:<port>`, allowing no-Origin/same-origin (T-03-05). Built per-port at startup, not module load (Pitfall 3).
- **`buildApp`** (internal): origin lock → `/api` proxy → `express.static(spaDir)` → `app.get("*")` SPA fallback.
- **`getSpaDir`** uses `fileURLToPath(new URL(".", import.meta.url))` — no `__dirname` (ESM, Pitfall 1); overridable via `opts.spaDir` for tests.
- `ServerOptions` / `ServerHandle` exported; injectable `openBrowser`/`stdout`/`spaDir` mirror `auth.ts` `LoginOptions`.

## Deviations from Plan

**GREEN verification deferred to 03-05 (not skipped).** The plan's Task 2 `<verify>` runs `npx vitest run packages/cli`, but the test deps `get-port`, `http-proxy-middleware`, and `supertest` are gated behind the 03-05 blocking-human package-legitimacy checkpoint and are not yet installed. `express`, `cors`, and `open` are already present. server.test.ts / origin-lock.test.ts / proxy.test.ts therefore remain RED on missing-import only — not logic — until 03-05 installs the deps and runs the suites GREEN. Source modules are complete and satisfy every static gate.

## Static Gate Confirmation

```
proxy.ts:   on: { ... } present; getApiUrl imported; __dirname = 0
server.ts:  __dirname literal = 0; 127.0.0.1 in listen() present;
            closeAllConnections present; fileURLToPath used
```

## Threat Flags

All four STRIDE mitigations from the plan's threat model are implemented in code and will be confirmed by the 03-02 test suites once deps land in 03-05:

- T-03-04 (DNS rebinding) → hostGuard 401 on wrong Host
- T-03-05 (cross-origin tab) → cors rejects wrong Origin
- T-03-06 (Bearer leak) → setHeader on proxyReq only, never response
- T-03-07 (network exposure) → hardcoded `127.0.0.1` bind

T-03-SC (supply chain): get-port + http-proxy-middleware install is gated by the 03-05 checkpoint — NOT installed in this plan.

## Self-Check: PASSED

- [x] `packages/cli/src/proxy.ts` exists, exports `createBackendProxy`
- [x] `packages/cli/src/server.ts` exists, exports `startServer`, `originLockMiddleware`, `ServerHandle`, `ServerOptions`
- [x] proxy uses `on.proxyReq` v4 hook; getApiUrl imported, not redefined
- [x] no `__dirname` in either file; loopback bind present; closeAllConnections present
- [x] Task 1 commit `71be86c`, Task 2 commit `37b3691` in git log
- [x] GREEN verification explicitly deferred to 03-05 (gated deps) — documented above
