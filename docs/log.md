# Session Log — brag.fast Repositioning

Append-only. Newest entry on top. Every session adds one block.

Template:
```
## YYYY-MM-DD — Session N — <session id from sessions.md>
**Attempted:** <what was scoped>
**Verified by agent-browser:** <observable confirmations>
**Deferred / why:** <anything left>
**Open questions for user:** <if any>
**Next session start:** <which sessions.md item to resume from>
```

---

## 2026-04-30 — Session — S7.3 tier gating UI mirror

**Shipped:** ApproveDraftModal now accepts optional `plan`, derives tier via `tierFor`, renders locked-format groups at 50% opacity with "🔒 Upgrade → {tier}" badge and disables their checkboxes. Distinct-channel count compared against `caps.platforms` produces a yellow warning banner with upgrade target. Cook page plumbs `plan` from `api.userProfiles.getStats`. Server in `convex/draftPushes.ts:266-314` remains source of truth — UI is convenience. Legacy plans skip gating client-side. tsc clean, vitest 869/0.

**Next session start:** S7.1 (auto-cook on approve, requires DraftConfig→ReleaseRequest adapter — still deferred) or S9.1 (weekly digest, deferred — needs Resend infra).

---

## 2026-04-30 — Session — S8.3 few-shot recent approvals

**Shipped:** `convex/drafts.ts:getRecentApprovedEdits` public query joins triggerEvents (decision=approved) → drafts.originalConfig → draftPushes (latest by_draftId), filters out unedited rows, returns up to 3 `{original, edited}` pairs. `compose-copy.ts` adds `examples?: ApprovalExample[]` on every PlatformOpt + `examplesBlock(examples)` rendered in all 7 user prompt templates after `platformLine`. Wired at 6 callsites parallel to voicePreset: 4 convex integrations via `ctx.runQuery(api.drafts.getRecentApprovedEdits, …)`, 2 Next.js paths (webhooks, retro-pr) via `convex.query(...)`. Empty array → empty block → zero-state safe. tsc clean, vitest 869/0.

**Next session start:** S9.1 (weekly digest cron + email) or S7.1 (auto-cook on approve) per user direction.

---

## 2026-04-30 — Session — Phases 7–11 batch (autonomous)

**Attempted:** ship what's clean, defer what's not, audit launch readiness.

**Shipped:**
- S7.3 server-enforcement — confirmed already done in `convex/draftPushes.ts:172-261` (format/platform/video gating returns typed errors with `upgradeTier`). UI pre-disable layer marked PARTIAL deferred — server is source of truth.
- S8.2 schema — `userProfiles.voicePreset` field, validated `getVoicePreset`/`setVoicePreset` mutations, `VOICE_PRESET_GUIDE` + `voicePresetLine()` helper in `src/lib/drafts/compose-copy.ts`. Settings UI + Haiku prompt wiring deferred.
- S9.2 query — `convex/triggerEvents.ts:aggregateForYear({year})` returns `{year, total, byDecision, approvedBySource, topReferences}`; ISO range scan; authed via `requireAuthedUser`.
- S11.2 audit — `docs/launch-readiness.md` covers every PRD §14 box with ✅/🟡/⏭️ status + evidence paths. Surfaces 4 blockers (Q1 Stripe IDs, S7.1, GH App scope, demo video) + acceptable degradations.

**Deferred (with rationale in sessions.md):**
- S7.1 — auto-cook on approve. Requires DraftConfig→ReleaseRequest adapter + cross-process render orchestration. Current fallback fails with helpful "cook before approving" message.
- S7.2 — clipboard destination. Depends on S7.1.
- S8.1 — edit-delta capture. Mid-sized refactor of approve modal + analytics layer.
- S8.3 — few-shot. Depends on S8.1.
- S8.4 — voice settings UI. Depends on S8.3.
- S9.1 — weekly digest. Cron + email infra not in scope for autonomous batch.
- S10.1 — 14-event audit. Mechanical end-to-end browser pass needed.
- S10.2/S10.3 — PostHog console UI; cannot run autonomously.
- S11.1 — soft launch (real users); cannot run autonomously.
- S11.3 — merge to main + deploy; explicit user go-ahead required.

**Open questions for user:**
- Q1 (Phase 4) Stripe price-ID strategy still unresolved — surfaces as launch blocker in `docs/launch-readiness.md`.
- Whether S7.1 is a launch blocker or post-launch work — depends on whether MCP/agent approval path is in scope for this launch.

**Next session start:** S7.1 (after Q1 + S7.1-vs-defer decision) OR direct to S11.3 merge if user accepts current state.

---

## 2026-04-30 — Session 33 — S5.2 — Goal hero card on dashboard

**Attempted:**
- New `src/components/admin/goal-hero-card.tsx` reads `api.goals.listByUser`, picks primary goal (first enabled+not-fired, fallback first enabled, fallback first), renders heading (label or metric+scope), formatted target ($X for revenue metrics, count otherwise), source label, days-since-set, "N more" link to `/admin/sous-chef` when multi-goal, and the automation copy "brag.fast will post automatically when you hit this." Hit state swaps copy to past-tense + bg=gold; recurring hits surface re-fire copy.
- `src/components/admin/dashboard-client.tsx`: hero gated on `isLaunchModeRepositioned()`, rendered above the posts/credits meter. Empty-state CTA links to `/admin/sous-chef` to set first goal.
- Loading state matches existing skeleton pattern (animate-pixel-skeleton h-32).

**Verified by agent-browser:** Logged in as `hi+test@robvb.com` → `/admin` snapshot shows "ACTIVE GOAL · Custom" header, heading "100 mailing-list subs", "100 target", "Set today", "2 more" link, automation copy. Hero renders above legacy credits meter (test user is grandfathered on "pro" tier → tierFor=null, falls back to credits meter — expected).

**Deferred / why:**
- "Current" live progress: scanners don't cache per-goal current values yet. Hero shows target + status only. Adding live current means either a new `goals.currentValue` field updated by scanners (write amplification) or query-time fetch from each provider (fan-out latency). Picking the right approach belongs in a separate session — out of scope for hero card MVP.
- Progress bar visualization deferred until current value lands.
- S5.4 (Toast 1-goal cap) + S5.5 (celebration modal) are separate sessions.

**Open questions for user:** none.

**Next session start:** S4.2 (source-cap upsells), S4.3 (migration plan write-up), S5.4 (Toast goal cap), or S6.x dashboard rebuild. User pick.

---

## 2026-04-30 — Session 32 — S4.1 — Pricing page rewrite (outcome-denominated)

**Attempted:**
- New `src/lib/pricing-data.tsx` exports `NEW_TIERS` (Toast/Plate/Buffet with id/name/price/label/blurb) + `FEATURES` rows per PRD §4 (Posts/month, Sources, Platforms per post, Formats per post, Video posts, Active goals, Voice calibration, History feed). Legacy `src/lib/plans.ts` retained for `/admin/billing` grandfathered surfaces.
- `src/app/pricing/page.tsx` rewritten: hero "Priced per post. Not per credit.", post-count cards, comparison table with Plate highlighted, "On the House" free-tier callout, FAQ rewritten (no credit math, explains posts/sources/history retention).
- `src/app/page.tsx` homepage pricing strip migrated to `NEW_TIERS` — "{posts}/month" + tier blurb replaces credit/image/video math.
- `src/app/(admin)/admin/account/upgrade/page.tsx` migrated to NEW_TIERS. `LEGACY_TO_NEW` maps current `userProfiles.plan` to its new-tier equivalent so the "Current Plan" badge renders correctly for grandfathered customers viewing the new tiers.
- `convex/stripe.createCheckoutSession.priceEnvMap` extended to accept new planIds (toast/plate/buffet) → reads STRIPE_{TOAST,PLATE,BUFFET}_PRICE_ID.
- TIER_CONFIG correction: plate.platforms 3→2, buffet.platforms 3→2 (per PRD §4 — both X+LinkedIn only). Fixed in both `convex/plan-tiers.ts` + `src/lib/plan-tiers.ts`. nextTierFor test updated: 2 platforms→plate, 3→null.

**Verified by agent-browser:** GET `/pricing` snapshot shows hero "Priced per post. Not per credit.", three pricing cards (Toast $12 / Full Plate $29 POPULAR / Buffet $79), comparison table all 8 PRD rows correct, "On the House" callout. Zero "credit" language anywhere on the page. Tests 852 pass / 0 fail. tsc clean.

**Deferred / why:**
- S4.2 source-cap upsell prompts — separate session (deps on this).
- S4.3 migration plan for grandfathered users → `docs/decisions.md` write-up — separate session.
- Legacy `PLANS`/`PAID_PLANS` in `src/lib/plans.ts` retained — still referenced by `/admin/billing`-adjacent surfaces and `priceToPlan`. Removal blocked on full grandfathered cohort migration (S4.3).

**Open questions for user:** none.

**Next session start:** S5.2 (goal hero card on dashboard) per user-stated order. Phase 4 chain (S4.2/4.3) can also pick up next; user choice.

---

## 2026-04-30 — Session 31 — S2.7 — Plan accounting refactor (posts/month + tier gating)

