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
