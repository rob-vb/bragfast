# brag.fast — Gap Audit vs PRD

**Created:** 2026-04-30
**Source of truth:** [`PRD.md`](../PRD.md) (sections referenced inline)
**Purpose:** Reference document mapping current code reality to PRD target state. Every implementation session should re-read the relevant section before starting work.

---

## A. Homepage + Public Marketing Surfaces

**Current state.**
`src/app/page.tsx` has two full sections promoting MCP and REST API as first-class product pillars (sections with ids `#mcp` and a REST API section at lines 193–267). The MCP section includes `<McpInstallInstructions>` with a hardcoded `mcp.brag.fast/mcp` URL and a "Read MCP docs" CTA that links to `/docs`. The footer (`page.tsx:507-544`) lists: Docs, Pricing, Demo, Support, Terms, Privacy. The hero copy at line 80 says "30 credits. No credit card required." The pricing section on the homepage and `src/app/pricing/page.tsx` are entirely credit-denominated: "Images: 1 credit each. Videos: 5 credits each." Plan names (Toast $12, Full Plate $29, Buffet $79) already match PRD prices. FAQs on both pages discuss credits, MCP, and the REST API as top-level features. The meta description at `page.tsx:15` reads "brag.fast turns your wins into branded images and video."

`src/app/pricing/page.tsx` has an "Install MCP" button as a secondary CTA in the final CTA section (line 368). The pricing FAQ at line 38 mentions MCP/agent integration prominently. The `src/app/docs/page.tsx` is a full publicly-linked API reference (`/docs` in main nav).

**Target state.** PRD §12. New one-liner: "Building in public, automated." Hero leads with the loop (PR merge → notification → approved post). Pricing tiers presented with builder-outcome bullets, not feature lists. MCP/API moves to a footer "Developers" link only.

**Gap:** NEEDS-REWRITE

- Entire MCP homepage section (`page.tsx` lines 193–225) → delete
- Entire REST API section (`page.tsx` lines 227–268) → delete
- Hero sub-copy "30 credits" → "30 posts lifetime"
- All credit language → posts language
- FAQ item "Will video eat all my credits?" → replace
- FAQ item on MCP/agent at `page.tsx:31-33` → delete
- Pricing section: `plan.credits` → `plan.posts`
- Footer: rename "Docs" → "Developers"
- `src/app/pricing/page.tsx` "Install MCP" CTA → remove
- `src/app/pricing/page.tsx` FAQ item on MCP → remove
- Landing nav (`src/components/landing/landing-nav.tsx`) Docs link → demote/rename
- `src/app/coming-soon/page.tsx` — generic placeholder, no purge needed

**Risk notes.** MCP referenced across homepage, pricing page, landing nav, and the WebMCP provider that injects `navigator.modelContext` browser-side. `src/components/landing/mcp-install-instructions.tsx` used only by homepage — safe to delete. `WebMcpProvider` at `src/components/webmcp-provider.tsx` (loaded globally via `src/app/layout.tsx:78`) must be removed/hidden without breaking the underlying MCP server.

---

## B. Onboarding Flow

**Current state.**
Sign-up at `src/app/(auth)/signup/page.tsx` is a standard email/password + social form. After submission it redirects to `/admin`. There is no multi-step wizard; user lands directly on the dashboard. An `OnboardingChecklist` (`src/components/admin/onboarding-checklist.tsx`) offers three static steps: "Create your brand," "Pick a template," "Generate your first image" — none mention GitHub OAuth or build-in-public framing. The GitHub App install flow exists as `src/app/api/github/callback/route.ts` (links installationId to user) and the Sous-Chef wizard at `src/components/admin/sous-chef-wizard.tsx` is a 7-step accordion: intro → GitHub → Stripe → PostHog → GA4 → goals → done. This wizard is buried in `/admin/sous-chef`, not surfaced on first login. The GitHub App install callback redirects to `/admin/account`, not to any wizard step.

**Target state.** PRD §5: paste public repo URL → watermarked preview → GitHub OAuth → GitHub App install (select repos by default) → repo picker → retro PR auto-rendered → approval → destination → brand/goal/integration prompts.

**Gap:** MISSING (the PRD wizard is entirely absent)

