---
title: Plan accounting refactor — posts/month + format/platform/video gating
type: refactor
status: active
date: 2026-04-30
origin: PRD.md §4 (pricing rewrite), docs/sessions.md S2.7
---

# Plan accounting refactor — posts/month + format/platform/video gating

## Summary

Replace the credit-only accounting model with a per-tier posts/month (subscription) + posts-lifetime (free) counter. Enforce format, platform, and video caps at the approval seam, not at cook time. Stripe webhook is extended to recognize a new family of price IDs (Toast/Full Plate/Buffet) alongside the legacy `starter`/`pro`/`scale` IDs, so existing paying users are remapped without invoicing changes. Cook routes (`/api/v1/cook/*`) keep their credit balance check unchanged — credits remain the unit of account for the legacy public API. Approval (Convex `draftPushes.approveDraft`) becomes the single place where post counters decrement and per-tier caps fire.

---

## Problem Frame

PRD §4 redefines the product around posts, not credits. Existing schema models monthly credit pools sized for cook-time render cost; nothing in the codebase enforces format/platform/video caps; the approval mutation has no plan awareness. Shipping the new pricing copy without rebuilding the accounting underneath would let any user approve unlimited posts on any format — the pricing page would lie. The refactor must land in one branch (`repos/launch`) gated by `isLaunchModeRepositioned()` so the legacy `/api/v1` surface continues to bill in credits while the repositioned admin UI bills in posts.

---

## Requirements

- R1. New `userProfiles` fields `postsRemainingThisMonth` (paid tiers) and `postsLifetime` (free tier) live alongside existing `creditsRemaining` — no field removed in this plan.
- R2. `userProfiles.plan` union expands to include `free`, `toast`, `plate`, `buffet` while preserving the legacy values (`trial`, `starter`, `pro`, `scale`). Both families coexist; no row is force-migrated as part of this PR.
- R3. Stripe webhook recognizes new price IDs (env: `STRIPE_TOAST_PRICE_ID`, `STRIPE_PLATE_PRICE_ID`, `STRIPE_BUFFET_PRICE_ID`) and writes `postsRemainingThisMonth` per tier on `invoice.paid` (monthly reset, no rollover).
- R4. Existing legacy price IDs (`STRIPE_STARTER_PRICE_ID` etc.) continue to write `creditsRemaining` per the existing `PLAN_CREDITS` map. No semantic change for legacy paying users in this PR.
- R5. `draftPushes.approveDraft` enforces, in this order: (a) plan-tier format/platform/video caps; (b) post-counter availability; (c) decrement on successful approval. Caps and counter are read from a single tier-config module.
- R6. Free tier (`free`): `postsLifetime` starts at 30, decrements on approval, never resets. No card required (no Stripe subscription on free).
- R7. Video on Buffet counts as one post (no separate counter); video on Toast/Plate is rejected at approval with an upgrade prompt.
- R8. Cook routes (`/api/v1/cook/image`, `/api/v1/cook/video`) are unchanged — they continue to call `reserveCreditsOrError` against `creditsRemaining`. The repositioned admin UI does not consume credits.
- R9. Existing trial users (legacy `plan: "trial"`) and existing paying users (legacy `starter`/`pro`/`scale`) are not silently re-mapped on this PR. Re-mapping is a separate backfill unit (U6) that runs once the launch flag flips.
- R10. Test coverage: tier-config table, webhook routing for new price IDs, approval-seam gating (each cap + counter), and backfill mapping. Existing credit/cook tests keep passing.

**Origin actors:** A1 free-tier user (no card), A2 Toast subscriber, A3 Full Plate subscriber, A4 Buffet subscriber, A5 legacy paying user mid-cycle.
**Origin flows:** F1 monthly invoice paid → counter resets, F2 user approves draft → cap check + counter decrement, F3 free user exhausts lifetime → upgrade prompt.

---

## Scope Boundaries

