# brag.fast Repositioning — Session Plan

**Created:** 2026-04-30
**Source:** PRD §14 build order, expanded from `docs/audit.md`.
**Cadence:** Solo, evenings/weekends. Each session sized to fit 2–4 hrs focused work.
**Branch strategy:** All work on `repos/launch` branch (or worktrees off it). No deploys to prod until all sessions complete and user explicitly signs off (PRD §14: single launch).
**Verification:** Every session ending in observable change must be confirmed via agent-browser. No "trust the code."

Status legend: `[ ]` pending · `[~]` in progress · `[x]` complete · `[!]` blocked.

Complexity: **S** ≤2 hr · **M** 2–4 hr · **L** 4–6 hr (split before starting) · **XL** plan-needed.

---

## Phase 0 — Foundation (unblocks everything)

### S0.1 — Create launch branch + feature-flag scaffold · S — `[x]` 2026-04-30
- Goal: `repos/launch` branch off `main`. Add `NEXT_PUBLIC_LAUNCH_MODE` env (`legacy` | `repositioned`) plus a tiny `isLaunchModeRepositioned()` helper to gate new surfaces.
- Acceptance: branch exists; helper imported in one file (no behavior change yet).
- Deps: none.
- **Result:** Branch live; `src/lib/launch-mode.ts` + `data-launch-mode` attribute on homepage root. Verified via curl. `.env.example` edit blocked (tool permission); helper defaults to `legacy`, safe.

### S0.2 — Naming conventions doc · S — `[x]` 2026-04-30
- Goal: `docs/conventions.md` codifying PRD §13 (events `snake_case` past-tense, properties `snake_case`, no PII, identify-before-capture, autocapture off).
- Acceptance: file committed; referenced from CLAUDE.md.
- Deps: none.

### S0.3 — PostHog wiring overhaul · M — `[x]` 2026-04-30
- Goal: flip `autocapture: false` (`src/components/posthog-provider.tsx`); add `posthog.identify()` hook in auth-success path with person properties (`signup_date`, `signup_source`, `github_app_installed`, `source_count`, `plan`); enable person profiles in PostHog project.
- Acceptance: agent-browser signs up a fresh user → PostHog → person profile appears with all five properties; no autocapture events firing.
- Deps: S0.1.

### S0.4 — Tenant isolation audit (Layer 5) · M — `[x]` 2026-04-30 (audit only; enforcement split out)
- Goal: Walk every Convex query/mutation, confirm `userId` enforcement; written audit summary in `docs/audit.md`.
- Outcome: audit done in `docs/audit.md` §M. Enforcement is missing system-wide — split into S0.4a–d below. Original "cross-tenant test" acceptance moved to S0.4d (post-enforcement).

### S0.4a — Convex auth enforcement: data reads/writes · M (split into 5 sub-sessions)
- Goal: replace client-supplied `userId` args with `requireAuthedUser(ctx)` across all RISKY functions in `docs/audit.md` §M.
- Acceptance: every RISKY function listed in audit §M derives userId from auth; typecheck + existing tests green.
- Deps: S0.4 (audit).
- Sub-sessions:
  - S0.4a.1 — wire `ConvexBetterAuthProvider` so browser carries Better Auth tokens to Convex. `[x]` 2026-04-30
  - S0.4a.2 — add `requireAuthedUser(ctx)` helper in `convex/auth.ts` (subject-based). `[x]` 2026-04-30
  - S0.4a.3 — convert browser-only RISKY: `drafts.unseenCount`, `drafts.markSeen`, `draftPushes.{approveDraft,listByDraft,retryPush}`. `[x]` 2026-04-30
  - S0.4a.4 — server-side auth bridge. **DEFERRED to post-launch** (decision 2026-04-30). Server-side `fetchQuery`/`fetchMutation`/`ConvexHttpClient` calls go through Next.js, which gates them via `authenticate()` (API key or session) before computing `userId`. Not externally exploitable — the public-Convex-URL exfil path is closed by S0.4a.3. Defense-in-depth at Convex layer postponed until Better Auth api-key plugin migration (option C) is planned as its own phase.
  - S0.4a.5 — convert MIXED RISKY. **DEFERRED with S0.4a.4.** Same rationale.

