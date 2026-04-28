---
date: 2026-04-26
topic: building-in-public-on-autopilot
focus: extending Sous-Chef into a fully autonomous build-in-public engine
mode: repo-grounded
---

# Ideation: Building in Public on Autopilot

## Context

bragfast already has the front half of a build-in-public autopilot: Sous-Chef watches PR merges and milestone events, Haiku drafts copy, drafts table holds the queue, image+video render pipelines are production-ready. **The back half is missing.** Drafts have a `socialCopy {twitter, linkedin}` JSON field but zero posting integration, no scheduling, no image attached on approval, no engagement loop, no outbound webhook. `brandVoice` is a phantom field — accepted by `composeCopy.ts` but never persisted or passed. Direct competitor PersonaBox stops at the same handoff. The product's headline value is "autopilot" and autopilot currently ends at a to-do list.

Constraints worth respecting:
- X API April 2026 economics: $0.20/post w/ link, $0.15 w/o. Image-as-media (no link) is the right architecture.
- LinkedIn personal-profile posting restricted; Pages API safe.
- Bluesky AT Protocol = cleanest sequencing target.
- AES-GCM `integrationSecrets` table + `internalAction "use node"` pattern + Convex crons already in place — most infrastructure exists.

## Grounding Context

**Codebase:** Next.js 16 + Convex + Satori/Sharp + Remotion Lambda + R2 + Stripe + Better Auth. Sous-Chef PR-merge → Haiku → drafts (`source: "agent"`). Triggers: pr_merged + MRR/first_sale/visitors/star/total_revenue/subscribers via crons + sweepers. `idempotencyKey = userId:sourceSystem:milestoneKey`. `socialCopy` field exists on releases but never sent anywhere. `brandVoice` accepted by `composeCopy` signature but never written to schema.

**External context:** PersonaBox = closest competitor (PR→content), gap: no posting/scheduling/multi-platform/learning. Postiz (AGPL) is reference architecture for 17+ platforms. TweetHunter/Hypefury/Typefully = scheduling+AI but no GitHub signal, no engagement loop. social-changelog (OSS) confirms primitive is easy. Upstash autonomous X agent = clean serverless pattern, no feedback loop.

**Cross-domain analogies that survived to inform survivors:** news wire assignment desk (kill before write), sports highlight shareability scoring, ghostwriter intake → batch review, TV showrunner bible (current arc), stand-up comedy (retire flops, expand hits), RSS-as-podcast-distribution-backbone.

## Ranked Ideas

