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
