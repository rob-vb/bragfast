---
title: "feat: User-Defined Sous-Chef Goals"
type: feat
status: active
date: 2026-04-22
origin: docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md
---

# User-Defined Sous-Chef Goals

## Overview

Replace Sous-Chef's hardcoded milestone catalog (fixed MRR / visitor / star thresholds) with a user-editable `goals` table. Each connected user decides what counts as a celebration: which MRR targets, which visitor targets, which star counts per repo, whether to get a draft on every PR merge, and so on. Applies across all four integrations (Stripe, PostHog, GA4, GitHub). Adds a friendly `/admin/sous-chef` goals section built via the `frontend-design` skill so adding a goal feels like picking something off a menu, not filling in a DB form.

This is the v2 of the milestone-agent that shipped from `docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md`. Structure (cron + scan + `milestoneHits` idempotency + Haiku compose) stays. Only the *source* of what counts as a milestone changes.

## Problem Frame

v1 shipped with a single hardcoded catalog baked into constant arrays: `MRR_THRESHOLDS_USD = [100, 500, 1000, 5000, 10000]`, `VISITOR_THRESHOLDS`, `STAR_THRESHOLDS`, plus a boolean first-sale detector and a per-event PR-merge path. Users can't tell Sous-Chef "also celebrate my 50th paying customer" or "I don't care about 100 stars, wake me up at 1k." Adding a new threshold requires a code deploy.

ICP (Rob + early users) want control over what gets drafted. Goals flip the switch from "brag.fast's opinion of what matters" to "the user's list of what they're chasing."

## Requirements Trace

- **R1.** Users add / enable / disable / delete goals for any connected provider via `/admin/sous-chef`. No code changes required to add a goal.
- **R2.** Goal types cover: Stripe MRR threshold, Stripe total-revenue threshold, Stripe subscriber-count threshold, Stripe first-sale (boolean), PostHog visitor threshold, GA4 visitor threshold, GitHub star threshold (per repo). **Not a goal:** PR-merged-to-main drafting — it is the core Sous-Chef behavior, always-on per repo that opts in via the existing `notifyOnPrMerge` toggle. Out of scope for the goals table.
- **R3.** Goals are one-shot: each goal fires at most once per user. (Repeating goals deferred.)
- **R4.** First-connect seeding creates a sensible default set so new users get value immediately; they can edit after.
- **R5.** Idempotency remains unbroken across goal add / delete / rename: deleting a fired goal and re-adding it with the same target does **not** re-fire.
- **R6.** UI designed via the `frontend-design` skill, matching `DESIGN.md` (NES-retro, hard-offset shadows, no radius, Press Start 2P + Geist) and `BRAND_VOICE.md` (diner metaphor, no em dashes).
- **R7.** Existing users' previously-fired milestones (stored as `mrr:1000`, `visitors:10000`, etc. in `milestoneHits`) must not re-fire after migration.
- **R8.** Agent-native parity: anything a user can do in the UI, an MCP / API caller can do too (create / list / delete goals).
- **R9.** `/admin/sous-chef` layout: every provider block full-width (stack vertically), matching the current GitHub section. No 3-up integration tile grid. Order top-to-bottom: **GitHub, Stripe, PostHog, Google Analytics**.

**Success criteria (30-day window post-ship):**
- ≥ 60% of Sous-Chef users edit the default goal list at least once.
- Zero duplicate drafts from the migration (R7 — verify in logs + spot-check).
- Adding a goal takes < 15s for a user already on `/admin/sous-chef` (usability check).
- Sous-Chef cron scans continue to fire drafts matching user goal lists, with no regressions in existing v1 test suite.

## Scope Boundaries

- **Out of v1:** editing an existing goal's target value (represent as delete + add in UI), repeating / recurring goals, custom metrics not tied to an existing provider, cross-provider composite goals ("MRR + stars"), per-goal rate limits / debounces (keep global PR-merge cap + debounce from v1).
- **Not in goals at all:** PR-merge drafting. This is the Sous-Chef USP — merges to `main` trigger an AI scan of the PR contents and produce a draft. It stays as the existing `githubRepoConfigs.notifyOnPrMerge` per-repo opt-in. The GitHub block in `/admin/sous-chef` renders this toggle alongside stars goals, but it is not a row in the `goals` table.
- **Out of v1:** changing Haiku compose logic or template picker (they keep consuming `milestoneKey` strings — only the *source* changes).
- **Out of v1:** moving first-party brag.fast billing (`convex/http.ts`) under goals — unrelated.

### Deferred to Separate Tasks

- Target editing in place: track in a follow-up plan once usage data shows how often users want it.
- Repeating goals (e.g. "every +$1k MRR"): revisit after one month of real goal data.
- Cross-repo aggregate star goal: deferred; current scope is per-repo.
- MCP tools for goal management: add after REST lands; reuse the same validators.

## Context & Research

### Relevant Code and Patterns

- **v1 milestone math (getting replaced or adapted):**
  - `src/lib/integrations/stripe-milestones.ts` — `MRR_THRESHOLDS_USD`, `detectCrossedMrrThresholds`, `shouldFireFirstSale`.
  - `src/lib/integrations/thresholds.ts` — `VISITOR_THRESHOLDS`, `STAR_THRESHOLDS`, generic `detectCrossedThresholds`.
