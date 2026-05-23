---
phase: 08-admin-trim
verified: 2026-05-23T09:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Sign up as a new user; open the Admin at /admin"
    expected: "Profile created with plan='trial' and trialEnd ~14 days out; billing status shows 'On the House — N days left in your trial'"
    why_human: "userProfiles.create is called lazily on first Admin visit — need to confirm the trial UI renders correctly end-to-end"
  - test: "From a terminal, run 'brag login'; open the printed URL (/device?code=XXXX) in a browser while not yet signed in"
    expected: "Browser redirects to /login?next=%2Fdevice%3Fcode%3DXXXX; after login the browser lands on /device with the code displayed and Approve/Deny buttons visible"
    why_human: "Redirect-after-login chain requires a running server; can't verify login redirect → device page flow programmatically"
  - test: "Subscribe via /admin/account/upgrade (use a Stripe test card)"
    expected: "Stripe checkout opens; on success plan flips to 'plate'; account page shows '$29/mo · Subscribed'; ManageBillingButton appears"
    why_human: "Stripe checkout requires live Stripe test keys and a browser; can't mock the payment flow"
  - test: "Set up a brand with a logo upload in /admin/brands; open the Workspace and verify the logo slot auto-populates"
    expected: "The logo uploaded in the Admin appears pre-filled in the logo slot when that brand is selected in the Workspace"
    why_human: "Requires running CLI proxy + Workspace + Admin together; useBrand hook loads via fetchBrands() which needs the proxy running"
  - test: "Navigate to /admin/history; confirm there is no creation or editing UI"
    expected: "Gallery shows thumbnails with status badges (completed/scheduled/pending/failed) and Download buttons only; no text editors, no copy fields, no 'New Release' or 'Edit' buttons"
    why_human: "Visual inspection required to confirm read-only state of the gallery surface"
---

# Phase 8: Admin Trim Verification Report

**Phase Goal:** The Admin is intentionally thin: login/signup works, brand setup feeds the Workspace logo slot, the read-only Creation gallery shows rendered/scheduled/published status, API key management works, billing with a 14-day trial is active, and the device approval page is wired in — legacy cook/release authoring UI is removed.