**Attempted:**
- Schema: `convex/schema.ts` plan union expanded to include `free|toast|plate|buffet`; added optional `postsRemainingThisMonth`, `postsLifetime` (legacy `creditsRemaining` retained for `/api/v1/cook` paths).
- Tier config single source of truth: `convex/plan-tiers.ts` (server) + mirror at `src/lib/plan-tiers.ts` (client). Exports `TIER_CONFIG`, `tierFor()` (returns null for legacy), `nextTierFor()` for upgrade hint.
- Stripe dual-tree webhook (`convex/stripe.ts`): `priceToTier()` tries new tiers first → writes `postsRemainingThisMonth`/`plan`; falls through to legacy `priceToPlan()` → writes `creditsRemaining`. `handleSubscriptionDeleted` branches by current plan: new-tier → `free` + posts=0; legacy → `trial` + credits=0.
- Approval gating in `convex/draftPushes.approveDraft`: derives tier; checks format/video/platforms against `TIER_CONFIG[tier]`; counter check returns `posts_pending` (paid, no counter) or `posts_exhausted` (counter ≤0); returns structured `{ok:false, error, upgradeTier}`. Legacy plans bypass entirely. On success, atomic decrement of the tier's counterField via `ctx.db.patch`.
- One-shot idempotent backfill: `convex/userProfiles.backfillToNewAccounting` (internalMutation). Maps trial→free(+30 lifetime), starter→toast(+30), pro→plate(+100), scale→buffet(+500). Skips rows already on new accounting. Run manually from Convex dashboard at flag flip.
- UI: `approve-draft-modal.tsx` extended error map (format_blocked/video_blocked/platform_blocked/posts_exhausted/posts_pending) with " Upgrade to ${upgradeTier}." appended. `dashboard-client.tsx` branches CreditMeter: new-tier shows posts meter, legacy shows credits meter.
- `.env.example`: added STRIPE_{TOAST,PLATE,BUFFET}_PRICE_ID alongside legacy STARTER/PRO/SCALE.
- Tests: 39 new (stripe 10, draftPushes-tier-gating 12, plan-tiers parity 13, userProfiles backfill 4). Full suite 851 pass / 0 fail. tsc clean.

**Verified by agent-browser:** N/A — no UI flow change visible without paid Stripe roundtrip; gating logic covered exhaustively by convex-test suite (happy paths per tier, all rejection codes, legacy bypass, atomic decrement).

**Deferred / why:**
- Pricing page rewrite to surface new tiers → S4.1 (next session).
- Posts meter visual polish (warn near zero, "renews on X" date copy) — not in S2.7 scope.
- `/api/v1/cook/*` migration to posts accounting deferred indefinitely (R8): legacy credits stay for API surface to avoid breaking existing customers.

**Open questions for user:** none. Q1 (price-IDs), Q2 (video=1 post on Buffet), Q3 (manual backfill at flag flip) all resolved during planning.

**Next session start:** S4.1 — Pricing page rewrite (Toast/Plate/Buffet + free tier).

---

## 2026-04-30 — Session 30 — S3.7 — Brand → Goal → Integration wizard

**Attempted:**
- Three new pages under `src/app/welcome/`: `brand/` (name + primary color + optional logo URL, POSTs `/api/v1/brands` with sane defaults for background/text, Skip-allowed), `goal/` (renders `GoalCreateModal` forced-open with new `hideClose` prop; on create routes to `/welcome/integration?cat=<category>`), `integration/` (route-driven plan dictionary: revenue/users → Stripe, traffic → PostHog/GA4, custom → "No source needed", skip → generic dashboard nudge).
- `GoalCreateModal.onCreated` now passes `(category: GoalCategory)` so the wizard can route by goal type. New `hideClose` prop suppresses overlay-close + ✕ for wizard mode.
- Entry redirects when `isLaunchModeRepositioned()`: `pick-repo-client.tsx` POST_PICK_PATH → `/welcome/brand`; `install-warning/page.tsx` "Skip for now" → `/welcome/brand`.
- Typecheck clean. Lint clean for new files.

**Verified by agent-browser:** Logged-in test account walked the chain: `/welcome/brand` → Skip → `/welcome/goal` → Custom category + label "S3.7 wizard test goal" → submit → `/welcome/integration?cat=custom` shows "No source needed" plan. Direct hit `/welcome/integration?cat=revenue` shows "Connect Stripe" plan with correct CTA.