### 1. Self-hosted Postiz as posting backbone (Pattern A: Postiz-team-per-user)
**Description:** bragfast self-hosts Postiz (AGPL-3.0, multi-platform scheduler — X, LinkedIn, Bluesky, Threads, Mastodon, Discord, Reddit, +). Each bragfast user provisioned as a Postiz team on signup or first-connect. User OAuths their socials through Postiz (in-app embedded flow or branded redirect). bragfast UI never sees platform tokens — Postiz holds them. On draft approval, Convex `internalAction "use node"` calls Postiz HTTP API with `{platforms, content, mediaUrl, scheduledAt}`. Render image via existing `/api/v1/cook/image` first, push JPEG to Postiz as media (no outbound link → sidesteps X $0.20 link fee). Generate platform-aware variants in one Haiku call (`composeCopy` returns `{x, linkedin, bluesky, threads, mastodon}` instead of one body).
**Warrant:** `direct:` `integrationSecrets` provider enum at `convex/schema.ts:177-184` is `stripe|posthog|ga4` only; `socialCopy` JSON shape exists on releases but unused; `internalAction "use node"` pattern matches `convex/videoRender.ts`. `external:` Postiz has ~3M Docker pulls and supports 17+ platforms — building 5-platform OAuth ourselves is months of work that doesn't differentiate. AGPL acceptable since fork stays public and Postiz runs unmodified behind bragfast wrapper.
**Rationale:** Foundational — without posting, "autopilot" terminates at a to-do list. Delegating distribution to Postiz lets bragfast focus on the differentiating layer (voice clone, kill desk, engagement loop, devlog feed, showrunner bible). API costs stay with user's connected account, not bragfast. Platform compliance burden (LinkedIn flagged-session risk, X rate-limit handling, retry logic) shifts to Postiz.
**Downsides:**
- AGPL-3.0 network-use clause: must offer source for any modifications. Keep bragfast-specific code in wrapper layer outside Postiz core.
- Two-account UX (bragfast + Postiz team) with OAuth branding leak unless embedded/proxied.
- Infra cost: Postgres + Redis + Temporal + workers (~$30-80/mo small, scales with users).
- Maintenance: track upstream Postiz releases; merge security patches.
- Engagement data (for #5) flows through Postiz analytics API if available, else direct platform polling.
**Confidence:** 95%
**Complexity:** Medium-High (infra + Postiz API integration + per-user team provisioning, but no per-platform OAuth/posting code)
**Status:** Explored (selected for brainstorm 2026-04-27)

**Architectural notes (locked defaults)**
- **OAuth UX: redirect** to `connect.brag.fast` (Postiz UI on custom subdomain). User clicks "Connect X" in bragfast → browser navigates to Postiz → completes OAuth → redirects back. Mild branding leak accepted; simplest path.
- **Provisioning: auto on signup.** New bragfast signup → Convex mutation calls Postiz API to create team + stores team token. Empty teams for non-connectors are cheap (few Postgres rows).
- **Postiz version: pinned tag** (e.g., `postiz/postiz-app:v1.42.3`). Renovate/Dependabot PRs version bumps weekly; manual review + staging test before promoting. No `:latest`. No core patches if avoidable (AGPL forks must stay public).
- **Engagement data: deferred post-MVP.** #5 needs Postiz analytics API (or direct platform polling); not in initial scope.
- **Schema deltas:**
  - `integrationSecrets` extends with `postiz` provider holding per-user Postiz team token (sealed AES-GCM, existing pattern).
  - New `postizTeams` table (or column on `userProfiles`): `{userId, postizTeamId, postizApiKey, createdAt}`.
- **Infra:** Postiz instance separate from Convex/Vercel — Fly.io / Railway / dedicated VPS. Single instance, multi-tenant via Postiz teams.
- **All platforms (incl. Bluesky) routed through Postiz.** No special-case direct integrations.

### 2. Silent-approval default with kill window + Slack/email delivery
**Description:** Drafts get `status` enum + `killBefore` timestamp + `scheduledAt`. Convex scheduler fires `postIfNotKilled` after configurable window (default 4h). Notification to Slack/email with inline Approve/Edit/Kill — admin UI is fallback, not primary review surface. Power users opt into "Ghost mode" subset (zero-approval channel for low-stakes platforms like Bluesky alt). Per-source overrides — e.g., always-review for fundraising posts; auto-only for dependency bumps that survived the kill desk (#4).
**Warrant:** `direct:` `drafts` schema (`convex/schema.ts:145-168`) has no `status`, `approvedAt`, `scheduledAt`, `killBefore` columns — current admin UI surface is just a flat queue. `reasoned:` Founders approve ~80%+ of agent drafts; one-way gate taxes the majority case for the minority. `external:` Linear/Vercel/GitHub all moved approval-style flows to where teams work — admin-UI-only is an anti-pattern at this point in 2026.
**Rationale:** "Autopilot" means defaults that don't depend on the founder being attentive. Kill-window + notification preserves the safety net while removing per-post drag. Fixes the most concrete UX failure mode: drafts piling up unreviewed, posts shipping days late.
**Downsides:** Bad post slips through if founder misses the kill window. Mitigated by per-source review-required flags and a 24h "undo" (deletes from platform).
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 3. Voice clone from approval history (fixes phantom brandVoice)
**Description:** Persist `brandVoice` field properly (currently accepted by `composeCopy` signature but never written to schema or threaded through webhook entry points). Capture every approved `{title, description, milestoneKey, sourceSystem}` to a new `approvedCopy` table. Feed top-N most recent approvals as few-shot examples in every `composeCopy` Haiku call (filtered by milestone type for relevance). Optional: compute embeddings later for k-NN lookup, but few-shot alone delivers most of the value at near-zero cost.
**Warrant:** `direct:` `composeCopy.ts` already takes `brandVoice` arg and threads it into prompts; `brands` table at `convex/schema.ts:20-36` has no `voice` column; `webhooks/route.ts:129` calls `buildPrMergeDraftInput` without brand context. The injection point literally exists — half the wiring is already there. `reasoned:` Few-shot is the cheapest possible voice personalization; cost negligible vs compounding benefit.
**Rationale:** Highest compounding-per-effort idea. Each approval makes the next draft sound more like the founder. Switching cost grows with usage — the approval archive is portable proof of voice. Currently every founder gets identical generic Haiku output.
**Downsides:** Cold-start (first 5 approvals are still generic). Privacy of approval corpus across multi-tenant; per-user isolation only.
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 4. Kill desk — shareability scoring before drafting
**Description:** Pre-drafting Haiku pass scores incoming events on post-worthiness using explicit signals: PR size (LOC, files), files touched (user-facing routes vs config/CI), description length and presence of structured sections, label set, commit count, and a "surprising fact" extraction prompt (DYK-miner style: pull the one counterintuitive number or struggle story buried in the PR body). Below-threshold events get logged to `milestoneHits` but no draft is generated. Founder can audit kills, tune threshold, override individual events.
**Warrant:** `direct:` Current pipeline drafts on every merge → drafts table fills with low-signal events (dependency bumps, typo fixes, CI config) that founders demonstrably ignore. `external:` AP/Reuters wire workflow puts the kill decision upstream of drafting; sports-broadcast highlight ML scores shareability before any human touches the clip. PersonaBox doesn't do this — it's a competitive moat.
**Rationale:** Quality of the draft queue determines whether autopilot is trusted. Filtering noise upstream is cheaper than asking the founder to skim drafts. Audit trail makes the decision legible. Pairs with #2 — silent-approval is only safe when the queue is curated.
**Downsides:** Threshold calibration (over-aggressive kills frustrate). Mitigated by surfacing kill log + per-event override + threshold slider.
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 5. Engagement feedback loop with tight-5 mechanic
**Description:** After posting (presupposes #1), poll platform APIs at 24h+48h to record likes/reposts/replies/impressions against `{milestoneKey, templateId, copyPattern}`. Compute per-user winners and losers. Three surfaces: (a) automatic template routing (best-performing template wins for similar future events); (b) retire-flops UI (low performers stop being suggested by `pickTemplate`); (c) "tight 5" archive of high-performers that get resampled into future drafts as few-shot examples weighted higher than baseline approvals.
**Warrant:** `direct:` `pickTemplate` already has a `reason` field (`rule|haiku|haiku-fallback`) — the routing logic is instrumented for replacement. `milestoneHits` already records `{milestoneKey, draftExternalId}` — the natural join point for engagement data. `external:` TweetHunter/Hypefury both expose engagement-driven tuning; bragfast competes with that tier. Stand-up comedy bit-development is the canonical retire-flops/expand-hits model.
**Rationale:** Closes the only open loop. Without engagement feedback, autopilot degrades — founders re-question template and copy style on every approval. With it, draft quality compounds with usage and the system acquires a defensible per-user calibration.
**Downsides:** API access for engagement data varies by platform (X has it, Bluesky firehose works, LinkedIn limited). Polling cost. Privacy of engagement data storage.
**Confidence:** 80%
**Complexity:** Medium-High (gated on #1)
**Status:** Unexplored

### 6. Devlog RSS/JSON feed → public profile page
**Description:** Per-user public RSS+JSON Feed at `brag.fast/feed/[handle]` derived directly from `milestoneHits + drafts` (filtered to approved/published, respecting per-event public/private flag). Backs an SSG public profile page at `brag.fast/[handle]` — reverse-chron timeline of approved moments with rendered images embedded, schema.org `BlogPosting`/`SoftwareApplication` structured data, indexed. Same data model also feeds: weekly newsletter digest (Convex cron reads own feed), Postiz/Buffer/Zapier consumers (no per-platform integration needed by bragfast), in-product changelog widget, year-in-review/investor-update generator.
**Warrant:** `direct:` `milestoneHits` has `firedAt + sourceSystem + milestoneKey + draftExternalId`; `releases` has rendered image URLs in R2. Data is all there — this is mostly a query + a route. `external:` RSS-as-distribution-backbone is how podcasts achieved N-platform fan-out at zero per-platform cost. Programmatic SEO at scale: 500 users × N moments each = thousands of indexed pages each linking back to bragfast.
**Rationale:** One feature unlocks 5+ downstream capabilities: SEO, newsletter, third-party scheduler ingestion, public portfolio link, investor traction page. Switching cost — your archive lives on bragfast and is the canonical record. The feed is also the cheapest acquisition surface bragfast has.
**Downsides:** SEO requires care to avoid thin/spammy aggregate (canonical URLs, content depth). Per-event privacy controls needed. Public-profile abuse cases (squatting handles).
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 7. Showrunner bible — current-arc context per founder
**Description:** Founder sets one short "current chapter" string per quarter (e.g., "Q2 2026: shipping the video pipeline + proving enterprise use cases"). String is prepended to every `composeCopy` Haiku prompt as thematic context, alongside `brandVoice`. Posts read as installments in a coherent narrative, not isolated changelog entries. Quarterly nudge to update; archive of past arcs feeds year-in-review/investor-update generation (composes with #6 feed).
**Warrant:** `external:` TV writers' room methodology — showrunner bibles documented in screenwriting curricula (Vince Gilligan's Breaking Bad bible is the canonical example). `direct:` `composeCopy.ts` `BASE_SYSTEM` prompt has a clear injection point alongside the existing `brandLine()` — one optional field on `userProfiles` or `brands`.
**Rationale:** Distinct from voice (#3 — *how* you talk). This is *what story you're in*. Build-in-public that builds an audience requires narrative coherence over time. Cheap to ship; high differentiation vs PersonaBox/Postiz/TweetHunter.
**Downsides:** Founders forget to update it (stale arc → stale framing). Mitigated by quarterly nudge + auto-detection of long-stale arcs.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

## Recommended sequencing

The survivors form a dependency graph. A practical build order:

1. **#3 Voice clone** + **#7 Showrunner bible** — both touch `composeCopy` and are low-effort high-leverage. Ship together as one prompt-engineering pass. Improves draft quality immediately, before any posting infrastructure.
2. **#4 Kill desk** — improves the queue. Builds trust in the agent's judgment, which is prerequisite to giving it posting permission.
3. **#1 Postiz backbone** — closes the autopilot loop. Spin up self-hosted Postiz, wire Postiz API client in Convex action, provision team-per-user, embed OAuth flow. Bluesky probably first connector to test (lowest stakes), then X/LinkedIn.
4. **#2 Silent-approval default** — only safe after #1 is reliable and #4 has filtered the queue. Layered rollout: opt-in per source.
5. **#5 Engagement feedback loop** — needs posts in the wild from #1. **Deferred post-MVP** — Postiz analytics API check + direct platform polling out of initial scope.
6. **#6 Devlog feed + profile page** — independent of the rest; can ship in parallel any time. Possibly the highest acquisition lever.

## Rejection Summary

| Idea | Reason rejected |
|------|-----------------|
| Last-mile cliff / image-never-attached | Folded into #1 (same scope) |
| Persona memory from edits | Narrower form of #3 voice clone |
| Per-platform tone variants / Trailer-house cut-downs | Folded into #1 multi-platform variant generation |
| Slack/email draft delivery | Folded into #2 approval flow |
| Ghostwriter-intake form | Form-based version of #3; learned > asked |
| Voice drift meter | Cute, secondary; below meeting-test floor |
| Cron timezone awareness | Operational tactical; below floor |
| No outbound webhook | Subset of #6 devlog feed |
| Real-time Stripe trigger | Tactical; not a new capability |
| Engagement-signal template routing | Subset of #5 |
| Hansard archive / Wikipedia DYK miner | Folded into #4 kill desk signal extraction |
| Expediter cross-platform queue | Premature optimization until #1 ships |
| Public momentum feed / devlog page / brag receipt badge | Variants of #6 |
| Audience-remix / audience-as-editor poll | Speculative; conflicts with autopilot thesis |
| Multi-product portfolio / multi-project unified feed | Expansion, not core to autopilot story |
| Template marketplace from approval data | Premature; needs scale first |
| Engagement tariff (per-post stake) | Pricing experiment, not feature idea |
| Time capsule (one year ago) | Cute add-on; below floor |
| Investor ratchet / build log PDF | High-value but adjacent product; deserves separate ideation |
| Silence budget (monthly bursts) | Captured by #2 batch-window option |
| Ghost mode | Captured by #2 (zero-approval = max kill window) |
| Correspondent retainer / qualitative trigger / proactive scan | Pricing/expansion-y; partly absorbed by #4 kill desk |
| Approval purgatory (no status/notify/expiry) | Folded into #2 |
| Canonical Moment object (architectural) | Implementation detail of #1+#5; not a user-facing idea |