### S0.4b — OAuth state issue/consume hardening · S
- Goal: gate `oauthState.issueStateAction` / `consumeStateAction` behind authed entry; remove the forgery surface where any caller can mint a CSRF state for any userId.
- Acceptance: forging a state nonce for another userId fails; OAuth happy path still works.
- Deps: S0.4a.

### S0.4c — `githubRepoConfigs` ownership scope · S
- Goal: every `githubRepoConfigs` mutation/query verifies the caller's installation ownership. Drop reliance on `repoFullName`/`installationId` alone.
- Acceptance: caller cannot toggle another user's repo config.
- Deps: S0.4a.

### S0.4d — Cross-tenant integration test · S
- Goal: vitest test creates two users, attempts cross-tenant reads/writes on drafts, releases, integrationSecrets, goals; asserts every attempt fails.
- Acceptance: test suite green.
- Deps: S0.4a, S0.4b, S0.4c.

### S0.5 — GitHub App scope = "select repositories" default · S — `[x]` 2026-04-30 (UI hint only — see decisions.md)
- Goal: update App manifest / config so install screen defaults to scoped, not "all repositories."
- Outcome: GitHub doesn't accept a URL/manifest param to pre-select scope. Added install-time guidance copy under the install CTA in `github-section.tsx`. Decision recorded in `docs/decisions.md` (2026-04-30 entry). Acceptance reframed.
- Deps: none.

### S0.6 — Pre-render content filter (Layer 1) · M — `[x]` 2026-04-30
- Goal: insert keyword + small LLM check before `composeCopy` in: webhook handler + Stripe/PostHog/GA4 scans. Sensitive matches → store as `suppressed_sensitive` event in history feed, do not draft.
- Acceptance: simulate PR titled "fix CVE in auth" → no draft generated; history feed entry visible. Agent-browser confirms.
- Deps: S0.3 (PostHog event firing).

---

## Phase 1 — Public-surface purge

### S1.1 — Remove MCP/API from homepage · M [x] 2026-04-30
- Goal: delete MCP section + REST API section from `src/app/page.tsx`; update meta description; remove MCP/API FAQ items; delete `src/components/landing/mcp-install-instructions.tsx`.
- Acceptance: agent-browser screenshots `/` — no MCP, no API, no agent language.
- Deps: S0.1.

### S1.2 — Footer rename + nav demotion · S [x] 2026-04-30
- Goal: footer "Docs" → "Developers"; landing nav Docs link demoted (footer-only or aria-hidden on hero nav).
- Acceptance: agent-browser confirms nav + footer updated.
- Deps: S1.1.

### S1.3 — Pricing page MCP/credits purge (copy only — model rewrite later) · M [x] 2026-04-30
- Goal: remove "Install MCP" CTA, MCP FAQ; keep credit-denominated copy as a temporary stub (full rewrite in Phase 4). Add comment-banner that file is mid-rewrite.
- Acceptance: agent-browser confirms MCP gone from `/pricing`.
- Deps: S1.1.

### S1.4 — README + GitHub App description + X bio purge · S [x] 2026-04-30 (README done; GH App + X bio queued for user)
- Goal: rewrite README around build-in-public framing; update GitHub App description; queue X bio change for user.
- Acceptance: README diff reviewed; user confirms X bio change queued.
- Deps: S1.1.

---

## Phase 2 — Backend capabilities (unblock new UX)

### S2.1 — Confidence scoring on Haiku · M [x] 2026-04-30
- Goal: Extend `composeCopy` to return `confidence: 0..1`. Persist on `drafts` row. Suppress drafts below 0.5 with override path (history-feed entry shows score + "Draft anyway").
- Acceptance: agent-browser triggers a low-confidence simulated PR → history shows skipped entry; clicking override creates draft. PostHog `draft_generated{was_suppressed:true}` fires.
- Deps: S0.3, S0.6.

### S2.2 — Per-platform copy generation · M [x] 2026-04-30
- Goal: Two Haiku calls per trigger (X + LinkedIn). Persist as two draft fields. Approval modal renders both. Per-user platform-disable in settings.
- Acceptance: agent-browser approves a draft → both platform copies visible and editable.
- Deps: S2.1.

