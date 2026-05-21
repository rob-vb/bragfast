---
phase: 05-local-image-render
plan: 02
subsystem: workspace
tags: [workspace, api, render-status, types]

requires:
  - phase: 05-local-image-render
    provides: CLI render/status/reveal route contracts
provides:
  - Workspace render status types
  - Workspace render trigger, poll, and reveal API helpers
affects: [workspace, render-panel, hooks]

tech-stack:
  added: []
  patterns:
    - Relative /api requestJson calls
    - Discriminated render state union

key-files:
  created: []
  modified:
    - packages/workspace/src/types.ts
    - packages/workspace/src/api.ts

key-decisions:
  - "Workspace render API helpers use only relative /api URLs."
  - "Render status is represented as a discriminated union on phase."

patterns-established:
  - "Polling helpers encode job ids before placing them into local API route URLs."

requirements-completed: [RND-01, RND-03, OUT-01, OUT-02, OUT-03, OUT-04]

duration: 6min
completed: 2026-05-21
---

# Phase 05 Plan 02: Workspace Render API Contracts Summary

**Workspace render contracts now expose per-format status state plus trigger, poll, and folder-reveal API helpers.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-21T11:56:00Z
- **Completed:** 2026-05-21T12:02:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `FormatRenderState` with `idle`, `pending`, `done`, and `failed` variants.
- Added `RenderStatusResponse` keyed by landscape, square, and portrait formats.
- Added `triggerRender`, `pollRenderStatus`, and `revealOutputFolder` helpers using the existing `requestJson` pattern.

## Task Commits

1. **Task 1: types.ts — add FormatRenderState and RenderStatusResponse** - `5a234c9` (feat)
2. **Task 2: api.ts — triggerRender, pollRenderStatus, revealOutputFolder** - `ef09d67` (feat)

## Files Created/Modified

- `packages/workspace/src/types.ts` - Adds render job state and status response contracts.
- `packages/workspace/src/api.ts` - Adds local render trigger, status polling, and folder reveal calls.

## Decisions Made

- `pollRenderStatus` casts the template literal route to the existing `/api/${string}` helper constraint after encoding the job id.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No deviations.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05-03 can import the API helpers and status types to build the render lifecycle hook.

## Self-Check: PASSED

- `npx tsc -p packages/workspace/tsconfig.json --noEmit` passed.
- `FormatRenderState`, `RenderStatusResponse`, `triggerRender`, `pollRenderStatus`, and `revealOutputFolder` are present.
- No absolute `http://` URLs were added to `packages/workspace/src/api.ts`.

---
*Phase: 05-local-image-render*
*Completed: 2026-05-21*
