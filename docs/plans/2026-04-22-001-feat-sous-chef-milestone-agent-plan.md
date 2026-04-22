---
title: "feat: Sous-Chef — Multi-Source Milestone Detection Agent"
type: feat
status: active
date: 2026-04-22
origin: self  # plan-mode: requirements and plan share this file
---

# Sous-Chef — Milestone Detection Agent

> **Plan-mode note.** Under normal `/ce:plan` operation this would land at `docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md`. Plan mode restricts edits to this file, so the plan is written here. When implementation starts (`/ce:work`), move or copy this to the canonical path, keep the frontmatter, and preserve the origin requirements section.

## Overview

Sous-Chef is a server-owned agent inside brag.fast that watches every connected user's GitHub, Stripe, PostHog, and Google Analytics for milestones (revenue thresholds, visitor thresholds, PR merges, star thresholds, first sale) and drafts text-only brag posts into the existing `drafts` pipeline. Each draft lands in `/admin/drafts` with a template already picked, ready for the user to add a visual and approve. It reverses the 2026-04-19 "agent brings own rails" decision: brag.fast owns the scheduler and webhook endpoints again, now across four data sources instead of one.

The feature sits on the drafts infrastructure that already shipped on `feat/drafts-endpoint` (`convex/drafts.ts`, `POST /api/v1/drafts`, `/admin/drafts` UI). It adds: multi-tenant integration configuration (key-paste based), per-user encrypted secret storage, the project's first Convex cron file, a shared Haiku wrapper, a deterministic template picker, and a dedicated Sous-Chef admin section.

## Problem Frame

Rob is ICP zero — he ships features, crosses revenue and traffic milestones, and almost never posts about any of them (25+ skipped posts in the last 30 days). brag.fast already has the rails (MCP, Haiku, pending review, drafts) but nothing *proactively* produces drafts. Today the only automatic-draft path is GitHub `release.published`, which misses everyone who doesn't cut tagged releases, and everything that isn't a code event.

Sous-Chef turns every interesting moment in a connected data source into a pre-filled draft. The user still approves, but the hard part — noticing and writing the first version — is done.

## Requirements Trace

- **R1.** Multi-tenant: every brag.fast user can connect their own GitHub / Stripe / PostHog / GA4 and get drafts for their own events. No founder-only gating. *(User decision, 2026-04-22)*
- **R2.** Text-only drafts. No image capture, no illustration generation. User adds the visual at approval time.
- **R3.** Draft includes a chosen template (`standard-browser` / `standard-mobile` / `split-browser` / `split-mobile` / `hero`). The choice must be explainable and auditable.
- **R4.** Hardcoded milestone catalog (first sale, $100/$500/$1k/$5k/$10k MRR, 100/1k/10k/100k/1M visitors, 100/1k/10k stars, every PR merged to default branch). No per-user threshold config in v1.
- **R5.** GitHub reacts via webhook (every merge to default branch, no label required); Stripe / PostHog / GA4 poll daily.
- **R6.** Each milestone fires at most once per user per milestone key, even across webhook redeliveries and cron overlaps.
- **R7.** No backfill of existing `releases` into `drafts`.
- **R8.** Retroactively-satisfied milestones on first connect are recorded as already-fired, not drafted.
- **R9.** Third-party credentials are encrypted at rest (AES-256-GCM). The raw key is shown to the user once, never returned after.
- **R10.** Sous-Chef admin home at `/admin/sous-chef` with per-provider connect/disconnect and last-scan status. Drafts UI surfaces `sourceSystem` so founders know why each draft exists.

**Success criteria** (30-day window post-ship):
- Founder post count ~5 → 20+ per month. Feature lives or dies on this. *(R1–R5, R10)*
- ≥ 70% drafts approved without copy edit (via existing `copyEditDistance`). *(R2, R3)*
- ≥ 80% drafts keep Haiku/rule-picked template (templateId at approval vs. creation). *(R3)*
- Zero duplicate drafts from redelivered webhooks or cron reruns in the first 30 days. *(R6)*
- At least one draft fired from each source (GitHub / Stripe / PostHog or GA4) within the first 7 days. *(R1, R5)*
- `releases` row count is unaffected by Sous-Chef firings (drafts go to `drafts`, never to `releases`). *(R7 — structurally enforced by Units 3, 4, 7–10, so spot-check once post-ship rather than monitor continuously.)*
- No already-crossed threshold fires a draft on first connect for any provider. *(R8 — verify by connecting a Stripe test-mode account with pre-existing MRR and confirming zero drafts from seeding.)*
- No raw third-party API key appears in logs or in a `drafts`/`integrationSecrets` row's non-ciphertext fields. *(R9 — verify via `grep -r "rk_live_" .output/` and equivalent spot-checks after a week of dogfood.)*

## Scope Boundaries

- **Out of v1:** Stripe Connect OAuth, Google OAuth, PostHog OAuth, Stripe webhook reception, auto-generated visuals, user-configurable thresholds, non-Twitter channels, auto-post (drafts always need human approve), encryption-key rotation design.
- **Out of v1:** LLM-judged milestone filtering ("is this PR shippable?"). Deferred in favor of the rate cap + debounce safety net below.

### Deferred to Separate Tasks

- Stripe webhook-driven real-time MRR milestones: wait until a user churns from "a day late" to justify the Stripe Connect OAuth work.
- Second-tenant rollout itself (opening Sous-Chef to anyone other than Rob). Note: the technical prerequisite — PR-merge noise cap + debounce — is **not** deferred; it lands in v1 inside Unit 7. The deferral is the rollout decision, not the safety net.
- `SECRET_BOX_KEY` rotation / versioned keys: tracked as tech debt, documented in `.env.example`.
- MCP surface for Sous-Chef (e.g. `sous_chef_list_milestones`): revisit once at least one user other than Rob is on it.