- Cook-route credit accounting is **not** rewritten. Credits remain the unit of account for `/api/v1` — the public API's billing semantics are out of scope.
- The pricing page rewrite (S4.1) is **not** part of this plan. This plan delivers the accounting; S4.1 delivers the marketing copy that depends on it.
- Source caps (1 / 3 / unlimited per tier) are **not** enforced in this plan. Sources connect via `/admin/sous-chef`; cap enforcement lives in S4.2 (source-cap upsell prompts).
- Active-goals cap (1 / 5 / unlimited) is **not** enforced here. Lives in S5.4.
- Voice calibration, history retention windows, and recap generation are out of scope.

### Deferred to Follow-Up Work

- **S4.1 — Pricing page rewrite**: depends on this plan's tier-config module being canonical.
- **S4.2 — Source-cap upsell prompts**: reuses this plan's tier-config + cap-violation surface.
- **S4.3 — Migration plan for existing users**: this plan ships the *mechanism* (U6 backfill mutation behind a manual trigger). The actual *when-to-run* decision belongs in S4.3.
- **S5.4 — Active-goals cap**: same tier-config module.

---

## Context & Research

### Relevant Code and Patterns

- `convex/schema.ts` — `userProfiles` table; expand here. Existing pattern: all rollout fields are optional with `v.optional(...)`.
- `convex/userProfiles.ts` — `reserve` mutation pattern at lines 52–65 is the precedent for atomic decrement-or-throw. Mirror this for posts.
- `convex/stripe.ts` — `priceToPlan()`, `PLAN_CREDITS`, `handleInvoicePaid`, `handleSubscriptionChange`. New tier handling slots in alongside without removing.
- `convex/draftPushes.ts` — `approveDraft` mutation (line 102) is the gating seam. Existing rejection patterns (no integration enabled, empty selections, dedupe) show the failure shape to mirror.
- `src/components/admin/approve-draft-modal.tsx` — approval UI; needs to surface cap-violation reasons returned by the mutation.
- `src/lib/launch-mode.ts` — `isLaunchModeRepositioned()` is the rollout gate; new behavior reads through it.

### Institutional Learnings

- `docs/solutions/` — pattern of always-optional new schema fields for rollout safety (used in goals migration S5.3 last week).
- Goals schema migration (S5.3, shipped 2026-04-30) is the pattern for this — same shape: optional fields, both old and new code paths coexist behind launch flag.

### External References

- None required — Stripe webhook handling is already in production; the change is configuration + branching, not new integration.

---

## Key Technical Decisions

- **Stripe price-ID strategy: new prices for new tiers, legacy prices unchanged.** Re-mapping metadata on existing prices would force every legacy paying user onto the new accounting model the moment the webhook fires, which we do not want before backfill is rehearsed. Separate price IDs let legacy customers keep paying the same amount with the same semantics until U6 explicitly migrates them. Cost: two parallel branches in the webhook for the rollout window. Benefit: zero-risk rollback (revert env vars and the new price-ID branch falls dormant).

- **Video on Buffet = 1 post, not a separate counter.** PRD wording is "1 per post" — there is no second budget. A separate `videosRemainingThisMonth` would split the cap unnecessarily; users who burn video posts simply use their post budget faster.

- **Approval is the sole gating seam.** Cap and counter checks live in `draftPushes.approveDraft`. Cook routes do not check post counters; the kitchen page is internal-only and does not surface to the repositioned UI as a posting action.

- **Tier-config module is the single source of truth.** A new `convex/plan-tiers.ts` (and a mirrored `src/lib/plan-tiers.ts` for client display) holds: `{ tier: "free" | "toast" | "plate" | "buffet", postsCap, postsField, formats, platforms, video, sources, goals }`. Webhook, approval mutation, UI surfaces, and future S4.x sessions all read from this module — no scattered constants.

- **Backfill is a one-shot internalMutation, not automatic.** U6 ships the mapping but does not trigger it. The deploy that flips `NEXT_PUBLIC_LAUNCH_MODE=repositioned` runs the backfill manually via Convex dashboard. This keeps the schema change reversible up to the launch moment.

