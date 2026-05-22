---
phase: 08-admin-trim
plan: 10
subsystem: schema,docs,tests
tags: [schema-cleanup, device-flow, docs, convex]
dependency_graph:
  requires: [08-08, 08-09]
  provides: [clean-schema-no-credits, verified-device-flow, updated-claude-md]
  affects: [convex/schema.ts, CLAUDE.md, test fixtures]
tech_stack:
  added: []
  patterns: [two-deploy-schema-migration]
key_files:
  created: []
  modified:
    - convex/schema.ts
    - CLAUDE.md
    - convex/__tests__/userProfiles.test.ts
    - convex/__tests__/crossTenant.test.ts
    - src/lib/posts/__tests__/approve-draft.test.ts
    - .planning/phases/08-admin-trim/08-VALIDATION.md
decisions:
  - D-15 satisfied: device approval URL-param path verified intact in code (device/page.tsx, device-approval.tsx, login ?next=)
  - T-08-21 accepted: creditsRemaining removal is safe; field was already optional; no operational data lost
  - Worktree test contamination (pre-existing): .worktrees/hyperframes-milestone/ test files picked up by vitest — 17 failures are all from that worktree's stale calculateCredits tests; not caused by Phase 8 changes
metrics:
  duration: "~12 min"
  completed: "2026-05-22"
  tasks_completed: 2
  files_changed: 6
---

# Phase 08 Plan 10: Final Schema Cleanup + Device Approval Verification Summary

One-liner: Convex userProfiles schema finalized (creditsRemaining field removed, two-deploy sequence complete); device approval path verified intact; CLAUDE.md updated to reflect Phase 8 deletions; stale test fixtures fixed.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Final Convex schema cleanup — remove creditsRemaining | 813beb8 |
| 2 | Verify device approval path + update CLAUDE.md + fix stale tests | e970c8d |

## Checkpoint Reached

Task 3 (checkpoint:human-verify) — requires human verification of Phase 8 UI surfaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale test fixtures referencing deleted creditsRemaining field**
- **Found during:** Task 2 (vitest run)
- **Issue:** `convex/__tests__/userProfiles.test.ts` seedProfile inserted `creditsRemaining: 30` (now-removed schema field), causing Convex validator errors. Also had a full `describe("userProfiles credits", ...)` block testing the deleted `reserve`/`refund` mutations.
- **Fix:** Removed `creditsRemaining: 30` from seedProfile; removed stale `credits` describe block.
- **Files modified:** `convex/__tests__/userProfiles.test.ts`
- **Commit:** e970c8d

**2. [Rule 1 - Bug] Stale test fixtures in crossTenant.test.ts**
- **Found during:** Task 2 (vitest run)
- **Issue:** `convex/__tests__/crossTenant.test.ts` inserted `creditsRemaining: 0` in four userProfile fixtures.
- **Fix:** Removed `creditsRemaining: 0` from all four inserts.
- **Files modified:** `convex/__tests__/crossTenant.test.ts`
- **Commit:** e970c8d

**3. [Rule 1 - Bug] Stale test expectations in approve-draft.test.ts**
- **Found during:** Task 2 (vitest run)
- **Issue:** `src/lib/posts/__tests__/approve-draft.test.ts` expected `credits_remaining: 29` in 200 response; expected `refund` mutation calls on render failure and `all_selections_skipped`. The `approve-draft.ts` source had already removed credits logic.
- **Fix:** Updated expected 200 body (removed `credits_remaining`); replaced `toHaveBeenCalledWith(refund...)` with `not.toHaveBeenCalledWith(refund...)`.
- **Files modified:** `src/lib/posts/__tests__/approve-draft.test.ts`
- **Commit:** e970c8d

**4. [Rule 1 - Bug] Stale credits test file reference in CLAUDE.md Commands**
- **Found during:** Task 2
- **Issue:** CLAUDE.md Commands listed `npx vitest run src/lib/__tests__/credits.test.ts` but that file was deleted in Phase 8.
- **Fix:** Removed the stale single-file vitest example.
- **Files modified:** `CLAUDE.md`
- **Commit:** e970c8d

## Pre-existing Failures (Not Caused by Phase 8)

- `.worktrees/hyperframes-milestone/` test files are picked up by vitest due to no exclusion in vitest.config.ts. These files reference `calculateCredits` (removed in Phase 8 main branch) and produce 17 test failures. These are worktree contamination failures, not Phase 8 regressions.
- The two GitHub callback redirect test failures previously documented in STATE.md appear to have been resolved or merged into the worktree failure count.

## Verification Status

| Check | Result |
|-------|--------|
| `grep -n "creditsRemaining" convex/schema.ts` | 0 matches — PASS |
| `grep -n "trialEnd" convex/schema.ts` | line 14 optional number — PASS |
| `npm run build` | exit 0 — PASS |
| `ls src/app/device/page.tsx` | exists — PASS |
| `grep -n "next=" src/app/(auth)/login/page.tsx` | line 19 — PASS |
| `grep -n "Approve" src/components/device/device-approval.tsx` | line 65 — PASS |
| `grep -n "GitHub App" CLAUDE.md` | updated minimal note — PASS |
| `grep -n "NEXT_PUBLIC_LAUNCH_MODE" CLAUDE.md` | 0 matches — PASS |
| `grep "nyquist_compliant: true" 08-VALIDATION.md` | match — PASS |
| vitest non-worktree failures | 0 (worktree contamination excluded) — PASS |

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes at trust boundaries introduced.

## Self-Check: PASSED

- convex/schema.ts modified (creditsRemaining removed): confirmed 0 matches in grep
- CLAUDE.md updated: GitHub App section, API routes, Key Modules, Conventions all updated
- Test fixtures fixed in 3 files
- Commits 813beb8 and e970c8d verified in git log
