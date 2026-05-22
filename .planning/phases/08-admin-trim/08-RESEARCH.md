# Phase 8: Admin Trim - Research

**Researched:** 2026-05-22
**Domain:** Deletion-heavy admin surface trim; Convex schema migration; Stripe single-plan billing; frontend flag collapse
**Confidence:** HIGH — all critical questions resolved from live codebase grep evidence

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Remove the entire shelved Sous-Chef automation surface (Briefing, Goals, Voice presets, Activity log, Report).
- **D-02:** Extract Buffer/Provider connection to its own standalone admin page (e.g. `/admin/integrations`). Buffer infra stays; UI host moves.
- **D-03:** Remove the GitHub App connection UI + PR-merge→draft webhook, the routing-defaults page (table stays), and the Drafts page (table stays).
- **D-04:** Keep the template list + canvas editor — non-deletion, overrides roadmap note.
- **D-05:** Surface custom templates in the Workspace picker with a Default/Custom toggle via `/api/v1/templates` through the CLI proxy.
- **D-06:** Slim `/admin` dashboard — strip Sous-Chef activity widget; keep stats + recent Creations.
- **D-07:** Hard-delete the legacy files AND remove `NEXT_PUBLIC_LAUNCH_MODE` flag, `src/lib/launch-mode.ts`, and collapse its 5 consumers to the repositioned branch.
- **D-08:** Deletion depth = UI + the backend it exclusively owns. Leave shared infra: `drafts`, `releases`, `brands`, `apiKeys`, `integrationSecrets`, `routingDefaults`, `deviceCodes` tables + their Convex fns.
- **D-09:** Single ~$29/mo plan, one Stripe price ID. Collapse 3 tiers.
- **D-10:** Card-less app-tracked 14-day trial. Set `trialEnd` timestamp in `userProfiles` at signup. No `trial_period_days` in Stripe.
- **D-11:** Expired/unsubscribed trial gates backend API access with 402. Local render keeps working.
- **D-12:** Full credits teardown. Resolve cook-API survival under ADR-0002 first.
- **D-13:** Fully read-only gallery — strip `SocialCopySection`.
- **D-14:** Show rendered + scheduled statuses only (plus pending/failed). No `published` badge yet.
- **D-15:** Device approval = verify the URL-param path only.

### Claude's Discretion

- Exact route name for the extracted Buffer/Provider connect page (D-02) — `/admin/integrations` suggested.
- Slim-dashboard exact widget layout (D-06).
- Subscribe-prompt copy/UX in Workspace/CLI on 402 (D-11).
- Default/Custom toggle visuals in the Workspace picker (D-05).
- Order of operations for the delete (which modules first) and exclusivity checks (D-08).

### Deferred Ideas (OUT OF SCOPE)

- Template-authoring feature work (AUTHOR-01..05).
- Buffer published-status tracking.
- Pending-device-code detection on plain login.
- Stripe-side trial (`trial_period_days`).
- Cook-API full route deletion (this phase only removes credit checks where they sit).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | User can sign up and log in to the admin | Device approval path verified: `device/page.tsx:38` redirects to `/login?next=...` and login `page.tsx:17-25` handles `?next=` param — path confirmed working |
| ADM-02 | User can set up a brand (logo + colors) in the admin | `brand-form.tsx` and `brands` table stay intact; no changes required |
| ADM-03 | User can view a read-only gallery of past creations | `history-client.tsx` is already read-only; only `SocialCopySection` (lines 79-203 of `history-table.tsx`) must be removed |
| ADM-04 | User can create, list, and revoke API keys | `apiKeys` table and API route stay untouched; confirmed not in blast radius |
| ADM-05 | User can subscribe to the single plan with a 14-day trial | Requires: schema add `trialEnd`, collapse `plans.ts`/`pricing-data.tsx`, rewrite `stripe.ts` to single price, add trial banner to `account/page.tsx` |
</phase_requirements>

---

## Summary

Phase 8 is a deletion-first phase: roughly 35+ files deleted, ~10 files meaningfully modified, and a Convex schema field swap (`creditsRemaining` out, `trialEnd` in). The research resolves all six flagged questions with concrete file:line evidence.

**Cook API survival (D-12 gate):** The cook API (`/api/v1/cook/*`) is NOT the render path anymore (ADR-0002 confirms this). The routes exist but the CLI/Workspace do not call them — render is local. The cook API should be left dormant (not deleted) this phase per the CONTEXT.md deferred note; credit check removal still applies. The gallery's data source is `convex/releases.ts` queried by `history-client.tsx` — this is independent of the cook API and works today.

**Deletion exclusivity:** All named backend modules (`pr-merge.ts`, triggerEvents, goals/voice/briefing Convex fns) are SAFE TO DELETE. Their only callers are the webhook route and Sous-Chef UI pages being deleted in the same sweep. One non-obvious dependency: `convex/drafts.ts` imports `insertTriggerEvent` from `./triggerEvents`. The trigger-insert call at `drafts.ts:499` is inside the `insertDraftIfNewAction` which is a PR-merge-only path — it can be stripped alongside the triggerEvents deletion. The `drafts` table itself and its core CRUD functions stay.

**Billing reshape:** `trialEnd` does not yet exist in the schema — it must be added as `v.optional(v.number())`. `creditsRemaining` is a `v.number()` (required) — safe Convex removal path: make it optional first, deploy, then strip all code references, then remove from schema.