Specifically missing:
- Public repo paste → watermarked draft preview (no preview, no watermark)
- GitHub OAuth as step 1 (currently optional post-signup)
- Repo picker with "select repositories" default UX
- Retro PR auto-rendered on first login
- Wizard routing after sign-up (`/signup` → wizard, not `/admin`)
- Destination step at onboarding time (clipboard/Buffer/Postiz)
- Brand and goal prompts embedded in wizard

`SousChefWizard` covers steps 2-6 semantically but is not the right entry point.

**Risk notes.** GitHub callback currently sends user to `/admin/account`. Any new wizard must intercept this redirect. Retro PR feature requires running `composeCopy` on historical PRs — currently only fires on live webhook events. Watermarked preview on a public repo URL is net-new and requires either a public-auth Haiku call path or unauthenticated draft preview route.

---

## C. Triggers

**Current state.**
Five trigger sources wired and working:

1. **GitHub PR merge** — `src/app/api/github/webhooks/route.ts` handles `pull_request` events, enforces 10-drafts/day/repo cap, 30-min debounce rollup, calls `composeCopy` + `pickTemplate` via `after()`.
2. **Stripe** — `convex/integrations/stripe.ts`: `scan` + `scanAll` + `seedFromCurrentState`. MRR, total revenue, subscriber count, first sale. Daily cron 15:00 UTC.
3. **PostHog** — `convex/integrations/posthog.ts`: unique visitors via HogQL. Daily cron 15:05 UTC.
4. **GA4** — `convex/integrations/ga4.ts`: Google service account JWT, total users 30d. Daily cron 15:07 UTC.
5. **GitHub stars** — `convex/integrations/githubStars.ts`. Daily cron 15:10 UTC.
6. **Manual** — Kitchen at `/admin/kitchen` for user-initiated image generation via cook endpoint.

**Not wired:**
- Manual "draft from scratch" trigger in PRD sense (paste any win text → Haiku draft). Kitchen generates rendered image, not a text draft awaiting approval.
- PostHog as a *product analytics trigger* for brag.fast itself: only `$pageview` is captured today.

**Target state.** PRD §3: GitHub PR (DONE), Stripe (DONE), PostHog (DONE), GA4 (DONE), manual (PARTIAL). Generic webhook deferred post-launch.

**Gap:** PARTIAL — automated sources wired; manual trigger needs a "compose a post" path producing a draft.

---

## D. Pricing + Billing

**Current state.**
`src/lib/plans.ts` defines four plans: `trial` (0, 30 credits), `starter`/Toast ($12, 200 credits), `pro`/Full Plate ($29, 800 credits), `scale`/Buffet ($79, 2500 credits). Plan names + prices match PRD. Unit is **credits**, not **posts/month**.

`convex/schema.ts` `userProfiles` has `creditsRemaining: v.number()` and `plan`. `convex/stripe.ts` `handleInvoicePaid` resets `creditsRemaining` to plan credit count. `handleSubscriptionChange` sets credits on subscribe. Credit deduction in `convex/userProfiles.ts:55-61` (`Insufficient credits` error). Reservation in `src/app/api/v1/cook/_shared.ts:142` `reserveCreditsOrError`. `calculateCredits` in `src/lib/types.ts`, called from image + video cook routes.

Credits referenced in **30+ places**:
- `convex/stripe.ts` (PLAN_CREDITS map, 3 mutations)
- `convex/userProfiles.ts` (deduct, refund mutations)
- `convex/videoRender.ts` (partial refund on failed formats)
- `src/app/api/v1/cook/image/route.ts`, `video/route.ts`, `_shared.ts`
- `src/lib/pipeline/render.ts`, `render-video.ts`
- `src/lib/types.ts` (`calculateCredits`)
- `src/app/(admin)/admin/account/page.tsx`
- `src/components/admin/dashboard-client.tsx`
- `src/components/admin/credit-meter.tsx`
- `src/components/kitchen/cook-results.tsx`
- `src/app/page.tsx`, `pricing/page.tsx`
- `src/app/terms/page.tsx`, `privacy/page.tsx`
- `src/lib/docs/api-reference.ts`

**Target state.** PRD §4: posts/month + tier-bounded format scope. Toast 30 posts/mo (1 source, 1 platform, 1 format). Full Plate 100 (3 sources, 2 platforms, 3 formats). Buffet 500 (unlimited sources, video). Free = 30 posts lifetime.

**Gap:** NEEDS-REWRITE — credit model deeply embedded.

