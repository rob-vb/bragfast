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