**Primary recommendation:** Execute deletion waves in exclusivity order — Sous-Chef automation + webhook first (no surviving callers), then credits teardown (schema last), then billing reshape, then nav/dashboard trim.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trial gate (402) | API / Backend | — | Must be server-enforced; CLI sends Bearer token to backend routes |
| Trial tracking (`trialEnd`) | Database (Convex) | API / Backend | Written at signup, read by gate middleware |
| Gallery data | Database (Convex) | API / Backend | `releases` table → `history-client.tsx` via `api.releases.listByUser` |
| Buffer connection UI | Frontend (Admin) | API (`integrations` route) | OAuth key stored server-side; UI is pure client form |
| Template picker (Default/Custom toggle) | Browser (Workspace SPA) | API (`/api/v1/templates`) | Workspace fetches templates through CLI proxy; no SSR needed |
| Launch-mode collapse | Browser + Frontend Server | — | Both server (`page.tsx`) and client consumers (`pick-repo-client.tsx`) |
| Stripe checkout collapse | Convex action | — | `createCheckoutSession` action owns price ID → session mapping |

---

## Critical Research Findings

### RQ-1: Backend Deletion Exclusivity (D-08)

Grep evidence for each module:

**`src/lib/github/pr-merge.ts`**
- Callers: `src/app/api/github/webhooks/route.ts:9` (import `shouldHandlePrMerge`, `buildPrMergeDraftInput`)
- Only caller is the webhook `handlePullRequest` function. The webhook route itself is being deleted (or gutted to `installation`-only).
- **Verdict: SAFE TO DELETE** (alongside webhook route cleanup)

**`convex/triggerEvents.ts`**
- External callers: `src/app/api/github/webhooks/route.ts` (calls `api.triggerEvents.recordAction` at lines 107, 136, 167, 245)
- Internal callers: `convex/drafts.ts:10` (imports `insertTriggerEvent`), `convex/drafts.ts:499` (calls it inside `insertDraftIfNewAction`)
- `insertDraftIfNewAction` is the PR-merge fresh-draft path called only from `webhooks/route.ts:231`. It is NOT called from the Workspace draft flow.
- `src/components/admin/report-client.tsx:116,122` calls `api.briefings.*` (not triggerEvents directly).
- **Verdict: SAFE TO DELETE** — but `convex/drafts.ts` must have the `insertTriggerEvent` import and call at line 499 stripped first, and the PR-merge-specific functions (`insertDraftIfNewAction`, `countRecentPrMergesByRepo`, `findRecentPrMergeForRepo`, `appendPrMergeRollup`, `getRecentApprovedEdits`) removed from `drafts.ts`.

**`convex/goals.ts`, `convex/briefings.ts`, `convex/briefingsActions.ts`, `convex/goalEmails.ts`, `convex/triggerDrafting.ts`**
- Callers in admin UI (being deleted): `src/components/admin/report-client.tsx:116,122` (`api.briefings.*`); `src/app/(admin)/admin/sous-chef/goals/page.tsx`; sous-chef pages.
- `convex/triggerDrafting.ts` calls `composeCopy` + `pickTemplate` from `src/lib/drafts/` — those src/lib/drafts modules (compose-copy, pick-template, safety/content-filter) are also exclusively owned by the Sous-Chef path.
- **Verdict: SAFE TO DELETE** (goals.ts, briefings.ts, briefingsActions.ts, goalEmails.ts, triggerDrafting.ts + src/lib/drafts/compose-copy.ts, src/lib/drafts/pick-template.ts, src/lib/safety/content-filter.ts)

**`src/app/api/github/webhooks/route.ts` — `pull_request` path**
- The `handleInstallation` function is used by the `installation` event which manages GitHub App installs.
- However, `src/components/admin/posthog-identifier.tsx:22` calls `api.githubInstallations.listByUserId` to populate PostHog person properties — this is live in the admin layout.
- After GitHub App UI is removed, `githubInstallations` data will go stale (no new installs). The posthog-identifier should drop the `github_app_installed` property or be updated to omit that field.
- The whole webhook route can be deleted (no GitHub App = no webhook needed). If the GitHub App service account keeps receiving webhooks, they'll 404, which is safe.
- **Verdict: SAFE TO DELETE the whole route** — note `posthog-identifier.tsx` must drop the `githubInstallations` query.

**`convex/githubInstallations.ts` + `convex/githubRepoConfigs.ts`**
- Callers outside the being-deleted surfaces: `src/components/admin/posthog-identifier.tsx:22` (reads listByUserId), `src/app/api/v1/sous-chef/integrations/route.ts:27` (reads installations to associate Buffer with install).
- The integrations route (`sous-chef/integrations`) survives with its Buffer connect logic — but the githubInstallations query there is used to associate a GitHub install with a user context. Once GitHub App is removed, that branch becomes dead code in the route.
- `convex/integrations/githubStars.ts` uses githubInstallations/RepoConfigs for the GitHub stars scanner (shelved automation).
- **Verdict: Tables stay (D-08). Convex fns may stay or become dead. githubStars.ts + the cron that calls it can be deleted. The `sous-chef/integrations` route needs the githubInstallations fetch stripped.**

**`src/app/api/github/configs/route.ts`** — calls `runRetroPrMergeDraft` from `src/lib/github/retro-pr.ts`. Only consumed by `src/app/welcome/pick-repo/pick-repo-client.tsx` and `src/components/admin/github-repo-list.tsx` — both in the GitHub App UI being deleted.
- **Verdict: SAFE TO DELETE** (configs route + retro-pr.ts)

