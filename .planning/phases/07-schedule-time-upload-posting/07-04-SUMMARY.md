---
phase: 07-schedule-time-upload-posting
plan: 04
subsystem: scheduling
tags: [cli, workspace, r2, buffer, vitest, react]

requires:
  - phase: 07-schedule-time-upload-posting
    provides: Authenticated schedule upload-url and schedule backend routes from 07-03
provides:
  - Local CLI schedule route that uploads rendered JPEGs directly to R2 via presigned URLs
  - CLI schedule resolver that calls the backend schedule endpoint only after local PUTs succeed
  - Workspace schedule API helpers, types, and guarded useSchedule state machine
affects: [schedule-time-upload-posting, workspace-schedule, cli-schedule, schedule-panel]

tech-stack:
  added: []
  patterns:
    - Workspace scheduling calls /api/local/schedule so the local CLI owns rendered file access and upload orchestration
    - CLI upload orchestration validates draft/output paths before reading local JPEG bytes
    - Workspace schedule submissions guard uploading and scheduling phases against duplicate requests

key-files:
  created:
    - packages/cli/src/__tests__/schedule-route.test.ts
    - packages/cli/src/schedule-resolver.ts
    - packages/workspace/src/hooks/__tests__/useSchedule.test.ts
    - packages/workspace/src/hooks/useSchedule.ts
    - .planning/phases/07-schedule-time-upload-posting/07-04-SUMMARY.md
  modified:
    - packages/cli/src/server.ts
    - packages/workspace/src/types.ts
    - packages/workspace/src/api.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "Workspace schedule calls target /api/local/schedule; the CLI performs presigned R2 PUTs and only sends public URLs/keys to the hosted backend."
  - "CLI schedule orchestration accepts only landscape, square, and portrait image formats for this phase."
  - "useSchedule treats uploading and scheduling as in-flight phases and ignores duplicate trigger calls until the current request settles."

patterns-established:
  - "Schedule resolver requests /api/v1/schedule/upload-url, uploads local brag-output/<draftId>/<format>.jpg bytes to R2, then calls /api/v1/schedule."
  - "Workspace schedule selections persist routing defaults before schedule submission."

requirements-completed: [SCHED-02, SCHED-03, SCHED-04, SCHED-05]

duration: 8min
completed: 2026-05-21
---

# Phase 07 Plan 04: CLI + Workspace Schedule Orchestration Summary

**Local scheduling now uploads rendered Workspace JPEGs from the CLI to R2 before dispatching Buffer schedule requests through the backend.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T21:40:47Z
- **Completed:** 2026-05-21T21:48:24Z
- **Tasks:** 4
- **Files modified:** 7 code/test files plus planning metadata

## Accomplishments

- Added failing-first CLI route tests, then implemented `POST /api/local/schedule` before the backend proxy.
- Added `resolveAndSchedule()` to request presigned upload URLs, read local `brag-output/<draftId>/<format>.jpg` files, PUT bytes directly to R2, and call the backend schedule endpoint after all uploads finish.
- Added failing-first Workspace hook tests, then implemented schedule types, API helpers, and `useSchedule()` with `idle`, `uploading`, `scheduling`, `done`, and `failed` phases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CLI schedule route/resolver tests** - `7b4bca4` (test)
2. **Task 2: Implement CLI schedule resolver and local route** - `aa019ed` (feat)
3. **Task 3: Add Workspace useSchedule tests** - `a46c99b` (test)
4. **Task 4: Add Workspace schedule API/types/hook** - `714dd89` (feat)
5. **Verification fix: CLI upload body typing** - `8091836` (fix)

**Plan metadata:** committed separately with this SUMMARY.

## Files Created/Modified

- `packages/cli/src/__tests__/schedule-route.test.ts` - Vitest coverage for local schedule route validation and resolver wiring.
- `packages/cli/src/schedule-resolver.ts` - Local R2 upload and backend schedule orchestration.
- `packages/cli/src/server.ts` - Registers `POST /api/local/schedule` before `createBackendProxy`.
- `packages/workspace/src/hooks/__tests__/useSchedule.test.ts` - Vitest coverage for schedule hook state and duplicate-submit guards.
- `packages/workspace/src/hooks/useSchedule.ts` - Workspace schedule state machine and trigger behavior.
- `packages/workspace/src/api.ts` - Integration, routing-default, and local schedule API helpers.
- `packages/workspace/src/types.ts` - Schedule, channel, integration, and routing-default contracts.
- `.planning/STATE.md` - Advances execution state to 07-04 complete and records decisions/metrics.
- `.planning/ROADMAP.md` - Marks 07-04 complete.

## Decisions Made

- Kept the Workspace-to-schedule path local-first: browser -> CLI `/api/local/schedule` -> R2 presigned PUTs -> hosted backend `/api/v1/schedule`.
- Kept scheduling image-only in this plan, matching the 07-03 backend format allowlist.
- Persisted routing defaults from `useSchedule` before invoking the schedule request, so the later SchedulePanel can use the same hook for preference updates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Converted CLI upload body from Buffer to ArrayBuffer**
- **Found during:** Plan verification after Task 4
- **Issue:** `packages/cli/tsconfig.json` rejected Node `Buffer` as a `fetch` `BodyInit` for presigned PUT uploads.
- **Fix:** Copied the JPEG buffer into an `ArrayBuffer` before calling `fetch(uploadUrl, { method: "PUT" })`.
- **Files modified:** `packages/cli/src/schedule-resolver.ts`
- **Verification:** `npx tsc --noEmit --project packages/cli/tsconfig.json` passed.
- **Committed in:** `8091836`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix preserved the planned direct R2 upload behavior and only adjusted TypeScript-compatible request body construction.

## Issues Encountered

- The RED CLI and Workspace tests initially failed on missing implementation imports, as expected for the TDD tasks.

## User Setup Required

None - no external service configuration required.

## Verification

- `rtk proxy npx vitest run packages/cli/src/__tests__/schedule-route.test.ts` passed: 4 tests.
- `rtk proxy npx vitest run packages/workspace/src/hooks/__tests__/useSchedule.test.ts` passed: 7 tests.
- `rtk proxy npx tsc --noEmit --project packages/workspace/tsconfig.json` passed.
- `rtk proxy npx tsc --noEmit --project packages/cli/tsconfig.json` passed.
- Acceptance checks confirmed `packages/cli/src/schedule-resolver.ts` calls `/api/v1/schedule/upload-url` and `/api/v1/schedule`.
- Acceptance checks confirmed `packages/cli/src/server.ts` registers `/api/local/schedule` before `createBackendProxy`.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Ready for `07-05-PLAN.md`: SchedulePanel can wire Buffer channel selection, timing controls, and confirmation UI to the completed local scheduling hook and CLI orchestration path.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/07-schedule-time-upload-posting/07-04-SUMMARY.md`.
- Task commits exist: `7b4bca4`, `aa019ed`, `a46c99b`, `714dd89`, `8091836`.
- Verification commands passed after implementation.

---
*Phase: 07-schedule-time-upload-posting*
*Completed: 2026-05-21*
