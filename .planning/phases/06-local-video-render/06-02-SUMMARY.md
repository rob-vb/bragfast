---
phase: 06-local-video-render
plan: 02
subsystem: cli
tags: [cli, express, remotion, video, vitest]

requires:
  - phase: 01-render-core-extraction
    provides: standalone render-core video renderer
  - phase: 06-local-video-render
    provides: LocalVideoRenderRequest.onProgress from Plan 01
provides:
  - CLI video render resolver for Remotion local MP4 output
  - POST /api/local/render/video async job endpoint
  - GET /api/local/render/video/:id/status polling endpoint
  - MP4 clip duration probe and loop/trim inputProps contract
affects: [06-local-video-render, workspace-video-render, local-output-preview]

tech-stack:
  added: []
  patterns:
    - async CLI render jobs mutate in-memory status maps for polling
    - resolver rewrites local /media URLs to absolute 127.0.0.1 URLs before Remotion render
    - video duration probing uses Range fetch and MP4 moov/mvhd parsing

key-files:
  created:
    - packages/cli/src/video-render-resolver.ts
    - packages/cli/src/__tests__/video-render-resolver.test.ts
    - packages/cli/src/__tests__/video-render-route.test.ts
  modified:
    - packages/cli/src/server.ts

key-decisions:
  - "Use a single active format for CLI video render and write brag-output/<draftId>/<format>.mp4."
  - "Only enter chrome-download phase when Remotion reports alreadyAvailable:false."
  - "Use ../../../src/remotion/index.ts from the CLI module directory; ../../ does not reach the repo root from src or dist."

patterns-established:
  - "Video render jobs expose phase, frame counts, Chrome download percent, URL, and error in one poll payload."
  - "Short clips pass videoDurationInFrames=clipFrames; long clips and probe failures pass 240 frames."

requirements-completed: [RND-02, RND-04]

duration: 7min
completed: 2026-05-21
---

# Phase 06 Plan 02: CLI Video Resolver and Routes Summary

**CLI video render pipeline with Remotion MP4 output, Chrome download status, frame progress polling, and clip loop/trim input props**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-21T19:29:10Z
- **Completed:** 2026-05-21T19:36:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `resolveAndRenderVideo()` with Draft fetch, template/brand resolution, `/media` URL rewriting, duration probing, Remotion `renderVideo()` call, MP4 write, and job mutation.
- Added CLI video render POST/status endpoints with pending jobs, frame fields, Chrome download percent, URL/error propagation, format validation, and traversal rejection.
- Added focused route and resolver tests covering 16 behaviors, including Chrome cached/download semantics and D-07 loop/trim input props.

## Task Commits

1. **Task 1/2 RED: Add failing video resolver and route tests** - `c3be5b9` (test)
2. **Task 1/2 GREEN: Add CLI video resolver and routes** - `2ea8571` (feat)

## Files Created/Modified

- `packages/cli/src/video-render-resolver.ts` - New CLI video resolver, `VideoRenderJob`, `probeClipDurationInFrames`, local media URL rewrite, Remotion entry resolution, and MP4 output write.
- `packages/cli/src/server.ts` - Adds video render job map, POST/status route handlers, format validation, and route registration.
- `packages/cli/src/__tests__/video-render-resolver.test.ts` - Covers Chrome gate, cached Chrome skip, URL rewrite, MP4 write, failures, frame progress, probe parsing, and loop/trim/fallback input props.
- `packages/cli/src/__tests__/video-render-route.test.ts` - Covers 202 trigger response, missing draft rejection, status polling fields, traversal rejection, and unknown job 404.

## Decisions Made

- Kept video render single-format per D-01/D-02 and defaulted missing `format` to `landscape`.
- Corrected the Remotion entry relative path to `../../../src/remotion/index.ts` from the CLI module directory; the `../../` path in the plan would resolve under `packages/src`.
- Kept composition-side `<Loop>` consumption out of this CLI-scoped plan; this resolver now passes the required `videoDurationInFrames` contract.

## Verification