**Shared infra confirmed intact (not in deletion scope):**
- `drafts` table + core CRUD (`api.drafts.listByUser`, `createDraft`, `patchDraft`, `getDraft`, `removeDraft`) — used by Workspace
- `releases` table + fns — used by gallery
- `brands` table + fns — used by brand setup + Workspace
- `apiKeys` table + fns — used by API key management
- `integrationSecrets` table + fns — used by Buffer connect
- `routingDefaults` table + fns — written by Workspace schedule panel (Phase 7)
- `deviceCodes` table + fns — used by device flow (Phase 2)

---

### RQ-2: Cook API Survival Under ADR-0002 (D-12 Gate — RESOLVED)

**ADR-0002 states:** "The cook API routes are no longer the render path." The existing server render pipeline (`src/lib/pipeline/render.ts`, `render-video.ts`) was repurposed into `packages/render-core` for local use.

**Who calls the cook API today:**
- `src/components/kitchen/cook-page.tsx` — being deleted (Kitchen)
- `src/app/demo/page.tsx` — demo page calls `/api/v1/cook/*`
- `scripts/generate-demo-images.ts` — script calls cook API
- `convex/stripe.ts` — NO, stripe.ts does not call cook API
- The Workspace/CLI do NOT call cook API — they use `POST /api/local/render` through the CLI proxy (confirmed via `packages/workspace/src/api.ts` and `packages/cli/src/render-resolver.ts`)

**Conclusion:** Under the reposition, the cook API routes (`/api/v1/cook/image`, `/api/v1/cook/video`, `/api/v1/cook/[id]`) are dead end-user paths. The CONTEXT.md deferred section explicitly says "Cook-API + server-render retirement — likely a broader cleanup; this phase only removes credit checks where they sit."

**Recommendation (CONFIRMED per CONTEXT.md):** Do NOT delete the cook API routes this phase. Strip the credit-check logic from them (the `reserveCreditsOrError` / `refundAndFail` / `calculateCredits` calls) and remove the credit fields from the response objects. The `cook/[id]` route also reads `api.userProfiles.getBalance` (credits_remaining field) — strip that too. Leave the routes themselves as stubs.

**Gallery data source:** `history-client.tsx` uses `api.releases.listByUser` from `convex/releases.ts`. This is completely independent of the cook API. Gallery works regardless of cook API state.

---

### RQ-3: Credits Teardown Blast Radius (D-12)

Complete ordered teardown list with all touch points:

**Layer 1 — Schema (do LAST, after code references are removed):**
- `convex/schema.ts` `userProfiles` table: `creditsRemaining: v.number()` → remove field (LAST step; first make optional)

**Layer 2 — Convex mutations/queries on creditsRemaining (remove after Layer 3):**
- `convex/userProfiles.ts`:
  - `getBalance` query (line 70) — reads `creditsRemaining`; delete (only called from cook `[id]` route)
  - `reserve` mutation (line 83) — deducts credits; delete
  - `refund` mutation (line 207) — refunds credits; delete
  - `create` mutation (line 61-66): strip `creditsRemaining: previous ? 0 : 30` field from insert; set `trialEnd: Date.now() + 14 * 24 * 60 * 60 * 1000` instead
  - `getStats` query (line ~130): strip `creditsRemaining` + `creditsUsedThisMonth` from returned object
- `convex/stripe.ts`:
  - `handleSubscriptionChange` (line 110): strip `creditsRemaining` patches from both new-tier and legacy paths; collapse to single plan update
  - `handleInvoicePaid` (line 150): strip `creditsRemaining` resets
  - `handleSubscriptionDeleted` (line 180): strip `creditsRemaining: 0` patches
  - Strip `PLAN_CREDITS` map, `priceToTier`/`priceToPlan` multi-tier functions, `TIER_CONFIG` import from `planTiers.ts`

**Layer 3 — API routes and pipeline (remove before Convex layer):**
- `src/app/api/v1/cook/_shared.ts`: delete `reserveCreditsOrError` and `refundAndFail` functions (lines 126-165); these call `api.userProfiles.reserve`/`refund`
- `src/app/api/v1/cook/image/route.ts`: strip `calculateCredits` call, `reserveCreditsOrError`, `refundAndFail`, `result.credits_remaining` assignment
- `src/app/api/v1/cook/video/route.ts`: same as image route
- `src/app/api/v1/cook/[id]/route.ts`: strip `api.userProfiles.getBalance` call + `result.credits_remaining` assignment
- `src/lib/pipeline/render.ts`: strip `calculateCredits` import + `creditsUsed` from `ReleaseResult` shape + refund-on-failure block (lines ~173-178)
- `src/lib/pipeline/render-video.ts`: strip `creditsUsed` from result + credit refund logic
- `convex/videoRender.ts` + `convex/videoRenderHelpers.ts`: strip any `creditsUsed`/`creditsRemaining` references

**Layer 4 — Types (remove alongside Layer 3):**
- `src/lib/types.ts`: delete `calculateCredits` function + `CookCreditsInput` type + `credits_remaining`/`credits_used` fields from `ReleaseResult`
- `src/lib/plans.ts`: delete `credits` field from `PlanConfig`; collapse `PLANS` to single entry (`plate` at $29, no credits)
- `src/lib/pricing-data.tsx`: delete entirely (Toast/Plate/Buffet tier data)
- `src/lib/accounting/post-allowance.ts`: delete or gut (credits-based allowance no longer applies; only subscription status matters)
- `src/lib/plan-tiers.ts` (contains `TIER_CONFIG`): delete or gut
- `convex/planTiers.ts`: delete

