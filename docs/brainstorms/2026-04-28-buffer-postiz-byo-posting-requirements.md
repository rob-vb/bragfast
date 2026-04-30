---
date: 2026-04-28
topic: buffer-postiz-byo-posting
status: draft
scope: deep — feature
supersedes: docs/brainstorms/2026-04-27-postiz-posting-backbone-requirements.md
---

# Buffer + Postiz BYO Posting — Requirements

## Context

bragfast generates draft brag posts (Sous-Chef pipeline) but cannot publish them. The prior brainstorm (`docs/brainstorms/2026-04-27-postiz-posting-backbone-requirements.md`) chose self-hosted Postiz as the posting backbone. **That direction is rejected** — running Postiz infra doesn't fit the product. New direction: **bring-your-own (BYO) provider**. Users connect their existing Buffer and/or Postiz accounts; bragfast pushes content to whichever they have. No infra to operate, no platform tokens stored in bragfast, faster path to "approve → published in queue."

## Problem

Drafts pile up. Founders manually copy text + download image + paste into each platform per channel, per format. The "autopilot" promise terminates at a to-do list.

## Goal

Close the autopilot loop: from draft approval, content reaches the user's connected scheduling tool (Buffer, Postiz, or both) with the right format on the right channel, with per-push visibility. bragfast holds only the user's Buffer OAuth token and Postiz API key — never platform tokens.

## Users & Trigger

- **User:** indie maker who already uses Buffer or Postiz (or both) for scheduling.
- **Trigger:** user clicks "Approve" on a draft inside bragfast admin UI.

## Non-Goals (MVP)

- bragfast-hosted Postiz instance. Killed.
- bragfast-built scheduling calendar / per-platform editor. Provider owns that surface.
- Auto-post / kill-window flow. MVP requires explicit Approve.
- Engagement loop / analytics ingestion. Deferred.
- Provider beyond Buffer + Postiz (no Hootsuite, Typefully, etc. in MVP).
- Auto-generated per-channel copy variants (Haiku-driven X-short / LinkedIn-long). MVP uses a single `{title, description}`; user edits per-channel inside provider before publish.

## MVP Flow

1. **Connect provider(s)** — Settings → Integrations:
   - **Buffer:** OAuth 2.0. "Connect Buffer" → redirect → callback stores access + refresh tokens (sealed via existing `secret-box`).
   - **Postiz:** Modal asks for instance URL (default `https://api.postiz.com`) + team API key. Stored sealed.
   - On successful connect, bragfast fetches the user's connected channels (X, LinkedIn, IG, etc.) and caches them.
2. **Configure routing defaults** (optional) — Settings → Routing. Per format (Square / Landscape / Portrait / Video-portrait / Video-square / Video-landscape), pick default channels across both providers. Sensible built-in defaults if user skips this step (e.g. Square → X + LinkedIn; Landscape → LinkedIn; Portrait → IG + TikTok).
3. **Approve draft** — Admin UI shows draft with all rendered formats. User clicks "Approve & Push". Approve modal:
   - Provider picker: `[ ] Buffer  [ ] Postiz` (only enabled if connected; pre-checked if connected).
   - Format → channels grid, pre-filled from routing defaults; user can toggle.
   - State: `( ) Add to queue   ( ) Save as draft` (per-draft, not per-channel in MVP).
   - Confirm.
4. **Backend pushes** — One push per (format × channel × provider) combination. Convex `internalAction` (`"use node"`) makes the API calls.
   - Image pushes: Satori → R2 already produces a JPEG URL. Send mediaUrl if provider accepts; otherwise upload binary.
   - Video pushes: Remotion-rendered MP4 in R2. Same path — mediaUrl preferred, binary fallback.
5. **Per-push status** — Draft detail page shows a status list, one row per push:
   ```
   Square    → X (Buffer)        ✓ queued
   Square    → LinkedIn (Buffer) ✓ queued
   Landscape → LinkedIn (Buffer) ✗ failed [retry]
   Portrait  → IG (Postiz)       ✓ queued
   Portrait  → TikTok (Postiz)   ✓ queued
   ```
   Each row: status (pending / queued / failed), provider post ID (when known), error message (when failed), retry button.

## Decisions Locked (this brainstorm)

| Decision | Value |
|---|---|
| Hosting model | BYO — bragfast hosts no posting infra |
| Providers (MVP) | Buffer + Postiz, parallel. User can connect either or both. |
| Buffer auth | OAuth 2.0 (access + refresh tokens) |
| Postiz auth | API key + instance URL (Cloud + self-hosted both supported) |
| Both-connected behavior | User picks per-draft which provider(s) receive the push |
| Post state | User picks per-draft: Add to queue OR Save as draft |
| Format→channel mapping | Smart defaults in settings + per-draft override grid |
| Channel selection | Pre-filled from routing defaults, user toggles per-draft |
| Per-channel copy | Single `{title, description}` across all channels (MVP). User edits per-channel inside provider. |
| Video flow | Same approve flow as images (MVP). Same routing rules, same modal. |
| Push lifecycle | Per-push row with status, error, retry — visible on draft detail. |

## UX Surfaces

- **Settings → Integrations** — connect/disconnect Buffer (OAuth) + Postiz (URL + API key paste). Show connected channels per provider.
- **Settings → Routing** — per-format default channels grid. Bragfast ships with sensible defaults; user can customize.
- **Draft detail → Approve modal** — provider checkboxes + format×channel grid + queue/draft toggle + confirm.
- **Draft detail → Pushes panel** — per-push status list with retry per failed row.

