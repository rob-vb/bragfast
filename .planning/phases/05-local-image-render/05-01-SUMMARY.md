---
phase: 05-local-image-render
plan: 01
subsystem: cli
tags: [express, render-core, local-render, output-files]

requires:
  - phase: 04-workspace-editor-slot-filling
    provides: persisted DraftConfig, local media refs, Workspace proxy conventions
provides:
  - CLI async render job endpoints
  - Draft-to-LocalRenderRequest resolver
  - Local JPEG output under brag-output/<draftId>/
  - /output static serving and OS folder reveal
affects: [workspace, render, cli]

tech-stack:
  added: []
  patterns:
    - Express local routes before backend proxy
    - In-memory local render job map
    - render-core LocalRenderRequest assembly in CLI

key-files:
  created:
    - packages/cli/src/render-resolver.ts
  modified:
    - packages/cli/src/server.ts
    - packages/cli/src/__tests__/server.test.ts
    - packages/cli/src/__tests__/proxy.test.ts

key-decisions:
  - "Render jobs return immediately and are polled by job id."
  - "Output files are served through /output and written beneath the configured output directory."
  - "Reveal validates ids and path roots before passing a path to open()."

patterns-established:
  - "Local render endpoints are registered before createBackendProxy so the backend proxy cannot intercept them."
  - "Render failures are logged to stdout and reflected in per-format job state."

requirements-completed: [RND-01, RND-03, RND-05, RND-06]

duration: 18min
completed: 2026-05-21
---

# Phase 05 Plan 01: CLI Local Render Pipeline Summary

**Local CLI render jobs turn persisted drafts into render-core JPEG output with status polling, static serving, and safe folder reveal.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-21T11:44:00Z
- **Completed:** 2026-05-21T12:02:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `resolveAndRender`, `RenderJob`, and `FormatJobState` in `packages/cli/src/render-resolver.ts`.
- Added `POST /api/local/render`, `GET /api/local/render/:id/status`, `POST /api/local/reveal`, and `/output` static serving.
- Added output directory resolution from `~/.brag/config.json` with `./brag-output` fallback.
- Added server route tests for render trigger, status validation, reveal validation, and output file serving.

## Task Commits

1. **Task 1: render-resolver.ts — Draft-to-disk render service** - `b49bdec` (feat)
2. **Task 2: server.ts — render routes + /output static + config + tests** - `ec6eab4` (feat)

## Files Created/Modified

- `packages/cli/src/render-resolver.ts` - Builds `LocalRenderRequest`, resolves media/brand/template inputs, calls `renderImage`, writes JPEG files, and returns per-format state.
- `packages/cli/src/server.ts` - Registers render/status/reveal endpoints plus `/output` static route before the backend proxy.
- `packages/cli/src/__tests__/server.test.ts` - Covers local render route contracts and output serving.
- `packages/cli/src/__tests__/proxy.test.ts` - Casts proxy callback mocks so the package compile gate passes under current middleware types.

## Decisions Made

- Custom templates are resolved through `GET /api/v1/templates` because the single-template route does not expose config.
- The render resolver keeps per-format write failures isolated after `renderImage` returns, while a render-core throw marks all formats failed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Proxy test callback typing blocked CLI TypeScript compilation**
- **Found during:** Task 2 (server route verification)
- **Issue:** `packages/cli/src/__tests__/proxy.test.ts` called the proxy callback with too few and too loosely typed arguments under the current package type surface.
- **Fix:** Passed the full callback arity and cast mocks at the call site.
- **Files modified:** `packages/cli/src/__tests__/proxy.test.ts`
- **Verification:** `npx tsc -p packages/cli/tsconfig.json --noEmit`
- **Committed in:** `ec6eab4`

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** The fix was limited to an existing test compile blocker needed for the plan's TypeScript gate.

## Issues Encountered

- The sandbox blocked local port binding for the server test suite (`listen EPERM`). The same suite passed when rerun with local port binding allowed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05-03 can call the render trigger/status endpoints through the SPA API helpers. Plan 05-04 can preview generated files from `/output/<draftId>/<format>.jpg`.

## Self-Check: PASSED

- `npx tsc -p packages/cli/tsconfig.json --noEmit` passed.
- `npx vitest run packages/cli/src/__tests__/server.test.ts` passed with 16 tests.
- Required server route strings and path traversal guard are present.

---
*Phase: 05-local-image-render*
*Completed: 2026-05-21*
