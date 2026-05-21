---
phase: 05-local-image-render
plan: 03
subsystem: workspace
tags: [react-hooks, autosave, polling, render-lifecycle]

requires:
  - phase: 05-local-image-render
    provides: Workspace render API helpers and status types
provides:
  - Autosave flush before render
  - Render lifecycle polling hook
affects: [workspace, render-panel, editor]

tech-stack:
  added: []
  patterns:
    - Imperative flush over debounced save
    - React polling effect with terminal-state cleanup

key-files:
  created:
    - packages/workspace/src/hooks/useRender.ts
  modified:
    - packages/workspace/src/hooks/useAutoSave.ts

key-decisions:
  - "Render trigger is guarded while flushing or rendering to avoid duplicate jobs."
  - "Polling stops when every format is done or failed."

patterns-established:
  - "Hook render state uses idle/flushing/rendering/done/partial/failed-all phases."

requirements-completed: [RND-01, RND-03, RND-06]

duration: 9min
completed: 2026-05-21
---

# Phase 05 Plan 03: Render Lifecycle Hooks Summary

**Workspace hooks now flush pending saves before render and poll local render jobs until all formats reach terminal state.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-21T12:03:00Z
- **Completed:** 2026-05-21T12:12:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `flush()` to `UseAutoSaveResult`; it cancels pending debounce, saves immediately, and returns the saved draft id.
- Added `useRender` with render phases, format states, guarded trigger flow, and 1000ms polling.
- Polling clears its interval on terminal states and on network/status errors.

## Task Commits

1. **Task 1: useAutoSave.ts — add flush() imperative method** - `c53758b` (feat)
2. **Task 2: useRender.ts — new polling render lifecycle hook** - `156e4ad` (feat)

## Files Created/Modified

- `packages/workspace/src/hooks/useAutoSave.ts` - Adds flushable save path and refs to avoid stale closure reads.
- `packages/workspace/src/hooks/useRender.ts` - Adds flush → trigger → poll render lifecycle hook.

## Decisions Made

- `useRender.trigger()` uses a phase ref so the callback can stay stable while still blocking duplicate triggers.

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

Plan 05-04 can wire `save.flush` and `useRender` into `Editor.tsx` and surface the states in `RenderPanel`.

## Self-Check: PASSED

- `npx tsc -p packages/workspace/tsconfig.json --noEmit` passed.
- `npx vitest run packages/workspace/src/__tests__/useAutoSave.test.tsx` passed.
- `useRender.ts` contains `setInterval`, terminal `clearInterval` paths, and `useCallback`.

---
*Phase: 05-local-image-render*
*Completed: 2026-05-21*