### S2.3 — Skipped-PR history storage · M [x] 2026-04-30
- Goal: Event log table queryable for history feed: every trigger seen (PR/scan/manual) stored with decision (`drafted` | `auto_skipped` | `user_skipped` | `approved` | `ignored_48h`), confidence, source IDs.
- Acceptance: agent-browser sees a feed row for every trigger event in dev.
- Deps: S2.1.

### S2.4 — Retro PR rendering on signup · M [x] 2026-04-30
- Goal: After GitHub App install + repo pick, fetch most-recent merged PR for that repo, run full pipeline (Layer 1 filter → composeCopy → confidence → draft + render with sample brand). Result available when wizard hits dashboard step.
- Acceptance: agent-browser signs up + installs → dashboard load shows pre-rendered draft.
- Deps: S2.1, S2.2, S0.6.

### S2.5 — Org-pending detection on install · S [x] 2026-04-30
- Goal: GitHub callback detects org-admin-pending state; surface "Send admin install request?" + personal-repo fallback option.
- Acceptance: agent-browser triggers org-pending callback (mocked) → fallback UI visible. PostHog `github_app_install_blocked{block_reason}` fires.
- Deps: S0.3.

### S2.6 — Watermark + low-quality preview pipeline · L (split into S2.6a–e)

**Pre-session decisions (2026-04-30):**
- **Render path:** reuse Satori + Sharp pipeline with a watermark composite step. Single format (square 1080×1080), JPEG quality 60, no video. Skip Haiku — preview uses raw PR title as headline (no copy-gen).
- **Cache:** R2 key = `preview/sha256(repoFullName + ":" + prNumber).jpg`. Public read. Lifecycle policy 7d TTL. Cache hit → 302 to R2 URL; miss → render synchronously then upload.
- **Rate limit:** existing `rateLimits` Convex table. Key = `preview:ip:{ip}`. Window: 10/hour, 50/day. IP from `x-forwarded-for` first hop with same trust as Better Auth uses.
- **GitHub fetch:** unauthenticated REST (`api.github.com/repos/{r}/pulls?state=closed&base={default}`). 60/IP/hr is GitHub's cap — when exhausted, return 503 with retry-after. No installation token (preview is public).
- **`bragfast.txt` opt-out:** raw GitHub `https://raw.githubusercontent.com/{repo}/{default}/bragfast.txt`. Existence alone blocks (no parsing). 1h cache in Convex `previewBlocks` table or in-memory LRU.
- **Watermark:** Sharp composite — bottom-right corner, "brag.fast preview" text on semi-transparent dark bar, full image width across bottom 40px. Sub-text "sign up to remove watermark" under the brag bar.

#### S2.6a — Preview API scaffold + URL parser + rate limit · M  [x] 2026-04-30
- Goal: `POST /api/preview` accepts `{ repoUrl: string }`. Parse `github.com/{owner}/{name}` (any URL form). Validate. Hit rateLimits. Return `{ status, error? }` shape. No render yet.
- Acceptance: invalid URL → 400. Rate-limit exceeded → 429 with retry-after. Valid URL → 200 with stub `{ status: "ok" }`.
- Deps: S0.1.

#### S2.6b — `bragfast.txt` opt-out check · S  [x] 2026-04-30
- Goal: helper `isRepoOptedOut(repoFullName)` fetches raw `bragfast.txt`, caches result 1h. Wired into preview API before render.
- Acceptance: opt-out repo returns 403 with `reason: "opted_out"`. Vitest covers cache behavior.
- Deps: S2.6a.

#### S2.6c — Unauth PR fetch · S
- Goal: helper `fetchPublicLatestPr(repoFullName)` reuses `retro-pr.ts` shape but skips installation token. Handles 404 (private/missing) and 403 (rate-limited by GitHub) distinctly.
- Acceptance: public repo returns latest merged PR. Private repo → 404 surface. Rate-limit → 503.
- Deps: S2.6a.

#### S2.6d — Low-quality watermarked render + R2 upload · M
- Goal: new `renderPreview(pr, repoFullName)` — single square format, raw PR title + `repoFullName` body, watermark composite via Sharp, JPEG quality 60. Upload to R2 with 7d TTL key. Returns public URL.
- Acceptance: render output ≤80KB; watermark visible bottom-bar; cache key deterministic per `(repo, prNumber)`.
- Deps: S2.6a.

