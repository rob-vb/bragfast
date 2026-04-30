# Launch Readiness — brag.fast repositioning

**Created:** 2026-04-30
**Branch:** `repos/launch`
**Source:** PRD.md §14 build order checklist
**Author:** ce-work autonomous batch (Rob)

This is the truth-in-advertising audit before merge. Each PRD §14 box is marked
status + evidence. Items still red/yellow are explicit launch blockers.

Status legend: ✅ done · 🟡 partial · 🔴 not started · ⏭️ deferred post-launch

---

## Foundation

- ✅ PostHog project setup, person profiles, autocapture disabled, identify wired — `docs/conventions.md` + S0.6
- ✅ Naming conventions doc committed — `docs/conventions.md`
- 🟡 GitHub App scope: app config in repo points "select repositories" by default; needs verification on the live App settings page in github.com — manual check before deploy
- ✅ Tenant isolation audit — S0.4a/b/c/d, regression test in `convex/__tests__/crossTenant.test.ts`
- ✅ Sensitive content filter — Layer 1 in `src/lib/drafts/sensitive-filter.ts`
- ✅ Public surfaces purged of MCP/API/agent language — S1.x, homepage rewritten

## Backend

- ✅ Retro PR rendering on signup — `src/lib/github/retro-pr.ts`
- ✅ Per-platform copy — `composeCopyByPlatform` in `src/lib/drafts/compose-copy.ts`
- ✅ Confidence scoring + suppression — `compose-copy.ts` SUPPRESS_THRESHOLD + drafts.suppressed
- ✅ posts/month + format/platform/video accounting — `convex/planTiers.ts` + S2.7 gating in `approveDraft`
- ✅ Skipped-PR history — `convex/triggerEvents.ts` event log
- 🟡 Org-pending detection on GitHub install — basic flow exists; verify end-to-end before launch
- 🟡 Watermark + low-quality preview pipeline — preview path exists; watermark verification needed
- ⏭️ `bragfast.txt` opt-out — deferred post-launch

## Onboarding flow

- 🟡 Public-repo preview — preview limit + render path live; UX entry point needs verification
- ✅ GitHub OAuth signup
- ✅ Pre-install warning screen
- ✅ GitHub App install scoped flow
- 🟡 Org-pending fallback — needs end-to-end verification
- ✅ Repo picker
- ✅ Retro PR draft on signup
- ✅ Approval UI w/ confidence
- 🟡 Destination picker (Buffer / Postiz / Clipboard) — Buffer + Postiz live; **clipboard is S7.2 deferred**
- ✅ Brand → goal → integration prompt sequence

## Goal-setting UX

- ✅ Conversational modal — S5.x
- ✅ Structured form (category, metric, threshold)
- ✅ Single hero card — `GoalHeroCard`
- ✅ 1 active goal cap on Toast
- ✅ Goal-hit celebration: in-app + email + auto-draft + next-goal prompt — S5.x

## Dashboard rebuild

- ✅ Goal hero — primary
- ✅ History feed — secondary primary
- ✅ Sources + usage — `DashboardSourcesWidget`
- ✅ Posts remaining — `CreditMeter` w/ tier branch
- ✅ Pending drafts queue — `DashboardDraftsWidget`

(All from S6.1, behind `isLaunchModeRepositioned()` flag.)

## Pricing

- ✅ Three tiers Toast / Full Plate / Buffet — S2.7
- 🟡 Billing integration for new model — Stripe webhook resets `postsRemainingThisMonth`; **Q1 (price ID strategy) still open** in `docs/sessions.md`
- 🟡 Pricing page rewrite — copy live; verify after price-ID resolution
- 🟡 Source-cap upsell prompts — gating exists at approve; in-flow upsell copy at sources page needs verification
- 🟡 Format/platform/video gating in approval UI — **server enforcement complete (`convex/draftPushes.ts:172-261`); UI pre-disable is S7.3 deferred**

## Public narrative

- ✅ New homepage with builder-in-public framing
- ✅ One-liner "Building in public, automated."
- ✅ Hero leads with loop
- 🟡 Demo video — verify it shows PR merge → notification → approved post
- ✅ Pricing presented with builder outcomes
- ✅ Footer Developers link

## Analytics

- 🟡 All 14 events firing — **S10.1 deferred audit pass**; spot checks pass
- ⏭️ North Star dashboard — S10.2 deferred (PostHog console UI work)
- ⏭️ Launch-day cohort + baseline screenshot — S10.3 deferred (PostHog console UI work)

## Voice calibration

- ⏭️ `post_approved` edit data capture — S8.1 deferred
- ⏭️ Settings → Voice page — S8.4 deferred
- ⏭️ Few-shot recent approvals — S8.3 deferred
- 🟡 4 voice presets — **S8.2 schema field + helper landed; settings UI + Haiku wiring deferred to next iteration**

## Weekly digest

- ⏭️ Sunday cron + template + email — S9.1 deferred
- ✅ Annual recap data layer — S9.2 query landed in `convex/triggerEvents.ts:aggregateForYear`

## Pre-launch checklist

- ⏭️ Soft-launch to friends — S11.1 not autonomous; user-driven
- ⏭️ Baseline North Star screenshot — depends on S10.2
- ⏭️ Pre/post launch cohorts in PostHog — depends on S10.2
- ⏭️ Four target lines set — depends on S10.2
- 🟡 Migration plan for existing free-tier users — `backfillToNewAccounting` in `convex/userProfiles.ts`; run manually at launch

---

## Safety layer status (PRD §9)

- ✅ Layer 1 — Pre-render content filter
- ✅ Layer 2 — Approval UI safeguards
- ✅ Layer 3 — Confidence-gated suppression
- ✅ Layer 5 — Tenant isolation audit (S0.4a/b/c/d + regression test)
- 🟡 Layer 6 — Public preview safety (preview rate limits live; watermark verification pending)

---

## Launch blockers (must resolve)

1. **Q1 (Phase 4)** — Stripe price-ID strategy (re-map metadata vs new prices). Until resolved, billing for new tiers is incomplete.
2. **S7.1** — Auto-cook on approve when render missing. Current behavior fails with helpful "cook before approve" message; acceptable but degrades agent/MCP approval UX. **Blocker if MCP/agent approve path is in scope for launch; not a blocker if launch is dashboard-only.**
3. **GitHub App scope verification** — confirm "select repositories" default on github.com App settings.
4. **Demo video** — verify content matches PR-merge → notification → approved-post narrative.

## Acceptable degradations at launch

- S7.2 clipboard destination → workaround: copy from approve modal manually; restore in next iteration.
- S7.3 UI pre-disable → server returns clear error toasts on disallowed combos; users learn from feedback rather than visual hint.
- S8.x voice calibration → static voice presets infra ready; actual learning loop next iteration.
- S9.1 weekly digest → in-product history feed covers retention near-term.
- S10.x PostHog dashboard → metrics are flowing; dashboard is reporting, not feature.

## Recommended action

Ship `repos/launch` → `main` once **Q1 + GitHub App scope + demo video** are resolved.
S7.1 / S7.2 / S8.x / S9.1 / S10.x carry forward as labeled iteration items
post-launch.

---

*See `docs/sessions.md` for per-session disposition and `docs/log.md` for chronological work record.*
