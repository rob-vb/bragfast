---
phase: 08-admin-trim
plan: "05"
subsystem: admin-ui
tags: [launch-mode, cleanup, admin-nav, dashboard]
dependency_graph:
  requires: [08-03, 08-04]
  provides: [launch-mode-collapse, integrations-nav-link, slim-dashboard]
  affects: [src/app/page.tsx, src/components/admin/admin-sidebar.tsx, src/components/admin/dashboard-client.tsx]
tech_stack:
  added: []
  patterns: [flag-collapse, dead-code-deletion]
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/welcome/pick-repo/pick-repo-client.tsx
    - src/app/welcome/install-warning/page.tsx
    - src/components/admin/dashboard-client.tsx
    - src/app/api/github/__tests__/callback.test.ts
    - docs/conventions.md
    - src/components/admin/admin-sidebar.tsx
  deleted:
    - src/lib/launch-mode.ts
decisions:
  - D-07 complete: launch-mode.ts deleted, all 5 consumers collapsed to repositioned branch
  - D-06 implemented: dashboard strips CreditMeter and resolvePostAllowance stub; stats + recent Releases remain
  - Integrations nav link added to admin sidebar pointing to /admin/integrations
metrics:
  duration: "8 min"
  completed: "2026-05-22"
  tasks: 2
  files: 8
---

# Phase 08 Plan 05: Launch-Mode Collapse + Admin Trim Summary

Launch-mode flag deleted and all 5 consumers hardcoded to the repositioned branch; admin sidebar gained an Integrations link; dashboard stripped of credits-related UI.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Delete launch-mode.ts, collapse 5 consumers, update test + conventions | d5b63a7 |
| 2 | Admin sidebar Integrations link + dashboard slim (D-06) | 98e71fb |

## What Was Built

**Task 1 — Launch-mode collapse (D-07):**
- `src/lib/launch-mode.ts` deleted
- `src/app/page.tsx`: removed `getLaunchMode()` import and `data-launch-mode` attribute from root div
- `src/app/welcome/pick-repo/pick-repo-client.tsx`: replaced `isLaunchModeRepositioned()` conditional with hardcoded `POST_PICK_PATH = "/welcome/brand"`
- `src/app/welcome/install-warning/page.tsx`: replaced conditional `skipPath` with hardcoded `"/welcome/brand"`
- `src/components/admin/dashboard-client.tsx`: already had no launch-mode references (prior plan had already done this work)
- `src/app/api/github/__tests__/callback.test.ts`: removed `vi.mock("@/lib/launch-mode", ...)`, updated test suite to remove legacy/repositioned branching tests and replace with single repositioned-mode assertion
- `docs/conventions.md`: removed "Launch mode flag" section

**Task 2 — Admin trim (D-03, D-06):**
- `src/components/admin/admin-sidebar.tsx`: added `Integrations` nav link (`/admin/integrations`, `Plug` icon) to the Developers group. No links needed removal — Kitchen/Drafts/Briefing/Goals/Activity/Sous-Chef were already absent from the sidebar (removed in prior plans)
- `src/components/admin/dashboard-client.tsx`: removed `CreditMeter` component and `resolvePostAllowance` stub, removed `credits_used` column from releases table. Dashboard now shows stats row (Releases/Images/Videos) + recent Releases list only

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- dashboard-client.tsx: The plan cited `isLaunchModeRepositioned()` at lines 13 and 38 but the file had already been updated in a prior plan (the stub comment confirms: "plan 08-05"). The only remaining cleanup was the `CreditMeter` + `resolvePostAllowance` removal.
- admin-sidebar.tsx: The 6 nav link removals (Kitchen, Drafts, Briefing, Goals, Activity, Sous-Chef Settings) were already completed in Plan 08-03. This plan only added the new Integrations link.
- callback.test.ts: The two tests for legacy/repositioned redirect modes were removed since the callback route no longer branches on launch mode — it always redirects to `/admin`.

## Known Stubs

None — all changes are complete hardcoded values, not placeholders.

## Threat Flags

None — changes are purely cosmetic/cleanup with no new trust boundaries introduced.

## Self-Check

- [x] src/lib/launch-mode.ts deleted
- [x] No launch-mode imports remain in src/
- [x] Integrations link present in admin-sidebar.tsx
- [x] CreditMeter removed from dashboard-client.tsx
- [x] npm run build exits 0
