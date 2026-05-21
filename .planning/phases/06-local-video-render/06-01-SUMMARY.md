---
phase: 06-local-video-render
plan: 01
subsystem: render-core
tags: [remotion, render-core, video, progress, vitest]

requires:
  - phase: 01-render-core-extraction
    provides: standalone render-core video renderer
  - phase: 06-local-video-render
    provides: D-10 frame progress planning context
provides:
  - LocalVideoRenderRequest onProgress callback contract
  - renderVideo progress forwarding from Remotion renderMedia
  - Vitest coverage for rendered frame and total frame forwarding
affects: [06-local-video-render, cli-video-render, workspace-video-progress]

tech-stack:
  added: []
  patterns:
    - render-core exposes a narrow progress callback instead of Remotion internals
    - video tests mock @remotion/bundler and @remotion/renderer dynamic imports

key-files:
  created:
    - packages/render-core/src/__tests__/video-onprogress.test.ts
  modified:
    - packages/render-core/src/types.ts
    - packages/render-core/src/video.ts

key-decisions:
  - "Expose only renderedFrames and totalFrames from render-core progress callbacks."
  - "Use composition.durationInFrames as the stable totalFrames value for video progress."

patterns-established:
  - "renderVideo progress forwarding: map Remotion renderedFrames to { renderedFrames, totalFrames }."
  - "Render-core video unit tests can mock Remotion dynamic imports and write a tiny temporary output file."

requirements-completed: [RND-02]

duration: 2min
completed: 2026-05-21
---

# Phase 06 Plan 01: Render-Core Video Progress Summary

**Render-core video progress callback forwarding from Remotion frames to the CLI-facing API contract**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-21T19:23:49Z
- **Completed:** 2026-05-21T19:25:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `LocalVideoRenderRequest.onProgress` with `{ renderedFrames; totalFrames }`.
- Forwarded `renderMedia` progress through `renderVideo()` using `composition.durationInFrames`.
- Added focused Vitest coverage for progress forwarding, omitted callback behavior, and total frame sourcing.

## Task Commits

1. **Task 1 RED / Task 2 tests: Add failing video progress coverage** - `34f6a8b` (test)
2. **Task 1 GREEN: Add onProgress to LocalVideoRenderRequest and wire into renderMedia** - `6304de9` (feat)

## Files Created/Modified

- `packages/render-core/src/types.ts` - Adds the typed optional video progress callback.
- `packages/render-core/src/video.ts` - Passes an optional `onProgress` handler into `renderMedia`.
- `packages/render-core/src/__tests__/video-onprogress.test.ts` - Mocks Remotion rendering and verifies the progress contract.

## Decisions Made

- Followed D-10 exactly: render-core exposes a minimal progress shape and does not leak Remotion-specific progress fields.
- Kept `onProgress` optional so callers that omit it keep the previous behavior.

## Verification

- `npx vitest run packages/render-core/src/__tests__/video-onprogress.test.ts` - PASS, 3 tests.
- `npx tsc --noEmit` from `packages/render-core` - PASS.
- `grep "onProgress" packages/render-core/src/types.ts` - PASS, typed optional field present.
- `grep "onProgress" packages/render-core/src/video.ts` - PASS, renderMedia forwarding present.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 6 CLI video resolver work can now pass an `onProgress` callback to `renderVideo()` and stream `{ renderedFrames, totalFrames }` into terminal and Workspace job status.

## Self-Check: PASSED

- Verified created/modified files exist on disk.
- Verified task commits exist: `34f6a8b`, `6304de9`.
- Re-ran plan verification commands successfully.

---
*Phase: 06-local-video-render*
*Completed: 2026-05-21*