#### S2.6e — Cache lookup + wire end-to-end · S
- Goal: preview API checks R2 HEAD before rendering. Cache hit → return cached URL. Cache miss → run b → c → d → return URL.
- Acceptance: agent-browser pastes URL → first call renders, second call returns same URL <200ms (cache hit). Layer 1 content filter still gates render (PR title with secret → 422).
- Deps: S2.6a–d, S0.6.

### S2.7 — Plan accounting refactor: posts/month + format/platform/video gating · L (split)
- Goal: New `userProfiles.postsRemainingThisMonth` (subscription tiers) + `userProfiles.postsLifetime` (free tier). Per-tier format/platform/video caps enforced at approval time. Stripe webhook resets `postsRemainingThisMonth` on `invoice.paid`. Credits stay only on `/api/v1` cook routes (legacy paths).
- Acceptance: Toast user can't approve a video; Free user can't approve more than 30 posts lifetime; agent-browser confirms gating UI.
- Deps: S0.1.
- **Pre-session plan needed:** schema migration plan + Stripe price-ID strategy.

---

## Phase 3 — Onboarding wizard (Phase 2 must be done)

### S3.1 — Public preview hero on homepage · M
- Goal: Replace current hero with paste-repo-URL form → inline preview (calls S2.6 endpoint). PostHog `preview_repo_pasted` + `preview_render_started/completed`.
- Acceptance: agent-browser pastes a URL → sees preview within 5s; events fire.
- Deps: S2.6, S0.3.

### S3.2 — GitHub-OAuth-first signup · M
- Goal: `/signup` reduces to GitHub OAuth button (in-page popup). Email/password de-emphasized to "advanced" link. Redirect post-OAuth → wizard step 2 (pre-install warning).
- Acceptance: agent-browser signs up via OAuth → lands on warning screen.
- Deps: S0.3.

### S3.3 — Pre-install warning + GitHub App install · S
- Goal: Full-screen warning screen ("GitHub will ask you to install. We only read PR titles..."); CTA → install flow.
- Acceptance: agent-browser flows through warning → install → callback.
- Deps: S0.5, S3.2.

### S3.4 — Repo picker (single repo) · M
- Goal: Post-install screen: list repos from installation, single selection, store in user profile.
- Acceptance: agent-browser picks repo → moves to retro-render step.
- Deps: S3.3, S2.4.

### S3.5 — Retro draft + approval UI on dashboard load · M
- Goal: First dashboard load after wizard shows pre-rendered draft (from S2.4). Approval UI: rendered post + raw PR title + first description line + confidence score + Approve/Edit/Skip CTAs.
- Acceptance: agent-browser hits dashboard → sees draft → can approve.
- Deps: S2.4, S3.4.

### S3.6 — Destination picker · M
- Goal: After Approve, modal: Buffer / Postiz / Copy + open X intent URL. None required to proceed.
- Acceptance: agent-browser approves with clipboard fallback → text copied + X compose URL opens.
- Deps: S3.5.

### S3.7 — Brand → Goal → Integration prompt sequence · M
- Goal: Three sequential post-activation prompts. Brand kit (logo + primary color, skippable). Goal-setting modal (full-screen, structured form). Integration prompt driven by goal type.
- Acceptance: agent-browser walks all three; PostHog `goal_set` + `source_connected` fire.
- Deps: S3.6, goals UX (Phase 5).

---

## Phase 4 — Pricing rewrite (model + page)

### S4.1 — Pricing page rewrite (builder-outcome bullets) · M
- Goal: Rewrite `/pricing` around outcomes (sources, posts/month, formats, video, goals, history retention) per PRD §4 table.
- Acceptance: agent-browser confirms zero credit/MCP language.
- Deps: S2.7, S1.3.

### S4.2 — Source-cap upsell prompts · M
- Goal: When Toast user tries to connect Stripe → prompt "Upgrade to Full Plate." Same for format/video gates.
- Acceptance: agent-browser hits each upsell trigger → prompt fires.
- Deps: S2.7.

### S4.3 — Migration plan for existing users · S
- Goal: Decide grandfathering: existing trial → free tier with same lifetime cap. Existing paid → keep current tier mapped to new plan. Document in `docs/decisions.md`.
- Acceptance: written plan reviewed by user.
- Deps: S2.7.

---

## Phase 5 — Goal-setting UX

