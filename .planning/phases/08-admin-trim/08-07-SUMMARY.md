---
phase: 08-admin-trim
plan: "07"
subsystem: admin-ui
tags:
  - gallery
  - integrations
  - buffer
  - read-only
dependency_graph:
  requires:
    - 08-05
  provides:
    - /admin/integrations page with Buffer connect/disconnect
    - read-only gallery (no SocialCopySection)
  affects:
    - src/components/admin/history-table.tsx
    - src/app/(admin)/admin/integrations/page.tsx
    - src/components/admin/integrations-client.tsx
    - src/app/api/v1/sous-chef/integrations/route.ts (test reconciled)
tech_stack:
  added: []
  patterns:
    - getSessionUser + redirect auth guard (integrations page)
    - AlertDialog for destructive disconnect confirmation
    - fetch GET/DELETE pattern for integration state
key_files:
  created:
    - src/app/(admin)/admin/integrations/page.tsx
    - src/components/admin/integrations-client.tsx
  modified:
    - src/components/admin/history-table.tsx
    - src/app/api/v1/sous-chef/__tests__/integrations.test.ts
decisions:
  - "D-13: SocialCopySection removed from history-table.tsx; gallery is display-only (thumbnail, PixelBadge, download, JSON viewer)"
  - "D-14: credits_used column removed from gallery table"
  - "D-02: Buffer connect/disconnect extracted to standalone /admin/integrations page; key never returned to browser"
  - "Reconcile: integrations.test.ts updated to remove sousChef.seedAction and githubInstallations references deleted in Plan 08-03"
metrics:
  duration: "8 min"
  completed_date: "2026-05-22"
  tasks: 2
  files: 4
---

# Phase 08 Plan 07: Gallery Read-Only Strip + Integrations Page Summary

**One-liner:** Gallery stripped of SocialCopySection (D-13) and Buffer connection extracted to `/admin/integrations` page (D-02); integrations test reconciled with deleted sousChef.seedAction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Strip SocialCopySection from history-table.tsx | 89a2f0f | src/components/admin/history-table.tsx |
| 2 | New /admin/integrations page + Buffer connect UI + fix tests | 73f21f4 | src/app/(admin)/admin/integrations/page.tsx, src/components/admin/integrations-client.tsx, src/app/api/v1/sous-chef/__tests__/integrations.test.ts |

## What Was Built

### Task 1: Gallery Read-Only Strip (D-13, D-14)

`history-table.tsx` had a 125-line `SocialCopySection` component (lines 79-203) providing an inline social copy editor with Twitter/LinkedIn fields and a `PATCH /api/v1/cook/[id]/copy` call. This was deleted entirely.

Additionally:
- `credits_used` field removed from the `Release` type and from the table row/header
- `colSpan` corrected from 6 to 5 after column removal
- Unused `PixelButton` import removed

Gallery now shows: thumbnail, PixelBadge status (rendered/scheduled/pending/failed), download button, and collapsible JSON viewer.

### Task 2: /admin/integrations Page + Buffer Connect UI (D-02)

Created `/admin/integrations/page.tsx` — server component with `getSessionUser()` auth guard and `redirect("/login")` fallback, matching the keys page pattern.

Created `src/components/admin/integrations-client.tsx` — client component that:
- Fetches `GET /api/v1/sous-chef/integrations` on mount to determine Buffer connection status
- Shows "Off" badge + "Connect Buffer" button when not connected; opens `ConnectDialog` from `./integration-forms`
- Shows "Connected" badge + channel list + AlertDialog-guarded "Disconnect Buffer" when connected
- Disconnect calls `DELETE /api/v1/sous-chef/integrations?provider=buffer` then reloads
- Loading skeleton + error state included
- Buffer API key never returned to browser (server-side sealed credential)

### Integrations Route and Test Reconciliation

The `integrations/route.ts` had no `githubInstallations` lookup remaining — already clean. Confirmed no `githubInstallations` import.

`integrations.test.ts` had two failing tests referencing `sousChef.seedAction` (deleted in Plan 08-03) and `githubInstallations` mock:
1. "disconnects and returns 502 when seeding fails" — obsolete; route no longer calls seedAction
2. "stores the secret and seeds successfully" — was asserting seedAction was called; route no longer does this

Rewrote both tests to match actual route behavior (upsertAction only for analytics providers). Added mock for `posthog-server` captureServer to avoid network calls. All 5 tests pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] integrations.test.ts reconciled with deleted sousChef module**

- **Found during:** Task 2 pre-work (objective context)
- **Issue:** Two tests asserted `api.sousChef.seedAction` was called; route no longer calls it since Plan 08-03 deleted `convex/sousChef.ts`; one test also mocked `githubInstallations.listByUserId` which the route no longer references
- **Fix:** Replaced two failing tests with correct behavior tests: "stores the secret for an analytics provider (no seedAction)" and "stores stripe secret and returns 200"; removed stale mocks from `vi.mock("@convex/_generated/api")`; added `posthog-server` mock to prevent live captureServer network calls; all 5 tests pass
- **Files modified:** `src/app/api/v1/sous-chef/__tests__/integrations.test.ts`
- **Commit:** 73f21f4

**2. [Rule 1 - Observation] integrations/route.ts already had no githubInstallations dependency**

- Plan task 2 included "Step 3 — Clean integrations route: remove githubInstallations query". On inspection, the route had already been cleaned of this call before this plan executed. No action needed.

## Known Stubs

None — IntegrationsClient fetches live data from the integrations API; ConnectDialog posts to the live route.

## Threat Flags

None — new surface (integrations page) covered by existing threat model entries T-08-12 and T-08-13: integrations page uses `getSessionUser() → redirect("/login")` guard; Buffer API key stored server-side via sealed credentials, only connected/not-connected status returned to browser.

## Self-Check: PASSED

- [x] `src/components/admin/history-table.tsx` exists and contains no SocialCopySection
- [x] `src/app/(admin)/admin/integrations/page.tsx` exists
- [x] `src/components/admin/integrations-client.tsx` exists
- [x] Commit 89a2f0f exists (Task 1)
- [x] Commit 73f21f4 exists (Task 2)
- [x] `npm run build` exits 0
- [x] All 5 integrations tests pass
