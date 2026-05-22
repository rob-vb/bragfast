---
phase: 07-schedule-time-upload-posting
plan: 06
subsystem: api
tags: [convex, buffer, r2, scheduling, idempotency]

requires:
  - phase: 07-schedule-time-upload-posting
    provides: Workspace schedule flow, R2 schedule uploads, and Buffer schedule push primitive
provides:
  - Trusted server-proof boundary for public schedulePush action calls
  - Server-derived Buffer media URLs from authenticated R2 schedule keys
  - Pending scheduled release attempts before Buffer side effects
  - Durable providerPost recording and idempotent retry behavior
affects: [schedule-time-upload-posting, buffer, releases, r2]

tech-stack:
  added: []
  patterns:
    - Route-generated HMAC proof for trusted Next-to-Convex action calls
    - Stable externalId derived from canonical schedule payload for idempotent retries
    - Scheduled release lifecycle mutations for pending, scheduled, and failed states

key-files:
  created: []
  modified:
    - convex/schedulePush.ts
    - convex/releases.ts
    - convex/__tests__/schedulePush.test.ts
    - src/app/api/v1/schedule/route.ts
    - src/app/api/v1/schedule/__tests__/route.test.ts
    - src/lib/storage/r2.ts

key-decisions:
  - "Phase 7 Plan 06: schedulePush.run stays public for ConvexHttpClient access but requires a short-lived INTERNAL_API_SECRET HMAC proof before any R2, credential, or Buffer side effect."
  - "Phase 7 Plan 06: schedule request externalId is derived from authenticated userId plus canonical schedule payload so retries reuse the same release attempt."
  - "Phase 7 Plan 06: POST /api/v1/schedule ignores caller-provided media URLs and derives Buffer URLs from authenticated scheduled/{userId}/{draftId}/{format}.jpg keys."

patterns-established:
  - "Trusted schedule route: authenticate, validate exact R2 key scope, derive public URLs, then sign the Convex action payload."
  - "Durable provider fanout: insert pending release, record each providerPostId immediately, mark failed with preserved metadata on later provider errors."

requirements-completed:
  - SCHED-04
  - SCHED-05
  - SCHED-06

duration: 10 min
completed: 2026-05-22
---

# Phase 07 Plan 06: Schedule Boundary Hardening Summary

**Trusted schedule-time Buffer posting with server-derived R2 media URLs, durable provider-post recording, and idempotent retry recovery**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-22T06:52:00Z
- **Completed:** 2026-05-22T07:02:15Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- Added regression coverage for direct public Convex abuse, media URL tampering, invalid R2 schedule keys, partial Buffer failure durability, and retry idempotency.
- Hardened `/api/v1/schedule` so it validates every selected key as `scheduled/{auth.userId}/{draftId}/{format}.jpg`, derives Buffer media URLs server-side, and signs the schedule action payload.
- Added scheduled release attempt mutations that create pending rows, record provider posts immediately after each Buffer success, and preserve provider posts when later pushes fail.
- Reworked `schedulePush.run` to reject missing/invalid server proof before side effects, use stable request IDs, skip already-recorded Buffer posts on retry, and mark success only after all provider posts are durable.

## Task Commits

1. **Task 1: Add regression tests for trusted action, derived URLs, and partial Buffer failure durability** - `d7aadb7` (test)
2. **Task 2: Derive schedule media URLs from authenticated R2 keys in the route** - `96b02ed` (fix)
3. **Task 3: Add durable scheduled-release attempt mutations** - `4b4b742` (feat)
4. **Task 4: Harden schedulePush trust and make Buffer posting idempotent** - `4fdd37c` (fix)
5. **Task 4 build fix: Type schedule error mapping for readonly Convex tuples** - `053edbb` (fix)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `convex/schedulePush.ts` - Adds HMAC proof verification, stable request IDs, pending attempt creation, immediate provider-post recording, failure marking, and retry skipping.
- `convex/releases.ts` - Adds internal scheduled-attempt lifecycle mutations.
- `convex/__tests__/schedulePush.test.ts` - Covers unauthorized direct calls, durable failed attempts, and retry idempotency.
- `src/app/api/v1/schedule/route.ts` - Derives URLs from authenticated R2 keys and attaches route-generated server proof.
- `src/app/api/v1/schedule/__tests__/route.test.ts` - Covers URL tampering rewrite and authenticated key scope rejection.
- `src/lib/storage/r2.ts` - Exposes `publicUrlForKey` so upload and schedule routes share R2 public URL construction.

## Decisions Made

- Kept `schedulePush.run` as a public action because the existing Next route uses `ConvexHttpClient`, but made it require a short-lived HMAC over the authenticated schedule payload.
- Used a canonical schedule payload digest as the release `externalId`, which gives retries a stable attempt record without adding schema fields.
- Preserved backwards compatibility for CLI request bodies containing `urls`, but stopped trusting those URLs for Buffer media.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Route error mapper accepted mutable `string[]` while Convex returned a readonly missing tuple**
- **Found during:** Task 4 verification (`npm run build`)
- **Issue:** TypeScript rejected `mapScheduleError(result)` because the generated Convex action result narrowed `missing` to a readonly tuple.
- **Fix:** Changed the route helper type to `missing?: readonly string[]`.
- **Files modified:** `src/app/api/v1/schedule/route.ts`
- **Verification:** `npm run build` passed.
- **Committed in:** `053edbb`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type-only compatibility fix required for production build. No behavior or scope change.

## Issues Encountered

- Initial RED tests failed as expected before implementation.
- First build attempt failed on readonly tuple typing in `mapScheduleError`; fixed and reran successfully.

## Verification

- `npx vitest run convex/__tests__/schedulePush.test.ts src/app/api/v1/schedule/__tests__/route.test.ts` - passed, 15 tests.
- `npx vitest run src/lib/integrations/__tests__/push.test.ts packages/cli/src/__tests__/schedule-route.test.ts packages/workspace/src/hooks/__tests__/useSchedule.test.ts` - passed, 27 tests.
- `npm run build` - passed.

## User Setup Required

None - no new external service configuration required. The implementation uses existing `INTERNAL_API_SECRET` shared between Next and Convex.

## Next Phase Readiness

Phase 7 backend verification gaps for direct action abuse, media URL tampering, and orphaned/duplicated Buffer posts are closed. Phase-level verification can now rerun against the hardened schedule-time posting flow.

---
*Phase: 07-schedule-time-upload-posting*
*Completed: 2026-05-22*
