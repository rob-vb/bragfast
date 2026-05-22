---
phase: 08-admin-trim
plan: "02"
subsystem: convex-schema
tags:
  - schema-migration
  - trial
  - credits-teardown
  - deploy-1-of-2

dependency_graph:
  requires:
    - 08-01
  provides:
    - userProfiles.trialEnd field (optional number) for subscription gate
    - creditsRemaining as optional — unblocks 08-04 code removal
  affects:
    - convex/schema.ts
    - convex/userProfiles.ts
    - convex/stripe.ts
    - convex/videoRenderHelpers.ts

tech_stack:
  added: []
  patterns:
    - "Two-deploy Convex schema migration: make field optional first, remove after code cleanup"
    - "trialEnd computed server-side in mutation args (not client-supplied) — T-08-01 mitigation"

key_files:
  created: []
  modified:
    - convex/schema.ts
    - convex/userProfiles.ts
    - convex/stripe.ts
    - convex/videoRenderHelpers.ts

decisions:
  - "D-10 implemented: userProfiles.create sets trialEnd = Date.now() + 14d server-side; no client arg"
  - "creditsRemaining made optional only (not removed) — Deploy 2 removal deferred to Plan 08-10"

metrics:
  duration: "8 minutes"
  completed_date: "2026-05-22"
  tasks_completed: 2
  files_changed: 4
---

# Phase 08 Plan 02: Convex Schema Deploy 1 — trialEnd + creditsRemaining Optional Summary

Deploy 1 of 2-deploy credits teardown: `creditsRemaining` made optional and `trialEnd: v.optional(v.number())` added to userProfiles schema; `create` mutation updated to set 14-day trial end server-side without setting `creditsRemaining`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema — make creditsRemaining optional + add trialEnd | 4ac6ed9 | convex/schema.ts |
| 2 | userProfiles.create — set trialEnd, strip creditsRemaining | 1baa6d4 | convex/userProfiles.ts |

## Verification

- `npx vitest run convex/__tests__/userProfiles.test.ts`: 10/10 pass (all trialEnd assertions green)
- `npm run build`: exits 0 (Next.js + Convex codegen clean)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Null-coalesce guards for creditsRemaining in transition code**
- **Found during:** Task 2 build verification
- **Issue:** Making `creditsRemaining` optional caused TypeScript errors in `convex/stripe.ts` (line 144), `convex/userProfiles.ts` (reserve/refund mutations), and `convex/videoRenderHelpers.ts` — all directly caused by the Task 1 schema change
- **Fix:** Added `?? 0` null coalesce guards at each read site; semantically equivalent to pre-migration behavior since 0 credits means the same as undefined credits in these transition paths
- **Files modified:** convex/stripe.ts, convex/userProfiles.ts, convex/videoRenderHelpers.ts
- **Commit:** d84baa7

## Known Stubs

None — this plan only modifies schema and a single mutation insert. No UI components or data rendering involved.

## Threat Flags

None — trialEnd is computed server-side in the mutation handler. The create mutation args remain `{ userId: v.string(), email: v.string() }` with no trialEnd parameter exposed (T-08-01 fully mitigated).

## Self-Check: PASSED

- convex/schema.ts modified: FOUND
- convex/userProfiles.ts modified: FOUND
- commit 4ac6ed9: FOUND
- commit 1baa6d4: FOUND
- commit d84baa7: FOUND
- `grep "trialEnd: v.optional" convex/schema.ts`: FOUND
- `grep "creditsRemaining: v.optional" convex/schema.ts`: FOUND
- All 10 tests passing: CONFIRMED
- Build exit 0: CONFIRMED