- **Detection orchestration (adapting, not rewriting):**
  - `convex/integrations/stripe.ts:98-148` — `scan` action loop; `fireDraft` helper at 198-229.
  - `convex/integrations/posthog.ts`, `convex/integrations/ga4.ts`, `convex/integrations/githubStars.ts` — mirror shape.
  - `src/app/api/github/webhooks/route.ts:45-158` — PR-merge webhook handler (daily cap + debounce).
- **Idempotency (unchanged):**
  - `convex/drafts.ts:81-132` — `insertDraftIfNew` internal mutation.
  - `src/lib/drafts/idempotency-key.ts` — key builders. Adding `goalMilestoneKey(goalExternalId)`.
  - `convex/milestoneHits.ts` — hit lookup.
- **Schema precedent for user-scoped CRUD resource:**
  - `convex/brands.ts` + `convex/templates.ts` + `convex/apiKeys.ts` — externalId, by_userId index, internalMutation writes called from REST.
- **Seeding precedent:**
  - `convex/integrations/stripe.ts:152-177` — `seedFromCurrentState` (sealed retroactive seed on first connect). Extend to also create default goals.
  - `convex/sousChef.ts` — `seed` dispatcher across providers.
- **Admin UI precedents:**
  - `src/components/admin/sous-chef-client.tsx` — current Sous-Chef page (where goals section lands).
  - `src/components/admin/github-repo-card.tsx` — expandable-per-item card + shadcn `Switch` toggle + Save (closest parallel for per-goal row).
  - `src/components/admin/key-manager.tsx` — inline add + danger delete (closest parallel for "+ New Goal" flow).
  - `src/components/admin/brand-form.tsx` + `/admin/brands/[id]/page.tsx` — REST-backed create/edit (skip edit route for v1).
- **Design primitives (reuse, do not re-roll):** `PixelCard`, `PixelButton`, `PixelTable`, `PixelEmptyState`, `PixelBadge`, shadcn `Switch` / `Input` / `Select` / `Label` / `AlertDialog`.
- **Client mutation convention:** admin forms call REST routes (`fetch` POST/DELETE) → REST calls `ConvexHttpClient` → internalMutation. No `useMutation`. Preserve.

### Institutional Learnings

- `docs/solutions/` has three UI best-practices docs but nothing yet on Sous-Chef. Post-ship, fold the "goals" pattern into a new solutions doc.
- Previous plan already documented rate-limit + debounce decisions for PR merges; goals inherit those global caps rather than becoming per-goal knobs.

### Security & Ownership

- The open P0 from `docs/reviews/2026-04-22-sous-chef-part-2-review.md` (public Convex mutations accept caller-supplied `userId` with no `ctx.auth.getUserIdentity()` check) affects any new goals mutations. All goals mutations must be `internalMutation` called from Next.js REST routes after `authenticate()` resolves the session user. No public-surface Convex writes. This is non-negotiable for the new surface — do not copy the vulnerable pattern.

## Key Technical Decisions

- **Single polymorphic `goals` table, not one table per metric.** One row = one goal. `metric` + `provider` + optional `target` + optional `scope` cover every shape. Simpler schema, simpler list queries, cheaper to add a goal type later.
- **Stable per-goal `externalId` (`goal_*`) as the idempotency seed.** `milestoneKey = "goal:<externalId>"`. Decouples hit state from target value, so deleting a goal + recreating (even with the same target) gets a fresh externalId and can re-fire. Prevents the "user tweaks their goal list" edge case from re-firing old hits.
- **Detection logic still emits an existing-shape `milestoneKey` (`mrr:<n>`, `visitors:<n>`, etc.) alongside `goal:<externalId>`.** The compose/template functions accept either. For the idempotency record (`milestoneHits`) and `drafts.idempotencyKey` we use `goal:<externalId>`. The human-readable `milestoneKey` stored on the draft row remains the typed form (`mrr:1000`) for UI display. Avoids breaking `pick-template.ts` rule matching on prefix.
- **Migration: one-time backfill that converts existing `milestoneHits` rows to the new key shape.** Run a one-time `internalMutation` that: for each existing hit, finds the matching goal (created as part of seeding defaults on migrate) and rewrites `idempotencyKey` + `milestoneKey` to `goal:<externalId>` format. Draft rows keep their old `idempotencyKey` (historical record). This prevents any already-fired threshold from re-firing post-migration.
- **Defaults seeded on first integration connect** (and on migration for existing users):
  - Stripe: MRR [100, 500, 1000, 5000, 10000] · first_sale · total_revenue [1000, 10000] · subscribers [10, 100, 1000].
  - PostHog: visitors [100, 1000, 10000, 100000, 1000000].
  - GA4: visitors [100, 1000, 10000, 100000, 1000000].
  - GitHub stars: [100, 1000, 10000] per repo selected for Sous-Chef.
