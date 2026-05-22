---
phase: 08-admin-trim
plan: "04"
subsystem: credits-teardown
tags: [credits, plans, types, convex, cook-api, render-pipeline]
dependency_graph:
  requires: [08-02, 08-03]
  provides: [credits-code-clean]
  affects: [convex/userProfiles, src/lib/types, src/lib/plans, cook-api-routes, render-pipeline]
tech_stack:
  added: []
  patterns: [credits-removal, single-plan-collapse]
key_files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/plans.ts
    - src/lib/posts/approve-draft.ts
    - src/app/api/v1/account/route.ts
    - src/app/api/v1/cook/_shared.ts
    - src/app/api/v1/cook/image/route.ts
    - src/app/api/v1/cook/video/route.ts
    - src/app/api/v1/cook/[id]/route.ts
    - src/lib/pipeline/render.ts
    - src/lib/pipeline/render-video.ts
    - convex/userProfiles.ts
    - convex/videoRender.ts
    - convex/videoRenderHelpers.ts
    - convex/account.ts
    - convex/planTiers.ts
  deleted:
    - src/lib/pricing-data.tsx
    - src/lib/plan-tiers.ts
    - src/lib/accounting/post-allowance.ts
decisions:
  - "D-12 credits teardown implemented: calculateCredits, CookCreditsInput, credits_used, credits_remaining removed from types.ts and all consuming code"
  - "plans.ts collapsed to single-plan shape: PlanId = trial | free | plate; no credits field"
  - "convex/planTiers.ts kept as minimal stub until Plan 08-06 rewrites stripe.ts"
  - "convex/stripe.ts not modified here per plan spec — deferred to Plan 08-06"
  - "approve-draft.ts legacy credit path stripped; render proceeds without credit reservation"
metrics:
  duration: "18 min"
  completed_date: "2026-05-22"
  tasks: 2
  files_modified: 19
  files_deleted: 3
---

# Phase 8 Plan 4: Credits Teardown Summary

Full credits system removed from types, plans config, Convex mutations, cook API routes, and render pipeline. `npm run build` exits 0 after all credit code references stripped.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete credit type/config files + strip credits from types.ts and plans.ts | 1fe2552 | types.ts, plans.ts, pricing-data.tsx(D), plan-tiers.ts(D), post-allowance.ts(D), planTiers.ts(stub), approve-draft.ts, +11 consumer stubs |
| 2 | Strip credits from Convex userProfiles + cook API routes + render pipeline | efd7eab | userProfiles.ts, videoRender.ts, videoRenderHelpers.ts, account.ts, _shared.ts, image/route.ts, video/route.ts, [id]/route.ts, render.ts, render-video.ts, dashboard-client.tsx, account/page.tsx |

## What Was Built

Credits system (D-12) fully stripped from all code in `src/` and `convex/` except `convex/stripe.ts` (deferred to Plan 08-06) and `convex/schema.ts` (field kept optional until Plan 08-10 removes it). The cook API routes survive as functional stubs without credit gating. The render pipeline no longer reserves or refunds credits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed admin-sidebar planConfig undefined lookup**
- **Found during:** Task 1 — collapse of plans.ts to 3 plans (trial/free/plate) while existing users might have "starter"/"pro"/"scale" plan values
- **Fix:** Changed `PLANS[plan]` to `PLANS[plan as keyof typeof PLANS] ?? PLANS.free` to handle legacy plan names gracefully
- **Files modified:** `src/components/admin/admin-sidebar.tsx`
- **Commit:** 1fe2552

**2. [Rule 3 - Blocking] Stubbed plan-tiers consumers to unblock build**
- **Found during:** Task 1 — deleting `plan-tiers.ts` and `pricing-data.tsx` broke many consuming files
- **Fix:** Inlined minimal stub type definitions and functions into the consuming files (account/page.tsx, dashboard-client.tsx, upsell-modal.tsx, page.tsx, pricing/page.tsx, upgrade/page.tsx). These pages will be properly reworked in Plans 08-05+
- **Files modified:** 6 consuming files
- **Commit:** 1fe2552

**3. [Rule 1 - Bug] Removed creditsUsedThisMonth from account page**
- **Found during:** Task 2 — getStats no longer returns creditsUsedThisMonth after credit strip
- **Fix:** Replaced the "Used this month" stat with a duplicate totalReleases (removed the duplicate, left 3 stats)
- **Files modified:** `src/app/(admin)/admin/account/page.tsx`
- **Commit:** efd7eab

**4. [Rule 1 - Bug] Removed credits_remaining from /api/v1/account GET**
- **Found during:** Task 2 scan — account/route.ts returned `credits_remaining: profile?.creditsRemaining ?? 0`
- **Fix:** Removed field from response object
- **Files modified:** `src/app/api/v1/account/route.ts`
- **Commit:** efd7eab (included in Task 2 commit via Task 1 change)

**5. [Rule 3 - Blocking] Fixed approve-draft.ts calculateCredits usage**
- **Found during:** Task 1 — approve-draft.ts imported calculateCredits from types.ts which was being deleted
- **Fix:** Removed calculateCredits import, credit reservation, and refund logic from the legacy approval path
- **Files modified:** `src/lib/posts/approve-draft.ts`
- **Commit:** 1fe2552

### Known Deferred

- `convex/stripe.ts` still has 9 `creditsRemaining` references — deferred to Plan 08-06 which rewrites the entire file
- `convex/planTiers.ts` is a stub (not fully deleted) — kept to satisfy stripe.ts imports until Plan 08-06

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `src/app/(admin)/admin/account/page.tsx` | Inline `resolvePostAllowance` stub | plan-tiers.ts deleted; page reworked in 08-05 |
| `src/components/admin/dashboard-client.tsx` | Inline `resolvePostAllowance` stub | plan-tiers.ts deleted; page reworked in 08-05 |
| `src/components/admin/upsell-modal.tsx` | Inline `Tier`/`TIER_CONFIG` stubs | plan-tiers.ts deleted; component removed in 08-05 |
| `src/app/page.tsx` | Inline `NEW_TIERS`/`FEATURES` stubs | pricing-data.tsx deleted; homepage reworked in 08-05+ |
| `src/app/pricing/page.tsx` | Inline `NEW_TIERS`/`FEATURES`/`FeatureValue` stubs | pricing-data.tsx deleted; page reworked in 08-05+ |
| `src/app/(admin)/admin/account/upgrade/page.tsx` | Inline pricing stubs | pricing-data.tsx deleted; upgrade page deleted in 08-05 |
| `convex/planTiers.ts` | Minimal re-export stub | stripe.ts imports Tier+TIER_CONFIG; fully removed after 08-06 |

## Threat Flags

None. Cook routes retain `authenticate()` check. Removing credit gates from dormant API routes (ADR-0002 confirmed these are not the active render path) has no active attack surface.

## Self-Check: PASSED

- Task 1 commit 1fe2552 exists: FOUND
- Task 2 commit efd7eab exists: FOUND
- `npm run build` exits 0: VERIFIED
- `calculateCredits` grep returns 0 matches in src/convex (excl. test/schema): VERIFIED
- `getBalance`/`reserve`/`refund` absent from convex/userProfiles.ts: VERIFIED
- `reserveCreditsOrError`/`refundAndFail` absent from cook/_shared.ts: VERIFIED
- refund-on-failure block removed from render.ts and render-video.ts: VERIFIED
- Sole remaining `creditsRemaining` references: convex/stripe.ts (known, deferred to 08-06)