- **Existing trial users keep `plan: "trial"` until backfill.** The new `free` literal is for newly created accounts post-launch. On launch, U6 maps every legacy `trial` row to `free` with `postsLifetime = max(0, 30 - posts_already_made_estimate)`. Estimate is `0` for the rollout — we accept that legacy trial users get the full 30-post free allowance even if they consumed credits historically. Engineering wash, marketing-clean.

---

## Open Questions

### Resolved During Planning

- **Stripe price-ID strategy** (Session 0 Q1): new prices, dual-tree webhook. See Key Technical Decisions.
- **Video accounting** (Session 0 Q2): 1 video = 1 post on Buffet, no separate counter. See Key Technical Decisions.
- **Migration window** (Session 0 Q3): U6 ships behind a manual trigger; the launch deploy runs it. No automatic re-map.

### Deferred to Implementation

- Exact cap-violation error shape returned by `approveDraft` — likely `{ ok: false, reason: "format_blocked" | "video_blocked" | "platform_blocked" | "posts_exhausted", upgradeTier?: "plate" | "buffet" }`, but final shape settled when wiring U5.
- Whether to expose the post counter in the sidebar as a permanent surface or only in the approval modal — UI decision belongs in U5.

---

## High-Level Technical Design

> *Directional. The tier-config module is the load-bearing piece; everything else is wiring.*

```
                    ┌─────────────────────────────┐
                    │  convex/plan-tiers.ts       │
                    │  TIER_CONFIG = {            │
                    │    free:   { posts: 30,     │
                    │              field:         │
                    │              "postsLifetime"│
                    │              formats: [sq], │
                    │              video: false,  │
                    │              platforms: 1 } │
                    │    toast:  { posts: 30,     │
                    │              field:         │
                    │              "postsRemain..│
                    │              ...                       │
                    └──────┬─────────┬────────┬───┘
                           │         │        │
            reads          │         │        │  reads
                           ▼         ▼        ▼
              ┌─────────────────┐  ┌──────────────────┐
              │ stripe webhook  │  │ approveDraft     │
              │ priceID → tier  │  │ - cap check      │
              │ resets counter  │  │ - decrement      │
              │ on invoice.paid │  │ - emit upgrade   │
              └─────────────────┘  │   reason         │
                                   └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ approval modal   │
                                   │ surfaces reason  │
                                   │ + upgrade CTA    │
                                   └──────────────────┘
```

Webhook routes by price-ID family:
- Legacy IDs (`starter`/`pro`/`scale`) → existing `PLAN_CREDITS` path → write `creditsRemaining`. **Unchanged.**
- New IDs (`toast`/`plate`/`buffet`) → new `TIER_CONFIG` path → write `postsRemainingThisMonth`.

Approval order:
1. Resolve user's tier from `userProfiles.plan`.
2. Look up `TIER_CONFIG[tier]`.
3. Validate selected formats ⊆ tier formats; platforms ≤ tier platforms; video iff tier.video.
4. Read counter from tier-specific field; reject if `<= 0`.
5. On approve, atomic decrement of that field.

---

## Implementation Units

- U1. **Schema migration: posts counters + expanded plan union**

**Goal:** Add `postsRemainingThisMonth`, `postsLifetime` (both optional) and expand `plan` union to include `free`, `toast`, `plate`, `buffet` alongside legacy values. Zero behavior change.

**Requirements:** R1, R2.

**Dependencies:** None.

**Files:**
- Modify: `convex/schema.ts`
- Test: `convex/__tests__/userProfiles.test.ts` (extend existing)

**Approach:**
- Both new fields `v.optional(v.number())`. No defaults applied to existing rows; reads must tolerate `undefined` and treat as "not yet on new accounting model".
- Plan union expansion is additive — Convex accepts existing rows because all legacy literals stay in the union.

**Patterns to follow:**
- Goals schema migration (S5.3, `convex/schema.ts` `goals` table) — same all-optional pattern.

**Test scenarios:**
- Edge case: a row with only legacy fields (`plan: "starter"`, `creditsRemaining: 100`) reads back unchanged.
- Edge case: a row with `plan: "toast"` and `postsRemainingThisMonth: 30` reads back with both fields.
- Edge case: a row with `plan: "free"` and `postsLifetime: 25` reads back with `postsRemainingThisMonth: undefined`.

