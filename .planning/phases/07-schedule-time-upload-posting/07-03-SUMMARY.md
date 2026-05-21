---
phase: 07-schedule-time-upload-posting
plan: 03
subsystem: scheduling
tags: [nextjs, api, r2, convex, buffer, vitest]

requires:
  - phase: 07-schedule-time-upload-posting
    provides: Convex schedulePush action and scheduled release status from 07-02
provides:
  - Authenticated presigned upload URL endpoint for schedule-time R2 image uploads
  - Authenticated schedule endpoint that validates image-only Buffer selections
  - HTTP error mapping for all-or-nothing schedule failures
affects: [schedule-time-upload-posting, workspace-schedule, cli-schedule]

tech-stack:
  added: []
  patterns:
    - Next.js API route handlers authenticate first, derive userId server-side, and reject request-supplied authority
    - Schedule routes validate image-only formats at the HTTP boundary before calling Convex

key-files:
  created:
    - src/app/api/v1/schedule/__tests__/route.test.ts
    - src/app/api/v1/schedule/upload-url/route.ts
    - src/app/api/v1/schedule/route.ts
    - .planning/phases/07-schedule-time-upload-posting/07-03-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Schedule route handlers accept only landscape, square, and portrait image formats; video-* formats are excluded from this phase."
  - "Route handlers derive userId from authenticate(request) and pass it to schedulePush.run instead of trusting request-supplied user identifiers."
  - "upload_missing maps to 409 with actionable re-upload guidance; Buffer connection errors map to 400 and provider/auth/channel failures map to 502."

patterns-established:
  - "Presigned schedule upload keys are generated server-side as scheduled/{userId}/{draftId}/{format}.jpg."
  - "Custom schedule requests require canonical ISO timestamps before crossing into Convex."

requirements-completed: [SCHED-02, SCHED-03, SCHED-04, SCHED-05]

duration: 4min
completed: 2026-05-21
---

# Phase 07 Plan 03: Backend API Routes Summary

**Authenticated Next.js schedule routes now mint scoped R2 image upload URLs and dispatch validated Buffer queue/custom schedule requests to Convex.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-21T21:33:03Z
- **Completed:** 2026-05-21T21:37:03Z
- **Tasks:** 3
- **Files modified:** 3 code/test files plus planning metadata

## Accomplishments

- Added route tests covering unauthenticated upload requests, video-format rejection, deterministic upload keys, empty selection rejection, custom timestamp validation, Convex action dispatch, and `upload_missing` error mapping.
- Added `POST /api/v1/schedule/upload-url` with auth, safe `draftId` validation, image-only format validation, and per-format `createPresignedUploadUrl(key, "image/jpeg", 300)` calls.
- Added `POST /api/v1/schedule` with auth-derived `userId`, image-only URL/key records, non-empty Buffer selections, queue/custom scheduling validation, `api.schedulePush.run`, and actionable non-2xx responses.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add route handler tests** - `892c6b6` (test)
2. **Task 2: Implement upload-url endpoint** - `7beedcc` (feat)
3. **Task 3: Implement schedule endpoint** - `e7e2a27` (feat)

**Plan metadata:** committed separately with this SUMMARY.

## Files Created/Modified

- `src/app/api/v1/schedule/__tests__/route.test.ts` - Vitest coverage for upload URL and schedule route behavior.
- `src/app/api/v1/schedule/upload-url/route.ts` - Authenticated presigned R2 upload URL endpoint for image formats.
- `src/app/api/v1/schedule/route.ts` - Authenticated schedule endpoint that validates requests and calls `api.schedulePush.run`.
- `.planning/STATE.md` - Advances execution state to 07-03 complete and records decisions/metrics.
- `.planning/ROADMAP.md` - Marks 07-03 complete.
- `.planning/REQUIREMENTS.md` - Marks SCHED-02 complete; SCHED-03, SCHED-04, and SCHED-05 were already complete.

## Decisions Made

- Kept the HTTP route format allowlist image-only (`landscape`, `square`, `portrait`) so the backend cannot accept video scheduling in this phase.
- Generated upload keys only on the server from authenticated `userId`, safe `draftId`, and format, preventing request-controlled R2 paths.
- Required canonical ISO `scheduledAt` for custom scheduling so the CLI/Workspace exact-time body has a stable contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added explicit validation-error narrowing for TypeScript**
- **Found during:** Task 3 (Implement schedule endpoint)
- **Issue:** `npx tsc --noEmit` could not narrow helper results because `Record<string, string>` can technically contain an `error` key.
- **Fix:** Added `isValidationError` and used it when handling URL/key validation results.
- **Files modified:** `src/app/api/v1/schedule/route.ts`
- **Verification:** `npx vitest run src/app/api/v1/schedule/__tests__/route.test.ts` and `npx tsc --noEmit` passed.
- **Committed in:** `e7e2a27`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix preserved the planned validation behavior and made the implementation type-safe. No scope expansion.

## Issues Encountered

- Task 2 endpoint verification used source-level acceptance checks because the shared route test also imported the not-yet-created schedule route. The full targeted suite passed after Task 3.

## User Setup Required

None - no external service configuration required.

## Verification

- `rtk proxy npx vitest run src/app/api/v1/schedule/__tests__/route.test.ts` passed: 7 tests.
- `rtk proxy npx tsc --noEmit` passed.
- Acceptance checks confirmed `src/app/api/v1/schedule/upload-url/route.ts` calls `createPresignedUploadUrl`.
- Acceptance checks confirmed `src/app/api/v1/schedule/route.ts` calls `api.schedulePush.run`.
- Acceptance checks confirmed `src/app/api/v1/schedule/route.ts` does not allow video formats.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Ready for `07-04-PLAN.md`: the CLI and Workspace can call authenticated backend routes to request presigned R2 image uploads, upload local render outputs, and submit validated Buffer scheduling requests.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/07-schedule-time-upload-posting/07-03-SUMMARY.md`.
- Task commits exist: `892c6b6`, `7beedcc`, `e7e2a27`.
- Verification commands passed after implementation.

---
*Phase: 07-schedule-time-upload-posting*
*Completed: 2026-05-21*