## Context & Research

### Relevant Code and Patterns

- **Drafts table & API:** `convex/schema.ts` (drafts table, lines 173-183) · `convex/drafts.ts` (create/listByUser/getByExternalId/remove) · `src/app/api/v1/drafts/route.ts` · `src/app/api/v1/drafts/[id]/route.ts` · `src/components/admin/drafts-client.tsx`.
- **Dedup precedent:** `convex/schema.ts` `by_sourceMetadata` index on `releases` · `convex/releases.ts:77-85` `getBySourceMetadata` · `convex/schema.ts` `githubSkippedReleases` table with `reason: "duplicate"`.
- **Webhook signature pattern:** `src/lib/github/verify-webhook.ts` (HMAC-SHA256 + length check + `timingSafeEqual`) — reuse exactly for Stripe later; copy structure for any other signed webhook.
- **Scheduler pattern:** `convex/releases.ts:165-205` — atomic `ctx.db.insert` + `ctx.scheduler.runAfter` inside a single `internalMutation` so writes are transactional.
- **Cron target precedent:** `convex/uploadTokens.ts:83` `expireStale` mutation, explicitly "run from a cron or on-demand sweep". First entry of `convex/crons.ts` can reuse its shape.
- **Haiku call sites:** `src/lib/github/analyze-release.ts` (`buildAnalysisPrompt` + `parseAnalysisResponse`) · `src/lib/copy/generate-copy.ts`. Both duplicate regex-extraction + `JSON.parse` + manual `typeof` checks + silent fallback — consolidation target for the new `src/lib/haiku-call.ts`.
- **Template definitions:** `src/lib/templates/canvas-defaults.ts`. `visualFrame: "browser" | "mobile" | "none"` is the existing key to match against the PR-keyword rule.
- **Admin route group:** `src/app/(admin)/*` already has `github-apps`, `drafts`, `kitchen`, `history`, `account/billing`. Sous-Chef fits as a sibling route group.

### Institutional Learnings

`docs/solutions/` contains only three UI-related best-practices entries and nothing on webhooks, crons, secrets, multi-tenant integrations, or Haiku wrappers. Every pattern below is net-new territory — post-ship, fold the learnings into a new solutions doc.

### External References

- Stripe restricted-key scopes: `read:charges`, `read:customers`, `read:subscriptions`, `read:invoices`. Documented in Stripe dashboard API-keys section — paste the list in the setup page copy.
- PostHog personal API key + `/api/projects/:id/insights/trend/` for unique visitor counts over a rolling window; cloud host = `us.posthog.com` or `eu.posthog.com`.
- GA4 Data API — service-account JSON, property ID, `properties/:id:runReport` with `totalUsers` metric over rolling 30-day window.

## Key Technical Decisions

