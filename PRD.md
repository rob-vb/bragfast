# brag.fast — Product Requirements Document

**Status:** Pre-launch repositioning
**Owner:** Rob
**Last updated:** April 30, 2026
**Scope:** Full product reposition + new onboarding + new pricing + analytics + safety. One launch, no incremental ships.

---

## 1. Product identity

### What brag.fast is

brag.fast is **the build-in-public system for solopreneurs**. Users ship code, hit revenue/traffic milestones, or close goals — brag.fast turns those moments into draft social posts automatically. The user approves; the post ships through Buffer or Postiz.

### One-liner

> Building in public, automated.

### What it replaces in the user's life

The unfunded ritual of "I should really post about this." Solopreneurs know building in public works. Most don't do it because they forget, don't have time, and find the production work tedious. brag.fast removes the trigger problem (#3), the production problem (#2), and the ideation problem (#1) in a single flow.

### What brag.fast is NOT

- Not an image generator with integrations bolted on
- Not an agent platform (the MCP/API surfaces stay shipping but disappear from public narrative)
- Not a scheduler (Buffer/Postiz own that — brag.fast hands off, doesn't compete)
- Not a tool for the "scared to post" segment (#4 deferred indefinitely)

### ICP

Solopreneurs and indie hackers who:

- Already believe building in public works
- Ship code, run a SaaS, or hit measurable milestones (revenue/traffic/users)
- Don't post enough — habit problem, not motivation problem
- Use GitHub for their primary product (the wedge integration)

### Segments deprioritized (do not address in copy or features)

- Marathon runners with Strava PRs
- Dev tool companies with DevRel teams
- AI agent builders integrating brag.fast as a tool
- "Scared to build in public" users (#4 segment)

---

## 2. Product spine

```
Trigger → Generate → Finish → Hand off
```

| Stage | What happens | User involvement |
|---|---|---|
| Trigger | GitHub PR merge / Stripe milestone / PostHog goal / GA goal / manual | None — fires automatically |
| Generate | Haiku writes copy in user's voice; visual draft renders with brand | None |
| Finish | User reviews draft, optionally edits copy or adds screenshot | One approval click |
| Hand off | Approved post pushed to Buffer/Postiz queue, or copy-to-clipboard fallback | One destination pick |

The trigger graph is the moat-architecture layer. Treat it as designed system, not accumulated integration code.

---

## 3. Triggers

| Trigger | Source | Status |
|---|---|---|
| GitHub PR merged to default branch | GitHub App | Built |
| Stripe milestone (user-defined goal) | Stripe webhook | Built |
| PostHog goal | PostHog | Built |
| GA goal | GA | Built |
| Generic webhook | User-configured URL | Build for post-launch |
| Manual trigger from dashboard | User initiates | Built |

GitHub PR is the flagship trigger — promoted from "niceity" in the original doc to hero status.

---

## 4. Pricing

### Model: posts/month + sources, with tier-bounded format scope

A "post" = one approval event. Tier bounds what an approval can render, which is what bounds compute exposure.

| Feature | Toast ($12/mo) | Full Plate ($29/mo) | Buffet ($79/mo) |
|---|---|---|---|
| Sources | 1 (GitHub only) | 3 (GitHub + Stripe + 1 of PostHog/GA) | Unlimited |
| Posts/month | 30 | 100 | 500 |
| Platforms per post | 1 (X or LinkedIn) | 2 (X + LinkedIn) | 2 (X + LinkedIn) |
| Formats per post | 1 (square) | 3 (square + landscape + portrait) | All formats |
| Video | No | No | Yes (1 per post) |
| Active goals | 1 | 5 | Unlimited |
| Voice calibration | Yes | Yes | Yes |
| History feed | 30 days | 1 year | Forever (annual recap) |

### Free tier ("On the House")

- 30 posts lifetime, no card required
- Same format restrictions as Toast
- Powers the public preview surface (lower-quality, watermarked) for unauthenticated users

### Why posts/month, not credits

- Solopreneurs don't want to do credit math before sharing a milestone
- The unit (an approval) maps directly to user value (a post in the world)
- Tier-bounded formats = unit-economics-safe at every tier
- Capability upsells convert better than throughput upsells

### Where credits still apply

API/MCP/agent surfaces (deprioritized but kept shipping) keep credit-based pricing. Two pricing models, two audiences, no public contradiction. Solopreneur surface is subscription/posts; developer surface is credits/usage-based — same model as Claude.ai vs the Anthropic API.

### Upsell triggers

- **Primary:** source cap hit (user wants to add Stripe to GitHub-only Toast). Expansion-driven, emotionally clean.
- **Secondary:** format/platform/video capability ("I want a video for this post" on Toast)
- **Tertiary:** posts/month cap hit (only fires for high-volume users; designed to be rare)

---

## 5. Onboarding flow

### Pre-signup (unauthenticated)

1. User lands on homepage
2. Hero asks: paste a public GitHub repo URL
3. brag.fast pulls the most recent merged PR from that repo
4. Renders a watermarked, lower-quality preview (single format, single template, no video) inline
5. Sub-text on the watermark: "Sample render — not endorsed by repo owner"
6. CTA: "Sign up to make this yours, with your brand"

### Signup → first post (target: under 10 minutes)

1. **Sign up via GitHub OAuth** — in-page popup, no email/password
2. **Pre-install warning screen** — "Next: GitHub will ask you to install our App. We only read PR titles and descriptions from repos you pick. We never read your code."
3. **GitHub App install** — scoped to "select repositories" by default (one-line config in the App manifest, not "all repositories")
4. **On install return:**
   - If org-pending → show "Want us to send admin an install request?" + offer personal-repo fallback
   - If personal repo → continue
5. **Repo picker** — single repo, not multi
6. **Retro PR rendering** — system pulls user's most recent merged PR, runs full pipeline, draft is ready when dashboard loads
7. **Dashboard loads with draft pre-rendered** — brag.fast sample brand applied as default
8. **Approval UI shows:**
   - Rendered post (square format)
   - Source PR title and first line of description
   - Confidence score from Haiku
   - One CTA: Approve. Secondary: Edit, Skip.
9. **Destination picker:** Buffer / Postiz / Copy + open X intent URL (fallback if neither connected)

### Post-activation prompt sequence (in order)

1. **Brand kit prompt** — "Add your brand to make this yours" (logo + primary color, both optional)
2. **Goal-setting prompt** — "What's the next milestone you'd celebrate?" (single full-screen modal)
3. **Integration prompt** — driven by goal: "To track this, connect Stripe" (or PostHog/GA depending on goal type)

### Critical flow rules

- Brand kit is skippable; default = brag.fast brand applied as visible sample
- Voice calibration is NOT in onboarding — lives in Settings, populated from approvals over time
- No "create a sample" or "try a template" — the user's actual real PR is the magic moment
- Buffer/Postiz NOT required to ship first post — clipboard fallback works

---

## 6. Goal-setting UX

### Why goals matter

Goals are the **retention surface**, not posts. Posts are the artifact of a goal hit. Users come back to the dashboard between trigger fires to check goal progress. Without goals, the product has no daily reason to open.

### Form

- Single full-screen modal
- Conversational header: "What's the next milestone you'd celebrate?"
- Structured form (not free-text):
  - Category picker: Revenue / Users / Traffic / Custom
  - Metric picker: depends on category
  - Threshold input: number
- Optional: connect source if not already connected

### Categories

| Category | Auto-tracked via | Custom value? |
|---|---|---|
| Revenue | Stripe | Yes (manual update) |
| Users | PostHog/GA | Yes |
| Traffic | PostHog/GA | Yes |
| Custom | None — user updates manually | Yes (followers, mailing list, GitHub stars, etc.) |

Custom category is critical — it's where #4-style milestones live (followers, list size) and creates engagement without an integration dependency.

### Dashboard presentation

- **Single hero card** on Toast tier (multiple goals = Full Plate upsell)
- Card shows: target, current value, progress bar, days since goal set
- Subtitle on card: "brag.fast will post automatically when you hit this"
- Goal progress is the most prominent element on the dashboard (above history)

### Goal-hit celebration sequence

1. Trigger fires → draft post auto-generated with milestone number + journey time ("47 days from goal set")
2. **In-app celebration screen** appears next dashboard load (animated, large, "You hit it" — confetti acceptable)
3. **Email sent immediately** with post draft + one-click approve (revenue milestones especially want phone-immediate)
4. After approval, prompt: **"Set your next goal?"** — converts goal-setting from one-time onboarding step into recurring loop

---

## 7. Dashboard

### Primary surfaces (in visual hierarchy)

1. **Goal hero card** — target/current/progress, "brag.fast will post automatically when you hit this"
2. **History feed** — every event the system saw, what it decided, confidence score, override option
3. **Sources connected** — with usage indicators
4. **Posts remaining this month** — "27 of 30 posts remaining"
5. **Pending drafts** — approval queue (if any)

### Why the history feed is primary

The skipped-PR history is the **institutional memory moat**. Users who see their build-in-public history (every PR, every milestone, what posted, what didn't, why) accumulate something they can't get elsewhere. After 6 months of history, switching to a competitor means losing 6 months of their builder narrative.

History is not buried in settings. It's a primary dashboard surface.

### History feed entry shape

```
[date] [trigger type] [PR/event title]
  → Draft generated, confidence 0.84 → APPROVED → posted to X+LinkedIn
  → Draft generated, confidence 0.41 → AUTO-SKIPPED (low confidence) [Override]
  → Draft generated, confidence 0.72 → SKIPPED BY YOU (reason: wrong tone)
```

Every entry has an override path. Auto-skipped drafts can be promoted by the user, which is high-quality training signal for confidence calibration.

---

## 8. Voice calibration

### What it is

Per-user voice model that learns from approvals, edits, and skips. Each interaction is signal. After ~50-100 approvals, the user's drafts sound meaningfully more like them than a generic Haiku-with-prompt baseline.

### Implementation

- Every `post_approved` event captures edit data (was edited, edit type, original vs final copy)
- Recent approvals fed into Haiku prompt as few-shot examples for each subsequent generation
- For new users with no approval history: 4 voice presets — *casual builder*, *dry/technical*, *earnest milestone*, *deadpan* — pick one to start
- Settings → Voice page exists, shows "trained on N approvals"
- User can manually adjust voice (paste existing posts, switch presets, edit calibration prompt)

### Why this is the moat

Cannot be cloned by competitors without rebuilding the same training loop and waiting months per user. Switching cost = "I lose my trained voice and have to start over."

The user must *feel* the model getting smarter. If improvement is invisible, the moat doesn't materialize even if quality genuinely improves.

### Per-platform copy generation

Same trigger = two Haiku calls = two distinct drafts. X copy is short and dry; LinkedIn copy is longer and more narrative. User can disable platforms they don't post to. Eliminates "the post sounded weird on LinkedIn" complaints. Cheap (Haiku is cheap), high quality impact.

---

## 9. Safety

### Failure modes covered

| # | Mode | Mitigation |
|---|---|---|
| 1 | Leaking private info from PR titles/descriptions | Layer 1: pre-render content filter |
| 2 | Hallucinating PR content | Layer 2: PR title/description visible on approval UI |
| 3 | Tone-deaf milestone framing during major events | Layer 4: world-events check (deferred until volume meaningful) |
| 4 | Voice drift over time | Voice calibration system + approval-rate canary metric |
| 5 | Cross-tenant contamination in render pipeline | Layer 5: tenant isolation audit + per-job pre-publish metadata check |
| 6 | Copyright/IP issues with user screenshots | ToS coverage + clear ownership transfer language |
| 7 | Public preview misuse (mocking competitors etc.) | Watermark + lower-quality + "Sample render" sub-text + `bragfast.txt` opt-out |

### Layer 1 — Pre-render content filter (REQUIRED for launch)

Before Haiku ever sees PR content, run a fast classifier (keyword + small LLM check) for sensitive patterns:

- Security/vulnerability terms ("security," "vulnerability," "patch," "exposed," "leak," "CVE," "password," "token," "secret")
- Confidentiality terms ("client," "customer name," "internal only," "NDA")
- Sensitive terms ("racial," "fired," "laid off," "lawsuit")
- HR/financial terms

If pattern matches: do NOT auto-generate. Surface to user as: *"This PR may contain sensitive content. Want to draft a post about it manually?"* User decides; model never writes the post unless explicitly invoked.

### Layer 2 — Approval UI safeguards (REQUIRED for launch)

Approval screen always shows:

- Source PR title (raw, unmodified)
- First line of PR description (raw)
- Confidence score
- Rendered post

User is reminded what the AI read. One extra UI element, large reduction in failure modes 1 and 2.

### Layer 3 — Confidence-gated suppression (REQUIRED for launch)

Haiku produces a 0-1 confidence score for every PR — "is this post-worthy?" Drafts below threshold (default 0.5, user-adjustable later) are NOT generated as posts. They're stored as skipped events in the history feed with the score visible.

User can override: "Actually that one was post-worthy, draft it anyway." Override = high-quality training signal for confidence model.

Result: quieter product, higher per-output quality, no noise in the user's queue.

### Layer 5 — Tenant isolation audit (REQUIRED for launch)

Audit the render pipeline for any place where user data is keyed by something that could collide across tenants. Add a final pre-publish check: *"does the rendered output's metadata match the user requesting it?"* Cheap, prevents the worst-case data-leak scenario entirely.

### Layer 6 — Public preview safety

- Cache rendered preview output for session only, never permanently
- Watermark + "Sample render — not endorsed by repo owner" sub-text on every preview
- Aggressive per-IP rate limiting
- Honor `bragfast.txt` at repo root or `no-bragfast-preview` topic — repos that opt out cannot be previewed

### Deferred safety work

- **Layer 4** (world-events check) — defer until posting volume is meaningful enough to warrant the infrastructure

---

## 10. Retention loop

### Week 1 — Activation magic

- Sign up, install, see retro PR rendered, approve first post
- Brand prompt → goal prompt → integration prompt
- First celebration: first approved post

### Week 2 — Weekly digest

- Every Sunday, brag.fast aggregates the week's events (merged PRs, traffic changes, revenue changes, goal progress)
- Generates a digest-style post draft (different visual template from single-event posts)
- Email delivered with draft + one-click approve
- Even if the week had no individual post-worthy events, the *aggregate* often is

This is the core week-2 retention hook. It compounds: solopreneurs who ship nothing notable in a single day often ship a meaningful week.

### Week 4 — Goal progress visibility

- Goal hero card shows accumulated progress
- Whether or not posts have fired, the goal card gives users a reason to open the dashboard

### Annual — Annual recap

- Data infrastructure built now (just store events properly with timestamps and metadata)
- UI built ~3 months before first cohort hits anniversary
- Recap = "everything you shipped in 2026, generated from your brag.fast history"
- Annual recap email is high-leverage retention reinforcement — users who get it don't churn in January

### Things deliberately NOT built

- Streak gamification (Duolingo guilt is wrong tone)
- Drought-trigger reverse prompts (defer to month 2 of post-launch)
- Native posting/scheduling (Buffer/Postiz own this)
- DAU/MAU as a tracked metric (vanity)

---

## 11. Moat strategy

### The three pillars

1. **Trigger graph as architecture** — cross-source orchestration, dedup, goal coordination as designed system. Competitors will ship flat integrations; brag.fast knows what's happening across the user's whole stack.
2. **Per-user voice model trained on approvals** — accumulation moat, slow to build, slow to copy, compounds with every interaction.
3. **History feed as institutional memory** — users come back to look at history; leaving means losing months of build-in-public narrative.

### What is NOT a moat

- The GitHub integration itself (2-week build for any competitor)
- The Haiku prompt for copy generation (reverse-engineerable)
- Image/video templates (infinite competition)
- The food-themed brand (memorability tool, not a moat at this stage)

### Competitive timeline assumption

- **Today through Q3 2026:** competitors don't see the market. Unobstructed runway.
- **Q4 2026 / Q1 2027:** at least one of Typefully/Buffer/Postiz ships a "GitHub → AI post" feature. Moats either show up or don't.
- **2027+:** if pillars are real, retain existing customers via switching cost; compete on depth-of-integration for new ones.

---

## 12. Public narrative

### What's removed from public surfaces

- All mentions of MCP
- All mentions of agents / agent-native / "for your AI agent"
- All mentions of API as a primary feature (kept available, demoted to footer Developers link)
- Old one-liner "for you, or for your AI agent"
- Pricing tier bullets like "API access" and "MCP integration"

### What replaces it

- One-liner: "Building in public, automated."
- Hero leads with the loop, not the visual output
- Demo shows: PR merge → notification → approved post (NOT a template editor)
- Pricing tiers presented with builder-outcome bullets (not feature lists)
- Footer: "Developers" link → minimal docs site for API/MCP (alive, not promoted)

### Existing surfaces to update

- Homepage
- Pricing page
- README
- X bio if it uses old framing
- GitHub App description
- Any launch-related copy that exists

---

## 13. Analytics — PostHog instrumentation

### Naming conventions (non-negotiable)

- Events: `snake_case`, past-tense verbs
- Properties: `snake_case`
- Property values: lowercase strings, no spaces
- Booleans: prefix with `is_` / `has_` / `was_`
- No PII in event properties (no emails, repo names, PR titles, post content)

### Setup

- Person profiles enabled
- Autocapture disabled
- `posthog.identify(userId)` called immediately after signup, before any other capture
- Person properties on identify: `signup_date`, `signup_source`, `github_app_installed`, `source_count`, `plan`

### The 14 events

#### `preview_repo_pasted`
```js
posthog.capture('preview_repo_pasted', {
  repo_host: 'github',
  is_returning_visitor: false,
})
```

#### `preview_render_started`
```js
posthog.capture('preview_render_started', { repo_host: 'github' })
```

#### `preview_render_completed`
```js
posthog.capture('preview_render_completed', {
  repo_host: 'github',
  render_duration_ms: 3420,
  was_successful: true,
  failure_reason: null,
})
```

#### `signup_completed`
```js
posthog.identify(user.id, {
  signup_date: new Date().toISOString(),
  signup_source: 'preview',
  plan: 'free',
})
posthog.capture('signup_completed', {
  signup_source: 'preview',
  came_from_preview: true,
})
```

#### `github_app_install_started`
```js
posthog.capture('github_app_install_started')
```

#### `github_app_installed`
```js
posthog.capture('github_app_installed', {
  install_scope: 'selected',
  repo_count: 1,
  org_install: false,
})
```

#### `github_app_install_blocked`
```js
posthog.capture('github_app_install_blocked', {
  block_reason: 'org_admin_approval_required',
  org_name_hash: 'sha256-of-org-name',
})
```

#### `draft_generated`
```js
posthog.capture('draft_generated', {
  trigger_type: 'github_pr',
  source_type: 'github',
  confidence_score: 0.84,
  was_suppressed: false,
  is_first_draft_for_user: false,
  has_visual_asset: true,
  platforms_targeted: ['x', 'linkedin'],
  formats_to_render: ['square', 'landscape', 'portrait'],
  video_requested: false,
})
```

#### `post_approved`
```js
posthog.capture('post_approved', {
  trigger_type: 'github_pr',
  was_edited: false,
  edit_type: null,
  time_from_draft_seconds: 142,
  confidence_score: 0.84,
  is_first_post_for_user: true,
  approval_surface: 'web',
  destination: 'buffer',
  formats_rendered: 3,
  video_rendered: false,
  total_render_count: 3,
})
```

#### `draft_skipped`
```js
posthog.capture('draft_skipped', {
  trigger_type: 'github_pr',
  skip_reason: 'wrong_tone',
  confidence_score: 0.84,
  time_from_draft_seconds: 28,
})
```

#### `draft_ignored` (server-side cron after 48h no-action)
```js
posthog.capture('draft_ignored', {
  trigger_type: 'github_pr',
  confidence_score: 0.84,
  hours_since_draft: 48,
})
```

#### `source_connected`
```js
posthog.capture('source_connected', {
  source_type: 'stripe',
  is_first_non_github_source: true,
  total_sources_connected: 2,
  was_prompted_by_goal: true,
})
```

#### `goal_set`
```js
posthog.capture('goal_set', {
  goal_category: 'revenue',
  is_first_goal: true,
  has_connected_source: true,
})
```

#### `goal_hit`
```js
posthog.capture('goal_hit', {
  goal_category: 'revenue',
  days_from_goal_set: 47,
})
```

### Dashboard — "North Star" (4 insights, 2x2 grid)

#### Insight 1 — Preview-to-signup conversion

- Type: Funnel
- Steps: `preview_repo_pasted` → `signup_completed`
- Conversion window: 24 hours
- Time range: last 30 days, weekly
- Target: 20%

#### Insight 2 — 10-minute activation

- Type: Funnel
- Steps: `signup_completed` → `github_app_installed` → `post_approved` (filter: `is_first_post_for_user = true`)
- Conversion window: 10 minutes
- Time range: last 30 days, weekly
- Target: 60%

Sibling diagnostic: same funnel with no time limit, to separate "speed problem" from "complete failure problem."

#### Insight 3 — Week-4 retention

- Type: Retention
- Cohortizing event: `post_approved` with `is_first_post_for_user = true`
- Returning event: `post_approved` (no filter)
- Period: weekly
- Display: cohort grid, 8 weeks visible
- Target: 40%

#### Insight 4 — Approval rate per draft

- Type: Trends with formula
- Series A: `post_approved`, count
- Series B: `draft_generated`, count, filter `was_suppressed = false`
- Formula: `A / B * 100`
- Display: line chart, weekly
- Target: 60%

Sibling: stacked bar chart of `post_approved` (split by `was_edited`), `draft_skipped`, `draft_ignored` to monitor composition over time.

### Critical setup details

- Cohort created on launch day for clean before/after analysis later
- Person profiles must be enabled (some PostHog projects default to events-only and silently break retention)
- Autocapture off

---

## 14. Build order (single launch, no incremental ships)

### Foundation (do first — unblocks everything)

- [ ] PostHog project setup, person profiles enabled, autocapture disabled, `identify()` wired
- [ ] Naming conventions doc committed to repo
- [ ] GitHub App scope changed to "select repositories" default
- [ ] Tenant isolation audit completed
- [ ] Sensitive content filter (Layer 1 of safety) shipped
- [ ] Public surfaces purged of MCP/API/agent language (homepage, README, pricing, X bio)

### Backend (new UX depends on these)

- [ ] Retro PR rendering on signup
- [ ] Per-platform copy generation (X vs LinkedIn separate Haiku calls)
- [ ] Confidence scoring on Haiku output + suppression-with-override path
- [ ] Sources + posts/month + format/platform/video accounting per tier
- [ ] Skipped-PR history storage (event log queryable for the history feed)
- [ ] Org-pending detection on GitHub install
- [ ] Watermark + lower-quality preview render pipeline
- [ ] `bragfast.txt` opt-out checker for previewable repos

### New onboarding flow

- [ ] Public-repo preview surface (paste any URL, see watermarked preview, no signup)
- [ ] Sign up via GitHub OAuth (in-page popup)
- [ ] Pre-install warning screen
- [ ] GitHub App install scoped flow
- [ ] Org-pending → admin request OR personal-repo fallback
- [ ] Repo picker (single repo)
- [ ] Retro PR draft renders with brag.fast sample brand
- [ ] Approval UI showing PR title/description + confidence score + one CTA
- [ ] Buffer/Postiz/clipboard destination picker
- [ ] Brand prompt → goal prompt → integration prompt sequence

### Goal-setting UX

- [ ] Single full-screen modal with conversational header
- [ ] Structured form: category, metric, threshold
- [ ] Single hero card on dashboard
- [ ] Toast: 1 active goal cap
- [ ] Goal-hit celebration: in-app screen + email + auto-draft + "next goal?" prompt

### Dashboard rebuild

- [ ] Goal hero card as primary element
- [ ] History feed as secondary primary surface
- [ ] Sources + usage indicators
- [ ] Posts remaining this month
- [ ] Pending drafts queue

### Pricing

- [ ] Three tiers: Toast / Full Plate / Buffet (per spec above)
- [ ] Billing integration updated for new model
- [ ] Pricing page rewritten around builder outcomes
- [ ] Source-cap upsell prompts at expansion moments
- [ ] Format/platform/video gating in approval UI for lower tiers

### Public narrative

- [ ] New homepage with builder-in-public framing
- [ ] New one-liner: "Building in public, automated."
- [ ] Hero leads with the loop, not the visual output
- [ ] Demo/video: PR merge → notification → approved post
- [ ] Pricing presented with builder-outcome bullets
- [ ] Footer "Developers" link → minimal API/MCP docs

### Analytics (interleaved with feature work, not separate phase)

- [ ] All 14 events firing as their corresponding features ship
- [ ] North Star dashboard built with 4 insights
- [ ] Launch-day cohort created in PostHog

### Voice calibration

- [ ] `post_approved` captures edit data
- [ ] Settings → Voice page with "trained on N approvals"
- [ ] Recent approvals fed as few-shot examples
- [ ] 4 voice presets for new users

### Weekly digest

- [ ] Sunday cron: aggregate week's events per user
- [ ] Digest-style template
- [ ] Email infrastructure for digest delivery
- [ ] Digest approval flow (same as single-event but pre-populated)

### Pre-launch checklist

- [ ] Soft-launch to friends to test full flow end-to-end
- [ ] Baseline metrics screenshot taken (empty North Star = "before" reference)
- [ ] Cohort created in PostHog labeled `pre_launch_baseline` (existing users) and `post_launch` (new users from launch day forward)
- [ ] All four target lines set on PostHog insights
- [ ] Migration plan for existing free-tier users (if any) — they auto-move to new free tier with grandfathered perks if needed

---

## 15. Out of scope (do not build now)

- Manual webhook fallback for users who can't install GitHub App (defer until first user asks)
- Tone-deaf world-events check (defer until posting volume meaningful)
- Annual recap UI (data infrastructure now, UI ~3 months before first cohort anniversary)
- Active #4 segment pursuit (deferred indefinitely)
- Agent/MCP/API public revival (deferred until agent-spend market is real, ~2027)
- Voice calibration via paste-existing-posts on signup (Settings feature, not onboarding)
- Streak gamification (don't build, ever)
- Native posting/scheduling (don't build, ever — Buffer/Postiz own this)
- New trigger sources beyond what's already built
- Drought-trigger reverse prompts
- DAU/MAU tracking
- NPS surveys
- Brand metrics tracking

---

## 16. Decision log (anchors for future drift)

| Decision | Rationale |
|---|---|
| ICP = #3 segment only (habit-deficient solopreneurs) | Wedge clarity. #4 deferred, agent-builders deprioritized. One funnel, one product. |
| Big-bang launch, not incremental milestones | No paying users to grandfather. Coherence > speed. One launch moment with full attention. |
| Posts/month + tier-bounded format scope, not credits | User-comprehensible unit, capability-driven upsells, unit-economics-safe at every tier. |
| GitHub PR is flagship trigger | Solves #3 (habit) automatically. Stripe/PostHog/GA expand it. |
| Goals = retention surface, not posts | Posts are the artifact; goals are the daily reason to open the dashboard. |
| History feed = primary dashboard surface | Builds switching cost on every user interaction. Single highest-leverage UX decision. |
| Voice calibration via approvals, not signup paste | "Show, don't configure." Voice training compounds; onboarding stays frictionless. |
| Watermark + lower-quality preview, not just watermark | Prevents preview from becoming a permanent free tool while preserving marketing reach. |
| MCP/API removed from public narrative | Zero paying customers via those surfaces. Keep infrastructure, kill the messaging confusion. |
| PostHog interleaved with feature work | Two minutes during build, two days adding it after. Launch-day data is unrecoverable. |
| One ICP, one funnel, one homepage | Two surfaces means two underbuilt products at solo-founder headcount. |

---

## 17. Targets at launch + 90 days

| Metric | Launch baseline | +30 days | +90 days |
|---|---|---|---|
| Preview-to-signup conversion | TBD | 15% | 20% |
| 10-minute activation | TBD | 50% | 60% |
| Week-4 retention | n/a (insufficient cohort) | TBD | 40% |
| Approval rate per draft | TBD | 55% | 60% |

If a metric falls 20% below target by +90 days, that subsystem gets a focused improvement sprint before any new feature work.

---

*End of PRD.*