- **PR-merge drafting is NOT a goal.** It keeps its existing per-repo `notifyOnPrMerge` toggle on `githubRepoConfigs`. Webhook path untouched by this plan.
- **No "edit target" flow in v1 UI.** Edit = delete + add. Reduces schema state machine (no target-changed event) and matches the simpler idempotency rule above.
- **REST-first, Convex-internal-mutation-second.** `/api/v1/goals` endpoints authenticate via `authenticate()` then call `internal.goals.*` via `ConvexHttpClient`. Mirrors existing `/api/v1/brands`, `/api/v1/templates`, `/api/v1/api-keys`.
- **UI lives inside existing `/admin/sous-chef`** as a new "Your Goals" section, not a separate route. Co-located with integration connect tiles since goals only make sense per provider. Sidebar entry unchanged.

## Open Questions

### Resolved During Planning

- "Should PR merges be a goal type?" → **No.** PR-merge-to-main drafting is the core Sous-Chef USP, always-on per repo via existing `notifyOnPrMerge` toggle. Not a goal, not in the `goals` table. GitHub block in the UI shows the toggle alongside stars goals for discoverability.
- "Seed defaults or start empty?" → Seed defaults (user answer). Gives new users instant value; they can edit.
- "One-shot or repeating?" → One-shot only v1 (user answer).

### Deferred to Implementation

- Exact `goalExternalId` alphabet / length — mirror `drf_*` / `tmpl_*` generation in existing modules.
- Final default-goal counts per provider (might trim to fewer defaults once we see goal-list density in the UI).
- Whether the goals section renders as one unified list or grouped by provider — decide during `frontend-design` mockup review.

## Output Structure

```
src/
  app/
    api/
      v1/
        goals/
          route.ts               # GET list, POST create
          [id]/
            route.ts             # DELETE, PATCH (toggle enabled only)
  components/
    admin/
      goals-section.tsx          # rendered inside sous-chef-client.tsx
      goal-row.tsx               # one row with toggle + delete
      add-goal-dialog.tsx        # picker for metric + target
  lib/
    goals/
      types.ts                   # GoalMetric union, Goal type, defaults catalog
      defaults.ts                # DEFAULT_GOALS_BY_PROVIDER
      __tests__/
        defaults.test.ts

convex/
  goals.ts                       # listByUser, create/remove/setEnabled (internalMutation), seedDefaultsForProvider
  migrations/
    backfillGoalsFromMilestoneHits.ts   # one-off internalMutation
```

Also modified (not created):

- `convex/schema.ts` — add `goals` table.
- `convex/integrations/stripe.ts`, `posthog.ts`, `ga4.ts`, `githubStars.ts` — read goals instead of constants.
- `src/app/api/github/webhooks/route.ts` — PR-merge path checks goal instead of `notifyOnPrMerge`.
- `src/components/admin/sous-chef-client.tsx` — mount `<GoalsSection>`.
- `src/lib/drafts/idempotency-key.ts` — add `goalMilestoneKey()`.
- `src/lib/integrations/stripe-milestones.ts`, `thresholds.ts` — remove catalog constants (keep pure math helpers).

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

**Goal row shape (schema sketch):**

```
Goal {
  userId
  externalId: "goal_*"
  provider: "stripe" | "posthog" | "ga4" | "github"
  metric:
    | "mrr"            (Stripe)
    | "total_revenue"  (Stripe)
    | "subscribers"    (Stripe)
    | "first_sale"     (Stripe, target ignored)
    | "visitors"       (PostHog or GA4)
    | "stars"          (GitHub, scope=owner/repo)
  target?: number      (required for threshold metrics, omitted for first_sale)
  scope?: string       (required for stars: owner/repo)
  label?: string       (user-visible name, defaults to auto-generated)
  enabled: boolean
  created_at, updated_at
}
// Note: PR-merge drafting is NOT a goal. It stays on githubRepoConfigs.notifyOnPrMerge.
```

**Scan flow (per provider, unchanged shape):**

```
cron → scanAll → per-user scan:
  1. loadSnapshot()                    (existing)
  2. goals = listEnabledGoalsForProvider(userId, provider)   ← NEW
  3. alreadyFiredGoalIds = listByUserSource(userId, provider)
                           .map(key => parseGoalId(key))     ← NEW
  4. for each goal not yet fired:
       if crossed(goal, snapshot):
         fireDraft({
           goalExternalId,
           milestoneKey: typedKey(goal),       // for UI display
           idempotencyKey: goal:${externalId}  // for dedup
         })
```

**UI sketch (rendered inside `/admin/sous-chef`, full-width stacked sections, order: GitHub, Stripe, PostHog, Google Analytics):**

```
┌─ GitHub ─────────────────────────────── [connect/status] ─┐
│  Installations + per-repo configs (existing GitHubSection)│
│    foo/bar  [x] Draft a post when a PR merges to main     │
│    baz/qux  [ ] Draft a post when a PR merges to main     │
│  Star goals                              [+ Add Goal]     │
│   [x] 100 stars on foo/bar                        [del]   │
│   [x] 1,000 stars on foo/bar                      [del]   │
└───────────────────────────────────────────────────────────┘

┌─ Stripe ─────────────────────────────── [connect/status] ─┐
│  Goals                                   [+ Add Goal]     │
│   [x] $1,000 MRR                                  [del]   │
│   [x] First paying customer                       [del]   │
│   [ ] 100 active subscribers                      [del]   │
└───────────────────────────────────────────────────────────┘

┌─ PostHog ────────────────────────────── [connect/status] ─┐
│  Goals                                   [+ Add Goal]     │
│   [x] 1,000 unique visitors                       [del]   │
└───────────────────────────────────────────────────────────┘

┌─ Google Analytics ───────────────────── [connect/status] ─┐
│  Goals                                   [+ Add Goal]     │
│   (empty — "No goals yet. Pick what's on your menu.")     │
└───────────────────────────────────────────────────────────┘
```

