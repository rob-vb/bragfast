---
phase: 03-cli-local-server-workspace-shell
plan: "05"
subsystem: cli
tags:
  - integration
  - wiring
  - build
  - green-state
  - supply-chain-checkpoint
dependency_graph:
  requires:
    - 03-01
    - 03-03
    - 03-04
  provides:
    - cli-build-with-bundled-spa
    - brag-starts-real-server
  affects:
    - package.json
    - packages/cli/package.json
    - packages/cli/tsup.config.ts
    - packages/cli/src/index.ts
    - packages/cli/src/server.ts
tech_stack:
  added:
    - express@5.2.1
    - get-port@7.2.0
    - http-proxy-middleware@4.0.0
    - cors@2.8.6
    - supertest@^7 (dev)
    - "@types/express, @types/cors, @types/supertest (dev)"
  patterns:
    - tsup onSuccess cpSync to bundle workspace SPA into CLI dist
    - workspace-before-cli build ordering in root scripts
    - SIGINT/SIGTERM → server.close() graceful shutdown
key_files:
  created: []
  modified:
    - package.json
    - packages/cli/package.json
    - packages/cli/tsup.config.ts
    - packages/cli/src/index.ts
    - packages/cli/src/server.ts
decisions:
  - "SPA fallback uses app.get('/*splat') not app.get('*') — Express 5 / path-to-regexp v8 removed the bare wildcard (plan's claim it was valid was wrong)"
  - "originLockMiddleware cors element wraps cors() to convert origin rejection into a direct 401 (cors' next(err) would otherwise render 500), per T-03-05"
  - "repo-context route registered before /api proxy so it is served locally, not forwarded to the backend"
metrics:
  completed_date: "2026-05-21"
  tasks_completed: 3
  files_created: 0
  files_modified: 5
---

# Phase 3 Plan 05: Integration & Wiring Summary

**One-liner:** Installs the gated server deps (after the supply-chain checkpoint), orders the workspace build before the CLI, bundles the SPA into the CLI dist, and replaces the Phase 2 placeholder so `brag` starts a real local Workspace server.

## What Was Built

### Task 1: Package legitimacy checkpoint (blocking-human) — APPROVED

Presented the 10 packages (express, get-port, http-proxy-middleware, cors, their @types, supertest, vite, @vitejs/plugin-react) with maintainer org and npmjs verification steps. User verified and approved before any install ran.

### Task 2: Dependency install + build ordering — commit `9401a77`

- `packages/cli` runtime deps: express@5.2.1, get-port@7.2.0, http-proxy-middleware@4.0.0, cors@2.8.6.
- `packages/cli` dev deps: @types/express@5.0.6, @types/cors@2.8.19, supertest@^7, @types/supertest@^6.
- `packages/workspace` deps (vite, @vitejs/plugin-react from 03-01) populated.
- Root `build` and `cli:build` scripts now build `packages/workspace` before `packages/cli` so the SPA dist exists when tsup copies it.

### Task 3: Wire server + bundle SPA — commit `5324a97`

- `tsup.config.ts`: onSuccess now `mkdirSync` + `cpSync("../workspace/dist", "dist/workspace-dist", { recursive: true })`.
- `index.ts`: default action calls `startServer(credentials)` and registers SIGINT/SIGTERM → `close()` for graceful shutdown (T-03-12). Placeholder removed.
- `server.ts`: added local `GET /api/repo-context` route (before the `/api` proxy) wired to `getRepoContext(process.cwd())` (D-CLI-07).

## Deviations from Plan

1. **SPA fallback route `app.get("*")` → `app.get("/*splat")`.** Express 5 (path-to-regexp v8) removed the bare `*` wildcard and throws `TypeError: Missing parameter name at index 1: *` at route registration — every server test crashed in `buildApp`. The named wildcard `/*splat` is the documented Express 5 form. The plan's interfaces note that `app.get("*")` is valid in Express 5 was incorrect.

2. **cors rejection → 401 instead of 500.** The `cors` package forwards a rejected origin to `next(err)`, which Express's default error handler renders as 500. A forbidden cross-origin request is an auth failure (T-03-05) and the contract test requires 401. Wrapped `cors()` in a middleware that converts its error into a direct `res.status(401)`, keeping `originLockMiddleware` a two-element array (the shape `origin-lock.test.ts` destructures).

Both deviations were necessary to reach GREEN and are committed with rationale.

## GREEN State Confirmation

```
npx vitest run packages/cli   → PASS (23) FAIL (0)
npm run cli:build             → exit 0 (vite SPA build + tsup, workspace-dist copied)
ls packages/cli/dist/workspace-dist/index.html → present (title: brag.fast Workspace)
```

## Threat Flags

- **T-03-10 / T-03-SC (supply chain):** all installs gated by the Task 1 blocking-human checkpoint; user-approved.
- **T-03-05 (cross-origin):** strengthened — origin rejection now returns 401 (was 500).
- **T-03-12 (port leak):** SIGINT/SIGTERM call close() → closeAllConnections() + close().
- **Pre-existing audit note (not introduced here):** `npm audit` reports high-severity advisories in `better-auth` and `defu` — both are existing app dependencies, unrelated to the Phase 3 packages. Out of scope for this phase; flagged for separate remediation.

## Self-Check: PASSED

- [x] CLI runtime + dev deps present in `packages/cli/package.json`
- [x] root `build` and `cli:build` build workspace before cli
- [x] tsup onSuccess copies workspace dist; `dist/workspace-dist/index.html` exists
- [x] `index.ts` starts server, SIGINT/SIGTERM → close(); no "arrives in Phase 3"
- [x] `server.ts` mounts `GET /api/repo-context` via getRepoContext
- [x] no `__dirname` in server.ts/proxy.ts/repo-context.ts
- [x] 23/23 CLI tests GREEN; `npm run cli:build` exit 0
- [x] Task 2 commit `9401a77`, Task 3 commit `5324a97` in git log
