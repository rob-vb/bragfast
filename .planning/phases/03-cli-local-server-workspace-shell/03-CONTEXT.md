# Phase 3: CLI Local Server + Workspace Shell - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning
**Source:** plan-phase inline decisions (resolves STATE-flagged SPA tech choice)

<domain>
## Phase Boundary

Running `brag` (after login from Phase 2) starts a local Express server on an
available port, auto-opens the browser to the Workspace, serves the Workspace
SPA shell with origin-locked CORS, proxies authenticated backend requests
(injecting the stored Bearer token), exposes repo context, and handles port
conflicts gracefully.

**In scope:** local server lifecycle, port selection, browser auto-open,
origin-locking, authenticated proxy to the backend, `/api/repo-context`
endpoint, and the Workspace SPA *shell* (loads, talks to the local server).

**Out of scope (Phase 4):** the actual Workspace editor — template picker,
slot-fill UI, format switcher, caption, Draft auto-save. Phase 3 ships only the
shell that proves the SPA loads and can reach the local server.
</domain>

<decisions>
## Implementation Decisions

### Workspace SPA tech — LOCKED
- **Vite standalone SPA** in a new `packages/workspace` package.
- Built to static assets (`packages/workspace/dist`); the CLI Express server
  serves them via static middleware.
- No Next.js runtime runs locally. The existing Next.js app remains the
  thin backend (Convex + auth + device routes) only.
- Components are ported/shared from `src/` as needed; do not depend on Next.js
  server features in the SPA.
- Rationale: smallest local footprint, fastest dev loop, no Next export
  constraints, aligns with "thin backend / local-first" repositioning
  (ADR-0001/0002).

### Local server
- Express server bound to `127.0.0.1` (loopback only — never `0.0.0.0`).
- Default port with automatic next-open-port fallback when occupied (CLI-06).
- Print the resolved `http://127.0.0.1:<PORT>` URL as a fallback even when the
  browser auto-opens (CLI-05).

### Origin-locking (AUTH-02)
- The local server accepts requests only from the Workspace origin
  (`http://127.0.0.1:<PORT>`); requests from any other origin are rejected
  (401 or CORS block).
- The stored Bearer credential (from Phase 2, `~/.brag/credentials.json`) is
  injected server-side by the proxy — never exposed to the browser.

### Repo context (CLI-07)
- `/api/repo-context` returns current repo git tag, commit SHA, package name,
  and package version, for the Workspace to prefill copy slots. No AI.

### Claude's Discretion
- Port range / default port number, port-scan strategy.
- Proxy library vs hand-rolled fetch passthrough.
- Browser-open mechanism (reuse Phase 2 approach if present).
- SPA shell scaffolding details (router, minimal landing view).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reposition decisions
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction
- `docs/adr/0002-local-render-thin-backend.md` — no Lambda, thin backend
- `CONTEXT.md` (repo root) — single-context domain doc

### Phase 2 artifacts (dependency)
- `packages/cli/src/credentials.ts` — stored Bearer credential to inject
- `packages/cli/src/auth.ts` / `packages/cli/src/http.ts` — existing CLI patterns
- `packages/cli/src/index.ts` — CLI entry to extend with server start

### Render core (future consumer)
- `packages/render-core/` — package the SPA/CLI will eventually drive
</canonical_refs>

<specifics>
## Specific Ideas

- Reuse Phase 2's browser-open + credential-load helpers rather than
  reimplementing.
- Server start should be the default action of `brag` when a credential exists;
  prompt login otherwise (Phase 2 behavior).
</specifics>

<deferred>
## Deferred Ideas

- Workspace editor + slot filling — Phase 4.
- Image/video render wiring — Phases 5/6.
</deferred>

---

*Phase: 03-cli-local-server-workspace-shell*
*Context gathered: 2026-05-20 via plan-phase inline decisions*
