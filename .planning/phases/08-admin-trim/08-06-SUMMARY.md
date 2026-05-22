---
phase: 08-admin-trim
plan: "06"
subsystem: billing
tags: [stripe, schema, migration, account-page, ui]
dependency_graph:
  requires: [08-04]
  provides: [single-plan-stripe, plan-union-collapsed, trial-status-display]
  affects: [convex/stripe.ts, convex/schema.ts, convex/userProfiles.ts, account-page]
tech_stack:
  added: []
  patterns: [single-price-stripe, plan-union-migration, trial-countdown-ui]
key_files:
  created:
    - convex/planMigration.ts
  modified:
    - convex/stripe.ts
    - convex/schema.ts
    - convex/userProfiles.ts
    - convex/__tests__/stripe.test.ts
    - src/app/(admin)/admin/account/page.tsx
    - src/app/(admin)/admin/account/upgrade/page.tsx
    - src/app/(admin)/admin/account/upgrade/actions.ts
    - src/app/(admin)/admin/account/upgrade/upgrade-button.tsx
    - src/components/admin/upsell-modal.tsx
decisions:
  - "D-09 implemented: createCheckoutSession uses single STRIPE_PLATE_PRICE_ID; all multi-tier price map removed"
  - "D-10 implemented: account page shows trial days remaining from trialEnd field; upgrade page is single-plan"
  - "handleSubscriptionDeleted now always patches to free (no legacy trial fallback)"
  - "planMigration.migratePlanLiterals batches with paginate() to stay within Convex transaction limits"
  - "upsell-modal simplified to single-plan prompt; old props (reason, currentTier, targetTier) removed"
metrics:
  duration: "12 min"
  completed: "2026-05-22"
  tasks: 2
  files: 9
---

# Phase 08 Plan 06: Billing Reshape Summary

**One-liner:** Stripe collapsed to single STRIPE_PLATE_PRICE_ID, plan union cleaned to trial|plate|free with migration, account page shows trial countdown based on trialEnd.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Collapse stripe.ts + schema + migration + tests | RED: test commit, GREEN: feat commit | convex/stripe.ts, schema.ts, planMigration.ts, userProfiles.ts, stripe.test.ts |
| 2 | Account page + upgrade page billing reshape | feat commit | account/page.tsx, upgrade/page.tsx, actions.ts, upgrade-button.tsx, upsell-modal.tsx |

## What Was Built

**convex/stripe.ts** — Collapsed from multi-tier branching to single-plan model:
- `createCheckoutSession` validates `planId === "plate"` and uses `process.env.STRIPE_PLATE_PRICE_ID`
- `handleSubscriptionChange` patches `plan: "plate"` only when `priceId` matches `STRIPE_PLATE_PRICE_ID`
- `handleSubscriptionDeleted` always patches `plan: "free"` (no legacy trial fallback)
- `handleInvoicePaid` is a no-op (no credits to reset on renewal)
- Removed: `priceToPlan`, `priceToTier`, `PLAN_CREDITS`, `TIER_CONFIG` import

**convex/planMigration.ts** — New `internalMutation` `migratePlanLiterals` that maps old paid plan literals (starter/pro/scale/toast/buffet) to "plate", leaving trial and free unchanged. Uses `paginate()` to process in batches.

**convex/schema.ts** — Plan union collapsed from 8 literals to 3: `trial | plate | free`.

**convex/userProfiles.ts** — `getStats` now returns `trialEnd` field for account page display.

**account/page.tsx** — Removed CreditBar, credit stats, plan allowance. Added trial status:
- Trial active: "{N} days left in your trial"
- Trial expired: "Trial ended" + Subscribe Now CTA
- Free: Subscribe Now CTA
- Plate: "Subscribed" + ManageBillingButton

**upgrade/page.tsx** — Replaced multi-tier grid (Toast/Plate/Buffet) with single Full Plate card at $29/mo.

**upsell-modal.tsx** — Refactored from multi-tier comparison modal to simple "Trial ended" subscribe prompt.

## TDD Gate Compliance

- RED commit: `test(08-06)` — 4 failing tests
- GREEN commit: `feat(08-06)` — all 7 tests passing
- Gate sequence: PASSED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UpgradeButton called createCheckout(planId) but actions.ts no longer accepts planId**
- **Found during:** Task 2
- **Issue:** After simplifying `createCheckout()` to hardcode `planId: "plate"`, the `UpgradeButton` still passed `planId` as an argument, causing a TypeScript type mismatch.
- **Fix:** Updated `upgrade-button.tsx` to call `createCheckout()` with no argument; kept `planId` prop as `_planId` (unused but kept for API compatibility until callers are updated).
- **Files modified:** `upgrade-button.tsx`

None others — plan executed as written.

## Known Stubs

None. All data wired: `trialEnd` flows from `userProfiles.getStats` → account page rendering.

## Threat Flags

None. No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- convex/planMigration.ts: FOUND
- convex/stripe.ts: FOUND (grep confirms no priceEnvMap/priceToPlan/TIER_CONFIG)
- convex/schema.ts: plan union = trial|plate|free confirmed
- stripe.test.ts: 7/7 PASS
- npm run build: exits 0