**Layer 5 — UI (remove first, unblocks everything downstream):**
- `src/app/(admin)/admin/account/page.tsx`: remove `CreditBar` component + credit stats section; replace with trial days remaining display
- `src/app/(admin)/admin/account/upgrade/page.tsx` + `upgrade/actions.ts`: collapse to single-price checkout
- `src/components/admin/history-table.tsx` line 242: remove `credits_used` column from table
- `src/components/admin/dashboard-client.tsx`: remove `creditsRemaining`/`allowance` usage

**Ordering hazard — CRITICAL:**
Convex schema does not support removing required fields with live data. Safe path:
1. Make `creditsRemaining` optional in schema (`v.optional(v.number())`) — deploy
2. Strip all code references to `creditsRemaining` — deploy
3. Remove `creditsRemaining` from schema entirely — deploy
This requires TWO schema deploys separated by a code-reference-clean deploy.

**Additional files with credit references (test/misc):**
- `src/lib/__tests__/credits.test.ts`, `cook-credits.test.ts`, `plan-tiers.test.ts`, `cook-api.test.ts`, `cook-state.test.ts` — delete
- `convex/__tests__/stripe.test.ts` — update to reflect single-plan stripe behavior
- `convex/__tests__/userProfiles.test.ts` — update (remove reserve/refund tests)
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — contains "credits" mentions; update copy
- `src/lib/docs/api-reference.ts` — contains credits documentation; update

---

### RQ-4: Launch-Mode Flag Collapse (D-07)

**All 5 consumers confirmed:**

| File | Usage | Repositioned Branch to Keep |
|------|-------|-----------------------------|
| `src/lib/launch-mode.ts` | Defines `getLaunchMode()`, `isLaunchModeRepositioned()` | DELETE entire file |
| `src/app/page.tsx:11,45` | `getLaunchMode()` passed as `data-launch-mode` attribute | Strip the attribute; keep the repositioned homepage content |
| `src/app/welcome/pick-repo/pick-repo-client.tsx:5,84` | `isLaunchModeRepositioned()` controls `?next=` target after repo pick | Keep the repositioned branch: `next = "/welcome/brand"` |
| `src/app/welcome/install-warning/page.tsx:3,16` | `isLaunchModeRepositioned()` controls skip path | Keep the repositioned branch: `skipPath = "/welcome/brand"` |
| `src/components/admin/dashboard-client.tsx:13,38` | `isLaunchModeRepositioned()` switches between legacy/repositioned dashboard | Keep the repositioned dashboard; drop legacy branch |
| `src/app/api/github/__tests__/callback.test.ts:7,8,26,30` | `vi.mock("@/lib/launch-mode", ...)` — test mock | Update test: remove mock, keep repositioned-only behavior |

**Note:** `docs/conventions.md` has a `##  Launch mode flag` section that must be removed/updated.

---

### RQ-5: Billing Reshape (D-09/D-10/D-11)

**`trialEnd` field:**
- Does NOT yet exist in `convex/schema.ts` `userProfiles` table
- Must be added as `v.optional(v.number())` (Unix ms timestamp)
- Set in `convex/userProfiles.ts` `create` mutation at line 61-66: `trialEnd: Date.now() + 14 * 24 * 60 * 60 * 1000`
- Schema add = safe (new optional field, no existing data migration needed)

**Single Stripe price collapse:**
- `convex/stripe.ts` currently handles 6 price IDs (starter/pro/scale legacy + toast/plate/buffet new-tier)
- Collapse to single `STRIPE_PLATE_PRICE_ID` env var (the $29 plan)
- `createCheckoutSession`: accept single `planId = "plate"`, use single price ID
- `handleSubscriptionChange`: strip multi-plan branching → single `plan: "plate"` set
- `handleInvoicePaid`: strip legacy credit reset; no-op (local render has no server cost)
- `handleSubscriptionDeleted`: set `plan: "free"` (no credits to zero)
- `plans.ts`: `PlanId` = `"trial" | "free" | "plate"` only; `PLANS` = single entry

**402 gate routes (D-11):**
The trial gate must be enforced on routes the CLI calls through the proxy:
- `POST /api/v1/schedule` — schedules a post (calls Buffer)
- `POST /api/v1/schedule/upload-url` — presigned R2 upload
- `POST /api/v1/drafts` — creates a new draft
- `PATCH /api/v1/drafts/[id]` — saves draft edits

The gate logic: read `userProfile.plan` + `userProfile.trialEnd`. If `plan === "free"` OR (`plan === "trial"` AND `trialEnd < Date.now()`), return 402.

Pattern: create a helper `checkSubscriptionGate(userId): Promise<Response | null>` in a new `src/lib/auth/subscription-gate.ts`. Call it at the top of the gated routes after `authenticate()`. This keeps existing `authenticate.ts` unchanged.

Routes that should NOT be gated (read-only or infrastructure):
- `GET /api/v1/brands`, `GET /api/v1/drafts`, `GET /api/v1/templates`, `GET /api/v1/fonts`
- `GET/POST /api/v1/api-keys`
- `POST /api/v1/upload` (local render uploads media to CLI; gating upload breaks local-only render)

**Account page reshape (D-09/D-10):**
- Remove `CreditBar` component + credits stats
- Replace plan display with: subscription status (Subscribed / Trial N days left / Trial expired)
- Add trial countdown banner when `plan === "trial"` and `trialEnd > Date.now()`
- Show "Subscribe Now" CTA when expired or free
- `getStats` query: remove `creditsRemaining` + `creditsUsedThisMonth`; add `trialEnd` return
- Delete `src/app/(admin)/admin/account/upgrade/page.tsx` multi-tier UI; replace with single-price subscribe page