**Risk notes.** Highest-risk rewrite. Credits load-bearing in: Stripe webhook (resets `creditsRemaining` on `invoice.paid`), video pipeline (partial refunds), cook routes (reserve-then-refund), schema, all admin UI. Migrating to posts/month also changes what "consumed unit" means — currently 1 image = 1 credit per format, 1 video = 5 credits per format. PRD's "1 post = 1 unit regardless of formats" changes accounting shape entirely. Stripe price IDs may need re-creation if subscription metadata changes. Credits *stay* on API/MCP surfaces per PRD §4 — must keep the credit infrastructure dual-running but route consumer surfaces to posts.

---

## E. Drafts + Approval + Destinations

**Current state.**
- `convex/drafts.ts` — full CRUD; `insertDraftIfNew` for idempotent Sous-Chef inserts; `appendPrMergeRollup` for debounce; `unseenCount` + `markSeen` for badge.
- `convex/draftPushes.ts` — `approveDraft` mutation creates `draftPushes` rows for each (format × provider × channel), schedules `pushFanout`. Approve modal at `src/components/admin/approve-draft-modal.tsx` collects: title (editable), description, format selections, Buffer/Postiz channel selections, queue vs draft.
- `convex/pushFanout.ts` — processes pending push rows, decrypts integration secrets, dispatches via `src/lib/integrations/push.ts`, handles 3-attempt exponential backoff.
- `convex/refreshChannelsAction.ts` — daily channel list refresh.
- **Buffer**: `src/lib/integrations/buffer/client.ts` + `push.ts` — API key-based (pivoted from OAuth 2026-04-29).
- **Postiz**: `src/lib/integrations/postiz/client.ts` + `push.ts` — instance URL + API key.
- **Clipboard**: NO clipboard-as-destination at approval time. Social copy on `releases` table is a post-hoc addition to *rendered images*, not a drafts approval destination.

**Target state.** PRD §2: Haiku draft → user approval → handoff to Buffer/Postiz/clipboard. Clipboard must be a first-class approval destination.

**Gap:** PARTIAL

- Buffer: DONE
- Postiz: DONE
- Clipboard at approval: MISSING
- `mediaUrl` in `draftPushes` is set to `""` at approve time (`draftPushes.ts:189`), meaning draft must be cooked before approval or push fails with `errorClass: "media"`. `TODO(post-U8)` acknowledges this gap.

**Risk notes.** Approval flow currently requires pre-rendered image. PRD flow: Haiku draft → approval → render-then-push. Implementing clipboard requires fork in `approveDraft` (no push row, return copy text). Media gap unwinds the coupling between drafts and releases.

---

## F. Dashboard Surfaces

**Current state.**
Admin sidebar (`src/components/admin/admin-sidebar.tsx`) main: Dashboard, Kitchen, Drafts, History. Configure: Templates, Brands, Sous-Chef, API Keys.

Dashboard (`/admin`): CreditMeter, three stat cards (Used/Month, Releases, Images), Recent Releases table. Primary surface = credit meter + release history.

History (`/admin/history`): rendered releases (images/videos), not posts history.

Sous-Chef (`/admin/sous-chef`): integrations management with 7-step wizard.

No Sources page. No Goals standalone page — embedded in Sous-Chef accordion per integration.

**Target state.** PRD §7. Visual hierarchy: Goal hero card → History feed → Sources → Posts remaining → Pending drafts. History feed is the institutional-memory moat.

**Gap:** NEEDS-REWRITE

- Dashboard → history-feed-first, not credit-meter-first
- "Recent Releases" (rendered images) ≠ "posts history" (approved + published)
- Add Sources page in nav
- Goals: dedicated surface or top-level nav, not buried in accordion
- Credit meter → posts-used meter, secondary position
- Sidebar to purge from main: API Keys (move to dev section), Kitchen (deprioritized)

---

## G. Goals

**Current state.**
`convex/goals.ts`: `create`, `remove`, `setEnabled`, `disableGoal`, `listByUser`, `listEnabledByUserProvider`, `seedDefaultsForProvider`.

Schema (`convex/schema.ts:296-322`): provider (stripe/posthog/ga4/github), metric (mrr/total_revenue/subscribers/first_sale/visitors/stars), target, scope, label, enabled.

UI: `src/components/admin/goals-section.tsx` — rendered inside each integration accordion. Goal list with progress bar, toggle, delete. Add dialog with metric/target/scope/label.

`src/lib/goals/defaults.ts` — seeds defaults on integration connect.

