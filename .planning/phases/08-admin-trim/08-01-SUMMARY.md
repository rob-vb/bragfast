---
phase: 08-admin-trim
plan: 01
subsystem: auth/billing-tests
tags: [tdd, wave-0, test-scaffold, subscription-gate, trial-end]
dependency_graph:
  requires: []
  provides: [subscription-gate-test-contract, userProfiles-trialEnd-contract]
  affects: [08-02-userProfiles-create, 08-08-subscription-gate-impl]
tech_stack:
  added: []
  patterns: [vitest-vi-mock, convex-test, edge-runtime-test]
key_files:
  created:
    - src/lib/auth/__tests__/subscription-gate.test.ts
  modified:
    - convex/__tests__/userProfiles.test.ts
    - .planning/phases/08-admin-trim/08-VALIDATION.md
decisions:
  - "subscription-gate test mocks convex/nextjs fetchQuery and generated api via vi.mock — keeps test framework consistent with existing auth patterns"
  - "userProfiles trialEnd assertions added in new describe block to avoid touching existing passing tests"
metrics:
  duration: 5min
  completed: "2026-05-22"
  tasks: 3
  files: 3
---

# Phase 08 Plan 01: Wave 0 Test Scaffolds Summary

Wave 0 test scaffolds for ADM-05 billing reshape — failing tests establish the contract for `checkSubscriptionGate()` and `userProfiles.create` trialEnd behavior before implementation begins.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Subscription gate test scaffold | fc99ed1 | src/lib/auth/__tests__/subscription-gate.test.ts |
| 2 | userProfiles trialEnd test assertion | dc01119 | convex/__tests__/userProfiles.test.ts |
| 3 | Mark Wave 0 complete in VALIDATION.md | 7799acf | .planning/phases/08-admin-trim/08-VALIDATION.md |

## What Was Built

**Task 1 — `src/lib/auth/__tests__/subscription-gate.test.ts`**
Four test cases covering the full subscription gate contract:
- Active trial (trialEnd +7 days) → `checkSubscriptionGate` returns null
- Expired trial (trialEnd -1 day) → returns Response with status 402 and `{ error: "subscription_required" }`
- Free plan (no trialEnd) → returns Response with status 402
- Active plate subscription → returns null

Test uses `vi.mock` for `convex/nextjs` fetchQuery and the generated api. Fails with "Failed to resolve import @/lib/auth/subscription-gate" at suite-run time — correct Wave 0 behavior.

**Task 2 — `convex/__tests__/userProfiles.test.ts`**
Two new assertions in a new `describe("userProfiles create — trialEnd")` block:
- `create` mutation sets `trialEnd` within ±5000ms of `Date.now() + 14 * 24 * 60 * 60 * 1000`
- `create` mutation does NOT set `creditsRemaining` (field should be undefined)

Both fail as expected (implementation not yet changed). All 8 pre-existing tests pass unchanged.

**Task 3 — `08-VALIDATION.md`**
Changed `wave_0_complete: false` → `wave_0_complete: true` in frontmatter. `nyquist_compliant: false` unchanged.

## Verification

```
npx vitest run src/lib/auth/__tests__/subscription-gate.test.ts convex/__tests__/userProfiles.test.ts
```

- subscription-gate: 1 suite FAIL — "Failed to resolve import" (expected, no syntax errors)
- userProfiles: 8 PASS, 2 FAIL (trialEnd + creditsRemaining new assertions — expected)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates test scaffolds only, no production code.

## Threat Flags

None — test files only; no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] `src/lib/auth/__tests__/subscription-gate.test.ts` exists
- [x] `convex/__tests__/userProfiles.test.ts` modified (not replaced)
- [x] Commits fc99ed1, dc01119, 7799acf exist
- [x] `wave_0_complete: true` in VALIDATION.md
- [x] `nyquist_compliant: false` unchanged in VALIDATION.md