Each section is one full-width `PixelCard` containing: provider header with connect/disconnect status pill + (for GitHub) existing installation management, followed by the provider's goals list. No side-by-side integration tiles — replaces the current 3-up grid in `sous-chef-client.tsx`.

Add-goal dialog: metric dropdown → conditional target input (number) + scope input (repo selector for stars / pr_merged) + optional label. Provider is inferred from which section's "+ Add" was clicked.

## Implementation Units

- [ ] **Unit 1: Schema + types**

**Goal:** Land the `goals` table + shared types that all later units compile against.

**Requirements:** R1, R2, R3, R8

**Dependencies:** None

**Files:**
- Modify: `convex/schema.ts`
- Create: `src/lib/goals/types.ts`
- Create: `src/lib/goals/defaults.ts`
- Create: `src/lib/goals/__tests__/defaults.test.ts`

**Approach:**
- Add `goals` table per High-Level Technical Design sketch. Indexes: `by_userId`, `by_userId_provider_enabled`, `by_externalId`.
- `types.ts`: `GoalMetric` union, `Goal` type, `isThresholdMetric()` / `isScopedMetric()` predicates, `typedMilestoneKey(goal)` that returns `mrr:1000` / `visitors:1000` / `star:100:owner/repo` / `pr_merged:owner/repo` / `first_sale` to preserve template-picker rule compatibility.
- `defaults.ts`: `DEFAULT_GOALS_BY_PROVIDER` per Key Technical Decisions list. Pure data — no side effects.

**Patterns to follow:**
- `convex/schema.ts` drafts + milestoneHits tables (externalId, idempotency key, userId indexing).

**Test scenarios:**
- Happy path: `DEFAULT_GOALS_BY_PROVIDER.stripe` contains MRR [100, 500, 1000, 5000, 10000] + first_sale + total_revenue [1000, 10000] + subscribers [10, 100, 1000].
- Happy path: `typedMilestoneKey({metric: "stars", target: 100, scope: "foo/bar"})` returns `star:100:foo/bar`.
- Edge case: `typedMilestoneKey({metric: "first_sale"})` returns `first_sale` (no target).
- Edge case: `typedMilestoneKey({metric: "pr_merged", scope: "foo/bar"})` returns `pr_merged:foo/bar`.
- Edge case: `isThresholdMetric("first_sale")` returns false; `isThresholdMetric("mrr")` returns true.

**Verification:**
- `npm run build` passes (Convex schema codegen + TS check).
- `npx vitest run src/lib/goals` passes.

---

- [ ] **Unit 2: Convex goals module (CRUD + seed + idempotency helpers)**

**Goal:** Provide `internal.goals.*` surface for REST, scans, and migration to call.

**Requirements:** R1, R4, R5, R8

**Dependencies:** Unit 1

**Files:**
- Create: `convex/goals.ts`
- Modify: `src/lib/drafts/idempotency-key.ts` (add `goalMilestoneKey()`)

**Approach:**
- `listByUser(userId)` — query returning all goals.
- `listEnabledByUserProvider(userId, provider)` — internalQuery used by scans.
- `create(userId, goalInput)` — internalMutation; generates `goal_*` externalId; returns created goal. Validates metric+target+scope compatibility.
- `remove(userId, externalId)` — internalMutation; asserts ownership.
- `setEnabled(userId, externalId, enabled)` — internalMutation.
- `seedDefaultsForProvider(userId, provider, repoFullNames?)` — internalMutation; idempotent (skips if any goal already exists for that provider + user). For stars / pr_merged, creates one goal per repo in `repoFullNames`.
- `goalMilestoneKey(externalId)` returns `goal:${externalId}`.
- All mutations are `internalMutation`. REST callers authenticate first.

**Patterns to follow:**
- `convex/brands.ts`, `convex/apiKeys.ts` (externalId generation, ownership assertion pattern).
- `convex/integrations/stripe.ts:152-177` `seedFromCurrentState` (idempotent seed shape).

**Test scenarios:**
- Happy path: `create` then `listByUser` returns the new goal with a `goal_*` externalId.
- Happy path: `seedDefaultsForProvider(user, "stripe")` creates exactly the default list.
- Edge case: second `seedDefaultsForProvider(user, "stripe")` is a no-op (idempotent).
- Error path: `create` with `metric="mrr"` and no target throws.
- Error path: `create` with `metric="stars"` and no scope throws.
- Error path: `remove` with a different user's externalId throws (ownership enforced).
- Integration: `goalMilestoneKey("goal_abc")` matches what scans will write.