## Schema Deltas (light — final shape in planning)

- `integrationSecrets.provider` enum: add `"buffer"` and `"postiz"`.
- `extra` field per provider:
  - Buffer: `{ refreshToken (sealed separately?), expiresAt, channels: [...] }`
  - Postiz: `{ instanceUrl, channels: [...] }`
- New table for routing defaults (per user, per format → channels[]). Or stash as a single JSON blob on `userProfiles`.
- New table `draftPushes`: `{draftId, format, channel, provider, providerPostId, status, error, attempts, lastAttemptAt}`. Indexed by `draftId` and by `userId + status` (for retry sweeps).
- `drafts` table gets a derived `pushSummary` (counts by status) for list views — or compute on read.

## Success Criteria

- User connects Buffer via OAuth in <60s; channels list populates automatically.
- User connects Postiz with URL + API key in <60s; channels list populates automatically.
- Approve modal default selections (smart routing) are accepted with one click in ≥80% of approvals.
- Approve → all selected pushes reach provider queue/drafts in <10s with status reflected per-push.
- Failed pushes are visible and one-click retryable; transient failures auto-retry.
- Zero platform tokens (X, LinkedIn, IG, etc.) stored in bragfast Convex.
- Disconnecting a provider removes the secret + nukes routing entries that referenced its channels.

## Failure Modes & Handling

- **Buffer token expired** — refresh-token flow. If refresh fails, mark provider disconnected, surface "Reconnect Buffer" CTA, fail subsequent pushes with clear reason.
- **Postiz API key revoked** — push returns 401. Mark disconnected, surface CTA.
- **Provider API down** — exponential backoff retry (Convex action retry). After N failures, mark push `failed`, expose retry button.
- **User disconnected a channel inside Buffer/Postiz** — push returns "channel not found". Mark push failed; on next channel-list refresh, drop stale channels from routing defaults and warn user.
- **Provider rejects mediaUrl** — fallback to binary upload. Both Buffer and Postiz support direct upload.
- **Partial failure across pushes** — draft reaches `partially_pushed` state; user sees mix of ✓/✗ rows; no global "this draft failed" gate.
- **Disconnect with pending pushes** — let pending pushes complete or fail naturally; do not block disconnect.

## Dependencies & Assumptions

**Verified in repo:**
- `integrationSecrets` table at `convex/schema.ts:172-194` exists with sealed-secret pattern (provider enum currently: `stripe | posthog | ga4`).
- `releases.socialCopy` field at `convex/schema.ts:85` already populated as JSON `{twitter, linkedin}`.
- `composeCopy` at `src/lib/drafts/compose-copy.ts` produces `Copy = {title, description}`.
- Image render output: JPEG in R2 via `src/lib/pipeline/render.ts`.
- Video render output: MP4 in R2 via `src/lib/pipeline/render-video.ts` + `convex/videoRender.ts`.
- `internalAction` + `"use node"` pattern at `convex/videoRender.ts` — reuse for outbound HTTP to Buffer/Postiz.
- Existing `secret-box` crypto in `src/lib/crypto/secret-box.ts`.

**Unverified — confirm during planning:**
- Buffer API: OAuth 2.0 scopes needed for queue/draft creation + media upload + channel list. Confirm rate limits.
- Postiz API: confirm `POST /posts` accepts `mediaUrl` (R2 public URL) vs requiring binary upload. Confirm endpoint shape for Cloud vs self-hosted (assumed identical).
- Both providers: confirm distinction between "add to queue" and "save as draft" exists in API (or we map both to same call with different flags).
- Buffer free tier supports 3 channels — relevant for new-user expectations but not a blocker.

## Outside This Product's Identity

- bragfast is a content-generation tool, not a scheduler. We push content into the user's existing scheduler. We do not rebuild Buffer or Postiz inside bragfast.
- We do not surface analytics, calendars, or per-platform editing inside bragfast. Provider's UI owns those.
- We do not store platform tokens. Only Buffer OAuth tokens and Postiz API keys.

## Deferred for Later

- Auto-post with kill window — once approve→push is stable.
- Engagement loop (likes/comments/views back into bragfast) — depends on provider analytics access.
- Per-channel copy variants generated by Haiku.
- Inline per-channel copy editing in approve modal.
- Additional providers (Hootsuite, Typefully, Make, Zapier-direct, etc.).
- Bulk approve across multiple drafts.

## Open Questions for Planning

1. Buffer OAuth app registration: production vs staging credentials, redirect URI strategy across `localhost`, preview deploys, prod.
2. Refresh token storage: separate sealed entry, or both stuffed in one `ciphertext` blob? Audit secret-box current shape.
3. Routing defaults table vs JSON blob on `userProfiles` — depends on how often we mutate it and whether we need indexed lookups.
4. Channel-list refresh cadence (on connect, on approve, nightly cron, or webhook?). Buffer + Postiz webhook support unknown.
5. Retry policy: bounded attempts + dead-letter, or infinite manual-only retry? Probably bounded auto + manual after exhaustion.
6. mediaUrl access: do we expose R2 with a signed URL or fully public? Affects whether providers can fetch.
7. Approve modal default-checking heuristics — do we hide unchecked rows (cleaner) or show all dimmed (discoverable)?

## Handoff

Once requirements are confirmed, next step is `/ce-plan` to design the implementation approach (auth flows, schema, push pipeline, retry semantics, UI components).