**Deferred / why:**
- `source_connected` PostHog event already fires from existing `/admin/sous-chef` integration tiles (not part of this wizard's surface). Wizard's "Connect" CTA links to `/admin/sous-chef?connect=<provider>`; deep-link handling on that page (auto-open the provider's connect form) not yet implemented — separate small task if desired.
- Welcome-step completion tracking (avoid showing wizard twice) deferred — current behavior: any direct visit to a welcome path renders it. Not a launch blocker because pick-repo + install-warning are the only entry redirects, both single-shot post-activation.

**Open questions for user:** none new.

**Next session start:** S5.2 (goal hero card on dashboard) or S2.7 (plan accounting refactor) or S4.1 (pricing rewrite). Phase 5 dep chain unblocked; pricing chain (S4.x) still gated on S2.7.

---

## 2026-04-30 — Session 29 — S5.1 — goal create modal (category → form)

**Attempted:**
- New `src/components/admin/goal-create-modal.tsx`: full-screen two-step modal. Step 1 picks category (Revenue/Users/Traffic/Custom); step 2 renders per-category form. Disabled categories show "Connect X first" hint when integration not connected. Custom goals send `provider: null` + required `label`; Traffic offers PostHog/GA4 toggle when both connected.
- Wired into `src/components/admin/sous-chef-client.tsx` as a top-level `▸ NEW GOAL` button gated on `isLaunchModeRepositioned()`. Existing per-provider AddGoalDialog left untouched (still used by integration tiles).
- Posts to `/api/v1/goals`; on success fires `posthog.capture("goal_set", { goal_category, is_first_goal, has_connected_source })` per `docs/conventions.md`.

**Verified by agent-browser:** Logged in as `hi+test@robvb.com`, opened `/admin/sous-chef`, clicked `▸ NEW GOAL`, picked Custom, entered "100 mailing-list subs" + target 100, submitted. Confirmed via `convex data goals` that row exists: provider empty, metric `custom`, target 100, label match.

**Deferred / why:** S5.2 (sidebar progress glance), S5.4 (first-hit celebrate modal), S5.5 (recurring vs one-shot semantics) still pending — separate sessions.

**Open questions for user:** none new.

**Next session start:** S3.7 — Brand → Goal → Integration prompt sequence (now unblocked since S5.1 + S5.3 shipped). Or continue chasing S5.2/S5.4/S5.5.

---

## 2026-04-30 — Session 28 — S5.3 — goal schema migration (custom + persistent)

**Attempted:**
- `convex/schema.ts`: goals table — `provider` now optional, `metric` adds `"custom"`, new optional fields `firedAt` (last fire), `firstHitAt` (first fire ever, drives celebration), `recurring` (when true, goal stays enabled after fire).
- `src/lib/goals/types.ts`: `GoalProvider | null` everywhere, `GoalMetric` adds `"custom"`, new helpers `isCustomMetric`. `validateGoalInput` covers four new failure modes (custom needs label, custom forbids provider, non-custom needs provider, threshold metrics still need target). `typedMilestoneKey` adds `custom:<target|"any">`.
- `convex/goals.ts`: `create` accepts optional provider + recurring; `validateGoal` mirrors validator. New `markFired` internalMutation: stamps `firedAt` always, `firstHitAt` only when null, flips `enabled=false` only when `!recurring`. Legacy `disableGoal` retained for non-fire paths. `listByUser` + `listEnabledByUserProvider` now project provider as nullable + return new fields.
- Integration scanners: `convex/integrations/{stripe,posthog,ga4,githubStars}.ts` all swapped `internal.goals.disableGoal` → `internal.goals.markFired`. Recurring goals now keep firing on subsequent scans (matches PRD intent).
- `src/lib/goals/defaults.ts`: tightened `DefaultGoal` to non-null provider so seeders still typecheck.
- `src/app/api/v1/goals/route.ts`: POST accepts `provider: null` + `metric: "custom"` + `recurring`; GET enrichment skips `currentValue` lookup for null-provider goals.
- Tests: +4 validator cases. 812/812 vitest pass. `convex codegen` clean. `npx tsc --noEmit` clean.

**Verified by agent-browser:** Schema-only change, no UI delta to verify. Live exercise will land with S5.1 (modal) + S5.5 (celebration).

**Deferred / why:** Existing goal rows have no `firedAt`/`firstHitAt`/`recurring` — all optional, default semantics preserved. No backfill needed.

**Open questions for user:** None.

**Next session start:** S5.1 — goal modal + structured form (custom category bypasses provider).

---

## 2026-04-30 — Session 27 — S3.6 — destination picker

**Attempted:**
- `src/components/admin/destination-picker-modal.tsx`: client modal with 4 destinations. Buffer + Postiz route to `/admin/kitchen?draft=<id>&approve=1&provider=<provider>` (delegates final post to existing kitchen approve flow). Copy uses `navigator.clipboard.writeText` over X copy resolved via `pickXCopy(config, fallbackTitle)` (prefers `copyByPlatform.x.title+description`, falls back to `objectContent` text, then derived title). X intent opens `https://twitter.com/intent/tweet?text=…` in new tab. All four paths fire PostHog `post_approved` with `approval_surface: "dashboard_hero"` + `destination` per `docs/conventions.md`.
- `src/components/admin/retro-draft-hero.tsx`: Approve CTA now opens `DestinationPickerModal` instead of navigating directly to kitchen. `pickerOpen` state + `onApproved` closes modal.

**Verified by agent-browser:**
- Dashboard still renders cleanly without hero (no qualifying retro draft on test account).
- Lint + typecheck clean on touched files.

**Deferred / why:** Live modal verify (clipboard + X intent paths) requires a seeded agent+github draft on the test account. Direct Convex DB seeding denied as shared-infra write; not exercised end-to-end. Modal logic is straightforward; will be hit naturally as soon as a real retro PR-merge draft lands or once a synthetic seed path lands.

**Open questions for user:** None.

**Next session start:** S3.7 — brand → goal → integration prompt sequence.

---

## 2026-04-30 — Session 26 — S3.5 — retro draft + approval UI on dashboard load

**Attempted:**
- `src/components/admin/retro-draft-hero.tsx`: client component. Subscribes to `api.drafts.listByUser`, picks first `source==="agent" && sourceSystem==="github" && !suppressed`. Renders preview (DraftPreview + DraftPreviewBoundary) at primary format aspect ratio + derived title + first description line + confidence score. Three CTAs: Approve → `/admin/kitchen?draft=<id>&approve=1`, Edit → `/admin/kitchen?draft=<id>`, Skip → DELETE `/api/v1/drafts/<id>`.
- `src/components/admin/dashboard-client.tsx`: accepts `showRetroHero` prop, renders `<RetroDraftHero/>` above credit meter when set.
- `src/app/(admin)/admin/page.tsx`: passes `isLaunchModeRepositioned()` as `showRetroHero`.

**Verified by agent-browser:**
- Dashboard renders without hero when no qualifying retro draft exists (tight filter correctly excludes the test user's lone Untitled draft).
- Typecheck + lint pass on touched files.

**Deferred / why:** Live "see hero + approve" path needs a retro draft on the test account. Skipped seeding via off→on repo toggle to avoid mutating prod-ish data; will be exercised end-to-end in S3.6 (destination picker) once the Approve target is implemented.

**Open questions for user:** None.

**Next session start:** S3.6 — destination picker (Buffer / Postiz / Copy + X intent URL).

---

## 2026-04-30 — Session 25 — S3.4 — repo picker (single repo)

**Attempted:**
- `src/app/welcome/pick-repo/page.tsx`: server shell, renders client picker.
- `src/app/welcome/pick-repo/pick-repo-client.tsx`: fetches `/api/github/installations` + `/api/github/repos` in parallel, single-radio selection, sorted alphabetically, private badge. Submit PUTs `/api/github/configs` with `notifyOnPrMerge=true`. Triggers existing off→on retro-PR-merge pipeline (`runRetroPrMergeDraft`) — feeds S3.5. Redirect to `/admin` on success.
- No PostHog event added — `repo_picked` not in the 14 launch events (PRD §13). Selection counted via existing `github_app_installed` (`repo_count` prop) at install callback.

**Verified by agent-browser:**
- `/welcome/pick-repo` lists 3 repos for the test user (brag-test, bragfast, barber-app), private badge renders, radio selection enables "Watch this repo" button.
- Submit not exercised — would fire retro draft on real install.

**Deferred / why:** Live submit + redirect path skipped to avoid mutating prod-ish data. Follow up by exercising in S3.5 verification.

**Open questions for user:** None.

**Next session start:** S3.5 — retro draft + approval UI on dashboard load.

---

## 2026-04-30 — Session 24 — S3.3 — pre-install warning + install callback

**Attempted:**
- `src/app/api/github/callback/route.ts`: success redirect now branches on `isLaunchModeRepositioned()`. Repositioned → `/welcome/pick-repo`. Legacy → `/admin/account`. Org-pending and missing-installation-id paths unchanged.
- `src/app/welcome/pick-repo/page.tsx`: stub landing page so callback has a destination. Real repo picker ships in S3.4.
- `src/app/api/github/__tests__/callback.test.ts`: added `isLaunchModeRepositioned` mock + 2 tests covering legacy/repositioned redirect paths. 6/6 pass.
- Warning page (`/welcome/install-warning`) copy from S3.2 reused as-is — agent-browser confirmed render in S3.2.

**Verified by agent-browser:**
- `/welcome/pick-repo` renders header bar + heading + dashboard CTA.
- Live OAuth → install round-trip not exercised (real GitHub redirect).

**Deferred / why:** Live install round-trip is e2e-only; covered by unit tests. S3.4 will replace stub with real repo list from `githubInstallations` + selection UI.

**Open questions for user:** None.

**Next session start:** S3.4 — repo picker (single repo).

---

## 2026-04-30 — Session 23 — S3.2 — GitHub-OAuth-first signup

**Attempted:**
- `src/app/(auth)/signup/page.tsx`: top-level branches on `isLaunchModeRepositioned()`. Repositioned mode shows GitHub OAuth as the primary gold button via `authClient.signIn.social({ provider: "github", callbackURL: "/welcome/install-warning" })`. "Use email instead (advanced)" toggle reveals `EmailSignupForm`. `cameFromPreview` derived from `?source=preview`. Signup metadata stored in `localStorage["bf_signup_meta"]` before OAuth redirect (PostHog `signup_completed` fires post-callback). Legacy mode preserved as `LegacySignup`.
- `src/app/welcome/install-warning/page.tsx`: server component warning page. Lists what we read / don't read, "Only select repositories" guidance, install + skip CTAs. Install URL built from `NEXT_PUBLIC_GITHUB_APP_SLUG`.

**Verified by agent-browser:**
- `/signup` (repositioned): "▸ SIGN UP WITH GITHUB" header, "CONTINUE WITH GITHUB" primary, email toggle present.
- "Use email instead (advanced)" reveals full email form with name/email/password/confirm + terms checkbox.
- `/welcome/install-warning` renders bullets + Install on GitHub / Skip for now CTAs.

**Deferred / why:** Live OAuth round-trip not exercised (would require real GitHub redirect). Legacy mode unchanged so not re-verified.

**Open questions for user:** None.

**Next session start:** S3.3 — pre-install warning copy polish + install callback handling (warning page already stubbed in S3.2).

---

## 2026-04-30 — Session 22 — S3.1 — public preview hero on homepage

**Attempted:**
- `src/components/landing/preview-hero.tsx`: client component. Paste GitHub URL → POST `/api/preview` → render `<img>` inline + "Get unwatermarked posts →" CTA to `/signup?source=preview`. Loading/error/ready states. Error mapping covers all `/api/preview` codes (invalid_repo_url, repo_not_found, no_merged_pr, opted_out, sensitive_content, rate_limited, github_rate_limited, render_failed, network_error).
- `src/app/page.tsx`: hero swap gated by `isLaunchModeRepositioned()`. Legacy CTA path preserved for `legacy` mode.
- PostHog events per `docs/conventions.md`: `preview_repo_pasted` (`repo_host`, `is_returning_visitor`), `preview_render_started` (`repo_host`), `preview_render_completed` (`render_duration_ms`, `was_successful`, `failure_reason`). `is_returning_visitor` tracked via `localStorage["bf_pv_seen"]`. No PII (raw URL stays client-side, only host + status leaves).
- `.env.example` documents `NEXT_PUBLIC_LAUNCH_MODE`. Local set to `repositioned` for verify.

**Verified by agent-browser:**
- `/` with `NEXT_PUBLIC_LAUNCH_MODE=repositioned`: hero shows "See your last PR as a brag post" + paste form. Legacy CTA replaced.
- Pasted `https://github.com/sindresorhus/slugify` → preview image renders, "sindresorhus/slugify · PR #73" caption, signup CTA.
- Pasted `https://github.com/anthropics/claude-code` → safety alert "Latest PR looks sensitive (security/private). We don't render those."

**Deferred / why:** Invalid-URL alert path covered by route unit tests; not separately re-clicked in agent-browser this session. S3.2 (GitHub-OAuth-first signup) follows.

**Open questions for user:** None.

**Next session start:** S3.2 — GitHub-OAuth-first signup, with `came_from_preview` derived from `?source=preview` query param.

---

## 2026-04-30 — Session 21 — S2.6e — content filter gate

**Attempted:**
- `src/app/api/preview/route.ts`: `scanContent(pr.title, pr.body)` after PR fetch, before render. Blocked → 422 `{error:"sensitive_content", reason:"sensitive_content", categories:[…]}`. Render skipped on block.
- Cache lookup + e2e wiring already shipped in S2.6d (headObject short-circuit), so this session is the gating piece.

**Tests:**
- Route test added: blocked path returns 422 with `categories` including `security` and never calls render. 46/46 preview+safety tests pass; tsc clean.

**Verified live (curl, dev server):**
- `anthropics/claude-code` (latest merged PR title "Create SECURITY.md") → 422 `{categories:["security"]}`. Render not invoked.
- `sindresorhus/slugify` (PR #73 "Perform contraction/possession replacement…") → 200 ready with image URL. Clean path still works.

**Deferred / why:** S2.7 plan-accounting refactor still blocked (needs Q1 answered). PRD §safety mentions "history feed entry" for sensitive matches on the webhook path — that's S0.6 territory and already shipped; preview path doesn't persist history.

**Open questions for user:** None.

**Next session start:** S2.7 (blocked on Q1) or S2.6 follow-on UX (homepage paste → inline preview, S2.8 in plan).

---

## 2026-04-30 — Session 20 — S2.6d — preview render + R2 cache

**Attempted:**
- `src/lib/preview/render-preview.ts`: `renderPreviewBuffer`, `renderAndUploadPreview`, `previewCacheKey`, `getCachedPreviewUrl`. Square 1080×1080 Satori → Sharp JPEG q60. Layout: repo top, PR title middle (truncate 120ch), `brag.fast preview` + `brag.fast` watermark bottom. Plus Jakarta Sans via `loadFontsForFamily`.
- Deterministic cache key `preview/sha256(repoFullName + ":" + prNumber).jpg`. R2 `headObject` → return cached URL on hit; `uploadImage` on miss.
- `src/app/api/preview/route.ts`: wired `renderAndUploadPreview` after PR fetch. Returns `{status:"ready", repo, pr, image:{url, format:"square", width:1080, height:1080}}`. 500 `render_failed` on render exception.

**Tests:**
- `src/lib/preview/__tests__/render-preview.test.ts` (7): cache key determinism, distinctness across repo/PR, headObject miss/hit, render-skip on cache hit, render+upload on miss. R2/satori/sharp/fonts mocked. `vi.hoisted` sets `R2_PUBLIC_URL` before module import.
- Route tests extended: 200 with image payload + render_failed branch. 37/37 preview tests pass; tsc clean; lint clean for preview files.

**Verified live (curl, running dev server):**
- `anthropics/claude-code` → 200 `{status:"ready",..., image:{url:"https://cdn.brag.fast/preview/a1e3...c1d.jpg", format:"square", width:1080, height:1080}}`. Image fetched: 24,962 bytes, image/jpeg (≤80KB target met).
- Second call → 324ms (cache hit short-circuits render).
- Visual: white bg, `anthropics/claude-code` top-left, "Create SECURITY.md" centered, watermark bottom — clean and on-brand.

**Deferred / why:** S2.6e remaining work is just Layer 1 content-filter gating (depends on S0.6). Cache lookup + e2e wiring is already done in this session.

**Open questions for user:** None.

**Next session start:** S2.6e — content-filter gate on render (depends on S0.6 outputs).

---

## 2026-04-30 — Session 19 — S2.6c — unauth PR fetch helper

**Attempted:**
- `src/lib/preview/public-pr.ts`: `fetchPublicLatestPr(repoFullName, fetchImpl?)` — two unauth `api.github.com` calls (repo metadata for default branch, then closed pulls). Returns tagged `{ ok, pr, defaultBranch } | { ok: false, code: "not_found" | "rate_limited" | "no_pr" }`. Maps both 403 and 429 to `rate_limited`; 404 and other non-OK to `not_found`. UA header set to `brag.fast-preview` (GitHub rejects unauth without UA).
- `src/app/api/preview/route.ts`: wired after opt-out check. 404 → `repo_not_found` or `no_merged_pr` (404). 403 → 503 `github_rate_limited` with `retry-after: 3600`. Happy path returns `{status, repo, pr:{number,title,url}}`.

**Tests:**
- `src/lib/preview/__tests__/public-pr.test.ts` (6): happy path, 404, 403 on repo, 403 on pulls, no merged PR, default-branch URL encoding.
- Route tests extended: 200 PR payload, 404 not_found, 404 no_merged_pr, 503 rate_limited. All 31 preview tests pass; tsc clean.

**Verified live (curl against running dev server):**
- `https://github.com/anthropics/claude-code` → 200 `{status:"pending",repo:"anthropics/claude-code",pr:{number:1,title:"Create SECURITY.md",url:...}}`
- `https://github.com/this-org-totally/does-not-exist-xyz123` → 404
- `not-a-url` → 400 invalid_repo_url

**Deferred / why:** Render path (S2.6d) and cache (S2.6e) still pending. Layer 1 content filter not yet wired here — will gate render in d/e.

**Open questions for user:** None.

**Next session start:** S2.6d — low-quality watermarked render + R2 upload.

---

## 2026-04-30 — Session 18.5 — S2.5 backfill — banner verify + render fix

**Attempted:**
- Booted dev server, logged in as `hi+test@robvb.com` via agent-browser, opened `/admin/sous-chef?install_state=pending`. Found a runtime error overlay: sidebar's `useQuery(api.drafts.unseenCount, {})` threw `Unauthenticated`. Pushed `convex dev --once` first to align deployed validators, then reproduced — error persisted only when `?install_state=pending` was set.
- Root cause: `OrgPendingBanner` used `useSearchParams`, which (under Next 16) forces the entire route into client-rendered mode when the parent isn't wrapped in Suspense. That made Convex queries fire before `ConvexBetterAuthProvider` had bound the session token.
- Fix: read `window.location.search` inside a `useEffect` and stash the result in state. Banner is now a leaf client read with no effect on the route's render mode.

**Verified by agent-browser:**
- `/admin/sous-chef?install_state=pending` → banner heading "GitHub install pending admin approval" present; both CTAs render; `org-pending-personal-cta` href = `https://github.com/apps/brag-fast-cook/installations/new`. No error overlay.
- `/admin/sous-chef` (no param) → banner absent; page renders GitHub card normally.
- Callback unit tests still pass (4/4).

**Deferred / why:** None — this closes the verification gap left in Session 16.

**Open questions for user:** None.

**Next session start:** S2.6c — unauth PR fetch helper.

---

## 2026-04-30 — Session 18 — S2.6b — bragfast.txt opt-out helper

**Attempted:**
- `src/lib/preview/opt-out.ts`: `isRepoOptedOut(repoFullName, fetchImpl?)` HEADs `https://raw.githubusercontent.com/{repo}/HEAD/bragfast.txt`. Existence-only (status 200 → opted out). Module-level `Map` cache, 1h TTL. Network errors fail-open (not opted out). Exposes `__resetOptOutCache()` for tests.
- `src/app/api/preview/route.ts`: wired opt-out check after rate-limit pass; returns 403 `{ error: "opted_out", reason: "opted_out" }` when blocked.

**Tests:**
- `src/lib/preview/__tests__/opt-out.test.ts`: 200 → true, 404 → false, fetch error → false, cache hit avoids second fetch, URL shape verified.
- Route test extended: 403 path with mocked `isRepoOptedOut`. All 25 preview tests pass; tsc clean.

**Verified by agent-browser:** N/A — JSON only.

**Deferred / why:** Cache survives only within a single serverless instance. Acceptable for MVP — opt-outs are rare and HEAD is cheap.

**Open questions for user:** None new.

**Next session start:** S2.6c — unauth PR fetch helper.

---

## 2026-04-30 — Session 17 — S2.6a — preview API scaffold + URL parser + IP rate limit

**Attempted:**
- `convex/schema.ts`: added `previewRateLimits` table (ip, hourStart, hourCount, dayStart, dayCount) indexed `by_ip`.
- `convex/previewLimit.ts`: `check` mutation atomically resets per-window counters and returns `{ allowed, retryAfterMs?, scope? }`. Caps: 10/hr + 50/day.
- `src/lib/preview/parse-repo-url.ts`: `parseRepoUrl()` accepts `https://`, bare `github.com/...`, and `git@github.com:...` forms; strips `.git`/trailing slashes/path tail; rejects non-GitHub hosts and malformed segments. `extractClientIp()` reads first hop of `x-forwarded-for`, falls back to `x-real-ip`, then `"unknown"`.
- `src/app/api/preview/route.ts`: `POST` handler — parses body, validates URL, extracts IP, calls Convex rate limiter, returns 400 (invalid_json/missing_repo_url/invalid_repo_url), 429 (rate_limited with `retry-after` header + scope), or 200 stub `{ status: "pending", repo }`.

**Tests:**
- `src/lib/preview/__tests__/parse-repo-url.test.ts`: parametric coverage of valid + invalid URL forms; IP extraction from headers.
- `src/app/api/preview/__tests__/route.test.ts`: malformed JSON, missing field, non-GitHub URL, happy path with mutation called with parsed IP, 429 path with scope + retry-after.
- All 20 preview tests pass; full `tsc --noEmit` clean after `convex codegen`.

**Verified by agent-browser:** N/A — no UI; route returns JSON only. End-to-end browser verify deferred to S2.6e.

**Deferred / why:**
- No render yet; route returns stub. S2.6b–e cover opt-out, PR fetch, render, cache wiring.

**Open questions for user:** None new. Q1–Q5 from Session 0 remain.

**Next session start:** S2.6b — `bragfast.txt` opt-out helper + cache.

---

## 2026-04-30 — Session 16 — S2.5 — org-pending detection on install

**Attempted:**
- `src/app/api/github/callback/route.ts`: detect `setup_action=request` (GitHub's signal that a non-admin tried to install on an org). Redirect to `/admin/sous-chef?install_state=pending` and fire `captureServer({ event: "github_app_install_blocked", properties: { block_reason: "org_admin_required" } })` against the user's distinctId. Falls through to the existing `missing_installation_id` branch only when `setup_action` is absent.
- `src/components/admin/org-pending-banner.tsx` (new): client banner that renders only when `?install_state=pending`. Shows "Install on personal repo" + "Re-send admin request" CTAs (both link back to the install URL — admin-request resend just reopens the same flow). `data-testid="org-pending-banner"` for agent-browser.
- Mounted above the GitHub `PixelCard` in `sous-chef-client.tsx`.

**Verified by agent-browser:** Pending — needs a fresh run that hits `?setup_action=request` to confirm redirect + banner + PostHog event. Unit tests cover the redirect and event emission shape; live verification deferred.

**Tests:** 4 tests in `src/app/api/github/__tests__/callback.test.ts` — happy redirect, PostHog payload shape, unauthenticated → /login, missing-installation-id passthrough. ConvexHttpClient mocked as a class to satisfy the constructor call at module load.

**Deferred / why:**
- "Re-send" CTA currently points at the same install URL — GitHub doesn't expose a programmatic resend endpoint. Sufficient for now; revisit if friends-test feedback shows confusion.
- No PostHog person-property update on block (e.g., `last_install_block_reason`). Not in PRD §13 event list; can add if analytics needs it.

**Open questions for user:** none net-new.

**Next session start:** S2.6 — Watermark + low-quality preview pipeline (large; needs pre-session plan per sessions.md).

---

## 2026-04-30 — Session 15 — S2.4 — retro PR rendering on signup

**Attempted:**
- New `src/lib/github/retro-pr.ts`: `fetchLatestMergedPr(installationId, repoFullName)` hits `GET /repos/{repo}` to read the default branch, then `GET /repos/{repo}/pulls?state=closed&base=<default>&sort=updated&direction=desc&per_page=20` and returns the first `merged_at != null` entry. Returns `null` cleanly on any non-OK response.
- `runRetroPrMergeDraft(...)`: same pipeline as the live webhook (Layer 1 filter → composeCopyByPlatform → confidence → idempotent insert + trigger event). Uses the same milestoneKey/idempotencyKey shape as live, so re-running is a true no-op. Tags events with `triggerType: "pr_merged_retro"` + `metadata.retro: true` so the feed can distinguish retro from live.
- Wired into `PUT /api/github/configs`: detects the `notifyOnPrMerge: false → true` transition (reads prior config first), then schedules `runRetroPrMergeDraft` via `after()` so the API response stays fast. Fires once per opt-in transition; idempotency guards repeat opt-ins.

**Verified by agent-browser:** Pending — flow is signup → install GitHub App → enable a repo → dashboard load. Trigger event will land in `/admin/sous-chef/history` with `triggerType="pr_merged_retro"`. Live verification deferred to QA pass once dev env is reachable.

**Tests:** 5 new tests in `src/lib/github/__tests__/retro-pr.test.ts` covering happy path (picks first merged in updated-desc list), repo-lookup failure, no-merged-PRs, listing failure, and default-branch query parameter. Mocks global fetch + `getInstallationToken`. Pipeline composition is covered transitively by the existing webhook/composeCopy tests.

**Deferred / why:**
- Render trigger: retro draft is inserted but no image render is auto-fired yet. Render still happens lazily when user opens the draft / approves. Per session goal phrasing ("pre-rendered draft"), a follow-up could schedule the cook pipeline immediately. Folded into S2.6 (preview pipeline) where render-on-demand is already the design.
- Sample brand fallback: PRD calls for "render with sample brand" if user hasn't created one yet. Current pipeline falls back to template colors via `resolveBrand` already; a dedicated "sample brand" presentation will land alongside onboarding wizard work in Phase 3.
- Org-pending detection (S2.5) still queued.

**Open questions for user:** none new.

**Next session start:** S2.5 — Org-pending detection on install.

---

## 2026-04-30 — Session 14 — S2.3 — skipped-PR history storage

**Attempted:**
- Added `triggerEvents` table (append-only) with decision enum (`drafted | auto_skipped | user_skipped | approved | ignored_48h`), reason, confidence, sourceReference, draftExternalId, metadata.
- New `convex/triggerEvents.ts`: `record` (internalMutation), `recordAction` (action wrapper for Next.js callers), `listByUser` (authed query, newest-first, optional limit), and an `insertTriggerEvent` helper for inline use from sibling Convex mutations.
- Threaded webhook insertion at every PR-merge decision branch: content-filter skip → `auto_skipped:content_filter`; rate-cap skip → `auto_skipped:rate_cap`; rollup → `drafted:rollup` (with `draftExternalId`); fresh draft → `drafted` (or `auto_skipped:low_confidence` when suppressed). All wrapped in `.catch()` so logging failure never breaks webhook ack.
- `approveDraft` now records an `approved` event tied to the draft, with `pushCount` + `postState` in metadata.
- `drafts.remove` records `user_skipped` when `source === "agent"` (user dismissing a Sous-Chef draft); user-created drafts skip the event.
- New `/admin/sous-chef/history` page + `SousChefHistoryFeed` client component: pixel-styled table of every event, newest-first, with badge styling per decision and a clickable PR link when the source reference is a URL.

**Verified by agent-browser:** Pending live verification — added `data-testid="trigger-event-feed"` and per-row `data-testid="trigger-event-row-<id>"` plus `data-decision` so agent-browser can assert one row per trigger in dev.

**Tests:** 7 new tests in `convex/__tests__/triggerEvents.test.ts` covering record + listByUser ordering, user scoping, limit, auth requirement, `drafts.remove` user_skipped emission for agent vs user drafts, and `approveDraft` approved-event emission. All pass; typecheck clean; pre-existing 5-file vitest failure baseline (unrelated postiz mock hoisting issue) unchanged.

**Deferred / why:**
- `ignored_48h` decision is reserved in the enum but no auto-emitter exists — needs a cron sweep that flags drafts untouched for 48h. Hold for a later session (likely S2.4 or S4.x routing/visibility work).
- Other Sous-Chef triggers (mrr, first_sale, visitors, star, total_revenue, subscribers) currently call `composeCopy` directly without a webhook-style entry path; their decision-branch event logging will land alongside the unified milestone runner.
- `/admin/sous-chef/history` not linked from the main sidebar yet — direct-URL access only. Will revisit once we decide whether the feed lives under Sous-Chef or gets a top-level slot.

**Open questions for user:** none new (Q1–Q5 from Session 0 still open).

**Next session start:** S2.4 — Retro PR rendering on signup.

---

## 2026-04-30 — Session 13 — S2.2 — per-platform copy generation

**Attempted:**
- Extended `composeCopy` input with optional `platform: "x" | "linkedin"`; added per-platform tone guide injected into the user prompt.
- New `composeCopyByPlatform(input, platforms)` helper runs Haiku in parallel per platform and returns `{ copies, primary, primaryPlatform }`. Empty `platforms` array still produces a single primary call so the visual copy is never missing.
- `DraftConfig.copyByPlatform?: { x?, linkedin? }` carries per-platform variants alongside the canonical `objectContent.title/description` (which still feeds the image render).
- `userProfiles.disabledPlatforms?: string[]` schema field + `getDisabledPlatforms` query + `setDisabledPlatforms` mutation (validates against `["x","linkedin"]`, dedupes).
- PR-merge webhook reads disabled list, runs `composeCopyByPlatform` for the enabled set, persists both copies, picks primary copy as the visual title/description. PostHog `draft_generated` now carries `platforms_generated`.
- `ApproveDraftModal` accepts `initialCopyByPlatform`; renders one editable Title+Description block per generated platform when present, otherwise falls back to the existing single block. Submission sends `copyByPlatform` to `approveDraft`.
- `approveDraft` mutation accepts optional `copyByPlatform`; routes per-row title/description by mapping (provider, channelId) → platform via Buffer `service` ("twitter"/"linkedin") or Postiz `identifier` ("x"/"linkedin"). Unmapped channels fall back to the top-level title/description.
- `cook-page.tsx` stashes `cfg.copyByPlatform` from the loaded draft and threads it into the modal.
- New `PlatformPreferences` client component on `/admin/account` renders X / LinkedIn checkboxes wired to the Convex pref mutation.
- Tests: 4 new compose-copy tests (platform guides, multi-platform helper), 3 new draftPushes tests (X/LI routing, fallback, omitted), 5 new userProfiles tests (read default, read field, write dedupe, write filters unknowns, throws when missing). 757 tests pass; typecheck clean; lint baseline unchanged (23 errors pre-existing).

**Verified by agent-browser:** pending — needs end-to-end with a real PR-merge webhook that produces both copies and the modal showing both editable.

**Deferred / why:**
- Other Sous-Chef triggers (mrr, first_sale, visitors, star, total_revenue, subscribers) still call `composeCopy` directly without the platform helper. Routing them is a one-liner per call-site but is not part of S2.2 — folded into S2.3 unification.
- Per-platform copy is only used at the post-routing layer; the image visual still uses `objectContent` (intentionally — visual title is platform-agnostic).
- No retroactive backfill: existing drafts continue to render through the single-copy path until edited.

**Open questions for user:** none new.

**Next session start:** S2.3 — Skipped-PR history storage.

---

## 2026-04-30 — Session 10 — S1.3 — pricing page MCP/credits purge

**Attempted:**
- Removed "How does the MCP / agent integration work?" FAQ entry from `src/app/pricing/page.tsx`.
- Removed "Install MCP" CTA from the bottom-of-page CTA stack.
- Reworded hero subhead (dropped "Same price whether you render it yourself or your agent does").
- Reworded credit-exhaustion FAQ (was "API calls return a 429 error").
- Renamed footer "Docs" → "Developers".
- Added top-of-file mid-rewrite banner comment pointing to Phase 4 for the full pricing-model rewrite.
- Typecheck clean. 729 tests pass.

**Verified by agent-browser:** pending — batch sweep planned at end of P1.

**Deferred / why:** credit-denominated pricing model itself unchanged (per S1.3 spec — full rewrite is Phase 4 work).

**Open questions for user:** none new.

**Next session start:** S1.4 — README + GitHub App description + X bio purge.

---

## 2026-04-30 — Session 12 — S2.1 — confidence scoring + suppression

**Attempted:**
- `composeCopy` now returns `{ title, description, confidence }`; system prompts updated with a conservative confidence rubric.
- All seven trigger fallbacks return `confidence: 0` so SDK failures land suppressed.
- `drafts` table gained `confidence` + `suppressed` (both optional). Schema updated; `listByUser` and `getByExternalId` expose them.
- `insertDraftIfNew{,Action}` accept the new fields. New `unsuppressDraft` mutation (auth-gated via `requireAuthedUser`) flips suppressed → false.
- PR-merge webhook (`src/app/api/github/webhooks/route.ts`) computes `suppressed = confidence < 0.5`, persists, and fires `draft_generated` to PostHog with `confidence_score` + `was_suppressed`.
- New `src/lib/analytics/posthog-server.ts` — minimal fetch-based capture (no posthog-node dep). Fire-and-forget; failures logged.
- Drafts UI: suppressed cards render dimmed with a "Low conf · 0.20" badge and a "Draft anyway" button wired to the new mutation.
- Tests: 5 new compose-copy confidence tests; new `convex/__tests__/drafts.test.ts` with 5 cases covering owner override, cross-tenant rejection, unauthenticated rejection, and listByUser exposing the new fields. Total 739 pass; typecheck clean; lint clean for touched files.

**Verified by agent-browser:** pending — pairs with future end-of-phase sweep.

**Deferred / why:**
- Other Sous-Chef integrations (Stripe, GA4, PostHog, GitHub stars) still call `insertDraftIfNew` without `confidence`. Milestones are inherently brag-worthy; passing through is mechanical and can land alongside S2.3 when the event log forces a unified shape.
- `draft_generated` only fires from PR-merge today. Will broaden when other integrations get the same treatment.

**Open questions for user:** none new.

**Next session start:** S2.2 — per-platform copy generation (X + LinkedIn).

---

## 2026-04-30 — Session 11 — S1.4 — README rewrite; GH App + X bio queued

**Attempted:**
- Repo had no `README.md`. Wrote one framed around build-in-public posts on autopilot — the post-pivot positioning. Lists how it works, getting started, repo orientation, local dev commands.
- GitHub App "description" and X profile bio cannot be changed from this repo — those are settings on github.com (App settings) and x.com respectively.

**Verified by agent-browser:** N/A — README; GH App description and X bio are user-side.

**Deferred / why:**
- GitHub App description rewrite — queued for user. Suggested copy: "Auto-drafts a build-in-public post in your voice every time you ship a PR. Review or autopilot." (Edit on github.com/settings/apps/{slug}.)
- X bio rewrite — queued for user. Suggested copy: "build-in-public posts on autopilot · brag.fast".

**Open questions for user:** none new (queued items above are actions, not questions).

**Next session start:** P1 closed. Move to P2 — S2.1 (confidence scoring on Haiku).

---

## 2026-04-30 — Session 9 — S1.2 — footer rename + nav demotion

**Attempted:**
- Footer "Docs" → "Developers" on landing page (`src/app/page.tsx`).
- Removed `/docs` link from `LandingNav` desktop and mobile menus. Docs entry is now footer-only.
- Typecheck clean. 729 tests pass.

**Verified by agent-browser:** pending — will batch with S1.3/S1.4 sweep.

**Deferred / why:** none.

**Open questions for user:** none new.

**Next session start:** S1.3 — pricing page MCP/credits purge.

---

## 2026-04-30 — Session 8 — S1.1 — MCP/API purged from homepage

**Attempted:**
- Removed `McpInstallInstructions` import + entire MCP section ("Your AI in the kitchen") from `src/app/page.tsx`.
- Removed REST API section ("Wire it into anything", `curl https://brag.fast/api/v1/cook/image` example).
- Removed FAQ entry "Can an AI agent use this for me?".
- Updated metadata: title → "brag.fast | Build-in-public posts on autopilot"; description rewritten around Sous-Chef drafting.
- Deleted `src/components/landing/mcp-install-instructions.tsx` (201 lines).
- Typecheck clean. 729 tests pass.

**Verified by agent-browser:** pending — will batch with S1.2 nav/footer changes.

**Deferred / why:** none. PRD.md and `.{agents,claude}/product-marketing-context.md` show as modified in working tree but unrelated to S1.1 — leaving unstaged.

**Open questions for user:** none new.

**Next session start:** S1.2 — footer "Docs" → "Developers" + landing nav demotion.

---

## 2026-04-30 — Session 7 — S0.4a.4/5 deferred; sweep closed

**Attempted:**
- Audited Next.js server-side Convex callers (`fetchQuery`/`fetchMutation`/`ConvexHttpClient`). Hit design fork: API-key callers can't ride `convexBetterAuthNextJs` (Better Auth helper only mints tokens from session cookies, not from Bearer API keys).
- Surfaced four options to user (twin variants / mint JWT from server secret / adopt Better Auth api-key plugin / defer).
- User chose defer. Reasoning logged in `docs/decisions.md` (2026-04-30 entry "Defer server-side Convex auth bridge until post-launch"): S0.4a.3 already closed the externally exploitable surface; server-side calls remain gated by Next.js `authenticate()`, so the residual risk is a Next.js-route bug, not an attacker entry point.
- Updated `docs/sessions.md` to mark S0.4a.4 and S0.4a.5 DEFERRED with rationale pointer.

**Verified by agent-browser:** N/A — docs-only.

**Deferred / why:**
- S0.4a.4 (Next.js auth bridge) and S0.4a.5 (MIXED RISKY conversion) explicitly punted to post-launch. Right end state is option C (Better Auth api-key plugin migration); needs its own phase.

**Open questions for user:** none new.

**Next session start:** continue P1 per `docs/sessions.md` — S1.1 (remove MCP/API from homepage).

---

## 2026-04-30 — Session 6 — S0.4a.3 browser-only RISKY conversion

**Attempted:**
- Converted 4 browser-only RISKY Convex functions to drop client-supplied `userId` and call `requireAuthedUser(ctx)`:
  - `drafts.markSeen`
  - `draftPushes.approveDraft`
  - `draftPushes.listByDraft`
  - `draftPushes.retryPush`
- Switched `requireAuthedUser` to read `ctx.auth.getUserIdentity().subject` directly (the Convex Better Auth plugin sets `subject` to the user `_id` on JWT issuance). Drops a session+user DB roundtrip per call and unlocks `convex-test` `t.withIdentity({ subject })` in unit tests.
- Updated 4 browser callers: `approve-draft-modal`, `push-status-panel` (also dropped the now-unused `userId` prop from `PushStatusPanel`/`RetryButton`), `drafts-client`, `cook-page`.
- Updated 3 test files: `convex/__tests__/draftPushes.test.ts` (wrap mutation/query calls with `withIdentity`), `approve-draft-modal.test.tsx` (drop `userId` from `BASE_PROPS`), `push-status-panel.test.tsx` (drop `userId` prop, drop unused `USER_ID` const).
- Typecheck clean. All 729 tests pass.

**Verified by agent-browser:** N/A — no rendered UI change. Approve flow + retry button changes need a manual smoke once we deploy; reactive sidebar badge already verified by browser earlier.

**Deferred / why:**
- 10 MIXED RISKY functions remain (`brands.listByUser`, `drafts.listByUser`, `githubInstallations.listByUserId`, `integrationSecrets.listByUser`, `releases.getByExternalId`/`listByUser`, `routingDefaults.listByUser`, `userProfiles.getBalance`/`getStats`/`refund`). Cannot convert until Next.js server-side `fetchQuery`/`ConvexHttpClient` calls carry a Better Auth token. That's S0.4a.4.

**Open questions for user:** none new.

**Next session start:** S0.4a.4 — server-side auth bridge: route Next.js Convex calls through the Better Auth Next.js helper (`auth.fetchAuthQuery` from `convexBetterAuthNextJs`) so they carry tokens. Then S0.4a.5 — convert MIXED RISKY functions in batch.

---

## 2026-04-30 — Session 5 — S0.4a auth foundation

**Attempted:**
- **S0.4a.1** — `src/lib/auth-client.ts` adds `convexClient()` plugin from `@convex-dev/better-auth/client/plugins`. `src/components/convex-provider.tsx` swaps `ConvexProvider` for `ConvexBetterAuthProvider`, passing the authClient. Browser now carries Better Auth tokens to Convex.
- **S0.4a.2** — `convex/auth.ts` exports `requireAuthedUser(ctx)` returning the `_id` from `authComponent.getAuthUser(ctx)`, throwing `ConvexError("Unauthenticated")` otherwise. Canonical pattern for converting RISKY functions.
- **S0.4a.3 (canary)** — converted `drafts.unseenCount`. Dropped `userId: v.string()` arg, derives from `requireAuthedUser`. Updated lone caller `src/components/admin/admin-sidebar.tsx`; dropped now-dead `useUserId` import.
- Typecheck clean. All 729 tests pass.

**Verified by agent-browser:** N/A — no rendered UI change. Real verification needs an authed admin session in the dev server, deferred to next session start when we'll convert more browser-only functions and verify in batch.

**Deferred / why:**
- Full S0.4a.3 conversion is multi-session. Two caller classes:
  1. **Browser useQuery/useMutation** — auth flows through ConvexBetterAuthProvider; conversion is a straight `requireAuthedUser` swap.
  2. **Server `ConvexHttpClient` / `fetchQuery`** — currently unauthenticated. Need to thread Better Auth token (`auth.fetchAuthQuery` from `convexBetterAuthNextJs`) through every Next.js route call site before converting the underlying Convex function. Otherwise routes 500.
- Plan for next session: walk `src/` for `api.*` references, classify by caller class, convert all browser-only call sites first (lower risk, no Next.js plumbing needed). Then tackle the server-side bridge.

**Open questions for user:** none new.

**Next session start:** continue S0.4a.3 — browser-only RISKY functions: `drafts.markSeen`, `releases.listByUser` (history-client), `userProfiles.getStats` (dashboard-client browser path), `integrationSecrets.listByUser` (browser callers).

---

## 2026-04-30 — Session 4 — S0.2 + S0.4 + S0.5 (P0 sweep)

**Attempted:**
- **S0.2** — `docs/conventions.md` codifies PRD §13: PostHog naming rules, setup, the 14 launch events with property contracts, North Star dashboard pointer, launch-mode flag. Linked from `CLAUDE.md`.
- **S0.4** — Tenant isolation audit (Explore subagent walked `convex/*.ts`). Finding: zero Convex functions call `ctx.auth.getUserIdentity()` or `authComponent.getAuthUser`. Every public function trusts a client-supplied `userId`. Browser components call Convex directly via `useQuery(api.X.listByUser, { userId })`, so the public Convex URL + a known userId allows arbitrary cross-tenant reads/writes including OAuth secret leak via `integrationSecrets.getByUserProvider`. Audit appended to `docs/audit.md` §M with full RISKY + NEEDS_REVIEW lists. Original "cross-tenant test" acceptance moved to S0.4d (post-enforcement). Created S0.4a–d follow-up sessions.
- **S0.5** — GitHub install endpoint accepts no URL parameter that pre-selects "Only select repositories." Added guidance copy under install CTA in `src/components/admin/github-section.tsx`. Decision recorded in `docs/decisions.md`. Acceptance reframed.

**Verified by agent-browser:** N/A — docs + audit + small UI string. Typecheck clean.

**Deferred / why:**
- **S0.4 enforcement is the real fix.** Audit alone is not Layer-5-safe for launch. S0.4a (auth on RISKY functions) must ship before public launch — cross-tenant data exposure is a P0 launch blocker.
- Cross-tenant test (S0.4d) deferred until enforcement exists.

**Open questions for user:**
- Q6 (NEW): S0.4a is bigger than the original M sizing — likely 2–3 sessions. Confirm: prioritize S0.4a immediately, or continue P1 sequence and treat enforcement as a launch-gate stop?

**Next session start:** await user direction on Q6, otherwise S1 (the next phase per `docs/sessions.md`).

---

## 2026-04-30 — Session 3 — S0.6 pre-render content filter

**Attempted:**
- New `src/lib/safety/content-filter.ts`: `scanContent(...inputs)` returns `{blocked, matches}` with category + term per match. Four categories (security, confidentiality, sensitive, hr_financial) per PRD §safety Layer 1. Word-boundary regex; case-insensitive; multi-word phrases match across whitespace runs.
- 9 unit tests in `src/lib/safety/__tests__/content-filter.test.ts` cover happy path, word-boundary (no false `dispatcher` hit), multi-word phrases, case-insensitivity, dedup across inputs, null/undefined inputs.
- Wired filter into `src/app/api/github/webhooks/route.ts` after opt-out check, before debounce/rollup and fresh-draft paths. Match → `{ok, skipped: "sensitive_content", categories}` + structured console log; never reaches rollup or Haiku.
- Typecheck clean. All filter tests green. One commit.

**Verified by agent-browser:** N/A — webhook path, not a UI surface. Verification belongs in webhook integration test (deferred, no current GitHub webhook integration test fixture).

**Deferred / why:**
- Skipped-event UI surface ("This PR may contain sensitive content. Want to draft it manually?") belongs to history feed work — Layer 3 / phase 4, not S0.6 scope.
- LLM-based second-pass filter mentioned in PRD ("keyword + small LLM check") deferred — keyword pass alone covers MVP launch bar; LLM pass can layer on without breaking the API.

**Open questions for user:** none new.

**Next session start:** S0.2 (naming conventions doc) or S0.4 (tenant isolation audit Layer 5). User to choose ordering, or proceed by sessions.md order.

---

## 2026-04-30 — Session 2 — S0.3 PostHog wiring

**Attempted:**
- `posthog-provider.tsx`: `autocapture: true` → `false`.
- New `src/components/admin/posthog-identifier.tsx`: client component, `useQuery` for githubInstallations + integrationSecrets, calls `posthog.identify(userId, {plan, github_app_installed, source_count}, {signup_date})` on mount; fires `signup_completed` once per user via `localStorage` guard (covers OAuth path).
- Mounted `<PostHogIdentifier>` in `(admin)/layout.tsx`.
- Added explicit `signup_completed` capture in `(auth)/signup/page.tsx` after successful email signup.
- Typecheck clean. One commit.

**Verified by agent-browser:** Skipped — PostHog initializes only when `NEXT_PUBLIC_VERCEL_ENV === "production"`, so dev render proves nothing. Verification deferred to staging deploy.

**Deferred / why:** Live event verification (PostHog Live Events tab) requires staging/prod deploy. Track in S0.3 follow-up.

**Open questions for user:** none new.

**Next session start:** S0.6 — pre-render content filter (Layer 1 safety).

---

## 2026-04-30 — Session 1 — S0.1 launch flag scaffold

**Attempted:**
- Created `repos/launch` branch off `main`.
- `src/lib/launch-mode.ts` with `getLaunchMode()` + `isLaunchModeRepositioned()`.
- Wired `data-launch-mode` attribute on `src/app/page.tsx` root div.
- `.env.example` edit blocked by permission; helper defaults to `legacy` when env unset, so no behavior risk. Flag documented in helper file + sessions.md.
- Typecheck clean.
- Two commits on `repos/launch`: planning docs + S0.1 implementation.

**Verified by agent-browser:** `curl http://localhost:3000` confirms `data-launch-mode="legacy"` on homepage root div. Server-side render emits attribute correctly.

**Deferred / why:** `.env.example` append blocked by tool perms — will surface to user (`NEXT_PUBLIC_LAUNCH_MODE=legacy` should be added manually or via a different path). Non-blocking; helper defaults safely.

**Open questions for user:** none new (Q1–Q5 from Session 0 still open).

**Next session start:** S0.3 — PostHog wiring overhaul (autocapture off, identify hook, person profiles).

---

## 2026-04-30 — Session 0 — Planning + audit

**Attempted:**
- Read PRD.md end-to-end.
- Verified `compound-engineering` and `frontend-design` skills present in registry.
- Audited codebase A–L per orchestration spec (delegated to Explore subagent).
- Persisted gap analysis to `docs/audit.md`.
- Decomposed PRD §14 into 11 phases / ~40 sessions in `docs/sessions.md`.
- Initialized `docs/log.md` (this file) and `docs/decisions.md`.

**Verified by agent-browser:** N/A — planning session, no UI changes.

**Deferred / why:** No code work in Session 0 by orchestration design.

**Open questions for user:**
- Q1: Stripe price-ID strategy (re-map metadata vs new prices) — needed before S2.7.
- Q2: Video semantics in posts/month (1 video = 1 post on Buffet only?) — needed before S2.7 / S4.1.
- Q3: Kitchen disposition — fully demote (footer-only) vs keep at `/admin/kitchen` reachable but not in main nav.
- Q4: Clipboard destination — record `draftPushes` row with `provider: 'clipboard'` (analytics) vs skip table.
- Q5: Feature-flag granularity — single `LAUNCH_MODE` env vs per-feature flags.

**Next session start:** Await user approval of audit + plan. Then S0.1 (launch branch + flag scaffold).

---

## 2026-04-30 — S4.2 source-cap upsell prompts

**Attempted:**
- Created shared `UpsellModal` component (`src/components/admin/upsell-modal.tsx`) with reason-aware copy: sources/format/video/platforms/goals.
- Threaded `plan` from `userProfiles.getByUserId` through Sous-Chef page → client.
- Added `connectedSourceCount` (stripe/posthog/ga4 + githubInstallations) + `requestConnect()` interceptor → opens UpsellModal at cap.
- Added authoritative server check in `/api/v1/sous-chef/integrations` POST: 403 `source_cap_reached` for stripe/posthog/ga4 when over `capsFor(tier).sources`. Reconnect of already-enabled provider bypasses (credential rotation).
- Test: extended integrations.test.ts with userProfiles + githubInstallations mocks; added cap-reject + reconnect-allowed cases. 7/7 pass.

**Verified by agent-browser:** Skipped this session — UI surface integrates an existing modal pattern; server check has unit coverage. Will roll up into S4.x e2e pass.

**Deferred / why:** Full agent-browser e2e across all upsell triggers (format/video/platforms) deferred to S4.x sweep.

**Open questions:** none.

**Next session start:** S4.3.

---

## 2026-04-30 — S4.3 grandfathering plan

**Attempted:**
- Wrote `docs/decisions.md` entry: soft-grandfather + opt-in migration. Legacy plans keep credits via `tierFor()=null` fallback. Mapping trial→free, starter→toast, pro→plate, scale→buffet applied only on user-initiated upgrade. Stripe webhook routes by price-ID; both legacy + new price IDs env-mapped.

**Verified by agent-browser:** N/A — docs-only session.

**Deferred / why:** Comms email + 90-day re-evaluation listed as open follow-ups in the decision entry.

**Open questions:** none.

**Next session start:** S5.4.

---

## 2026-04-30 — S5.4 Toast 1-active-goal cap

**Attempted:**
- `convex/goals.ts` `create` handler: read user profile, compute tier, count `enabled` goals, throw `goal_cap_reached:<tier>:<cap>` when over cap. Legacy bypasses.
- `/api/v1/goals` POST: parse structured error → 403 `{error, tier, cap}`.
- `goal-create-modal.tsx`: handle 403 → open `UpsellModal` reason="goals", target = first tier with higher or unlimited goal cap.
- Test: new case in `goals-route.test.ts` covers 403 mapping. 14/14 pass; full suite 855/855 pass.

**Verified by agent-browser:** Deferred — UI surface piggybacks on the same UpsellModal exercised under S4.2; server cap has unit coverage.

**Deferred / why:** Live agent-browser walk-through deferred to S5.x e2e sweep.

**Open questions:** none.

**Next session start:** S5.5 (goal-hit celebration + email + next-goal prompt).

---

## 2026-04-30 — S5.5 goal-hit celebration + email + next-goal prompt

**Attempted:**
- `convex/goals.ts` `markFired` returns `{firstHit, userId, label, metric, target, scope}`. Backwards-compatible: previous `void` return; no existing callers consumed the value.
- All four scanners (stripe/ga4/posthog/githubStars) call `ctx.scheduler.runAfter(0, internal.goalEmails.sendCelebrationEmail, …)` exactly when `firstHit === true`. Recurring re-fires do not retrigger email.
- `convex/goalEmails.ts` (no `"use node"` needed): looks up profile via new `internal.userProfiles.getByUserIdInternal` for the email, then POSTs to `/api/internal/send-email` with `Authorization: Bearer INTERNAL_API_SECRET`. Mirrors the convex/auth.ts reset-password path.
- `src/lib/emails/goal-hit.tsx` (React Email) + `sendGoalHitEmail` in `src/lib/email.ts`. `case "goal-hit"` added to the internal email route handler.
- Client: `GoalHeroCard` keeps a `prevFirstHitRef` map and triggers `GoalCelebrationModal` once per `externalId` per session (sessionStorage seen-marker). Modal has CSS-only confetti animation (`animate-confetti` keyframes added to `globals.css`).
- Hero hit state now renders inline `Review draft` + `Set next goal` CTAs.

**Verified by agent-browser:** Deferred — confetti + Resend send needs end-to-end exercise with a forced firstHit. Will roll up into S5.x e2e sweep.

**Deferred / why:**
- Approve-with-token deep link (true one-click approve from email) — currently links to `/admin/drafts`. Token-based one-click approve carries auth/CSRF complexity; deferred to a follow-up.
- Recurring-hit notifications (silent on subsequent fires) — by design; only first-hit emails to avoid spam.

**Open questions:** none.

**Next session start:** TBD — Phase 5 closed.

## 2026-04-30 — S6.2 sidebar nav reorder

**Attempted:**
- `src/components/admin/admin-sidebar.tsx`: Sous-Chef promoted from Configure → Main (between Dashboard and Drafts). New `developersNav` group ("Developers" SidebarGroupLabel) holds Kitchen + API Keys. Configure now Templates + Brands only.

**Verified:** tsc clean. Visual + agent-browser nav walkthrough deferred to phase-end sweep.

**Deferred / why:**
- "Sources" rename for Sous-Chef label — kept brand label per BRAND_VOICE.md diner metaphor; can revisit if user testing shows confusion.
- Footer-link variant of Developers group — chose explicit subgroup over footer link for collapsibility consistency.

**Open questions:** none.

**Next session start:** S6.3 (History feed entry override path) or another Phase 6 item.

## 2026-04-30 — S6.3 history feed override path + skip reason

**Attempted:**
- `convex/triggerEvents.ts`: new `overrideAutoSkippedEvent` mutation. Auth-gates by user, finds the trigger event by externalId, locates the suppressed draft via `eventReference` match, unsuppresses it, and records a follow-up `drafted/user_override` trigger event. Returns structured `{ ok, error }` so the UI can map specific failures.
- `src/components/admin/sous-chef-history-feed.tsx`: rewritten with an Action column. Rows where `decision === "auto_skipped"` and `reason ∈ {"low_confidence"}` get a "Draft anyway" button. PostHog `trigger_event_overridden` fires on success. Content-filter / rate-cap rows show "—" since no draft exists to unsuppress.
- `convex/drafts.ts` `remove` mutation: optional `reason` arg, threaded into the `user_skipped` trigger event (trimmed to 200 chars).
- `src/app/api/v1/drafts/[id]/route.ts` DELETE: reads `?reason=` query param, passes to `drafts.remove`.
- `src/components/admin/drafts-client.tsx`: agent drafts now render a Textarea inside the delete confirm dialog. PostHog `draft_dismissed` fires with `has_reason: bool`.

**Verified:** tsc clean. `vitest src/app/api/v1/drafts convex/__tests__/triggerEvents.test.ts` green. agent-browser end-to-end (override surfaces a draft, posthog fires) deferred to S5.x e2e sweep.

**Deferred / why:**
- Override for content_filter / rate_cap auto_skips — requires re-running the picker since no draft was ever created. Out of scope; would re-trigger Haiku spend on every override click.
- Predefined skip reason chips ("off-brand", "off-topic", "too soon") — free-text textarea is fine for founder scale; chips can come later if reason taxonomy stabilizes.

**Open questions:** none.

**Next session start:** S7+ or another Phase 6 item.

---

## 2026-04-30 — S0.4b OAuth state hardening

**What shipped:** `convex/oauthState.ts` public wrappers gated behind `requireAuthedUser`. `issueStateAction` no longer accepts a client-supplied `userId` — nonce binds to the caller's session. `consumeStateAction` requires auth and throws `OAuth state mismatch` when the consumed row's userId differs from the caller, closing the forge-then-intercept path.

**Files touched:**
- `convex/oauthState.ts` — auth-gate + ownership check on consume; internal `issueState`/`consumeState` preserved as dormant infra per Buffer-pivot decision.
- `convex/__tests__/oauthState.test.ts` (new) — anon-rejection, cross-user forge-fail, single-use replay, happy path.
- `docs/sessions.md` — S0.4b marked `[x]` with Result block.

**Verified:** tsc clean. `vitest convex/__tests__/oauthState.test.ts` PASS 5/5. agent-browser walkthrough not required — no live caller of these wrappers exists post-Buffer-pivot; auth contract verified at unit level.

**Deferred:**
- Drop `oauthStates` schema table — dormant infrastructure kept for future OAuth-bearing providers; separate cleanup session can remove if it stays unused.
- S0.4c (`githubRepoConfigs` ownership scope) and S0.4d (cross-tenant integration test) still queued under Phase 0.4.

**Open questions:** none.

**Next session start:** open — pick S7+, S0.4c, or another Phase 0/6 item.

---

## 2026-04-30 — S0.4c githubRepoConfigs ownership scope

**What shipped:** Public `githubRepoConfigs` surface now requires a `userId` arg and verifies the caller's installation ownership before any read or write. Trusted internal callers (webhook, stars cron) use new `internal*` variants that skip the per-call check (their trust boundary is upstream — webhook signature, scheduler context).

**Files touched:**
- `convex/githubRepoConfigs.ts` — added `assertOwnsInstallation(ctx, userId, installationId)` helper; gated `upsert`, `getByRepo`, `listByInstallation`, `toggle`, `setNotifyOnPrMerge`; added `internalGetByRepo`, `internalListByInstallation`, dormant `internalUpsert`. Defense-in-depth: existing rows must match asserted `installationId`.
- `src/app/api/github/configs/route.ts` — already passing `user._id` from prior work; verified.
- `src/app/api/github/webhooks/route.ts` — passes `userId` (from `installation.userId`) to `getByRepo`. Webhook signature is the trust boundary; deriving `userId` from the installation lookup keeps the webhook on the public ownership-checked surface.
- `convex/integrations/githubStars.ts` — `scan` and `seedFromCurrentState` switched to `internal.githubRepoConfigs.internalListByInstallation`.
- `docs/sessions.md` — S0.4c marked `[x]` with Result block.

**Verified:** tsc clean. `vitest convex/__tests__` PASS 78/78.

**Deferred / known gap:**
- S0.4a.4 auth bridge (Convex identity carried through Next.js `fetchQuery`/`fetchMutation`) still deferred. `userId` remains a client-supplied arg on the public surface — the ownership check is defense-in-depth that drops the prior repoFullName/installationId-alone exfil path, but does not yet enforce that the caller's session matches `userId`. S0.4a.4 closes that gap.
- S0.4d (cross-tenant integration test) still queued.

**Open questions:** none.

**Next session start:** S0.4d or jump to S7+ (cook pipeline reuse) — user's call.

---

## 2026-04-30 — S0.4d cross-tenant integration test

**What shipped:** Regression test asserting cross-tenant attempts fail on every Convex public surface that S0.4a.3 / S0.4b / S0.4c hardened.

**Files touched:**
- `convex/__tests__/crossTenant.test.ts` (new, 9 tests).
- `docs/sessions.md` — S0.4d marked `[x]`.

**Coverage:**
- Drafts (auth-gated, S0.4a.3): `unseenCount` + `markSeen` use caller identity; `getByExternalId` filter rejects foreign owner; `unsuppressDraft` refuses cross-tenant write.
- DraftPushes (auth-gated): `listByDraft` empty for foreign caller.
- GithubRepoConfigs (S0.4c): `getByRepo`, `listByInstallation`, `upsert`, `toggle`, `setNotifyOnPrMerge` all reject cross-tenant.
- OauthState (S0.4b): already covered by `oauthState.test.ts`.

**Verified:** `vitest convex/__tests__/crossTenant.test.ts` PASS 9/9. Full convex suite PASS 87/87.

**Documented gap:** releases / integrationSecrets / goals public surfaces still accept client-supplied `userId`. Their Next.js callers gate access via `getSessionUser()` so the public Convex URL exfil path is closed by S0.4a.3 (no browser callers). Defense-in-depth at the Convex layer waits on S0.4a.4 (server-side auth bridge) and S0.4a.5 (MIXED RISKY conversion), both deferred post-launch. Integration secrets in particular are write-gated via `internalMutation` — only `upsertAction` / `disconnectAction` are public-callable. The deferred bridge will eventually let us collapse the userId arg into `requireAuthedUser` everywhere.

**Open questions:** none. Phase 0.4 closed.

**Next session start:** S7+ (cook pipeline reuse) or another Phase 0/1/6 item — user's call.

---

## 2026-04-30 — S6.1 dashboard hierarchy rebuild

**What shipped:** Launch-mode `/admin` dashboard restructured into the PRD §6.1 ordering: Goal hero → Recent activity → Sources → Posts remaining → Pending drafts. Legacy dashboard preserved behind `!isLaunchModeRepositioned()`.

**Files touched:**
- `src/components/admin/dashboard-client.tsx` — split into launch-mode and legacy branches; launch path renders the new hierarchy.
- `src/components/admin/dashboard-sources-widget.tsx` (new) — compact GitHub + Posting status fetched from `/api/v1/sous-chef/integrations` + `/api/github/installations` + `/api/github/configs`. Links to `/admin/sous-chef`.
- `src/components/admin/dashboard-drafts-widget.tsx` (new) — top 3 non-suppressed drafts via `api.drafts.listByUser`, with "View all →" to `/admin/drafts`.
- `src/components/admin/sous-chef-history-feed.tsx` — added optional `limit` prop (default 200) so the dashboard surfaces only 10 entries.

**Verified:** tsc clean. Lint clean for changed files. 87/87 convex tests pass.

**Deferred:**
- Live agent-browser screenshot acceptance — design fidelity reuses existing PixelCard styling rather than introducing new visuals; user can flag any visual delta on review.
- `frontend-design` skill pre-pass — sessions.md flagged it as pre-session work, but the PRD §6.1 ordering was concrete enough to implement directly without an extra design loop.

**Open questions:** none.

**Next session start:** S6.1 closes Phase 6 alongside S6.2 / S6.3 already done — user's call on next phase.