- `npx vitest run packages/cli/src/__tests__/video-render-route.test.ts` - PASS, 5 tests.
- `npx vitest run packages/cli/src/__tests__/video-render-resolver.test.ts` - PASS, 11 tests.
- `npx vitest run packages/cli/src/__tests__/video-render-route.test.ts packages/cli/src/__tests__/video-render-resolver.test.ts` - PASS, 16 tests.
- `npx tsc --noEmit` from `packages/cli` - PASS.
- `grep "render/video" packages/cli/src/server.ts` - PASS, POST and status route registrations present.
- `grep "isUnsafeOutputId" packages/cli/src/server.ts` - PASS, status route guard present.
- `grep "fileURLToPath" packages/cli/src/video-render-resolver.ts` - PASS, import-meta path pattern present.
- `grep "alreadyAvailable" packages/cli/src/video-render-resolver.ts` - PASS, cached Chrome early return present.
- `grep "videoDurationInFrames" packages/cli/src/video-render-resolver.ts` - PASS, D-07 field passed.
- `grep "probeClipDurationInFrames" packages/cli/src/video-render-resolver.ts` - PASS, probe helper and call present.
- `grep "COMPOSITION_FRAMES" packages/cli/src/video-render-resolver.ts` - PASS, 240-frame trim/fallback constant present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected Remotion entry relative path**
- **Found during:** Task 1 (resolver implementation)
- **Issue:** The plan's `../../src/remotion/index.ts` path does not reach the repo root from `packages/cli/src` or `packages/cli/dist`; it resolves under `packages/src`.
- **Fix:** Used `fileURLToPath(new URL(".", import.meta.url))` and `../../../src/remotion/index.ts`, with the required fail-fast `existsSync` check.
- **Files modified:** `packages/cli/src/video-render-resolver.ts`
- **Verification:** Resolver tests import successfully; `grep "fileURLToPath" packages/cli/src/video-render-resolver.ts` passes.
- **Committed in:** `2ea8571`

**2. [Rule 3 - Blocking] Added Vitest-compatible import.meta.url fallback**
- **Found during:** Task 1 verification
- **Issue:** Vitest/Vite exposes a non-file `import.meta.url`, causing `fileURLToPath()` to throw before tests run.
- **Fix:** Kept the built CLI file-URL path and added a test-runner fallback module directory so the module-level fail-fast check remains active.
- **Files modified:** `packages/cli/src/video-render-resolver.ts`
- **Verification:** `npx vitest run packages/cli/src/__tests__/video-render-resolver.test.ts` passes.
- **Committed in:** `2ea8571`

**3. [Rule 2 - Missing Critical] Validated untrusted video render format**
- **Found during:** Task 2 (server route implementation)
- **Issue:** The plan cast `body.format` to `FormatKey`; the threat model marks POST body fields as untrusted.
- **Fix:** Added `isFormatKey()` validation and rejected invalid formats with 400 before calling the resolver.
- **Files modified:** `packages/cli/src/server.ts`
- **Verification:** `npx tsc --noEmit` from `packages/cli` passes; route suite still passes.
- **Committed in:** `2ea8571`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical).
**Impact on plan:** All fixes were required for the planned CLI resolver/routes to compile, test, and keep the HTTP trust boundary validated. No feature scope was expanded beyond the plan.

## Issues Encountered

- `rtk npx vitest ...` routed incorrectly to npm script lookup; reran verification with `rtk proxy npx vitest ...`.
- `packages/cli` TypeScript initially saw stale render-core package declarations for Plan 06-01's `onProgress`; rebuilding `packages/render-core` refreshed the local package types. No render-core files were changed by this plan.

## Known Stubs

None.

## Threat Flags

None - new HTTP routes and local media/probe surfaces were already covered by the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 06 Plan 03 can call the new CLI endpoints from the Workspace, poll `phase`, `framesRendered`, `totalFrames`, `downloadPct`, `url`, and `error`, and show the Chrome-download gate only when the CLI reports `phase:"chrome-download"`.

## Self-Check: PASSED

- Verified created files exist on disk: `packages/cli/src/video-render-resolver.ts`, resolver tests, route tests, and this summary.
- Verified task commits exist: `c3be5b9`, `2ea8571`.
- Re-ran plan verification commands successfully.

---
*Phase: 06-local-video-render*
*Completed: 2026-05-21*