**Verification:**
- `npx vitest run convex/__tests__/userProfiles.test.ts` passes.
- Convex codegen (`npm run build`) emits no errors.

---

- U2. **Tier-config module: single source of truth**

**Goal:** New `convex/plan-tiers.ts` exporting `TIER_CONFIG` and helpers (`tierFor(plan)`, `counterFieldFor(tier)`, `capsFor(tier)`). Mirrored client copy in `src/lib/plan-tiers.ts` for UI display (subset of fields safe for client).

**Requirements:** R5, R6, R7.

**Dependencies:** U1.

**Files:**
- Create: `convex/plan-tiers.ts`
- Create: `src/lib/plan-tiers.ts`
- Test: `src/lib/__tests__/plan-tiers.test.ts`

**Approach:**
- `TIER_CONFIG` is a `Record<Tier, TierSpec>` with: `posts: number`, `counterField: "postsRemainingThisMonth" | "postsLifetime"`, `formats: ("square" | "landscape" | "portrait")[]`, `platforms: number` (max destinations per post), `video: boolean`, `sources: number | "unlimited"`, `goals: number | "unlimited"`.
- Values come from PRD §4 verbatim (free=30 lifetime sq-only, toast=30/mo sq-only, plate=100/mo sq+land+port, buffet=500/mo all-formats+video).
- Helpers: `tierFor(plan: Plan): Tier | null` (returns `null` for legacy `trial`/`starter`/`pro`/`scale` — those rows skip new gating until backfilled).
- Client copy duplicates the table verbatim (no "import from convex" — Convex types are server-only). Drift caught by U2 test.

**Patterns to follow:**
- `src/lib/goals/defaults.ts` — small typed config tables with helpers.

**Test scenarios:**
- Happy path: `TIER_CONFIG.toast.posts === 30`, `TIER_CONFIG.buffet.video === true`, `TIER_CONFIG.free.counterField === "postsLifetime"`.
- Happy path: `tierFor("toast") === "toast"`; `tierFor("starter") === null`; `tierFor("free") === "free"`.
- Edge case: every tier has `formats.length >= 1`; `platforms >= 1`; `posts > 0`.
- Edge case: client + convex copies have identical numeric values for `posts`, `platforms`, formats array length, and video boolean (parity check via shared fixture or string compare).

**Verification:**
- All tests pass; tier table renders as expected for an unknown legacy plan (`tierFor` returns null without throwing).

---

- U3. **Stripe webhook: route new price IDs to posts counter**

**Goal:** Extend `convex/stripe.ts` so `invoice.paid` and `customer.subscription.{created,updated}` recognize the new price-ID env vars and write `postsRemainingThisMonth` (monthly reset, no rollover) + set `plan` to the matching new literal. Legacy IDs unchanged.

**Requirements:** R3, R4.

**Dependencies:** U1, U2.

**Files:**
- Modify: `convex/stripe.ts`
- Modify: `.env.example` (document new `STRIPE_TOAST_PRICE_ID`, `STRIPE_PLATE_PRICE_ID`, `STRIPE_BUFFET_PRICE_ID`)
- Test: `convex/__tests__/stripe.test.ts` (new file or extend if exists)

**Execution note:** Test-first. Webhook semantics are easy to break silently; pin them with tests before editing the handler.