---

### RQ-6: Buffer/Provider Extraction (D-02) + Workspace Template Toggle (D-05)

**Buffer connect current host:**
- `src/app/(admin)/admin/sous-chef/page.tsx:14` — the Sous-Chef main page fetches GitHub installations + integrations
- `src/components/admin/sous-chef-client.tsx` — renders the Sous-Chef settings including Buffer connect UI
- The actual API route stays: `src/app/api/v1/sous-chef/integrations/route.ts` (GET/POST/DELETE `integrationSecrets`)
- The Buffer client lib stays: `src/lib/integrations/buffer/client.ts`, `buffer/push.ts`

**What must be extracted to new page (`/admin/integrations`):**
- A new `src/components/admin/integrations-client.tsx` wrapping the Buffer connect form
- A new `src/app/(admin)/admin/integrations/page.tsx` page
- The integrations route stays at `/api/v1/sous-chef/integrations` (no rename needed — it's an internal API)
- The `sous-chef/integrations` route currently also fetches `api.githubInstallations.listByUserId` (line 27). Strip this GitHub lookup from the route after GitHub App UI is removed.

**Workspace template toggle (D-05):**
- `packages/workspace/src/pages/Home.tsx` is the template picker — currently hardcodes `TEMPLATE_IDS` array of 5 built-ins (lines 11-17)
- `packages/workspace/src/api.ts` — no template fetch function exists yet; must add `fetchUserTemplates()` calling `/api/v1/templates`
- `packages/workspace/src/types.ts` — no user template type; add `UserTemplate { id: string; name: string; config: CanvasTemplateConfig }` or reuse existing shape from `/api/v1/templates` response
- The `/api/v1/templates` route already exists (`src/app/api/v1/templates/route.ts`) and returns user's custom templates; no backend change needed
- The CLI proxy already passes Bearer to backend routes (`packages/cli/src/proxy.ts`) — `/api/v1/templates` goes through this path automatically

---

### RQ-7: Convex Schema Migration Safety

Based on Convex documentation patterns (verified from `convex/_generated/ai/guidelines.md`):

**Safe ordering for this phase:**

1. **Add `trialEnd` as `v.optional(v.number())`** — additive change, safe to deploy immediately. No migration needed; existing rows simply lack the field (optional).

2. **Make `creditsRemaining` optional first** — change to `v.optional(v.number())`. Deploy this schema change before removing code references. This prevents Convex from rejecting writes from still-deployed old code paths during the transition window.

3. **Strip all `creditsRemaining` code references** — after schema marks it optional, all reads will return `undefined` gracefully. Deploy code changes.

4. **Remove `creditsRemaining` from schema entirely** — final schema cleanup. Deploy.

**Plan schema field adds/removes for this phase:**
- `userProfiles` adds: `trialEnd: v.optional(v.number())`
- `userProfiles` removes: `creditsRemaining: v.number()` (via optional intermediate step)
- `userProfiles` schema `plan` union: simplify to `v.union(v.literal("trial"), v.literal("plate"), v.literal("free"))` — but existing rows may have old plan values ("starter", "pro", "scale", "toast", "buffet"). Safe path: add new literals alongside old ones, deploy, run a one-time migration, then remove old literals.

**[ASSUMED] Schema plan field migration:** There is no built-in Convex schema migration tool; the standard pattern is to add a Convex mutation that iterates existing rows and updates `plan` to the new value, then run it as an `internalAction`. This migration must run before the old plan literal strings are removed from the schema union.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin Browser
    |
    |---> /admin pages (Next.js App Router, (admin) route group)
    |       |- /admin (slim dashboard)
    |       |- /admin/history (read-only gallery)
    |       |- /admin/brands (brand setup)
    |       |- /admin/templates (template list + editor)
    |       |- /admin/integrations [NEW] (Buffer connect)
    |       |- /admin/account (billing: trial/subscribed)
    |       |- /admin/api-keys
    |       \- /device (device approval, not in admin route group)
    |
    |---> Next.js API routes
    |       |- /api/v1/schedule → 402-gated → Convex scheduleAction
    |       |- /api/v1/schedule/upload-url → 402-gated → R2 presign
    |       |- /api/v1/drafts (POST/PATCH) → 402-gated → Convex drafts
    |       |- /api/v1/templates (GET) → Convex templates (ungated)
    |       |- /api/v1/sous-chef/integrations (GET/POST/DELETE) → Convex integrationSecrets
    |       \- /api/v1/cook/* (stubs — no longer render path)
    |
    |---> Convex backend
            |- userProfiles (plan + trialEnd — replaces creditsRemaining)
            |- releases (gallery read path)
            |- brands (brand setup)
            |- drafts (CLI Workspace backing store — tables stay)
            |- integrationSecrets (Buffer credentials)
            |- routingDefaults (written by Workspace, stays)
            |- deviceCodes (Phase 2 device flow, stays)
            |- stripe (createCheckoutSession → single price)
            \- templates (user custom templates)

Workspace (localhost Vite SPA)
    |
    |---> CLI proxy → /api/v1/templates (new — for Default/Custom toggle)
    \---> CLI proxy → /api/v1/drafts, /schedule, etc. (402 gate here)
```

### Recommended Project Structure (changes only)

```
src/
├── app/(admin)/admin/
│   ├── integrations/page.tsx     [NEW — D-02]
│   ├── account/page.tsx          [MODIFIED — D-09/D-10/D-12]
│   ├── account/upgrade/page.tsx  [MODIFIED — single price]
│   ├── page.tsx                  [MODIFIED — slim dashboard D-06]
│   ├── kitchen/                  [DELETE — D-01/D-08]
│   ├── briefing/                 [DELETE — D-01]
│   ├── sous-chef/                [DELETE — D-01/D-03]
│   ├── report/                   [DELETE — D-01]
│   └── drafts/page.tsx           [DELETE — D-03]
├── components/admin/
│   ├── integrations-client.tsx   [NEW — D-02]
│   ├── kitchen/                  [DELETE — entire dir]
│   ├── drafts-client.tsx         [DELETE]
│   ├── briefing-client.tsx       [DELETE]
│   ├── sous-chef-client.tsx      [DELETE]
│   ├── routing-defaults-client.tsx [DELETE]
│   ├── github-repo-list.tsx      [DELETE]
│   ├── pixel-event-card.tsx      [DELETE]
│   ├── history-table.tsx         [MODIFIED — strip SocialCopySection]
│   ├── admin-sidebar.tsx         [MODIFIED — nav links]
│   └── posthog-identifier.tsx    [MODIFIED — remove githubInstallations query]
├── lib/
│   ├── launch-mode.ts            [DELETE — D-07]
│   ├── plans.ts                  [MODIFIED — single plan]
│   ├── pricing-data.tsx          [DELETE — D-09]
│   ├── plan-tiers.ts             [DELETE — D-12]
│   ├── accounting/post-allowance.ts [DELETE — D-12]
│   ├── auth/subscription-gate.ts [NEW — D-11 402 gate helper]
│   └── github/pr-merge.ts        [DELETE — D-08]
├── app/api/github/
│   ├── webhooks/route.ts         [DELETE — D-03/D-08]
│   ├── configs/route.ts          [DELETE — GitHub App UI]
│   ├── repos/route.ts            [DELETE — GitHub App UI]
│   └── installations/route.ts    [DELETE — GitHub App UI]
convex/
├── triggerEvents.ts              [DELETE — D-08]
├── goals.ts                      [DELETE — D-01]
├── briefings.ts                  [DELETE — D-01]
├── briefingsActions.ts           [DELETE — D-01]
├── goalEmails.ts                 [DELETE — D-01]
├── triggerDrafting.ts            [DELETE — D-01/D-08]
├── sousChef.ts                   [DELETE — D-01/D-08]
├── planTiers.ts                  [DELETE — D-12]
├── integrations/githubStars.ts   [DELETE — shelved automation]
├── stripe.ts                     [MODIFIED — single price, strip credits]
├── schema.ts                     [MODIFIED — add trialEnd, remove creditsRemaining (2 deploys)]
└── userProfiles.ts               [MODIFIED — create sets trialEnd, strip reserve/refund/getBalance]
packages/workspace/src/
├── api.ts                        [MODIFIED — add fetchUserTemplates()]
├── types.ts                      [MODIFIED — add UserTemplate type]
└── pages/Home.tsx                [MODIFIED — add Default/Custom toggle]
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 402 gate pattern | Custom auth middleware | Helper function `checkSubscriptionGate()` called after `authenticate()` | The existing `authenticate.ts` pattern is route-level; a helper keeps it consistent and testable |
| Stripe single price collapse | Multiple price ID configs | Single `STRIPE_PLATE_PRICE_ID` env var | Existing `createCheckoutSession` action already handles dynamic priceId lookup |
| Plan literal migration | Schema rewrite | Convex `internalAction` migration mutation | Convex has no migration runner; running a mutation is the idiomatic path |
| Workspace template fetch | New proxy route | Existing CLI proxy passes all `/api/v1/*` calls through with Bearer | No new proxy config needed |

---

## Common Pitfalls

### Pitfall 1: Removing Required Schema Fields Without Intermediate Optional Step
**What goes wrong:** Convex rejects a schema deploy that removes a required field when existing documents still have that field. The deploy fails, or worse, live code breaks if deployed out of order.
**Why it happens:** Convex validates all documents against the schema on deploy. Required field removal requires two steps.
**How to avoid:** Intermediate deploy: change `creditsRemaining: v.number()` to `creditsRemaining: v.optional(v.number())`. Then strip code, then remove field.
**Warning signs:** Convex deploy error mentioning schema validation on existing documents.

### Pitfall 2: Deleting triggerEvents.ts Before Cleaning drafts.ts
**What goes wrong:** `convex/drafts.ts` imports `insertTriggerEvent` from `./triggerEvents` at line 10. Deleting triggerEvents.ts while drafts.ts still imports it breaks the Convex build.
**Why it happens:** PR-merge-specific draft functions in drafts.ts depend on triggerEvents.
**How to avoid:** Strip the PR-merge functions and triggerEvent import from drafts.ts first, deploy successfully, then delete triggerEvents.ts.
**Warning signs:** Convex build error `Cannot find module './triggerEvents'`.

### Pitfall 3: Launch-Mode Collapse Leaves Dead Branches
**What goes wrong:** Collapsing `isLaunchModeRepositioned()` to always-true still leaves legacy UI branches as unreachable code, or the `data-launch-mode` attribute is left on root layouts confusing future readers.
**Why it happens:** It's easy to inline `true` and forget to delete the `if (false)` branch.
**How to avoid:** For each consumer, delete the function call AND both branches (keeping only the repositioned arm), then verify `npm run build` is clean.

### Pitfall 4: Sous-Chef API Routes Left Wired to Deleted Components
**What goes wrong:** Deleted pages/components left import references in route handlers, or deleted Convex fns still referenced from API routes that survive.
**Why it happens:** The Sous-Chef surface has non-obvious cross-references (e.g., `sous-chef/integrations` route calls `githubInstallations.listByUserId` even though the GitHub UI is deleted).
**How to avoid:** After deletion, run `npx tsc --noEmit` and `npm run build` — TypeScript will catch dangling imports. Treat any TS error as a blocker before merging.

### Pitfall 5: plan Schema Literal Cleanup Breaking Existing Users
**What goes wrong:** Removing `"starter" | "pro" | "scale" | "toast" | "buffet" | "free"` literals from the `plan` union before migrating existing user rows causes Convex to reject those rows on read or schema push.
**Why it happens:** Production users may be on `"toast"` or `"plate"` plans.
**How to avoid:** Keep all existing plan literals in the schema until after a data migration runs. Migration: `ctx.db.query("userProfiles").collect()` → patch all non-"trial"/non-"free" to "plate". Then remove old literals.

### Pitfall 6: 402 Gate Missing from `POST /api/v1/drafts`
**What goes wrong:** CLI can still save drafts (which consume backend storage) after trial expires if POST drafts is not gated.
**Why it happens:** The gate list in D-11 says "schedule, presigned upload, draft save" — easy to miss draft PATCH.
**How to avoid:** Gate both `POST /api/v1/drafts` (create) AND `PATCH /api/v1/drafts/[id]` (save). GET drafts stays ungated (read-only, needed for Workspace load even after expiry).

---

## Runtime State Inventory

> This is a deletion/cleanup phase; NOT a rename/refactor phase. Runtime state items are limited.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `userProfiles` rows with `creditsRemaining` field | Schema optional step + data migration for `plan` field (keep existing plan values until migration runs) |
| Stored data | `userProfiles` rows with old plan values (`starter`, `pro`, `scale`, `toast`, `plate`, `buffet`, `free`) | Run migration mutation to normalize to `plate` or `free` before removing schema literals |
| Live service config | Stripe: multiple price IDs configured (`STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SCALE_PRICE_ID`, `STRIPE_TOAST_PRICE_ID`, `STRIPE_BUFFET_PRICE_ID`) | Keep env vars set (old subscriptions may reference them via Stripe webhook); only `STRIPE_PLATE_PRICE_ID` used for new checkouts |
| OS-registered state | None — no cron tasks, no scheduled jobs directly tied to deleted surfaces | None |
| Secrets/env vars | `NEXT_PUBLIC_LAUNCH_MODE` env var — code remove, env var becomes dead | Remove from `.env.local`, Vercel env config, and any CI; grep for `NEXT_PUBLIC_LAUNCH_MODE` in deployment config |
| Build artifacts | None identified | None |

**Nothing found in categories OS-registered state and build artifacts** — verified by absence of cron registrations for deleted paths and absence of installed global binaries for admin surfaces.

---

## Environment Availability

> This phase is a deletion/trim phase with Convex schema changes. External dependencies are minimal.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Convex CLI (`npx convex deploy`) | Schema migration deploys | ✓ (in package.json) | Managed via `npx convex` | — |
| Stripe test mode | Billing reshape verification | ✓ (env vars present) | Stripe SDK v14+ | Manual curl test |
| TypeScript compiler | Import integrity verification | ✓ | 5.x | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

> `workflow.nyquist_validation` key absent in `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx tsc --noEmit && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-01 | Login → device approval redirect (`/device?code=X`) | Smoke (manual E2E) | Manual: `brag login` → approve in browser | N/A (existing device page) |
| ADM-02 | Brand form saves logo + colors | Integration | `npx vitest run src/` (existing brand tests) | ✅ |
| ADM-03 | Gallery renders read-only (no edit affordances) | Unit (component) | `npx vitest run` (new test: `SocialCopySection` absent from DOM) | ❌ Wave 0 |
| ADM-03 | `SocialCopySection` component deleted (no dangling import) | Build | `npx tsc --noEmit` | N/A (build gate) |
| ADM-04 | API key CRUD unchanged | Integration | `npx vitest run src/app/api/v1/api-keys/` | ✅ (existing) |
| ADM-05 | `trialEnd` set on new userProfile creation | Unit | `npx vitest run convex/__tests__/userProfiles.test.ts` | ❌ Wave 0 (update existing test) |
| ADM-05 | 402 returned when trial expired | Unit | `npx vitest run src/lib/auth/__tests__/subscription-gate.test.ts` | ❌ Wave 0 |
| ADM-05 | Single-price checkout creates Stripe session | Unit | `npx vitest run convex/__tests__/stripe.test.ts` | ✅ (update existing) |
| D-07 | No `launch-mode` imports remain | Build | `npx tsc --noEmit && grep -r "launch-mode" src/ --include="*.ts"` | N/A (grep gate) |
| D-12 | No `creditsRemaining` references remain post-teardown | Build | `npx tsc --noEmit && grep -r "creditsRemaining" src/ convex/ --include="*.ts"` | N/A (grep gate) |

### Sampling Rate
- **Per task commit:** `npx vitest run && npx tsc --noEmit`
- **Per wave merge:** `npm run build` (full Next.js build + Convex codegen)
- **Phase gate:** Full suite green + manual E2E: device flow works, gallery shows read-only, subscribe flow works

### Wave 0 Gaps
- [ ] `convex/__tests__/userProfiles.test.ts` — add test: `create` mutation sets `trialEnd` ~14 days from now
- [ ] `src/lib/auth/__tests__/subscription-gate.test.ts` — covers `checkSubscriptionGate()`: trial active → null, trial expired → 402, free plan → 402, plate subscribed → null
- [ ] `src/components/admin/__tests__/history-table.test.tsx` — verify `SocialCopySection` absent from rendered output
- [ ] `convex/__tests__/stripe.test.ts` — update: `handleSubscriptionChange` with single plate price → sets `plan: "plate"`, no `creditsRemaining`

---

## Security Domain

> `security_enforcement` not set in config — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `authenticate.ts` (API key + session) — unchanged |
| V3 Session Management | yes | Better Auth session cookies — unchanged |
| V4 Access Control | yes | New `checkSubscriptionGate()` for 402 trial gate |
| V5 Input Validation | yes | Existing validation in API routes — unchanged |
| V6 Cryptography | no | No new crypto introduced; existing `secret-box.ts` stays |

### Known Threat Patterns for Deletion Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Dangling authenticated routes (deleted UI but live API) | Elevation of Privilege | After deletion, verify no route is reachable that lacks auth; `npx tsc --noEmit` confirms no dead imports |
| 402 gate bypass (unauthenticated route) | Elevation of Privilege | Gate runs AFTER `authenticate()` — unauthenticated requests already get 401 before reaching the gate |
| Stripe price ID spoofing on checkout | Tampering | `createCheckoutSession` action hardcodes the single price ID from env; caller passes `planId` string that must match `"plate"` |
| Old plan data exposure after migration | Information Disclosure | Plan migration should run before schema literal cleanup; old literal strings removed only after migration confirmed |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Convex schema migration requires two deploys to safely remove a required field | RQ-7, Pitfall 1 | If single-deploy removal works, the intermediate step is unnecessary overhead (low risk — erring safe) |
| A2 | Plan field migration requires an explicit `internalAction` migration mutation | RQ-7 | If Convex auto-migrates, the task is unnecessary; but skipping it when needed would break schema push |
| A3 | Existing Stripe price IDs should be kept in env for webhook processing of existing subscriptions | Runtime State Inventory | If old subscriptions are fully cancelled before the deploy, env vars are purely dead; no risk to removing them |
| A4 | `src/app/api/v1/goals/route.ts` and `goals/[id]/route.ts` are safely deletable (goals UI is deleted) | RQ-1 | If any non-goals-UI surface calls the goals API, deletion breaks it — grep shows only goals page called it |

**If this table were empty:** All claims were verified or cited — A1/A2 are conservative safety assumptions from Convex general patterns.

---

## Open Questions (RESOLVED)

1. **plan field data migration scope**
   - What we know: Production has users on `"toast"`, `"plate"`, `"buffet"`, `"starter"`, `"pro"`, `"scale"` plans
   - What's unclear: Whether the migration should map all paid plans to `"plate"` or whether users on `"starter"` ($12) should land on `"free"` until they subscribe to the new $29 plan
   - Recommendation: Map all active paid plans → `"plate"` (they already paid). Map `"trial"` → `"trial"`. `"free"` → `"free"`. If this is a dev-mode-only product this phase, no production users exist, and the migration is trivial.

2. **`approve-draft` route survival**
   - What we know: `src/app/api/v1/drafts/[id]/approve/route.ts` is used only by `src/components/admin/approve-draft-modal.tsx` which is only used by `report-client.tsx` (being deleted) and `cook-page.tsx` (being deleted)
   - What's unclear: Whether the approve route is ever called from the Workspace/CLI path (it's not — confirmed)
   - Recommendation: Delete `approve/route.ts` + `rewrite-copy/route.ts` + `approve-draft-modal.tsx`

3. **`src/components/admin/upsell-modal.tsx` reuse**
   - What we know: `upsell-modal.tsx` uses `TIER_CONFIG` from `plan-tiers.ts` (being deleted) and `Tier` type
   - What's unclear: Whether the modal is reused for the subscribe-prompt on trial expiry (D-11 UI) or replaced
   - Recommendation: Refactor `upsell-modal.tsx` to remove tier references and adapt for the single-plan subscribe prompt (keep the component, gut the multi-tier content)

---

## Sources

### Primary (HIGH confidence)
- Live codebase grep — all file:line references verified against actual source
- `convex/schema.ts` — authoritative schema state
- `docs/adr/0001-0003` — strategic constraints
- `08-CONTEXT.md` — locked decisions
- `convex/_generated/ai/guidelines.md` — Convex patterns

### Secondary (MEDIUM confidence)
- `convex/stripe.ts` full read — billing structure inferred from actual code, not docs
- `packages/workspace/src/api.ts` + `pages/Home.tsx` — Workspace template picker surface confirmed from source

### Tertiary (LOW confidence / assumed)
- A1/A2 in Assumptions Log — Convex schema migration two-step pattern based on training knowledge + general safe-deployment principles

---

## Metadata

**Confidence breakdown:**
- Deletion exclusivity verdicts: HIGH — confirmed from live grep, not assumed
- Cook API survival: HIGH — ADR-0002 + actual Workspace api.ts confirms CLI does not call cook API
- Credits blast radius: HIGH — every touch point located via grep
- Launch-mode consumers: HIGH — all 5 confirmed with line numbers
- Billing reshape (trialEnd): HIGH — schema confirmed absent; userProfiles.create confirmed as the insertion point
- Convex schema migration safety: MEDIUM — safe two-step pattern assumed; no Convex docs explicitly state this for this version

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (schema and billing structure stable; Stripe API very stable)