Firing: daily scans check goals; when crossed, `disableGoal` is called (auto-disables after firing).

**Target state.** PRD §6: Single hero card per goal, structured form (Category → Metric → Threshold), Toast cap of 1 active goal, custom category for non-integration metrics. Goal-hit celebration: in-app screen + email + auto-draft + "next goal?" prompt.

**Gap:** PARTIAL

- Multi-goal CRUD: DONE
- Single hero card UX: MISSING
- Toast cap of 1: MISSING
- Goals as standalone page / primary nav: MISSING
- Custom category (no integration): MISSING (current schema requires provider)
- Goal-hit celebration: MISSING (silent disable)

**Risk notes.** Auto-disable on fire conflicts with PRD's "persistent retention surface." Schema migration likely needed (`firedAt` + recurring-goal pattern). Custom category breaks the provider-required schema.

---

## H. Voice Calibration + Per-Platform Copy

**Current state.**
`src/lib/drafts/compose-copy.ts` — Haiku compose accepts optional `brandName?`, `brandVoice?`. Passed as `brandLine()` in prompt but never populated from a stored profile. No `userProfiles.brandVoice` field. No approval-feedback loop.

Per-platform copy: `releases` table has `socialCopy: v.optional(v.string())` (JSON: twitter, linkedin). Exists on rendered releases, not drafts. Populated via `src/app/api/v1/cook/[id]/copy/route.ts` PATCH endpoint, visible in `history-table.tsx`. Post-render copy, not pre-render Haiku drafting.

Confidence scoring: not implemented anywhere.

**Target state.** PRD §8. Voice trains from approvals (recent approvals as few-shot examples). 4 voice presets for new users. Per-platform copy = two Haiku calls per trigger. Confidence score 0-1 from Haiku, suppression below threshold (PRD §9 Layer 3).

**Gap:** MISSING

- `brandVoice` field signature exists but wired to nothing
- No voice profile in schema
- No approval-feedback loop
- No confidence scoring
- Per-platform copy at draft level: MISSING (currently only at release level)
- 4 voice presets for new users: MISSING

**Risk notes.** Training voice from approvals requires storing edit deltas (kept vs original copy) + periodic synthesis or live few-shot. Touches webhook handler + all 3 scan integrations + compose-copy library. Per-platform draft copy doubles Haiku calls and changes draft schema.

---

## I. Safety Layers

**Layer 1 (pre-render content filter):** MISSING. No filter before draft creation. `compose-copy.ts` sends PR titles/bodies directly to Haiku.

**Layer 2 (PR title visible on approval):** PARTIAL. Draft name is `copy.title` from composed copy. Raw PR title in `draftConfig.notes: "Sous-Chef: PR #X merged..."`. Not surfaced prominently.

**Layer 3 (confidence score + suppression):** MISSING. No confidence computed, no suppression.

**Layer 4 (deferred per PRD).** No action.

**Layer 5 (tenant isolation audit):** PARTIAL. Every Convex query/mutation checks `userId` (e.g., `drafts.ts:65, 143, 222`). `integrationSecrets` indexed `by_userId`. No formal audit, no automated cross-tenant test.

**Layer 6 (preview safety: watermark, rate limit, bragfast.txt):** MISSING. No watermark, no `bragfast.txt`, no preview-specific rate limiting (only API auth limits). Public preview path itself doesn't exist.

**Risk notes.** Layer 1 inserts into webhook hot path — latency-sensitive. Layer 6 requires building unauthenticated preview endpoint + watermarking in canvas renderer + `bragfast.txt` protocol from scratch.

---

## J. PostHog Instrumentation

**Current state.**
`src/components/posthog-provider.tsx`:
- `autocapture: true` (PRD requires `false`)
- `capture_pageview: false` (manual via `PageviewTracker`)
- Only captures `$pageview`. Conditional on `NEXT_PUBLIC_VERCEL_ENV === "production"`.

No `posthog.identify()` calls anywhere. No custom events fired anywhere.

**Target state.** PRD §13: 14 events (snake_case past-tense), person profiles on, autocapture off, `identify()` immediately after signup, 4 North Star insights.

**Gap:** MISSING — essentially the entire analytics plan.

**Risk notes.** Flipping `autocapture: false` breaks any dashboards built on autocapture data. `posthog.identify` needs hook into auth-success path (no existing hook). Mis-instrumentation undermines launch's North Star insights.

---