- **Fresh table for third-party secrets, not `apiKeys`:** the existing `apiKeys` table stores raw keys in a `v.optional(v.string())` field with a comment implying they're not stored. That's fine for brag.fast's *issued* API keys (only the hash is used for verification) but wrong for *read-back* third-party keys. A new encrypted column is required, and so is a new table.
- **AES-256-GCM with env-var `SECRET_BOX_KEY`, not KMS:** hosted KMS (AWS/GCP) is v2. Env-var key + documented rotation TODO is right-size for an app running in one Next.js/Convex environment.
- **Polling over webhooks for Stripe / PostHog / GA4:** paste-a-key without configuring a webhook endpoint + secret means polling is the cheaper UX. Daily cron acceptable for revenue/traffic milestones (no one cares if a "$1k MRR" draft lands 6 hours late).
- **GitHub PR merges, no label:** user explicit. Noise risk mitigated by per-repo cap + debounce (Unit 7), not by label curation.
- **Rule-based template picker with Haiku fallback:** deterministic decision table for 90% of cases, one Haiku call only when rules return `"ambiguous"`. Keeps cost flat, debuggable, overridable.
- **One Haiku call per draft for copy:** regardless of source type; prompt is source-aware. Consolidated through a new `src/lib/haiku-call.ts` Zod-validated wrapper that also absorbs `analyze-release.ts` and `copy/generate-copy.ts`.
- **`insertDraftIfNew` via unique `idempotencyKey`:** canonical format is `${userId}:${sourceSystem}:${milestoneKey}`. `milestoneKey` itself carries whatever extra context disambiguates the event (e.g. `pr_merged:owner/repo#42` for PR merges, `mrr:1000` for revenue thresholds, `star:100:owner/repo` for star thresholds, `visitors:10000` for PostHog, `ga:visitors:10000` for GA4). The resulting key has effectively four or five colon-separated segments in practice; the three-part decomposition reflects the three fields we store on the `drafts` row, not a fixed segment count. Guards against both webhook redelivery and cron overlap. Builds on the `getBySourceMetadata`-then-insert idiom already used for releases.
- **`eventReference` semantics:** a human-readable pointer to the originating event, used for observability and for the `/admin/drafts` card's "view source" link. Format is provider-specific (GitHub PR URL, Stripe `evt_*` id, PostHog insight URL, GA4 report URL). It is NOT used for idempotency (that's `idempotencyKey`) and NOT used for dedup (that's `milestoneKey`). Always optional.
- **Scan actions write back via `internalMutation`, never `ctx.db` directly:** Convex actions cannot write to the DB. Every scan action ends by calling a mutation to persist `milestoneHits` + `drafts` atomically.

## Open Questions

### Resolved During Planning

- Tenancy → multi-tenant from day one.
- Integration UX → paste read-only API key.
- Milestone definition → hardcoded catalog.
- Stripe cadence → polling.
- GitHub scope → every PR merged to default branch, no label.
- Template picker → rules + LLM fallback.
- Backfill `releases` → no.
- Retroactive milestones → skip, seed as already-hit on connect.
- Naming → Sous-Chef, `/admin/sous-chef`.

### Deferred to Implementation

- Exact Haiku prompts for each milestone category — iterate against real data in dev.
- Exact PostHog insight query shape — depends on a test project's schema; validate during Unit 9.
- Exact GA4 Data API request body — service-account JSON in hand is a prerequisite; validate during Unit 10.
- PR-merge debounce rollup copy format ("merged 3 PRs in 30 min" vs. one-liner per title) — decide after Unit 7 by eyeballing early drafts.
- Whether the star-milestone cron should also cover collaborator-authored repos, or only the installation owner's. Probably yes but confirm when the GitHub stars code is live.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```mermaid
flowchart LR
    subgraph Sources
      GH[GitHub PR merge]
      SA[Stripe API]
      PH[PostHog API]
      GA[GA4 API]
    end

    GH -- webhook --> WH[/app/api/github/webhooks]
    CR[convex/crons.ts 15:00-15:10 UTC] --> SS[scanStripe action]
    CR --> SP[scanPostHog action]
    CR --> SG[scanGa4 action]
    CR --> STR[scanGithubStars action]
    SS --> SA
    SP --> PH
    SG --> GA

    WH --> CP[compose draft]
    SS --> CP
    SP --> CP
    SG --> CP
    STR --> CP

    CP --> PT[pick-template rules]
    PT -->|ambiguous| HC[haiku-call fallback]
    CP --> HCOPY[haiku-call copy composer]

    CP --> IDN[insertDraftIfNew]
    IDN --> MH[(milestoneHits)]
    IDN --> DR[(drafts)]
    DR --> UI[/admin/drafts]
```

Two write paths — webhook (GitHub) and cron (Stripe/PostHog/GA4/stars) — converge on a shared composer that picks a template, calls Haiku for copy, and atomically writes the draft + milestone-hit row via a single idempotent mutation.

## Implementation Units

- [ ] **Unit 1: Secret-box crypto primitive**

**Goal:** Reusable AES-256-GCM wrapper so every integration stores credentials the same way.

**Requirements:** R9.

**Dependencies:** None.

**Files:**
- Create: `src/lib/crypto/secret-box.ts`
- Create: `src/lib/crypto/__tests__/secret-box.test.ts`
- Modify: `.env.example` (add `SECRET_BOX_KEY` with `openssl rand -base64 32` generation note)

**Approach:**
- Export `seal(plaintext: string): { ciphertext, iv, tag }` and `open(payload): string`.
- Use Node `crypto.createCipheriv("aes-256-gcm", keyBuf, iv)` with a 12-byte random IV. Store `ciphertext`, `iv`, `tag` as base64 strings.
- Read `SECRET_BOX_KEY` lazily from `process.env` and cache the decoded buffer. Throw on missing/short key.
- Document rotation as out-of-scope tech debt in a TODO comment.

**Patterns to follow:**
- `src/lib/github/verify-webhook.ts` — same `import crypto from "crypto"` idiom, same length-check-before-compare approach.

**Test scenarios:**
- Happy path: `open(seal(x)) === x` for ASCII, unicode, 1-byte, 10KB strings.
- Edge case: empty string round-trips.
- Error path: modified `ciphertext` → `open` throws.
- Error path: modified `tag` → `open` throws.
- Error path: missing `SECRET_BOX_KEY` → both functions throw with a recognizable message.
- Error path: `SECRET_BOX_KEY` shorter than 32 bytes → throws.

**Verification:**
- `npx vitest run src/lib/crypto/__tests__/secret-box.test.ts` green.
- Grep confirms no other file in repo imports `createCipheriv` outside this module.

- [ ] **Unit 2: Shared Haiku call wrapper and existing-site refactor**

**Goal:** One typed Haiku entry point with Zod validation, replacing duplicated regex+parse+fallback in two existing files.

**Requirements:** R3, R4 (supports template picker + copy composer).

**Dependencies:** None (but blocks Units 5 and 6).

**Files:**
- Create: `src/lib/haiku-call.ts`
- Create: `src/lib/__tests__/haiku-call.test.ts`
- Modify: `src/lib/github/analyze-release.ts` (use `callHaiku` — drop local regex + JSON parse)
- Modify: `src/lib/copy/generate-copy.ts` (same)

**Approach:**
- Export `callHaiku<T extends ZodTypeAny>({ prompt, schema, maxTokens?, fallback? })`.
- Extract first JSON object via regex `/\{[\s\S]*\}/` (same shape as existing code); parse; `schema.safeParse`; return typed value, fall back on `fallback` when validation fails (with a single `console.warn`).
- Model pinned to `claude-haiku-4-5-20251001`.
- Keep the Anthropic SDK import and API-key env var identical to existing call sites.

**Patterns to follow:**
- `src/lib/github/analyze-release.ts` — existing prompt-build + parse shape.

**Test scenarios:**
- Happy path: SDK mock returns valid JSON matching schema → typed value returned.
- Edge case: SDK returns JSON wrapped in prose → regex extracts, schema parses.
- Error path: SDK returns malformed JSON → fallback returned, warn logged.
- Error path: JSON parses but violates Zod schema → fallback returned, warn logged.
- Integration: existing `analyzeRelease` tests still pass after refactor (no behavior regression).

**Verification:**
- `npx vitest run` covering both new tests and existing analyze-release tests green.
- The two refactored sites no longer contain local `JSON.parse(match[0])` calls.

- [ ] **Unit 3: Schema deltas**

**Goal:** Add all new tables and optional fields in one additive migration-free change.

**Requirements:** R1, R3, R6, R9, R10.

**Dependencies:** None.

**Files:**
- Modify: `convex/schema.ts`

**Approach:**
- New table `integrationSecrets`: `{ userId: string, provider: "stripe" | "posthog" | "ga4", ciphertext: string, iv: string, tag: string, extra?: string (JSON blob for provider-specific non-secret config like projectId/propertyId/host), enabled: boolean, lastScanAt?: string, lastScanOkAt?: string, lastScanError?: string, created_at, updated_at }`. Index `by_userId_provider`.
- New table `milestoneHits`: `{ userId, sourceSystem: "github" | "stripe" | "posthog" | "ga4", milestoneKey: string, idempotencyKey: string, firedAt: string, draftExternalId?: string }`. Index `by_idempotencyKey` (for unique-enforcement-via-query) and `by_userId`.
- Extend `drafts`: optional `sourceSystem`, optional `milestoneKey`, optional `eventReference`, optional `idempotencyKey`. Index `by_idempotencyKey`.
- Extend `githubRepoConfigs`: `notifyOnPrMerge: v.optional(v.boolean())`. Default treated as false at read time; no data migration.

**Patterns to follow:**
- Existing `githubRepoConfigs` shape (`convex/schema.ts:116-134`) — same `userId`/`enabled`/timestamp convention, same `by_userId` index layout.

**Test scenarios:**
- Test expectation: none — schema-only change validated by `npm run build` (Convex codegen) succeeding and `npx tsc --noEmit` passing.

**Verification:**
- `npm run build` passes; Convex codegen produces types for every new table and field.
- Existing `convex/drafts.ts:create` accepts the new optional fields without breaking existing callers.

- [ ] **Unit 4: Idempotent draft + milestone-hit mutation**

**Goal:** Transactional `insertDraftIfNew` that writes `drafts` + `milestoneHits` together, keyed by a single idempotencyKey, so webhook redelivery and cron overlap never produce duplicates.

**Requirements:** R6.

**Dependencies:** Unit 3.

**Files:**
- Create: `convex/milestoneHits.ts`
- Modify: `convex/drafts.ts` (add `insertDraftIfNew` public mutation; keep existing `create` untouched for direct-API-key callers)
- Create: `convex/__tests__/milestoneHits.test.ts` (Convex test via `convex-test` harness if present; otherwise a thin integration wrapper)

**Approach:**
- `insertDraftIfNew(args: { userId, idempotencyKey, sourceSystem, milestoneKey, eventReference?, config: DraftConfig })` inside `convex/drafts.ts` as a `mutation`.
- Step 1: `ctx.db.query("drafts").withIndex("by_idempotencyKey", q => q.eq("idempotencyKey", key)).first()` → if hit, return existing externalId with `{ created: false }`.
- Step 2: insert draft (reusing existing `create` logic but with the extra optional fields set).
- Step 3: insert `milestoneHits` row with `draftExternalId` back-reference.
- All three steps in one mutation handler = transactional.
- `convex/milestoneHits.ts` exposes: `listByUser(userId)`, `seedAlreadyHit(userId, source, milestoneKey)` (used by Unit 8-10 on first connect), internal helpers.

**Patterns to follow:**
- `convex/releases.ts:77-85` `getBySourceMetadata`-then-insert idiom, upgraded to a single mutation to close the read-insert race.
- `convex/uploadTokens.ts:expireStale` as another example of "designed for cron/scheduled" mutations.

**Test scenarios:**
- Happy path: first call with idempotencyKey `u1:stripe:mrr:100` creates draft and milestone-hit row; returns `{ created: true, externalId }`.
- Edge case: second call with same key returns `{ created: false, externalId: <same> }`, no new draft row.
- Edge case: two concurrent calls with same key → only one insert wins (Convex mutation serialization).
- Error path: missing `idempotencyKey` → mutation throws validation error.
- Integration: after insert, `convex/drafts.ts:listByUser` returns the new draft with `sourceSystem` populated.

**Verification:**
- Test suite green.
- `listByUser` returns draft with `sourceSystem="stripe"` and matching `milestoneKey`.

- [ ] **Unit 5: Template picker (rules + Haiku fallback)**

**Goal:** Deterministic `pickTemplate(event) -> templateId` with a single Haiku-backed fallback for ambiguous cases.

**Requirements:** R3.

**Dependencies:** Unit 2.

**Files:**
- Create: `src/lib/drafts/pick-template.ts`
- Create: `src/lib/drafts/__tests__/pick-template.test.ts`

**Approach:**
- Rule table (keyed by milestone type):
  - milestoneKey starts with `mrr:`, equals `first_sale`, starts with `visitors:`, starts with `ga:` (covers `ga:visitors:*` from Unit 10), or starts with `star:` (covers `star:<N>:<owner>/<repo>` from Unit 11) → `hero`.
  - `pr_merged` → inspect `title + body` (concatenated, lowercased):
    - If matches `/\b(ios|iphone|ipad|android|react native|mobile app)\b/` → mobile variant.
    - Otherwise → browser variant.
    - If combined `body.length < 120` → `standard-*`; else → `split-*`.
- When `event.type === "pr_merged"` *and* matches *both* browser and mobile keywords, return `"ambiguous"` and call Haiku fallback via `callHaiku` with a short prompt that receives the five template names + short descriptions and the event context; Haiku returns a single template id validated by a Zod enum.
- Return `{ templateId, reason: "rule" | "haiku", debug: { matchedKeyword?, rule? } }` — stored on the draft for later observability.

**Patterns to follow:**
- `src/lib/templates/canvas-defaults.ts` template ID literals.

**Test scenarios:**
- Happy path: `mrr:1000` → `hero`, reason `"rule"`.
- Happy path: `pr_merged` with short body + no keyword → `standard-browser`.
- Happy path: `pr_merged` with long body + no keyword → `split-browser`.
- Happy path: `pr_merged` with `iPhone` in title + short body → `standard-mobile`.
- Happy path: `star:100` → `hero`.
- Edge case: `pr_merged` with both "iOS" and "web" keywords → `"ambiguous"` → Haiku mock returns `"split-mobile"` → result is `split-mobile`, reason `"haiku"`.
- Error path: Haiku validates to an unknown string → schema rejects → fallback `"standard-browser"`, reason `"haiku-fallback"`.

**Verification:**
- Every rule-table row covered by a test.
- One mocked Haiku-fallback test green.

- [ ] **Unit 6: Copy composer per milestone category**

**Goal:** One function per milestone family that produces `{ title, description }` sized to the picked template.

**Requirements:** R2 (text-only), R3 (copy must fit chosen template's text slots).

**Dependencies:** Unit 2.

**Files:**
- Create: `src/lib/drafts/compose-copy.ts`
- Create: `src/lib/drafts/__tests__/compose-copy.test.ts`

**Approach:**
- Exports `composeCopy(event, brandVoice?) -> { title, description }`.
- Internally routes by `event.type`:
  - `pr_merged` → Haiku prompt uses PR title + body, respects `brands.voice` if present.
  - `mrr:<N>` / `first_sale` → Haiku prompt is celebratory + uses the raw number (no prose rewrite for `$1k MRR`).
  - `visitors:<N>` / `ga:<N>` → Haiku prompt is celebratory + uses the raw number.
  - `star:<N>` → "just crossed N stars on <repo>" shape; pull repo name from event.
- Uses `callHaiku` (Unit 2) with a Zod schema `{ title: z.string().max(140), description: z.string().max(600) }`.
- Fallback copy is deterministic per category (e.g. for MRR: `{ title: "New milestone hit", description: "We just crossed {N} MRR." }`).

**Patterns to follow:**
- Brand voice injection via `resolveBrand` in `src/lib/pipeline/shared.ts`.

**Test scenarios:**
- Happy path × 4: PR merge, MRR threshold, visitor threshold, star threshold — each returns Haiku-mocked typed output.
- Edge case: brand voice absent → prompt still composes, generic voice.
- Error path: Haiku validation fails → deterministic fallback copy returned, warn logged.
- Integration: title/description lengths fit the known slot caps (title ≤ 140 in all templates, description ≤ 600 chars for split-* which have the smallest-font largest-height description slots).

**Verification:**
- All four categories produce outputs that pass Zod schema in the mock test.
- Length assertions hold.

- [ ] **Unit 7: GitHub PR-merge webhook branch + noise cap + debounce**

**Goal:** Extend the existing GitHub webhook to react to every PR merged to the repo's default branch, composing and inserting a draft — with a per-repo daily cap and a 30-minute debounce rollup to prevent flooding.

**Requirements:** R4, R5, R6.

**Dependencies:** Units 4, 5, 6.

**Files:**
- Modify: `src/app/api/github/webhooks/route.ts`
- Modify: `convex/githubRepoConfigs.ts` (add `countDraftsInLastDay(userId, repoFullName)`, `findRecentPendingDraftForRepo(userId, repoFullName, withinSeconds)` queries)
- Create: `src/app/api/github/__tests__/pull-request-webhook.test.ts` (fixture replay)

**Approach:**
- Add `pull_request` to the `action` switch. Early-return unless `action === "closed" && payload.pull_request.merged === true && payload.pull_request.base.ref === payload.repository.default_branch`.
- Respect `repoConfig.notifyOnPrMerge`; early-return if false/undefined.
- Build `idempotencyKey = ${userId}:github:pr_merged:${repoFullName}#${pr.number}`.
- **Noise cap:** count existing `pr_merged` drafts for this repo in the last 24h. If ≥ 10, log to `githubSkippedReleases` with a new `reason: "rate_cap"` literal (extend the enum) and return 200.
- **Debounce rollup:** if there's a draft from the same repo created < 30 min ago and still in `pending_review`, update its description to "Merged N PRs: …" (append PR title) *instead of* creating a new draft. Return 200.
- Otherwise: `composeCopy` → `pickTemplate` → `insertDraftIfNew`. Fire the work via `after()` so the webhook response is fast.

**Execution note:** Start with a failing fixture-replay test for the happy path and the dedup path; build up the debounce and cap tests as behavior lands.

**Patterns to follow:**
- Existing release handler at `src/app/api/github/webhooks/route.ts:187`.
- `after()` background pattern already in use in the same file.

**Test scenarios:**
- Happy path: new PR merged, config opted in → one draft created, one `milestoneHits` row, 200 response.
- Happy path: template picker invoked — mobile keyword in PR title → `standard-mobile` picked.
- Edge case: PR closed without merge → no draft, 200.
- Edge case: PR merged to non-default branch → no draft, 200.
- Edge case: repo config `notifyOnPrMerge: false` → no draft, 200.
- Edge case: same webhook redelivered → second call returns the existing externalId, no new row.
- Edge case: 11th PR merge in 24h for the same repo → skipped with `reason: "rate_cap"`.
- Edge case: second PR merged 5 min after first (same repo) with existing pending draft → existing draft description updated, no new draft row.
- Error path: `composeCopy` throws → webhook still responds 200, failure recorded (no draft, no milestone hit).
- Integration: `/admin/drafts` shows the new draft with `sourceSystem: "github"` badge after the request completes.

**Verification:**
- Fixture-replay test suite green.
- Local `npm run dev` + `smee.io`-tunneled webhook replay produces a draft visible in `/admin/drafts`.

- [ ] **Unit 8: Stripe integration — scan action + first-connect seed**

**Goal:** Daily scan of each user's Stripe account, firing drafts for crossed MRR thresholds and first-sale. On first connect, seed `milestoneHits` with already-crossed thresholds so no historical flood.

**Requirements:** R1, R4, R5, R6, R8, R9.

**Dependencies:** Units 1, 3, 4, 6.

**Files:**
- Create: `convex/integrations/stripe.ts` (`"use node"`, `internalAction` + `internalMutation` pair)
- Create: `convex/__tests__/stripe-scan.test.ts`
- Create: `src/lib/integrations/stripe-milestones.ts` (pure functions — MRR calc from subscription list, threshold-crossing detector)
- Create: `src/lib/integrations/__tests__/stripe-milestones.test.ts`

**Approach:**
- `internalAction scan({ userId })`: load `integrationSecrets` row, decrypt, instantiate Stripe client, list active subscriptions + recent charges, compute MRR, detect first-sale.
- Compare against `milestoneHits` for this user; compute new hits strictly above previously highest-hit threshold.
- For each new hit, call the mutation chain (Unit 4) via `ctx.runMutation(api.drafts.insertDraftIfNew, ...)`. Use `composeCopy` for text (Unit 6) and `pickTemplate` (Unit 5).
- Update `integrationSecrets.lastScanAt` and either `lastScanOkAt` or `lastScanError`.
- First-connect path: expose `seedFromCurrentState({ userId })` action (called from Unit 12's setup form). Same Stripe read, but writes `milestoneHits` only — no drafts.

**Execution note:** Pure MRR math in `stripe-milestones.ts` is test-first. The Convex action is exercised via a thin integration test with the Stripe SDK mocked.

**Patterns to follow:**
- `convex/videoRender.ts` — `"use node"` + `internalAction` + secret-read-then-call-external-API + write-back-via-mutation shape.

**Test scenarios:**
- Happy path (pure MRR calc): 5 active subs at $20/mo → MRR = $100.
- Happy path (pure threshold calc): previousMax = $50, current = $1500 → new hits `[100, 500, 1000]`, not `[5000, 10000]`.
- Edge case: currency other than USD → normalize to USD via Stripe-supplied rate or drop with explicit skip log.
- Edge case: MRR regression (churn drops from $1200 to $800) → no hits fired.
- Happy path (scan action): mocked Stripe client → 3 new thresholds crossed since last scan → 3 drafts inserted, 3 milestoneHits rows, `lastScanOkAt` updated.
- Edge case: first-connect seed → user already has $1200 MRR → `milestoneHits` seeded with `mrr:100`, `mrr:500`, `mrr:1000` as already-fired, zero drafts created.
- Error path: decryption fails → `lastScanError` set, no drafts written.
- Error path: Stripe API returns auth error → `lastScanError` set with readable message, no retry storm.
- Integration: after seed + scan, `convex/drafts.ts:listByUser` returns any legitimately new drafts with `sourceSystem: "stripe"`.

**Verification:**
- `npx vitest run src/lib/integrations/__tests__/stripe-milestones.test.ts` green.
- Local `npx convex run integrations/stripe:scan --args '{"userId":"u1"}'` produces expected drafts against a Stripe test-mode account.

- [ ] **Unit 9: PostHog integration — scan action + first-connect seed**

**Goal:** Daily scan of each user's PostHog project for unique-visitor thresholds (rolling 30d). Seed already-hit thresholds on first connect.

**Requirements:** R1, R4, R5, R6, R8, R9.

**Dependencies:** Units 1, 3, 4, 6.

**Files:**
- Create: `convex/integrations/posthog.ts` (`"use node"`, `internalAction`)
- Create: `src/lib/integrations/posthog-milestones.ts`
- Create: `src/lib/integrations/__tests__/posthog-milestones.test.ts`

**Approach:**
- Mirrors Unit 8's shape: decrypt secret (includes `projectId` + `host` in `extra` JSON), call PostHog API for unique-visitor count over rolling 30 days, compare against `milestoneHits`, insert drafts for new hits.
- Thresholds: `100, 1000, 10000, 100000, 1000000` visitors.
- First-connect seed path identical.

**Patterns to follow:**
- Unit 8 Stripe scan — copy the skeleton, swap the client + metric.

**Test scenarios:**
- Happy path (threshold calc): currentVisitors = 15000, previousMax = 1000 → new hits `[10000]`, not `[100000]`.
- Happy path (scan action): mocked PostHog HTTP response → expected drafts.
- Edge case: PostHog project returns 0 visitors (new project) → no hits, no drafts.
- Edge case: EU vs US host — `extra.host` drives base URL; both covered by fixture test.
- Edge case: first-connect with 50000 visitors → seed `[100, 1000, 10000]`, zero drafts.
- Error path: 401 from PostHog → `lastScanError` set, no drafts.

**Verification:**
- Pure milestone-calc tests green.
- Scan action returns expected counts in a fixture replay.

- [ ] **Unit 10: Google Analytics 4 integration — scan action + first-connect seed**

**Goal:** Same as Unit 9 but for GA4 totalUsers metric over rolling 30 days.

**Requirements:** R1, R4, R5, R6, R8, R9.

**Dependencies:** Units 1, 3, 4, 6.

**Files:**
- Create: `convex/integrations/ga4.ts` (`"use node"`, `internalAction`)
- Create: `src/lib/integrations/ga4-milestones.ts`
- Create: `src/lib/integrations/__tests__/ga4-milestones.test.ts`

**Approach:**
- Decrypt `extra` JSON containing `propertyId` + the service-account JSON.
- Use `@google-analytics/data` Node SDK (`BetaAnalyticsDataClient`) or raw REST — pick whichever is lighter; package version pinned in `package.json`.
- `runReport` for `totalUsers` over `YYYY-MM-DD,today` rolling window.
- Milestone keys use `ga:visitors:<N>` prefix to distinguish from PostHog in `milestoneHits`.

**Patterns to follow:**
- Unit 9 — structural clone with GA-specific client.

**Test scenarios:**
- Happy path (threshold calc): mirrors Unit 9 with `ga:visitors:*` keys.
- Edge case: service-account JSON invalid → `lastScanError` set at setup time, not scan time (caught in Unit 12 validation step).
- Edge case: propertyId missing or wrong format → same.
- Happy path (scan action): GA4 SDK mock returns totalUsers = 25000 → draft for `ga:visitors:10000`.
- Error path: Google API auth error → `lastScanError` set with readable message.

**Verification:**
- Pure milestone-calc tests green.
- Scan action fires drafts with `sourceSystem: "ga4"` in local dev with a real service account.

- [ ] **Unit 11: Convex crons — first `convex/crons.ts` in the project**

**Goal:** Schedule daily scans for Stripe, PostHog, GA4, and GitHub stars.

**Requirements:** R5.

**Dependencies:** Units 4, 5, 6, 8, 9, 10. (The stars scan uses the same composer / picker / idempotent mutation as the other three integrations.)

**Files:**
- Create: `convex/crons.ts`
- Create: `convex/integrations/github-stars.ts` (new `"use node"` action walking connected installations, polling star counts via existing `getInstallationToken` flow. Milestone key format `star:<N>:<owner>/<repo>` — the repo suffix is required because one user can own many repos, each capable of crossing the same star threshold independently.)
- Create: `src/lib/integrations/github-star-milestones.ts` + tests

**Approach:**
- Use Convex `cronJobs()` API. Schedule:
  - 15:00 UTC daily → `internal.integrations.stripe.scanAll` (fan-out over enabled users).
  - 15:05 UTC daily → `internal.integrations.posthog.scanAll` and `internal.integrations.ga4.scanAll` in parallel.
  - 15:10 UTC daily → `internal.integrations.githubStars.scanAll`.
- Each `scanAll` action queries `integrationSecrets` (or `githubInstallations`) for enabled rows and schedules per-user scan actions via `ctx.scheduler.runAfter(0, ...)` so each user's work is isolated and one user's error does not block another's scan.

**Patterns to follow:**
- `convex/uploadTokens.ts:expireStale` — the project's first cron-ready mutation, designed for this exact shape.

**Test scenarios:**
- Integration: running `scanAll` in dev with two enabled users schedules two per-user scans, no exceptions propagate if one errors.
- Integration: stars scan detects a crossed threshold and fires a draft with `sourceSystem: "github"` and `milestoneKey: "star:100:<repo>"`.

**Verification:**
- `npx convex dev` starts, crons registered, manual invocation of each `scanAll` works.

- [ ] **Unit 12: Sous-Chef admin UI + provider setup + drafts source badge + GitHub opt-in toggle**

**Goal:** Ship the user-facing surface: Sous-Chef landing with per-provider tiles, three setup pages (Stripe / PostHog / GA4), the per-repo `notifyOnPrMerge` toggle on the GitHub page, and the source badge in `/admin/drafts`.

**Requirements:** R3 (user sees which template was picked), R10.

**Dependencies:** Units 1, 3, 8, 9, 10, 11. (Unit 11 specifically, because the first-connect seed flow schedules the provider's `seedFromCurrentState` action, which relies on the per-provider scan infrastructure being in place.)

**Files:**
- Create: `src/app/(admin)/sous-chef/page.tsx`
- Create: `src/app/(admin)/sous-chef/[provider]/page.tsx` (Stripe / PostHog / GA4 forms)
- Create: `src/app/api/v1/sous-chef/integrations/route.ts` (POST to save pasted key, GET to list status) — reuses dual-auth via `src/lib/auth/authenticate.ts`.
- Modify: `src/components/admin/drafts-client.tsx` (new `SourceSystemBadge` next to existing `SourceBadge`; shows `milestoneKey` as a tooltip)
- Modify: `src/app/(admin)/github-apps/page.tsx` (or its per-repo config component) — add `notifyOnPrMerge` toggle with save.

**Approach:**
- Setup page POSTs the pasted secret directly to the Convex mutation via `/api/v1/sous-chef/integrations` (server-side, so the key passes through Next.js route handler using `seal()` from Unit 1 before hitting Convex). Never store raw key client-side.
- On save success, kicks off `seedFromCurrentState` via `ctx.scheduler.runAfter(0, ...)` (Unit 8–10 entry points).
- Landing page reads all integrations for the user and renders status tiles with "Connected" / "Not connected" / "Error on last scan" states. Copy uses the sous-chef metaphor ("prepping tomorrow's post…").
- Display the stored key as `rk_••••XXXX` — only the last 4 chars; never re-send the raw value.
- Drafts UI badge: read `sourceSystem` + `milestoneKey` off the draft (already extended in Unit 3), render a small pill.

**Patterns to follow:**
- `src/components/admin/drafts-client.tsx` existing `SourceBadge` and `OutputBadge` render approach.
- `src/app/(admin)/github-apps/*` for the per-repo config row pattern.
- `src/lib/auth/authenticate.ts` dual-auth for the new API route.

**Test scenarios:**
- Happy path: user pastes a Stripe restricted key → server stores sealed secret → `integrationSecrets` row created with `enabled: true` → seed action scheduled.
- Happy path: Sous-Chef landing shows three tiles with correct connected / not-connected states after setup.
- Happy path: `/admin/drafts` renders `sourceSystem` badge (`GitHub` / `Stripe` / `PostHog` / `GA4`) and tooltip-exposes the milestoneKey.
- Happy path: toggling `notifyOnPrMerge` on a GitHub repo writes to `githubRepoConfigs`.
- Edge case: pasted key is obviously malformed (`rk_live_…` with wrong length) → server responds with a validation error; no DB write.
- Edge case: re-pasting a key for an already-connected provider replaces the old ciphertext (no soft-delete ceremony in v1).
- Error path: user with no brag.fast session hitting `/api/v1/sous-chef/integrations` → 401.
- Integration: round-trip — paste key → seed runs → `milestoneHits` populated with already-hit thresholds → no drafts fired from historical data.

**Verification:**
- Manual QA on `npm run dev`: connect a Stripe test-mode account, see it reflected on the Sous-Chef landing; merge a PR into a sandbox repo's `main` with the toggle on → draft appears in `/admin/drafts` with the `GitHub` badge and correct template.
- Drafts listing remains sortable and filterable (no regression).

## System-Wide Impact

- **Interaction graph:** GitHub webhook path grows a second event branch (`pull_request`). Two new Convex cron schedules fan out into per-user scans. New admin route group (`(admin)/sous-chef`) sits alongside existing groups. `/admin/drafts` gains one new badge field but its CRUD surface is unchanged.
- **Error propagation:** Scan failures per user are isolated (`lastScanError` per row, no cross-user impact). Webhook failures respond 200 with logged skip — we never tell GitHub to retry, because retries would just rediscover an already-processed merge (idempotency would dedup but we save the round trip). Secret-box decryption errors abort the specific user's scan, never throw up to the scheduler and block sibling users.
- **State lifecycle risks:** `milestoneHits` grows monotonically. No cleanup needed — each row is cheap, and deleting one would re-open a draft-firing window. `integrationSecrets` does need a disconnect path (set `enabled: false`, clear ciphertext) — covered by Unit 12's "disconnect" tile action.
- **API surface parity:** `POST /api/v1/drafts` already accepts `source: "agent" | "user"`. New optional fields (`sourceSystem`, `milestoneKey`, `eventReference`, `idempotencyKey`) must be accepted by both `create` (direct) and the new `insertDraftIfNew` paths so external MCP clients can also fire idempotent drafts if they want to.
- **Integration coverage:** The composer (Unit 6) + template picker (Unit 5) + idempotent mutation (Unit 4) must all work together in a real fixture — covered as an integration test in Unit 7's happy path. Do not rely on pure unit tests alone for the PR-merge path because the template picker's keyword match touches real text.
- **Unchanged invariants:** The GitHub `release.published` path is untouched. `POST /api/v1/drafts` still works as a raw-create endpoint for MCP-driven flows. `apiKeys` table is not touched — Sous-Chef third-party secrets live in a fresh `integrationSecrets` table.

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Raw key leak via DB snapshot or log line | Med | High | AES-256-GCM at rest (Unit 1); redact ciphertext in logs; setup form never echoes raw key after save. |
| PR-merge draft flood in active repos | High | Med | Per-repo daily cap (10/day) + 30-min debounce rollup (Unit 7). Both ship in v1 before a second user onboards. |
| Stripe restricted-key scope misconfigured by user | High | Low | Setup page lists required scopes (`read:charges`, `read:customers`, `read:subscriptions`, `read:invoices`); first-connect seed validates by making a no-op `subscriptions.list` call and surfaces a readable error if scopes are wrong. |
| Cron overlap double-fire | Med | Low | Idempotency key on `milestoneHits` + transactional `insertDraftIfNew` (Unit 4). |
| Webhook signature bypass | Low | High | Reuse existing `verify-webhook.ts` pattern untouched. No new verification logic. |
| `SECRET_BOX_KEY` rotation not designed | Low | High | Document as tech debt in `.env.example` and in the rotation-TODO comment in `secret-box.ts`. Acceptable for single-env v1; v2 adds versioned keys + lazy re-seal. |
| Haiku cost spike | Low | Med | Haiku is called only on template-picker ambiguity (rare) and on copy composition (once per draft); all other paths are rule-based. Expected < 50 Haiku calls/day across all users initially. |
| GA4 service-account JSON upload parse failure | Med | Low | Validate on paste: attempt a `properties/:id:metadata` call; surface a readable error and refuse to save invalid credentials. |
| User expects retroactive history backfilled | Low | Low | Setup page copy explicitly states "Sous-Chef only celebrates forward motion — past milestones won't generate posts." |
| Reversal of 2026-04-19 "founder-only" decision surprises external stakeholders | Low | Low | Update `memory/project_agent_drafts_feature.md` after ship to reflect the multi-tenant pivot. |

## Documentation / Operational Notes

- `.env.example`: add `SECRET_BOX_KEY=<base64-encoded 32-byte key>` with generation note.
- `docs/API_REFERENCE.md`: add `/api/v1/sous-chef/integrations` POST (auth, body shape) and an "Agent-fired drafts" note on `POST /api/v1/drafts` describing the optional `idempotencyKey` / `sourceSystem` / `milestoneKey` fields.
- `CLAUDE.md`: add a one-line mention of `convex/crons.ts` and `src/lib/crypto/secret-box.ts` in the Key Modules table after Unit 11 lands.
- Post-ship: write a `docs/solutions/` entry covering: multi-tenant webhook reception + Convex cron fan-out + AES-256-GCM secret storage pattern. This is the first project doc in any of those topics.
- Rollout: land everything behind no feature flag for the founder; add a simple `userProfiles.sousChefEnabled` gate if Unit 7's debounce still lets floods through in dogfood week.

## Sources & References

- Origin requirements (this document's upper sections, derived from `/compound-engineering:ce-brainstorm` run on 2026-04-22).
- Related code: `convex/drafts.ts`, `convex/schema.ts`, `src/app/api/github/webhooks/route.ts`, `convex/releases.ts`, `convex/uploadTokens.ts`, `src/lib/github/verify-webhook.ts`, `src/lib/github/analyze-release.ts`, `src/lib/copy/generate-copy.ts`, `src/lib/templates/canvas-defaults.ts`, `src/app/(admin)/drafts/`.
- Related memory: `memory/project_agent_drafts_feature.md` (2026-04-19 pivot, now partially superseded).
- External: Stripe API docs (restricted keys, subscriptions.list, charges.list), PostHog API (personal key, trends insight), GA4 Data API (runReport, totalUsers metric).
