---
phase: 07-schedule-time-upload-posting
plan: 02
subsystem: scheduling
tags: [convex, buffer, r2, scheduling, vitest]

requires:
  - phase: 07-schedule-time-upload-posting
    provides: Buffer scheduling primitive from 07-01
provides:
  - Trusted Convex schedule action for queue/custom Buffer posting
  - All-or-nothing R2 HEAD-check before Buffer pushes
  - Scheduled release rows visible to Admin history and badges
affects: [schedule-time-upload-posting, admin-gallery, buffer-posting]

tech-stack:
  added: []
  patterns:
    - Convex Node action performs external R2/Buffer calls and delegates DB writes to internal mutations
    - Scheduled release metadata stores channel summaries, provider post IDs, draftId, and scheduling details as JSON

key-files:
  created:
    - convex/schedulePush.ts
    - convex/__tests__/schedulePush.test.ts
    - .planning/phases/07-schedule-time-upload-posting/07-02-SUMMARY.md
  modified:
    - convex/schema.ts
    - convex/releases.ts
    - convex/_generated/api.d.ts
    - src/components/admin/pixel-badge.tsx
    - src/components/admin/history-table.tsx
    - src/lib/types.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "schedulePush.run is a public trusted action for authenticated Next.js route handlers; it keeps credentials server-side and returns only provider post summaries."
  - "Scheduled release rows use externalId prefix rel_ and template local-render with channel/scheduling details in metadata JSON."
  - "R2 HEAD checks run for every provided key before the first Buffer push to prevent partial scheduling."

patterns-established:
  - "External-service schedule actions preflight all rendered assets before provider fanout."
  - "Admin gallery status unions must mirror Convex release status literals and shared API result types."

requirements-completed: [SCHED-04, SCHED-05, SCHED-06]

duration: 5min
completed: 2026-05-21
---

# Phase 07 Plan 02: Schedule Push Core Summary

**Convex schedulePush now atomically validates uploaded R2 images, posts selected formats to Buffer, and records scheduled releases for Admin display.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-21T21:21:25Z
- **Completed:** 2026-05-21T21:26:22Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added Convex coverage for missing upload aborts, missing Buffer credentials, successful Buffer scheduling, and scheduled release persistence.
- Added `scheduled` to the release schema, admin badge/table status unions, and shared `ReleaseResult` status typing.
- Added `convex/schedulePush.ts` as a Node action that HEAD-checks R2 keys, unseals Buffer credentials through the internal secret query, pushes selected images, and inserts one scheduled release row.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schedulePush Convex tests** - `7478316` (test)
2. **Task 2: Extend release schema, release types, and admin badge** - `163cd7d` (feat)
3. **Task 3: Implement schedulePush action** - `c311e45` (feat)

**Plan metadata:** committed separately with this SUMMARY.

## Files Created/Modified

- `convex/schedulePush.ts` - Trusted schedule action with all-or-nothing R2 preflight, Buffer fanout, scheduled release insertion, and safe response shape.
- `convex/__tests__/schedulePush.test.ts` - Convex tests for upload_missing, buffer_not_connected, Buffer push params, and scheduled release metadata.
- `convex/schema.ts` - Adds `scheduled` as a release status literal.
- `convex/releases.ts` - Adds internal `insertScheduled` mutation for action-owned scheduled release writes.
- `convex/_generated/api.d.ts` - Refreshes generated Convex API bindings for `schedulePush` and `insertScheduled`.
- `src/components/admin/pixel-badge.tsx` - Adds the Scheduled status badge style.
- `src/components/admin/history-table.tsx` - Allows scheduled releases in Admin history rows.
- `src/lib/types.ts` - Keeps public release result typing aligned with Convex scheduled status.

## Decisions Made

- `schedulePush.run` remains public because the next route layer will authenticate and derive `userId`; the action itself never exposes sealed credentials or plaintext credentials.
- The scheduled release `externalId` uses `rel_` to distinguish scheduled local-render records from existing `cook_` render records.
- Provider push metadata is stored in release `metadata` JSON instead of new schema columns to keep this plan within the existing release table shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept RED tests type-safe before Convex codegen saw schedulePush**
- **Found during:** Task 2 (Extend release schema, release types, and admin badge)
- **Issue:** `npx tsc --noEmit` failed because the RED test referenced `api.schedulePush.run` before the generated API had a schedulePush module.
- **Fix:** Switched the test to an explicit `makeFunctionReference("schedulePush:run")` and read releases through the existing public query.
- **Files modified:** `convex/__tests__/schedulePush.test.ts`
- **Verification:** `npx tsc --noEmit` passed before Task 3 implementation.
- **Committed in:** `163cd7d`

**2. [Rule 3 - Blocking] Extended shared ReleaseResult status union**
- **Found during:** Task 2 (Extend release schema, release types, and admin badge)
- **Issue:** Adding `scheduled` to Convex release status made `src/lib/pipeline/render.ts` unable to assign queried release status into `ReleaseResult`.
- **Fix:** Added `scheduled` to `src/lib/types.ts` `ReleaseResult.status`.
- **Files modified:** `src/lib/types.ts`
- **Verification:** `npx tsc --noEmit` passed.
- **Committed in:** `163cd7d`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to keep the planned schema expansion type-safe. No scope expansion beyond scheduled release status propagation.

## Issues Encountered

- `npx convex codegen` refreshed `convex/_generated/api.d.ts` after adding the new Convex action and internal mutation so TypeScript could resolve the generated function references.

## User Setup Required

None - no external service configuration required.

## Verification

- `rtk proxy npx vitest run convex/__tests__/schedulePush.test.ts` passed: 3 tests.
- `rtk proxy npx tsc --noEmit` passed.
- Acceptance checks confirmed `convex/schedulePush.ts` contains `headObject`, `pushToBuffer`, and `insertScheduled`.
- Acceptance checks confirmed `convex/schedulePush.ts` does not import or write `draftPushes`.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Ready for `07-03-PLAN.md`: the backend scheduling primitive can now be called by an authenticated route/workspace flow to upload rendered images, queue or schedule them in Buffer, and show the scheduled release in Admin history.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/07-schedule-time-upload-posting/07-02-SUMMARY.md`.
- Task commits exist: `7478316`, `163cd7d`, `c311e45`.
- Verification commands passed after implementation.

---
*Phase: 07-schedule-time-upload-posting*
*Completed: 2026-05-21*