**Approach:**
- New `priceToTier(priceId): Tier | null` reads new env vars, returns `null` if priceId is unknown to the new family.
- Existing `priceToPlan` keeps its job for legacy IDs.
- `handleInvoicePaid`: if `priceToTier` matches → write `{ plan: tier, postsRemainingThisMonth: TIER_CONFIG[tier].posts, updated_at: ... }`; else fall through to existing legacy path.
- `handleSubscriptionChange`: same fork. Crossover (legacy → new tier or vice versa) is treated as a fresh subscription on the new model — set the new counter, do not touch the legacy `creditsRemaining` field.
- `handleSubscriptionDeleted`: also clear `postsRemainingThisMonth` to `0` and set `plan: "free"` (post-launch behavior; legacy users still go to `trial` because U6 hasn't run yet).

**Patterns to follow:**
- Existing `priceToPlan` + `PLAN_CREDITS` logic in `convex/stripe.ts`.

**Test scenarios:**
- Happy path: `invoice.paid` event with Toast price ID → profile patched with `plan: "toast"`, `postsRemainingThisMonth: 30`.
- Happy path: `invoice.paid` for Plate → `postsRemainingThisMonth: 100`.
- Happy path: `invoice.paid` for Buffet → `postsRemainingThisMonth: 500`.
- Happy path: `invoice.paid` for legacy starter price → `creditsRemaining: 200`, `postsRemainingThisMonth` untouched.
- Edge case: `billing_reason: "subscription_create"` is still skipped (existing behavior preserved).
- Edge case: subscription downgraded from Buffet to Toast mid-cycle → next `invoice.paid` resets counter to 30; no rollover.
- Error path: unknown price ID logs warning and returns without patching.
- Integration: full webhook signature → handler → mutation → DB read confirms shape.

**Verification:**
- All scenarios pass. `tail -f` of Convex logs during a manual Stripe test event shows the new branch firing.

---

- U4. **Approval gating: cap checks + counter decrement**

**Goal:** `draftPushes.approveDraft` (a) reads tier from `userProfiles.plan`, (b) validates the draft's selected formats/platforms and video status against `TIER_CONFIG[tier]`, (c) reads + decrements the right counter atomically, (d) returns a structured error with `reason` + optional `upgradeTier` on cap violation.

**Requirements:** R5, R6, R7, R10.

**Dependencies:** U2.

**Files:**
- Modify: `convex/draftPushes.ts`
- Modify: `convex/userProfiles.ts` (add `reservePost` mutation mirror of `reserve`)
- Test: `convex/__tests__/draftPushes.test.ts`

**Execution note:** Test-first. Each cap is its own scenario.

**Approach:**
- `tier = tierFor(profile.plan)`. If `tier === null` (legacy paying or trial user before backfill), bypass new gating — preserves R9.
- For new-tier users, run cap check before existing dedupe/integration checks (cap rejection is faster + cheaper).
- Format check: `draft.formatsToPost ⊆ TIER_CONFIG[tier].formats`. Platform check: `draft.selections.length ≤ TIER_CONFIG[tier].platforms`. Video check: if `draft.includesVideo && !TIER_CONFIG[tier].video` → reject.
- Counter: read `profile[counterField]`. If `undefined`, treat as `0` for `free` tier (force backfill before user can post) and as `TIER_CONFIG[tier].posts` for paid tiers (newly subscribed user, webhook may not have fired yet — be permissive at `>0`, decrement on success). Actually safer: require counter to be defined; reject with `posts_pending` reason if it's missing on a paid tier. Settled in implementation.
- Decrement is `ctx.db.patch` inside the same mutation transaction as the existing approval write — atomic by Convex semantics.
- Return shape on rejection: `{ ok: false, reason, upgradeTier? }` matching existing failure shape conventions in this file.

**Patterns to follow:**
- `convex/userProfiles.ts` `reserve` mutation — atomic decrement-or-throw pattern.
- Existing error returns in `draftPushes.approveDraft` (no integration / dedupe).

**Test scenarios:**
- Happy path: Toast user approves a square-only draft to X → success, `postsRemainingThisMonth` decrements by 1.
- Happy path: Plate user approves square+landscape draft to X+LinkedIn → success, decrements by 1.
- Happy path: Buffet user approves a video draft → success, decrements by 1 (R7).
- Happy path: Free user approves their first draft with `postsLifetime: 30` → success, becomes 29.
- Edge case: Free user with `postsLifetime: 0` → reject with `reason: "posts_exhausted"`, `upgradeTier: "toast"`.
- Edge case: Toast user with `postsRemainingThisMonth: 0` → reject `posts_exhausted`, `upgradeTier: "plate"`.
- Error path: Toast user submits portrait format → reject `format_blocked`, `upgradeTier: "plate"`.
- Error path: Toast user submits video → reject `video_blocked`, `upgradeTier: "buffet"`.
- Error path: Toast user selects 2 platforms (X + LinkedIn) → reject `platform_blocked`, `upgradeTier: "plate"`.
- Edge case: legacy `plan: "starter"` user approves any draft → no cap check, no counter decrement, falls through to existing behavior (R9).
- Integration: approval succeeds → counter decrement is visible in next `userProfiles.getByUserId` read in the same test.

**Verification:**
- All scenarios pass. Manual: agent-browser as a `plan: "toast"` test user approves a draft → counter visible in convex dashboard drops by 1.

---

- U5. **UI: surface caps + counter in approval modal**

**Goal:** `approve-draft-modal.tsx` displays the user's remaining post count and cap-violation reasons returned from U4. The repositioned admin sidebar shows post counter when `isLaunchModeRepositioned()`. Format/platform pickers in the draft UI grey out tier-blocked options with an upgrade hint.

**Requirements:** R5, R10.

**Dependencies:** U2, U4.

**Files:**
- Modify: `src/components/admin/approve-draft-modal.tsx`
- Modify: `src/components/admin/sous-chef-client.tsx` (sidebar counter when repositioned)
- Modify: `src/components/admin/destination-picker-modal.tsx` or wherever platform selection happens in repositioned flow
- Test: `src/components/admin/__tests__/approve-draft-modal.test.tsx` (extend)

**Approach:**
- Read `userProfile.plan` + counter via existing Convex `useQuery`.
- Use `src/lib/plan-tiers.ts` `capsFor(tier)` to render disabled chips with title="Upgrade to <tier> to enable".
- On `reason: "..."` from approval mutation, inline-render an upgrade CTA linking to `/admin/account/upgrade?target=<upgradeTier>`.
- All gated UI is wrapped in `isLaunchModeRepositioned()` so legacy view stays clean.

**Test scenarios:**
- Happy path: render with Toast tier → portrait chip is disabled, video toggle is hidden.
- Happy path: render with Buffet tier → all chips enabled, video toggle visible.
- Edge case: render with `postsRemainingThisMonth: 0` → submit button is disabled, banner shows "Out of posts this month".
- Error path: server returns `reason: "format_blocked"` → modal shows inline upgrade CTA, does not close.

**Verification:**
- Vitest passes. agent-browser as the test Toast user sees portrait disabled + video hidden.

---

- U6. **One-shot backfill mutation: legacy users → new tiers**

**Goal:** New `userProfiles.backfillToNewAccounting` `internalMutation` that maps legacy `plan` values to new ones and seeds counters. Run once manually from Convex dashboard at launch.

**Requirements:** R9.

**Dependencies:** U1, U2, U3.

**Files:**
- Modify: `convex/userProfiles.ts`
- Test: `convex/__tests__/userProfiles.test.ts`

**Approach:**
- Mapping (single direction, idempotent): `trial` → `free` with `postsLifetime: 30`; `starter` → `toast` with `postsRemainingThisMonth: 30`; `pro` → `plate` with `postsRemainingThisMonth: 100`; `scale` → `buffet` with `postsRemainingThisMonth: 500`.
- Idempotent: if a row already has `postsRemainingThisMonth` or `postsLifetime` set, skip it. Lets the mutation be re-run safely.
- Logs progress: count of `migrated`, `skipped`, `errors`. Returns the summary.
- Does not touch `creditsRemaining` — legacy field remains for cook-route accounting (R8).

**Patterns to follow:**
- Existing internalMutation pattern in `convex/goals.ts` `markFired`.

**Test scenarios:**
- Happy path: 4 fixture users (one per legacy plan) → all 4 are mapped correctly with the right counter.
- Idempotent: running twice on the same dataset produces 0 additional migrations on the second run.
- Edge case: a user with both legacy and new fields set is skipped.
- Edge case: a user with `plan: "free"` (newly created post-launch) is skipped — no remap.
- Error path: unknown legacy plan literal logs a warning and is reported under `errors`.

**Verification:**
- Vitest passes. Manual: run on production via Convex dashboard, summary matches expected counts from a SQL-style count of legacy rows.

---

## System-Wide Impact

- **Interaction graph:** Stripe webhook (`convex/stripe.ts`) → `userProfiles` table → `draftPushes.approveDraft` → `pushFanout` → Buffer/Postiz. New cap check is the only new node; everything downstream is unchanged.
- **Error propagation:** Approval-time rejection returns structured `{ ok: false, reason }`. The fanout never runs for a rejected approval. Cap rejections do not consume the counter.
- **State lifecycle risks:** A subscription that crosses tiers mid-cycle gets its counter reset on the next `invoice.paid`, not immediately. Acceptable per "monthly reset, no rollover". A user who upgrades mid-cycle is briefly stuck on the old counter — surface this in S4.2 with a "your new posts arrive on next billing date" hint, not in this plan.
- **API surface parity:** Cook routes (`/api/v1/cook/*`) are deliberately untouched. Public API customers continue paying in credits.
- **Integration coverage:** U3 + U4 each carry an integration test (real DB, no mocks) that exercises the full webhook → DB → approval → counter decrement chain.
- **Unchanged invariants:** `creditsRemaining` field, `reserve` mutation, all `/api/v1` routes, the Buffer/Postiz fanout, the goals system, the GitHub webhook draft path. None of these change.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Backfill (U6) runs on production but a row's legacy `plan` value falls outside the known mapping (e.g., `null`, manually edited). | Idempotent mapping with explicit error logging per row; summary returned. Re-run safe. |
| Webhook race: `invoice.paid` arrives before `customer.subscription.created` after a tier change. | Both handlers compute the tier from price ID independently and patch the counter; whichever wins ends in the same state. Existing legacy code already tolerates this race. |
| Stripe price IDs not yet provisioned at deploy time. | `priceToTier` returns `null` for unknown IDs; webhook silently no-ops on the new branch. Adding the env vars later activates the new path with no code change. |
| Legacy paying user gets surprise re-mapping if backfill is run prematurely. | U6 ships dormant — only the manual Convex dashboard call triggers it. The launch-flag flip is the documented trigger. |
| Format/platform/video flags drift between PRD and `TIER_CONFIG`. | Single source of truth in `convex/plan-tiers.ts`; PRD §4 referenced verbatim in the module doc-comment. Drift caught by parity test in U2. |
| User upgrades mid-cycle and feels they "lost" the remainder. | Out of scope for this plan; surface as "new posts on next billing date" hint in S4.2. |

---

## Documentation / Operational Notes

- `.env.example` updated in U3 with the three new Stripe price-ID vars + a comment that legacy vars are still required.
- `docs/conventions.md` PostHog event list — no new events needed for accounting (cap-violation surfacing emits `upsell_prompt_shown` already on the roadmap as part of S4.2).
- `docs/decisions.md` gets one entry: "S2.7: dual-tree Stripe webhook + manual backfill — chose semantic separation over price-ID re-map for rollback safety."
- Launch runbook (deferred to S4.3): step "After flipping `NEXT_PUBLIC_LAUNCH_MODE`, run `npx convex run userProfiles.backfillToNewAccounting --prod` once. Verify summary."
- No PostHog identify-property changes — `plan` already flows through `posthog-identifier.tsx`; new literals show up automatically.

---

## Sources & References

- **Origin document:** `PRD.md` §4 (pricing rewrite)
- **Session ledger:** `docs/sessions.md` S2.7
- Related code: `convex/stripe.ts`, `convex/draftPushes.ts`, `convex/userProfiles.ts`, `src/lib/launch-mode.ts`
- Related prior session: `docs/log.md` Session 28 (S5.3 goal schema migration — same all-optional-fields rollout pattern)
- Related plans: `docs/plans/2026-04-22-002-feat-user-defined-sous-chef-goals-plan.md`