### S5.1 — Goal modal + structured form · M
- Goal: Single full-screen modal with category (Revenue/Users/Traffic/Custom), metric picker, threshold input. Custom category bypasses provider requirement.
- Acceptance: agent-browser sets a custom goal ("100 mailing-list subs").
- Deps: schema migration (S5.3).

### S5.2 — Goal hero card on dashboard · M
- Goal: Single hero card showing target / current / progress / days-since-set / "brag.fast will post automatically when you hit this."
- Acceptance: agent-browser dashboard renders hero card.
- Deps: S5.1.

### S5.3 — Goal schema migration: custom + persistent · M
- Goal: Allow `provider: null` (custom). Replace auto-disable-on-fire with `firedAt` timestamp + recurring flag. Add `firstHitAt` for celebration trigger.
- Acceptance: existing goals still work; new custom goal fires correctly without provider.
- Deps: S0.1.

### S5.4 — Toast cap of 1 active goal · S
- Goal: Enforce in `goals.create` mutation; UI surfaces "Upgrade to Full Plate for unlimited goals."
- Acceptance: Toast user can't create 2nd goal.
- Deps: S5.3, S2.7.

### S5.5 — Goal-hit celebration + email + next-goal prompt · M
- Goal: Real-time subscription on dashboard fires confetti modal. Resend email with one-click approve link. After approval, "Set your next goal?" prompt.
- Acceptance: agent-browser triggers fake hit → sees celebration + email logged + prompt.
- Deps: S5.3.

---

## Phase 6 — Dashboard rebuild

### S6.1 — Dashboard hierarchy: Goal hero → History feed → Sources → Posts remaining → Pending drafts · L (split)
- Goal: Rewrite `/admin` page. New components for goal hero (S5.2), history feed (S2.3), sources widget, posts-remaining meter (replaces credit meter), pending drafts queue.
- Acceptance: agent-browser screenshots dashboard match design from `frontend-design` output.
- Deps: S2.3, S2.7, S5.2.
- **Pre-session plan needed:** invoke `frontend-design` skill before coding.

### S6.2 — Sidebar nav reorder · S
- Goal: Promote Goals + Sources. Demote Kitchen + API Keys to "Developers" sub-section (or footer-link).
- Acceptance: agent-browser nav matches PRD §7.
- Deps: S6.1.

### S6.3 — History feed entry override path · M
- Goal: Auto-skipped entries get "Draft anyway" override. User-skipped entries get reason capture (modal).
- Acceptance: agent-browser overrides a suppressed entry → new draft created. PostHog event fires.
- Deps: S2.3.

---

## Phase 7 — Drafts approval flow polish

### S7.1 — Decouple draft from release for `mediaUrl` · M
- Goal: Resolve `TODO(post-U8)` in `pushFanout.ts:189`. Approval triggers cook if `mediaUrl` empty; render → upload → push.
- Acceptance: agent-browser approves draft without pre-render → push succeeds.
- Deps: S2.7.

### S7.2 — Clipboard as first-class destination · S
- Goal: Approval modal "Copy" option returns text + opens X intent URL. No `draftPushes` row.
- Acceptance: agent-browser uses clipboard path → draft marked approved + history reflects.
- Deps: S7.1.

### S7.3 — Format/platform/video gating in approval UI · M
- Goal: Lower tiers see disabled checkboxes with upsell tooltip. Server-side enforcement matches.
- Acceptance: Toast user → only square + 1 platform; UI + server agree.
- Deps: S2.7.

---

## Phase 8 — Voice calibration

### S8.1 — Approval edit-delta capture · M
- Goal: `post_approved` event captures `was_edited`, `edit_type`, original copy, final copy. Persist on draft row.
- Acceptance: agent-browser edits + approves → PostHog event has full delta.
- Deps: S0.3, S7.1.

### S8.2 — Voice presets (4) for new users · S
- Goal: Settings → Voice page shows preset picker (casual builder / dry-technical / earnest milestone / deadpan). Stored on `userProfiles.voicePreset`.
- Acceptance: agent-browser picks preset → next draft prompt includes preset.
- Deps: schema field added.

### S8.3 — Few-shot recent approvals into Haiku prompt · M
- Goal: composeCopy fetches last N approved-and-edited drafts for user, injects as examples.
- Acceptance: 3 approvals later, agent-browser sees voice consistency improvement (qualitative).
- Deps: S8.1.

