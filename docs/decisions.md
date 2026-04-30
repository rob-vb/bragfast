# Decisions Log — brag.fast Repositioning

Append-only ledger. PRD.md is strategic source-of-truth; this file captures implementation-level decisions surfaced during build that aren't in PRD.

Format:
```
## YYYY-MM-DD — <short title>
**Context:** <what triggered the decision>
**Options considered:** <alternatives>
**Decision:** <what was chosen>
**Rationale:** <why>
**PRD impact:** <none | clarifies §X | conflicts with §X — see below>
```

---

## 2026-04-30 — Q1–Q5 launch-plan answers (Session 0 carry-overs)

**Context:** Five questions left open in Session 0 logs. Resolved before resuming S2.7 + S2.8.

**Q1 — Stripe price strategy:** Keep current Stripe prices. Version entitlements in Convex via new `userProfiles.planVersion: 1 | 2`. New signups → v2; old subs → v1 until migration event. Rationale: Stripe price-IDs map $/cadence only; entitlement bundles already live in app code. No $ change → no need for new Stripe Price objects. Avoids Stripe-dashboard duplication, invoice rename, and webhook re-routing. Re-creating prices buys nothing unless $ amount changes (Stripe Price.amount is immutable) or Stripe metadata is the entitlement source-of-truth (it isn't here).

**Q2 — Video posts/month accounting:** Video and image both consume one `posts_used_this_month` slot. Single counter regardless of format. Per `.agents/product-marketing-context.md` line 17, Buffet "1 video per post" — video is rendered alongside post, not separately quotaed. Aligns with stated value metric: "post = one approved share, regardless of platforms or formats."

**Q3 — Kitchen disposition:** Keep. Stays in main admin sidebar, fully reachable. Rationale (user override 2026-04-30): power lives in agent drafting + showing options, but users still need a manual lane to cook one-off posts. Demoting it would amputate intended functionality, not just remove front-door confusion. Repositioning shifts the *primary* path (auto-draft) but doesn't deprecate manual cooking.

**Q4 — Clipboard `draftPushes` row:** Skip the DB row. PostHog event `draft_clipboard_copied` covers analytics. Clipboard copy is fire-and-forget client-side — no webhook, no failure mode, no retry, nothing to query against. DB row would be storage + write for zero downstream consumer.

**Q5 — Feature-flag granularity:** Single `LAUNCH_MODE` env var (already scaffolded in S0.1). No per-feature flags. Rationale: launch is one cohesive repositioning, not N independent rollouts. One env flip = full new product. Simpler, fewer combinatorial states to test.

**PRD impact:** none — all five clarify implementation-level choices not specified in PRD.

---

## 2026-04-30 — Defer server-side Convex auth bridge until post-launch (S0.4a.4/5)

**Context:** S0.4a.3 closed the externally exploitable tenant-isolation hole — browser-only RISKY Convex functions now derive `userId` from `requireAuthedUser(ctx)` instead of trusting a client-supplied arg. Anyone with the public Convex URL can no longer call `integrationSecrets.getByUserProvider` for an arbitrary `userId`. That was the P0.

S0.4a.4 was scoped to extend the same discipline to the 10 MIXED RISKY functions called from Next.js routes (`fetchQuery`/`fetchMutation`/`ConvexHttpClient`). Hit a design fork: those routes authenticate via `src/lib/auth/authenticate.ts`, which accepts either a Better Auth session cookie OR a Bearer API key. Better Auth's Next.js helper (`convexBetterAuthNextJs`) only mints a Convex JWT from session cookies — API-key callers have no Better Auth identity to forward.

**Options considered:**
1. **Two function variants per RISKY fn** — authed (browser) + internal-with-shared-secret (Next.js → Convex). Doubles function surface; perpetuates "trust this caller" pattern at the Convex layer.
2. **Mint Convex JWT from `BETTER_AUTH_SECRET`** for API-key paths in Next.js. Single function signature, but the secret becomes a subject-impersonation key — anyone with shell on the Next.js host can mint cross-tenant tokens. Blast radius: full takeover.
3. **Adopt Better Auth's api-key plugin** as the single source of truth. Migrate `apiKeys` table into Better Auth, refactor `authenticate.ts`, route every API call through Better Auth → Convex. Most secure + complete (revocation, scoping, audit, blast-radius bounded to one user). Largest migration; touches every `/api/v1` route + key issuance UI.
4. **Defer S0.4a.4/5; ship browser-only fix.** Server-side calls remain trusted because Next.js gates them — `authenticate()` runs before `userId` is computed, so external attackers must pass through it. Not externally exploitable; loses defense-in-depth at the Convex layer (a bug in a Next.js route that passes the wrong `userId` would silently leak cross-tenant data).

**Decision:** Option 4 for launch. Plan Option 3 as its own post-launch phase.

**Rationale:** S0.4a.3 already plugged the externally reachable surface. Server-side routes are not directly callable from outside; the only remaining exposure is a logic bug inside our own Next.js code, which is a quality issue, not an attacker entry point. Option 3 is the right end state but is multi-session work that doesn't earn its way onto the launch path. Option 2 introduces a worse blast radius than the gap it closes.

**PRD impact:** clarifies §safety Layer 5 — Convex-layer auth enforcement is partial at launch (browser callers only). Server-layer enforcement deferred. Tracking via `docs/audit.md` §M and `docs/sessions.md` S0.4a.4/5 (marked DEFERRED).

---

## 2026-04-30 — GitHub App scope guidance is user-side, not enforced (S0.5)

**Context:** PRD §safety Layer 5 calls for a "select repositories" default install scope. PRD §sessions S0.5 acceptance asks the install screen pre-select "Only select repositories." Investigated whether GitHub's `https://github.com/apps/{slug}/installations/new` endpoint accepts a parameter that pre-selects scoped install.

**Options considered:**
1. URL parameter — GitHub's install endpoint accepts `state`, `target_id`, `target_type`, `repository_ids`, `suggested_target_id`. None pre-selects the access mode (All vs. Select).
2. App manifest — no manifest file in this repo; manifest creation is a one-time GitHub UI flow. Existing app's defaults are set in App settings on github.com.
3. UI nudge — render guidance copy next to the install CTA telling the user to choose "Only select repositories."

**Decision:** Option 3. Add hint text under the Install button on `src/components/admin/github-section.tsx` and the Sous-Chef install surface. Cannot enforce server-side; GitHub presents both options unconditionally.

**Rationale:** GitHub doesn't expose a switch for default repo-access mode. The realistic Layer 5 mitigation is education at the install moment + the planned org-pending detection (PRD §safety, also covers `github_app_install_blocked` event). Pairs with later S0.4c (server-side ownership scoping on `githubRepoConfigs`).

**PRD impact:** clarifies §safety Layer 5 / §sessions S0.5 — agent-browser cannot verify "pre-selected" because GitHub never pre-selects. Acceptance reframed: user-facing copy is present, sent in PR.

