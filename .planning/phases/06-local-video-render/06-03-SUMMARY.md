---
phase: 06-local-video-render
plan: 03
subsystem: workspace
tags: [react, vite, vitest, local-render, video-render]

requires:
  - phase: 06-local-video-render
    provides: CLI video render trigger/status endpoints from plans 06-01 and 06-02
provides:
  - Workspace video render type contracts
  - Workspace video render API helpers
  - useVideoRender hook with Chrome-download and frame-progress polling
  - Unit coverage for video render hook states
affects: [06-local-video-render, workspace-editor, render-panel]

tech-stack:
  added: []
  patterns:
    - React hook state machine mirroring useRender
    - 1000ms poll loop with renderPhaseRef guard
    - Vitest renderHook tests with mocked Workspace API helpers

key-files:
  created:
    - packages/workspace/src/hooks/useVideoRender.ts
    - packages/workspace/src/hooks/__tests__/useVideoRender.test.ts
  modified:
    - packages/workspace/src/types.ts
    - packages/workspace/src/api.ts

key-decisions:
  - "Video render polling maps pending status to the existing rendering phase so the UI does not regress after trigger."
  - "Video render trigger is guarded during flushing, chrome-download, and rendering phases."

patterns-established:
  - "Video render hook mirrors useRender's ref-backed trigger guard and polling cleanup."
  - "Workspace video status keeps frame, download, URL, and error fields as first-class hook state."

requirements-completed: [RND-02, RND-04]

duration: 4min
completed: 2026-05-21
---

# Phase 06 Plan 03: Workspace Video Render Contracts and Hook Summary

**Workspace video render contracts and hook polling state for Chrome download, frame progress, completion, and failure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-21T19:40:07Z
- **Completed:** 2026-05-21T19:43:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `VideoRenderPhase` and `VideoRenderStatusResponse` to Workspace shared types.
- Added `triggerVideoRender(draftId, format)` and `pollVideoRenderStatus(id)` API helpers for the CLI video render endpoints.
- Added `useVideoRender` with flushing, Chrome download, rendering, done, and failed states plus 1s polling cleanup.
- Added eight hook tests covering initial state, trigger guard, polling transitions, terminal states, and flush failure.

## Task Commits

1. **Task 1: Extend types.ts and api.ts with video render contracts** - `a304217` (feat)
2. **Task 2 RED: Add failing useVideoRender hook tests** - `d2149c3` (test)
3. **Task 2 GREEN: Implement useVideoRender hook and tests** - `1d1cc38` (feat)

## Files Created/Modified

- `packages/workspace/src/types.ts` - Adds video render phase and poll status response contracts.
- `packages/workspace/src/api.ts` - Adds Workspace API helpers for video render trigger/status.
- `packages/workspace/src/hooks/useVideoRender.ts` - New hook managing flush, trigger, polling, progress, URL, and error state.
- `packages/workspace/src/hooks/__tests__/useVideoRender.test.ts` - Unit tests for all required video render hook behaviors.
- `.planning/phases/06-local-video-render/06-03-SUMMARY.md` - This plan summary.

## Decisions Made

- Pending poll responses leave the hook in `rendering`, matching the plan's mapping so a brief CLI `pending` state does not show a separate UI phase.
- The trigger guard blocks `flushing`, `chrome-download`, and `rendering`; terminal and idle phases can start a new render.

## Verification Evidence

- `npx vitest run packages/workspace/src/hooks/__tests__/useVideoRender.test.ts` - passed, 8 tests.
- `npx tsc --noEmit --project packages/workspace/tsconfig.json` - passed with zero errors.
- `grep "VideoRenderPhase" packages/workspace/src/types.ts` - found the type export.
- `grep "triggerVideoRender\|pollVideoRenderStatus" packages/workspace/src/api.ts` - found both API helpers.
- `grep "useVideoRender" packages/workspace/src/hooks/useVideoRender.ts` - found the hook export.
- `grep "POLL_INTERVAL_MS" packages/workspace/src/hooks/useVideoRender.ts` - found the 1000ms poll constant.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first RED test harness used an unawaited async `act()` to observe the transient `flushing` phase. During GREEN this produced React test contamination, so the test was corrected to use a controlled deferred `flush()` promise while preserving the required behavior assertion.

## Known Stubs

None. The `null` checks in `useVideoRender.ts` are legitimate empty runtime states, not placeholder UI data.

## Threat Flags

None. This plan added Workspace types, client API helpers, and a hook only; it did not introduce new network endpoints, auth paths, file access, or schema trust boundaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 06-04 can import `useVideoRender`, call `trigger()` from the RenderPanel/Editor wiring, and display `downloadPct`, `framesRendered`, `totalFrames`, `url`, and `error`.

## Self-Check: PASSED

- Created files exist: `packages/workspace/src/hooks/useVideoRender.ts`, `packages/workspace/src/hooks/__tests__/useVideoRender.test.ts`, `.planning/phases/06-local-video-render/06-03-SUMMARY.md`.
- Commits exist: `a304217`, `d2149c3`, `1d1cc38`.
- Verification commands passed as listed above.

---
*Phase: 06-local-video-render*
*Completed: 2026-05-21*