### S8.4 — Settings → Voice page with "trained on N approvals" · S
- Goal: counter + manual edit ability for calibration prompt.
- Acceptance: agent-browser sees count update post-approval.
- Deps: S8.3.

---

## Phase 9 — Retention infrastructure

### S9.1 — Weekly digest cron + template · M
- Goal: Sunday cron aggregates week's events per user → digest-style template render → Resend email with approve link.
- Acceptance: agent-browser triggers cron in dev → email arrives with draft.
- Deps: S2.3.

### S9.2 — Annual recap data layer · S
- Goal: ensure events stored with timestamp + metadata sufficient for year-end aggregation. No UI yet.
- Acceptance: SQL/Convex query produces "everything user shipped in 2026."
- Deps: S2.3.

---

## Phase 10 — Analytics finalization

### S10.1 — All 14 events instrumented · M
- Goal: Audit each event in PRD §13 against codebase; add missing capture sites; verify property shape via agent-browser PostHog event tab.
- Acceptance: 14/14 events fire with correct properties on a clean signup→approve flow.
- Deps: most prior phases.

### S10.2 — North Star dashboard (4 insights) · M
- Goal: Build funnels + retention + trends per PRD §13. Set targets (20%, 60%, 40%, 60%).
- Acceptance: agent-browser opens PostHog → all 4 insights present + populated with dev data.
- Deps: S10.1.

### S10.3 — Launch-day cohort + baseline screenshot · S
- Goal: PostHog cohorts `pre_launch_baseline` + `post_launch`. Screenshot empty North Star as "before" reference.
- Acceptance: cohorts created; screenshot saved to `docs/baselines/`.
- Deps: S10.2.

---

## Phase 11 — Pre-launch

### S11.1 — Soft-launch friends test · M
- Goal: 3-5 friends complete full flow end-to-end. Capture friction notes.
- Acceptance: ≥3 successful first-post approvals from non-rob accounts.
- Deps: all prior.

### S11.2 — Launch-readiness review · M
- Goal: Walk PRD §14 checklist; tick every item. Confirm safety layers 1, 2, 3, 5, 6 active. Confirm North Star insights live.
- Acceptance: every PRD §14 box checked.
- Deps: S11.1.

### S11.3 — Merge `repos/launch` → `main` + deploy · S
- Goal: Single merge, single deploy. User-initiated only.
- Acceptance: production confirms new homepage, wizard, pricing live.
- Deps: S11.2 + explicit user go-ahead.

---

## Open questions (resolve before relevant phase)

- **Q1 (Phase 4):** Stripe — keep existing price IDs and re-map metadata, or create new prices? (block S2.7 + S4.3)
- **Q2 (Phase 4):** Video pricing semantics in posts/month world — is 1 video = 1 post (Buffet only) or does video have a separate sub-cap? PRD §4 says "Video: Yes (1 per post)" — interpret as included up to posts/month cap.
- **Q3 (Phase 2/6):** Demote Kitchen (image generator) entirely vs keep behind /admin/kitchen? PRD says non-primary; assume keep but remove from main nav.
- **Q4 (Phase 7):** Should clipboard destination still record a `draftPushes` row (with `provider: 'clipboard'`) for analytics, or skip the table entirely? Lean toward recording for history-feed completeness.
- **Q5 (Phase 0):** Feature-flag granularity — single `LAUNCH_MODE` env vs per-feature flags? Lean single flag for big-bang launch.

---

## Sequencing summary

```
Phase 0 (Foundation) → Phase 1 (Public purge) ⫼ Phase 2 (Backend)
                                                    ↓
                                                Phase 3 (Onboarding) ← Phase 5 (Goals UX)
                                                    ↓
                                                Phase 4 (Pricing)
                                                    ↓
                                                Phase 6 (Dashboard) ← Phase 7 (Drafts polish)
                                                    ↓
                                                Phase 8 (Voice) ← Phase 9 (Retention)
                                                    ↓
                                                Phase 10 (Analytics) → Phase 11 (Launch)
```

Phase 1 and Phase 2 can run in parallel if focus is sufficient. Phase 4 + 5 can interleave. Phase 6 blocks on 2+5+7. Phase 11 is final gate.