**Verified:** 2026-05-23T09:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New user can sign up/log in and access Admin; CLI device-flow code via /device?code= approval page is wired | VERIFIED | `/device/page.tsx` + `device-approval.tsx` exist and are fully implemented. Login page reads `?next=` param and redirects after auth. `api.deviceCodes.approveCode` and `denyCode` mutations wired. |
| 2 | User can set up/update a brand (logo + colors); logo auto-populates Workspace logo slot | VERIFIED | `brand-form.tsx` handles logo upload (file + URL input). `useBrand` hook in Workspace fetches brands via `fetchBrands()` → `api.ts`, maps `logo_url` to `logoBase64`, feeds `brandLogoUrl` prop → `SlotPanel` → `VisualField` for logo-type objects. Data flows from Admin brand edit → `/api/v1/brands` → Workspace `useBrand`. |
| 3 | Admin gallery shows read-only thumbnail grid with status indicators; no creation/editing UI present | VERIFIED | `history-client.tsx` renders `HistoryTable`; `history-table.tsx` has no mutations, no form inputs, no PATCH calls — only `DownloadButton` and `PixelBadge`. `SocialCopySection` confirmed absent (grep returns 0 matches). Status variants: completed/scheduled/pending/failed in `pixel-badge.tsx`. |
| 4 | User can create, list, and revoke API keys from the Admin | VERIFIED | `key-manager.tsx` fetches `GET /api/v1/api-keys`, `POST` to create, `DELETE` to revoke. `/admin/keys/page.tsx` renders `KeyManager` behind `getSessionUser()` auth guard. |
| 5 | User can subscribe to the single ~$29/mo plan with a 14-day trial and see billing status | VERIFIED | `plans.ts` has single "plate" plan at $29. `userProfiles.create` sets `trialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000` and `plan: "trial"`. `account/page.tsx` renders trial days remaining. `upgrade/page.tsx` shows single Full Plate card. Stripe `createCheckoutSession` uses `STRIPE_PLATE_PRICE_ID`. `checkSubscriptionGate()` gates schedule/drafts/upload APIs with 402 on expired trial or free plan. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/device/page.tsx` | Device approval entry page | VERIFIED | Exists, 70 lines, full impl with auth redirect |
| `src/components/device/device-approval.tsx` | Approve/Deny buttons wired to Convex | VERIFIED | Exists, uses `api.deviceCodes.approveCode` + `denyCode` mutations |
| `src/lib/auth/subscription-gate.ts` | 402 gate for expired trial / free plan | VERIFIED | Exists, handles trial/free/plate plan states correctly |
| `src/app/(admin)/admin/keys/page.tsx` | API keys admin page | VERIFIED | Exists, renders `KeyManager` behind session auth |
| `src/components/admin/key-manager.tsx` | CRUD for API keys | VERIFIED | Full CRUD: list, create (POST), revoke (DELETE) |
| `src/app/(admin)/admin/account/page.tsx` | Billing status page | VERIFIED | Shows trial countdown, subscribe CTA, subscribed state |
| `src/app/(admin)/admin/account/upgrade/page.tsx` | Single-plan subscribe page | VERIFIED | Single Full Plate card at $29/mo |
| `src/components/admin/history-table.tsx` | Read-only gallery table | VERIFIED | No mutations/editing — download + badge only; SocialCopySection removed |
| `convex/userProfiles.ts` (`create`) | Sets trialEnd at signup | VERIFIED | `trialEnd: Date.now() + 14 * 24 * 60 * 60 * 1000` at line 65 |
| `convex/schema.ts` | `trialEnd` field, `creditsRemaining` removed | VERIFIED | `trialEnd: v.optional(v.number())` present; 0 matches for `creditsRemaining` |
| `src/lib/plans.ts` | Single-plan collapse | VERIFIED | Only `trial`, `free`, `plate` — no Toast/Plate/Buffet multi-tier |
| `src/lib/launch-mode.ts` | Deleted | VERIFIED | File does not exist |

### Removed Artifacts (Confirmed Deleted)

| Artifact | Status |
|----------|--------|
| `src/app/(admin)/admin/kitchen/` | REMOVED |
| `src/app/(admin)/admin/drafts/` | REMOVED |
| `src/app/(admin)/admin/briefing/` | REMOVED |
| `src/app/(admin)/admin/sous-chef/` | REMOVED |
| `src/app/(admin)/admin/report/` | REMOVED |
| `src/components/kitchen/*` | REMOVED |
| `src/lib/launch-mode.ts` | REMOVED |
| `src/lib/pricing-data.ts` | REMOVED |
| `SocialCopySection` from history-table | REMOVED |
| `creditsRemaining` from schema | REMOVED |
| `calculateCredits` from types.ts | REMOVED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `device/page.tsx` | `/login?next=` | `getSessionUser()` + `redirect()` | WIRED | Line 38: `redirect('/login?next=${encodeURIComponent('/device?code=${code}')}')`|
| `login/page.tsx` | `callbackURL: next` | `authClient.signIn.email` + `useEffect` | WIRED | Line 37 callbackURL; line 25 router.replace(next) on session |
| `device-approval.tsx` | `api.deviceCodes.approveCode` | `useMutation` | WIRED | Convex real-time mutation |
| `key-manager.tsx` | `/api/v1/api-keys` | `fetch` GET/POST/DELETE | WIRED | Lines 19, 26, 41 |
| `useBrand.ts` | `/api/v1/brands` | `fetchBrands()` in useEffect | WIRED | `api.ts` fetchBrands → `brands.map → mapBrandRecord` → `logo_url → logoBase64` |
| `SlotPanel` → `VisualField` | `brandLogoUrl` | prop | WIRED | `brandLogoUrl={object.type === "logo" ? brandLogoUrl : undefined}` |
| `checkSubscriptionGate` | `api.userProfiles.getByUserId` | `fetchQuery` | WIRED | Checks plan + trialEnd; returns 402 Response or null |
| `schedule/route.ts` | `checkSubscriptionGate` | import + await | WIRED | Lines 5, 267 |
| `drafts/route.ts` | `checkSubscriptionGate` | import + await | WIRED | Lines 6, 25 |
| `upgrade/actions.ts` | `api.stripe.createCheckoutSession` | `fetchAction`, planId: "plate" | WIRED | Single price path |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `history-client.tsx` | `allReleases` | `useQuery(api.releases.listByUser, {userId})` | Yes — Convex DB query | FLOWING |
| `dashboard-client.tsx` | `stats`, `releases` | `useQuery(api.userProfiles.getStats)` + `useQuery(api.releases.listByUser)` | Yes — Convex DB queries | FLOWING |
| `key-manager.tsx` | `keys` | `fetch("/api/v1/api-keys")` in `useEffect` | Yes — Convex `apiKeys.listByUser` | FLOWING |
| `account/page.tsx` | `stats` (plan, trialEnd) | `fetchQuery(api.userProfiles.getStats)` | Yes — Convex DB query | FLOWING |
| `useBrand.ts` | `brands` | `fetchBrands()` → `GET /api/v1/brands` → Convex `brands.listByUser` | Yes — Convex DB query | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| subscription-gate: 4 scenarios | `npx vitest run src/lib/auth/__tests__/subscription-gate.test.ts` | 4 passed | PASS |
| userProfiles.create sets trialEnd | `npx vitest run convex/__tests__/userProfiles.test.ts` | 6 passed | PASS |
| deviceCodes approve/deny | `npx vitest run convex/__tests__/deviceCodes.test.ts` | 6 passed | PASS |
| Subscription gate wired to schedule route | `grep -n "checkSubscriptionGate" src/app/api/v1/schedule/route.ts` | line 267 | PASS |
| Subscription gate wired to drafts route | `grep -n "checkSubscriptionGate" src/app/api/v1/drafts/route.ts` | lines 6, 25 | PASS |
| Kitchen routes removed | `ls src/app/(admin)/admin/kitchen/` | No such file | PASS |
| SocialCopySection absent from history-table | `grep "SocialCopy" src/components/admin/history-table.tsx` | 0 matches | PASS |
| creditsRemaining absent from schema | `grep "creditsRemaining" convex/schema.ts` | 0 matches | PASS |
| launch-mode.ts deleted | `cat src/lib/launch-mode.ts` | No such file | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ADM-01 | 08-03, 08-10 | User can sign up and log in to the admin | SATISFIED | `/login/page.tsx`, `/signup/`, `/device/page.tsx` exist and implement the full auth + device-approval flow |
| ADM-02 | 08-07 | User can set up a brand (logo + colors) in the admin | SATISFIED | `brand-form.tsx` with logo upload; `useBrand.ts` → `logo_url → logoBase64` → Workspace slot |
| ADM-03 | 08-03 | User can view a read-only gallery of past creations | SATISFIED | `history-client.tsx` + `history-table.tsx`; SocialCopySection removed; status badges present |
| ADM-04 | 08-03 | User can create, list, and revoke API keys | SATISFIED | `key-manager.tsx` with full CRUD wired to `/api/v1/api-keys` |
| ADM-05 | 08-01, 08-06, 08-08 | User can subscribe to the single plan with a 14-day trial | SATISFIED | Single plate plan at $29/mo; trialEnd set at create; account page shows status; 402 gate on API |

All 5 required ADM requirements covered. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/page.tsx` | 210 | Active `CtaLink` with `signedInHref="/admin/kitchen"` — route removed | WARNING | Signed-in users clicking "Make your first post" CTA hit a 404. Public-facing but out of Admin scope for this phase. |
| `src/app/page.tsx` | 363 | Active `CtaLink` with `signedInHref="/admin/billing"` — route never existed | WARNING | Signed-in users in pricing section CTA hit a 404. Also copy says "30 Free Credits" — credits removed. |
| `src/app/page.tsx` | 70, 92-174 | Homepage hero + "Sous-Chef" section still describes the retired automation product | WARNING | Public marketing page describes shelved product. Not Admin scope, but signals homepage rewrite is owed. |
| `src/components/admin/dashboard-sources-widget.tsx` | 73 | Orphaned file with active link to `/admin/sous-chef` | INFO | Component exists but is not imported anywhere — not user-facing. Dead code only. |
| `src/components/admin/dashboard-drafts-widget.tsx` | 42 | Orphaned file with link to `/admin/drafts` | INFO | Component exists but is not imported anywhere — not user-facing. Dead code only. |
| `src/components/admin/goal-celebration-modal.tsx` | 68, 75 | Orphaned file with links to `/admin/drafts` + `/admin/sous-chef` | INFO | Component exists but is not imported anywhere — not user-facing. Dead code only. |
| `src/components/admin/admin-sidebar.tsx` | 136 | `sr-only` text "Release kitchen" on logo link | INFO | Screen reader label is stale copy; link goes to `/` homepage, not `/admin/kitchen`. Cosmetic only. |
| `src/app/welcome/integration/integration-client.tsx` | 18, 24, 30 | Links to `/admin/sous-chef?connect=...` | WARNING | Welcome onboarding step links to removed page. However, the welcome flow (`/welcome/integration`) is not linked from Admin navigation — it appears to be legacy onboarding. |

**Debt marker check:** No `TBD`, `FIXME`, or `XXX` markers found in Phase 8-modified files.

**Stub classification:** All WARNING-level items are orphaned files not reachable from Admin navigation, EXCEPT:
- `src/app/page.tsx` line 210 (`/admin/kitchen`) — reachable from public homepage by signed-in users
- `src/app/page.tsx` line 363 (`/admin/billing`) — reachable from public homepage by signed-in users

These are user-facing 404s on the public homepage, but the phase goal scopes to the Admin surfaces. The homepage copy update is owed but not a gap against the 5 Admin success criteria.

---

### Human Verification Required

#### 1. Trial Profile Initialization and Billing Status Display

**Test:** Sign up as a new user; visit `/admin` for the first time.
**Expected:** Admin loads without errors; Account page shows "On the House — N days left in your trial" with the correct day count.
**Why human:** `userProfiles.create` is called on Admin page load (not at signup); need to confirm the lazy profile creation works end-to-end and the trial UI renders correctly.

#### 2. Login → Device Approval Redirect Flow

**Test:** From a terminal, run `brag login`; copy the printed `/device?code=XXXX` URL; open it in a browser while not signed in.
**Expected:** Browser redirects to `/login?next=%2Fdevice%3Fcode%3DXXXX`; after completing login the browser automatically lands on `/device?code=XXXX` displaying the device code and Approve/Deny buttons.
**Why human:** The redirect-after-login chain (`?next=` param + callbackURL + `router.replace(next)`) requires a running dev server; the code path is verified at each step but the end-to-end chain cannot be tested programmatically.

#### 3. Stripe Subscribe Flow (14-Day Trial → Subscribe)

**Test:** With an expired trial account, navigate to `/admin/account/upgrade` and click "Subscribe"; use Stripe test card `4242 4242 4242 4242`.
**Expected:** Stripe checkout opens with the Full Plate plan ($29/mo); on success redirects to `/admin/account/upgrade/success`; account page now shows "$29/mo · Subscribed" and the ManageBillingButton.
**Why human:** Requires Stripe test keys, a browser, and a checkout session — cannot mock the full Stripe payment flow.

#### 4. Brand Logo → Workspace Logo Slot Wiring

**Test:** In `/admin/brands`, create or edit a brand and upload a logo image; open the Workspace (`npx brag`) and select that brand.
**Expected:** The logo slot in the Workspace canvas auto-populates with the uploaded logo without any manual action.
**Why human:** Requires the CLI proxy running (to proxy `/api/v1/brands` with Bearer auth) plus the Workspace app — the `useBrand` hook chain is verified in code but the full local dev stack must be running.

#### 5. Gallery Read-Only Confirmation (Visual)

**Test:** Navigate to `/admin/history` with some past Creations.
**Expected:** Table shows thumbnail (if images present), status badge (completed/scheduled/pending/failed), date, and Download button. No text input fields, no copy-editing UI, no "New Release" button, no "Edit" affordances anywhere on the page.
**Why human:** Visual inspection of a rendered page required to confirm absence of editing UI.

---

### Gaps Summary

No hard blockers against the 5 success criteria. All success criteria are supported by real implementation in the codebase.

**Observations (not blocking phase goal):**

1. **Public homepage has two active stale CTAs** that route signed-in users to deleted pages (`/admin/kitchen` at line 210, `/admin/billing` at line 363). The `src/app/page.tsx` scope in Phase 8 was limited to removing the `launch-mode` flag (Plan 08-05 explicitly said "Keep all other repositioned homepage content intact"). Homepage copy rewrite was not in scope. These are owed cleanup items for a future phase.

2. **Three orphaned components** (`dashboard-sources-widget.tsx`, `dashboard-drafts-widget.tsx`, `goal-celebration-modal.tsx`) contain stale links but are not imported anywhere — not user-facing dead code. Safe to delete in a cleanup pass.

3. **Welcome flow** (`/welcome/integration`) links to `/admin/sous-chef` — this is legacy onboarding not linked from Admin navigation but exists in the codebase as a dead-end.

4. **Admin sidebar `sr-only` text** says "Release kitchen" on the logo link — cosmetic stale label.

---

_Verified: 2026-05-23T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