**Verification:**
- `npx vitest run convex/goals` passes (use existing Convex test setup if present; otherwise cover via next unit's integration tests).
- Manual: call via Convex dashboard or dev REPL once to sanity-check write+read.

---

- [ ] **Unit 3: REST API — `/api/v1/goals`**

**Goal:** Dual-auth REST surface matching existing admin resource conventions.

**Requirements:** R1, R8

**Dependencies:** Unit 2

**Files:**
- Create: `src/app/api/v1/goals/route.ts` (GET list, POST create)
- Create: `src/app/api/v1/goals/[id]/route.ts` (DELETE, PATCH toggle enabled)
- Create: `src/app/api/v1/goals/__tests__/goals-route.test.ts`

**Approach:**
- Every handler: `authenticate()` → `ConvexHttpClient` → `internal.goals.*`. No public Convex writes.
- Zod validation on POST body + PATCH body. Server-side check: metric+target+scope compatibility (duplicate of Convex validation for defence in depth + better error messages).
- DELETE returns 204; POST returns created goal; GET returns `{ goals: Goal[] }`.
- 403 when the caller's user id does not match the goal's `userId`.

**Patterns to follow:**
- `src/app/api/v1/brands/route.ts`, `src/app/api/v1/api-keys/route.ts`, `src/app/api/v1/sous-chef/integrations/route.ts`.

**Test scenarios:**
- Happy path: POST with valid Stripe MRR goal → 201 + created goal body.
- Happy path: DELETE existing goal → 204; subsequent GET omits it.
- Edge case: PATCH with `enabled=false` toggles it off; scan would skip it.
- Error path: POST without auth → 401.
- Error path: POST with `metric="stars"` missing `scope` → 400.
- Error path: DELETE on another user's goal → 403.
- Integration: POST then GET returns the same goal — confirms route → Convex round trip.

**Verification:**
- `npx vitest run src/app/api/v1/goals` passes.
- `npm run lint` passes.

---

- [ ] **Unit 4: Detection rewire — Stripe**

**Goal:** Stripe scan reads goals instead of `MRR_THRESHOLDS_USD` + `shouldFireFirstSale` constants.

**Requirements:** R2, R3, R5

**Dependencies:** Unit 2

**Files:**
- Modify: `convex/integrations/stripe.ts`
- Modify: `src/lib/integrations/stripe-milestones.ts` (remove catalog constants; keep `computeMrrUsd`, `lineItemMonthlyUsd`, generic `detectCrossedThresholds` usage)
- Modify: `convex/integrations/__tests__/*` (update expectations)

**Approach:**
- `scan`: after building snapshot (MRR USD, total revenue USD, active subscriber count, hasSuccessfulCharge), fetch enabled Stripe goals via `internal.goals.listEnabledByUserProvider`.
- Also fetch already-fired `milestoneHits` for `sourceSystem="stripe"` and parse out goal externalIds (hits whose key starts with `goal:`).
- For each unfired enabled goal, evaluate:
  - `mrr` → `currentMrrUsd >= target`
  - `total_revenue` → `totalRevenueUsd >= target`
  - `subscribers` → `activeSubscriberCount >= target`
  - `first_sale` → `hasSuccessfulCharge`
- For each crossed goal, call `fireDraft` with `idempotencyKey = goal:${externalId}`, `milestoneKey = typedMilestoneKey(goal)`.
- `seedFromCurrentState`: seed goals first (via `internal.goals.seedDefaultsForProvider`), then record hits for goals whose target is *already* crossed at connect time (retroactive-skip, existing behavior).
- Extend `readStripeSnapshot` to also compute `totalRevenueUsd` (sum of successful charges) and `activeSubscriberCount` (count of subs with status in ACTIVE_STATUSES).

**Execution note:** Characterization-first — before modifying `scan`, write a test that captures current v1 behavior (fires `mrr:1000` when MRR crosses $1k with default thresholds seeded as goals). Then refactor. Legacy area; easy to break dedup.

**Patterns to follow:**
- Existing `convex/integrations/stripe.ts:98-148` scan shape.
- `src/lib/integrations/thresholds.ts` `detectCrossedThresholds` for per-goal comparison.

**Test scenarios:**
- Happy path: user with MRR $1,500 and an enabled MRR $1,000 goal fires one draft with `milestoneKey=mrr:1000`.
- Happy path: first successful charge with first_sale goal enabled fires `milestoneKey=first_sale`.
- Happy path: 150 active subs with a 100-sub goal fires `milestoneKey=subscribers:100`.
- Edge case: disabled goal never fires even when crossed.
- Edge case: already-fired goal (`goal:goal_xyz` in milestoneHits) does not re-fire.
- Edge case: user with no goals for Stripe produces zero drafts (not an error).
- Integration: delete a fired goal, re-create with the same target, new scan fires again (new externalId → fresh idempotencyKey).

**Verification:**
- `npx vitest run convex/integrations/stripe` passes.
- Manual dev-mode: connect a Stripe test account, seed defaults, trigger `scanNow`, verify draft appears.

---

- [ ] **Unit 5: Detection rewire — PostHog + GA4 + GitHub stars**

**Goal:** Same refactor as Unit 4 for the other three pollers.

**Requirements:** R2, R3, R5

**Dependencies:** Unit 2

**Files:**
- Modify: `convex/integrations/posthog.ts`
- Modify: `convex/integrations/ga4.ts`
- Modify: `convex/integrations/githubStars.ts`
- Modify: `src/lib/integrations/thresholds.ts` (remove `VISITOR_THRESHOLDS`, `STAR_THRESHOLDS` constants; keep generic `detectCrossedThresholds`)
- Modify: matching `__tests__/` files

**Approach:**
- For PostHog + GA4 visitors: iterate enabled `visitors` goals, compare against snapshot's visitor count.
- For GitHub stars: goals are scoped per repo; iterate enabled `stars` goals, each goal's scope selects which repo's star count to compare against.
- Seed defaults per provider (PostHog/GA4: visitor defaults; GitHub stars: seed per repo selected for Sous-Chef).

**Patterns to follow:**
- Unit 4's pattern verbatim.

**Test scenarios:**
- Happy path (PostHog): 1,500 visitors with a 1,000 goal fires `milestoneKey=visitors:1000`.
- Happy path (GA4): same but `milestoneKey=ga:visitors:1000`.
- Happy path (stars): repo `foo/bar` at 105 stars with a `{metric: stars, target: 100, scope: "foo/bar"}` goal fires `milestoneKey=star:100:foo/bar`.
- Edge case: stars goal with a scope not in the user's configured repos is skipped (no scan target).
- Edge case: disabled goals never fire.

**Verification:**
- `npx vitest run convex/integrations` passes end-to-end.

---

- [ ] **Unit 6: (removed — PR-merge stays as existing `notifyOnPrMerge` per-repo toggle, not a goal)**

---

- [ ] **Unit 7: Seed defaults on connect + on install**

**Goal:** Wire `seedDefaultsForProvider` into existing connect flows so users get starter goals automatically.

**Requirements:** R4

**Dependencies:** Units 2, 4, 5

**Files:**
- Modify: `src/app/api/v1/sous-chef/integrations/route.ts` (POST handler — after `seedFromCurrentState`, call `seedDefaultsForProvider`).
- Modify: `convex/sousChef.ts` (extend existing `seed` dispatcher).
- Modify: `src/app/api/github/callback/route.ts` (after installation, seed `pr_merged` + `stars` goals for each selected repo).

**Approach:**
- Seed goals **before** `seedFromCurrentState` so the retroactive-skip logic in the per-provider seed has goals to mark as already-hit.
- If the user already has goals for a provider, `seedDefaultsForProvider` is a no-op (Unit 2 guarantee) — safe to call on every connect/install.
- GitHub install: seed star goals per selected repo. PR-merge drafting is handled by existing `notifyOnPrMerge` flow — not touched here.

**Patterns to follow:**
- Existing POST handler at `src/app/api/v1/sous-chef/integrations/route.ts` seed-then-rollback pattern.

**Test scenarios:**
- Happy path: connecting Stripe for the first time creates default Stripe goals.
- Edge case: reconnecting (disconnect → connect) keeps existing user-created goals untouched and does not duplicate defaults.
- Integration: newly seeded goal for a threshold already crossed is marked as hit (no retroactive draft).

**Verification:**
- `npx vitest run src/app/api/v1/sous-chef/integrations` passes.
- Manual: connect a test Stripe account, verify goals appear in `/admin/sous-chef`.

---

- [ ] **Unit 8: Goals admin UI + `/admin/sous-chef` layout refactor**

**Goal:** User-friendly goals section inside `/admin/sous-chef`. Built via the `frontend-design` skill. Also restructure the page so every provider block is full-width and ordered GitHub → Stripe → PostHog → Google Analytics.

**Requirements:** R1, R2, R6, R9

**Dependencies:** Unit 3

**Files:**
- Create: `src/components/admin/goals-section.tsx` (reusable per-provider goals list)
- Create: `src/components/admin/goal-row.tsx`
- Create: `src/components/admin/add-goal-dialog.tsx`
- Create: `src/components/admin/provider-block.tsx` (full-width card shell: header + connect/disconnect + body slot)
- Modify: `src/components/admin/sous-chef-client.tsx` (rewrite layout: drop 3-up `IntegrationTile` grid, render 4 stacked `<ProviderBlock>` full-width in fixed order)
- Modify: `src/components/admin/github-section.tsx` (move into a `<ProviderBlock provider="github">` body; keep existing installations + repo configs UI intact)

**Approach:**
- Invoke the `frontend-design` skill during implementation. Constrain it with `DESIGN.md` + `BRAND_VOICE.md` + the ASCII layout in High-Level Technical Design above. Goal: every provider block reads like the current GitHub section (full-width `PixelCard`, connect/disconnect status in the header, content below).
- Replace the existing `IntegrationTile` 3-up grid with a vertical stack of four `<ProviderBlock>` components. Fixed render order: GitHub, Stripe, PostHog, Google Analytics. No `PROVIDER_COMING_SOON` gate — all four providers get a block; if not yet connected, the block shows a connect CTA.
- `<ProviderBlock>` header: provider name + status pill (Connected / Not connected / Error) + connect/disconnect button. Body is a slot: GitHub renders existing `<GitHubSection>` contents (installations + per-repo `notifyOnPrMerge` toggle — which is the PR-merge drafting USP) + a star goals list; Stripe / PostHog / GA4 render only goals.
- `<GoalsSection provider={...}>`: shared across all four providers. Renders a header row ("Goals" label + "+ Add Goal" button), goal rows, and an empty state ("No goals yet. Pick what's on your menu."). For GitHub, only `stars` metric is offered.
- `<GoalRow>`: enabled `Switch` + auto-generated label (e.g. "$1,000 MRR" / "First paying customer" / "1,000 unique visitors" / "100 stars on foo/bar"), optional user label override, delete button with `AlertDialog` confirm.
- `<AddGoalDialog>` (reuse custom overlay pattern from existing `ConnectDialog`, not shadcn `Dialog`): metric `Select` (options filtered by provider — GitHub only shows "Stars threshold") → conditional fields (target `Input` for threshold metrics, repo `Select` for stars using existing GitHub installations), label `Input`, Save.
- All interactions call `/api/v1/goals` via `fetch`; reload list on success. Use `sonner` toasts for feedback.
- No `react-hook-form`. Use `useState` per existing admin-form convention.

**Patterns to follow:**
- `src/components/admin/github-repo-card.tsx` (per-item card with Switch + Save).
- `src/components/admin/key-manager.tsx` (inline add + danger delete).
- `src/components/admin/sous-chef-client.tsx` `ConnectDialog` (custom modal overlay pattern).

**Test scenarios:**
- Happy path: page renders four provider blocks full-width in order GitHub → Stripe → PostHog → Google Analytics.
- Happy path: click "+ Add" in Stripe section, select "MRR threshold", enter 2500, save → row appears with "$2,500 MRR".
- Happy path: toggle a goal off → switch flips; scan would skip this goal (covered in Unit 4 tests).
- Happy path: delete confirmation → `AlertDialog` → goal removed from list.
- Happy path: GitHub block still shows installations + per-repo `notifyOnPrMerge` toggle above its star goals list.
- Happy path: Add Goal dialog in GitHub section only offers the "Stars threshold" metric (no MRR, visitors, etc.).
- Edge case: empty provider section shows diner-themed empty state copy, not a blank area.
- Edge case: not-connected provider shows connect CTA in the header, empty goals body.
- Edge case: invalid target (negative, zero, non-numeric) shows inline error without calling API.
- Edge case: API error (e.g. 403) shows toast; list does not update.
- Integration: create goal in UI, verify it appears in next `/admin/drafts` scan output (covered indirectly by Unit 4 tests).

**Verification:**
- `npm run dev`, navigate to `/admin/sous-chef`, exercise add / toggle / delete for each provider section.
- Visually verify NES-retro design fidelity against `DESIGN.md`.
- Run `frontend-design` skill's review loop on the final section before merging.

---

- [ ] **Unit 9: Migration — backfill `milestoneHits` to goal-keyed idempotency**

**Goal:** Existing users' previously-fired milestones don't re-fire after the rewire.

**Requirements:** R5, R7

**Dependencies:** Units 1, 2, 4, 5, 7

**Files:**
- Create: `convex/migrations/backfillGoalsFromMilestoneHits.ts`
- Create: `convex/migrations/__tests__/backfillGoalsFromMilestoneHits.test.ts`

**Approach:**
- One-off `internalMutation` runnable from Convex dashboard. For each user with any `milestoneHits` row:
  1. Seed default goals per provider (idempotent).
  2. For each existing hit, find the matching goal (parse typed milestoneKey → match on metric + target + optional scope). If a match exists, rewrite `idempotencyKey` + `milestoneKey` to `goal:${goal.externalId}` format. If no match (user had a hit for a non-default threshold — shouldn't happen in v1 but defensive), create the goal first then rewrite.
  3. Skip rewrite for hits whose original key doesn't parse cleanly (log + surface at end).
- Idempotent: running twice is safe (second run sees already-rewritten keys and skips).
- Run from Convex dashboard post-deploy; document in `.env.example` or a migration runbook note.

**Patterns to follow:**
- `convex/integrations/stripe.ts:152-177` idempotent-seed pattern.

**Test scenarios:**
- Happy path: existing user with an `mrr:1000` hit gets seeded defaults + hit rewritten to `goal:goal_xxx`; next scan does not re-fire.
- Happy path: `visitors:10000` (PostHog) → rewritten; `ga:visitors:10000` (GA4) → rewritten (distinct goals per provider).
- Happy path: `star:100:foo/bar` → rewritten, goal correctly scoped to `foo/bar`.
- (PR-merged hits are left untouched — not a goal, remains keyed by `pr_merged:<repo>#<pr>`.)
- Edge case: running migration twice produces no changes the second time.
- Edge case: user with no prior hits gets defaults seeded, no hits rewritten.
- Error path: unparseable milestoneKey → logged, row left untouched, migration continues.

**Verification:**
- `npx vitest run convex/migrations` passes.
- Dry-run in dev Convex against a seeded dataset; inspect `milestoneHits` rows before and after.
- Prod runbook: take a Convex snapshot (or dump `milestoneHits` via dashboard export) before running.

---

- [ ] **Unit 10: Remove dead constants + update docs**

**Goal:** Delete hardcoded catalogs + dead `notifyOnPrMerge` plumbing once goals own the source of truth.

**Requirements:** R1

**Dependencies:** Units 4, 5, 7, 9 (must land first so there's nothing still reading the constants)

**Files:**
- Modify: `src/lib/integrations/stripe-milestones.ts` (delete `MRR_THRESHOLDS_USD`, `detectCrossedMrrThresholds` convenience — keep `computeMrrUsd` / `lineItemMonthlyUsd` / `shouldFireFirstSale`? actually delete `shouldFireFirstSale` too; its logic is now inline in Unit 4).
- Modify: `src/lib/integrations/thresholds.ts` (delete `VISITOR_THRESHOLDS`, `STAR_THRESHOLDS`; keep generic `detectCrossedThresholds`).
- Modify: `docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md` (add a "Partially superseded by" note at the top pointing to this plan — R4 catalog reversal only; PR-merge behavior unchanged).

(Note: `notifyOnPrMerge` on `githubRepoConfigs` and `github-repo-card.tsx` stay as-is — PR-merge drafting is not part of goals.)

**Approach:**
- Delete-only pass on threshold constants. No behavior change. If any consumer still imports a removed constant, compile fails; fix the call site (should already be rewired in earlier units).
- Do **not** touch PR-merge code or `notifyOnPrMerge` — that path is unrelated to goals.

**Test scenarios:**
- Test expectation: regression — full suite still passes after deletions.

**Verification:**
- `npm run build` + `npx vitest run` + `npm run lint` all pass.
- Grep: `grep -r "MRR_THRESHOLDS_USD\|VISITOR_THRESHOLDS\|STAR_THRESHOLDS\|notifyOnPrMerge" src/ convex/` returns zero matches (or only matches in schema for the to-be-removed column, flagged as a follow-up).

---

## System-Wide Impact

- **Interaction graph:** Four Convex scan actions (Stripe, PostHog, GA4, GitHub stars) depend on `internal.goals.listEnabledByUserProvider`. PR-merge webhook route is untouched. Goals table becomes a hot read during every scan. Query is indexed (`by_userId_provider_enabled`) and result sets are small (< 50 rows per user per provider in v1).
- **Error propagation:** A transient Convex read failure in the goals lookup inside a scan must not wipe already-done work for the scan. Wrap the goals fetch in the same `try` block as the rest of the scan, so `recordScanResult` captures the error.
- **State lifecycle risks:** Goals can be deleted mid-scan. Guard: scans fetch goals once at the start of the per-user pass and iterate that snapshot. A deletion during the run is visible next scan.
- **API surface parity:** REST + (future) MCP must expose identical create/list/delete semantics. Validator helpers live in `src/lib/goals/types.ts` so both surfaces use the same rules.
- **Integration coverage:** End-to-end test for at least one full flow: seed defaults → scan → draft created → delete goal → re-create with same target → scan → new draft (verifies stable-externalId idempotency decision).
- **Unchanged invariants:** `drafts` / `milestoneHits` / `integrationSecrets` schemas unchanged (no new columns). Haiku compose, template picker, and Remotion pipeline are completely untouched. `/api/v1/cook/*`, `/api/v1/drafts`, and first-party Stripe billing webhook (`convex/http.ts`) are untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Migration (Unit 9) silently fails to rewrite some hits → duplicate drafts after ship | Idempotent migration + dry-run in dev + one-by-one hit accounting with counters returned from the mutation; manual spot-check against a real production-like dataset before running. |
| User deletes a goal during a scan → partial fire state | Scans read goals once per run; deletes are visible next scan. Worst case: one goal fires then gets deleted — `milestoneHits` row stays (historical record), draft stays (user can delete). |
| Default seed floods new users with 15+ goals per provider | Keep defaults minimal (see Key Technical Decisions list). Revisit after first-user feedback. |
| Review's P0 ownership-bypass pattern gets copied to `internal.goals.*` | Explicit rule in Unit 2: all writes are `internalMutation`, REST callers authenticate first. Add a reviewer checklist note. |
| User expects PR-merge to live under Goals UI and can't find the toggle | GitHub block's UI explicitly surfaces the per-repo `notifyOnPrMerge` toggle with clear copy ("Draft a post when a PR merges to main"), above the star goals list. Copy reinforces that PR-merge drafting is always-on per repo, not a target. |
| `frontend-design` skill suggests a layout that doesn't match existing Sous-Chef page | Constrain the skill with `DESIGN.md` + `BRAND_VOICE.md` + existing `sous-chef-client.tsx` structure as input context. Review before merging. |

## Documentation / Operational Notes

- Post-ship: write a new entry in `docs/solutions/best-practices/` capturing the "user-editable threshold catalog" pattern (schema shape, idempotency-via-externalId trick, default seeding).
- Migration runbook: dry-run in dev Convex → inspect → run in prod via dashboard → verify hit counts match pre-run snapshot.
- Mark `docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md` as superseded for the catalog decisions. R4 of that plan ("Hardcoded milestone catalog, no per-user threshold config in v1") is explicitly reversed.
- After one release with both `notifyOnPrMerge` and `pr_merged` goals in sync, follow up to drop the column.

## Sources & References

- **Origin document:** [docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md](../../docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md) — v1 milestone agent plan. R4 is reversed by this plan.
- **Review reference:** `docs/reviews/2026-04-22-sous-chef-part-2-review.md` — flags the public-mutation-auth P0 that this plan must avoid repeating.
- Related code: `convex/goals.ts` (new), `convex/integrations/*.ts`, `src/lib/drafts/idempotency-key.ts`, `src/components/admin/sous-chef-client.tsx`.
- Skill: `frontend-design` — invoked during Unit 8 for the goals section UI.