## K. MCP/API Surfaces

**Current state.**
`src/app/api/v1/`: 31 route files (cook image/video, brands, templates, drafts, goals, uploads, sous-chef integrations, routing-defaults, API keys, account, fonts, motion-presets).

MCP server external at `https://mcp.brag.fast/mcp`. `WebMcpProvider` (`src/components/webmcp-provider.tsx`) injects browser-side `navigator.modelContext`.

Public nav: landing nav (`landing-nav.tsx:48`) → `/docs`. Homepage has dedicated MCP + REST API sections. Footer "Docs."

**Target state.** PRD §12: MCP/API stays running, disappears from public surfaces. Footer "Developers" link only.

**Gap:** NEEDS-PURGE on public surfaces; DONE on keeping API running.

- `/docs`: stays, demote from main nav
- MCP homepage sections: purge (see §A)
- Footer "Docs" → "Developers"
- `mcp-install-instructions.tsx`: delete
- `WebMcpProvider`: low-risk to leave (developer feature, browser-only)

---

## L. Retention Loop

**Current state.**
`convex/crons.ts`: 4 daily scan crons + 1 channel-refresh cron. No weekly digest. No annual recap.

Goal hit: silent draft insertion + sidebar unseen-badge. No celebration UI.

Email infra: `src/lib/email.ts` + `src/app/api/internal/send-email/route.ts` (Resend wired).

**Target state.** PRD §10: weekly Sunday digest, annual recap data infrastructure now (UI later), goal-hit celebration (in-app + email + auto-draft + "next goal?").

**Gap:** MISSING — entire retention loop absent.

**Risk notes.** Weekly digest: cron + per-user aggregation + email template. Annual recap: storage adequate (releases table) but no aggregation layer. Goal-hit celebration: real-time Convex subscription + celebratory UI state.

---

## Risk Register

Highest-risk rewrite areas, in priority order:

1. **Credits → posts model (D)** — 30+ files, schema migration, Stripe webhook reset logic, video partial refunds, dual model (consumer = posts, API = credits) running simultaneously. Resolve video pricing equivalence before any code.

2. **Onboarding wizard (B)** — Entirely absent. Unauthenticated public-repo preview + watermarking + multi-step gated wizard + retro-PR historical scan + GitHub OAuth-first sign-up + callback rerouting through wizard state. Largest surface area.

3. **Safety Layer 1 + 6 (I)** — Layer 1 in webhook hot path (latency). Layer 6 = new unauthenticated route through canvas renderer + `bragfast.txt` protocol. Both security-relevant.

4. **PostHog overhaul (J)** — 14 events from scratch, autocapture flip, identify hook into auth flow. Mis-instrumentation = lost launch data.

5. **Dashboard hierarchy (F)** — Distinguish "published posts" (draftPushes queued) from "renders" (releases). Build unified history feed. Sidebar reordering (Goals up, Kitchen/API down).

6. **Voice calibration (H)** — Schema field + approval-edit deltas + few-shot synthesis + populate at all call sites. Touches webhook + 3 scans + compose-copy.

7. **Clipboard destination (E)** — Fork in `approveDraft` (no push row path) + modal UX + decouple drafts from releases for social copy.

8. **MCP surface purge (A + K)** — Surgical removal across homepage, pricing, nav, FAQ while preserving running MCP server. `WebMcpProvider` decision.

9. **Goal UX overhaul (G)** — Hero-card layout + tier caps + custom (no-provider) category + celebration moment. Schema migration for persistent vs auto-disabled goals.

10. **`mediaUrl` gap in draft approval (E)** — `pushFanout` errors `errorClass: "media"` when `mediaUrl` empty. PRD flow demands draft → approval → render-then-push. Couples approval to cook pipeline.

---

## Summary

- **DONE / preserve:** Triggers (GitHub PR, Stripe, PostHog, GA4, GitHub stars), Buffer + Postiz push, drafts CRUD, goals CRUD, plan name/price scaffold, email infra.
- **NEEDS-REWRITE:** Credits→posts, public marketing copy, dashboard hierarchy.
- **MISSING (build new):** Onboarding wizard, public preview + watermark, content filter, confidence scoring, voice calibration, per-platform draft copy, weekly digest, goal-hit celebration, full PostHog instrumentation, custom-category goals, history feed primary surface.
- **NEEDS-PURGE:** MCP/API public mentions, "credits" language on consumer surfaces.
