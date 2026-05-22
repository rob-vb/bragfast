---
phase: 08-admin-trim
plan: "08"
subsystem: auth
tags: [subscription-gate, 402, trial, billing]
dependency_graph:
  requires: [08-06, 08-07]
  provides: [checkSubscriptionGate, 402-gate-on-write-routes]
  affects: [schedule, upload-url, drafts]
tech_stack:
  added: []
  patterns: [fetchQuery-from-nextjs, Response.json-402, auth-then-gate]
key_files:
  created:
    - src/lib/auth/subscription-gate.ts
  modified:
    - src/app/api/v1/schedule/route.ts
    - src/app/api/v1/schedule/upload-url/route.ts
    - src/app/api/v1/drafts/route.ts
    - src/app/api/v1/drafts/[id]/route.ts
decisions:
  - "T-08-16 mitigation: undefined trialEnd on trial plan is treated as expired (blocked) rather than allowed — safe default"
metrics:
  duration: 7min
  completed: 2026-05-22
  tasks: 2
  files: 5
---

# Phase 08 Plan 08: Subscription Gate Summary

**One-liner:** 402 subscription gate via `checkSubscriptionGate(userId)` using fetchQuery to userProfiles, wired into 4 CLI-facing write routes after the 401 auth check.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement subscription-gate.ts | 0e28e65 | src/lib/auth/subscription-gate.ts |
| 2 | Wire checkSubscriptionGate into 4 gated routes | 7c7dd4a | schedule/route.ts, upload-url/route.ts, drafts/route.ts, drafts/[id]/route.ts |

## What Was Built

**`src/lib/auth/subscription-gate.ts`**

Single-export async helper `checkSubscriptionGate(userId: string): Promise<Response | null>`:
- Fetches user profile via `fetchQuery(api.userProfiles.getByUserId, { userId })`
- `plan === "free"` → 402 `{ error: "subscription_required" }`
- `plan === "trial"` AND (`trialEnd === undefined` OR `trialEnd < Date.now()`) → 402
- `plan === "trial"` AND `trialEnd >= Date.now()` → null (active trial)
- `plan === "plate"` → null (subscribed)
- Missing profile → 402 (no subscription record)

**4 routes wired (write paths only):**
- `POST /api/v1/schedule` — gate after 401 check, before payload parse
- `POST /api/v1/schedule/upload-url` — gate after 401 check
- `POST /api/v1/drafts` — gate after 401 check, before rate limit
- `PATCH /api/v1/drafts/[id]` — gate after 401 check

**Not gated (per plan):** GET routes, DELETE routes, POST /api/v1/upload (local render), cook API routes.

## Test Results

All 4 contract tests from Plan 08-01 pass GREEN:
- active trial returns null
- expired trial returns 402 with subscription_required error
- free plan returns 402 with subscription_required error
- active plate subscription returns null

## Security Verification (STRIDE)

| Threat | Status |
|--------|--------|
| T-08-15: Unauthenticated request gets 402 before 401 | Mitigated — 401 check on line 263, gate on line 267 |
| T-08-16: Missing trialEnd treated as free | Mitigated — `undefined` trialEnd returns 402 |
| T-08-17: upload-url not gated | Mitigated — upload-url explicitly wired |
| T-08-18: Local render broken by gate | Mitigated — POST /api/v1/upload not touched |

## Deviations from Plan

None - plan executed exactly as written.

The `undefined` trialEnd safe-default behavior (T-08-16) was already called out in the plan's threat model and implemented as specified.

## Self-Check: PASSED

- [x] src/lib/auth/subscription-gate.ts created
- [x] All 4 route files modified
- [x] Commit 0e28e65 exists (Task 1)
- [x] Commit 7c7dd4a exists (Task 2)
- [x] vitest exits 0 (4/4 green)
- [x] npm run build exits 0
