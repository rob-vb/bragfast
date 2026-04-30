---
date: 2026-04-27
topic: postiz-posting-backbone
status: superseded
superseded_by: docs/brainstorms/2026-04-28-buffer-postiz-byo-posting-requirements.md
superseded_reason: Self-hosted Postiz dropped. Replaced with BYO model (user-provided Buffer OAuth + Postiz API key).
scope: deep — feature
ideation_source: docs/ideation/2026-04-27-building-in-public-on-autopilot-ideation.md
---

> **Superseded 2026-04-28** by `docs/brainstorms/2026-04-28-buffer-postiz-byo-posting-requirements.md`. Self-hosting Postiz was rejected. Kept here for context.

# Postiz Posting Backbone — Requirements

## Problem

bragfast generates draft brag posts (Sous-Chef pipeline) but cannot publish them. Drafts pile up; founders must manually copy text + download image + paste into each platform. The product's headline value is "autopilot" and currently terminates at a to-do list.

## Goal

Close the autopilot loop: from draft approval, content reaches the user's social platforms with image attached, without bragfast ever holding platform tokens.

## Non-Goal (MVP)

- Per-platform copy variants (X-short / LinkedIn-long / Bluesky-casual). Single `{title, description}` + image; user adjusts per-platform inside Postiz.
- Auto-posting / kill-window flow (Survivor #2). MVP hands off to Postiz queue; user finalizes schedule there.
- Engagement feedback loop (Survivor #5). Deferred — depends on Postiz analytics access.
- Voice clone / showrunner bible (Survivors #3, #7). Separate work; do not block on this.
- bragfast UI for per-platform editing or scheduling. Postiz owns that surface.

## Users & Trigger

- **User:** indie maker who has Sous-Chef wired (GitHub app, Stripe, etc.) and wants posts to actually ship.
- **Trigger:** user clicks "Approve" on a draft inside bragfast admin UI.

## MVP Flow

1. User signs up to bragfast. Convex mutation auto-provisions a Postiz team for the user (server-to-server Postiz API call). Team API key sealed via existing `secret-box` and stored in `integrationSecrets` under new `postiz` provider.
2. User opens "Connect socials" in bragfast → redirected to `connect.brag.fast` (Postiz UI on custom subdomain) → completes OAuth for whatever platforms they want (Postiz supports 17+) → returns to bragfast.
3. User approves a draft in bragfast admin UI.
4. bragfast renders the image (existing `/api/v1/cook/image` pipeline) → JPEG in R2.
5. Convex `internalAction` (`"use node"`) calls Postiz HTTP API with `{teamId, title, description, mediaUrl}`. Content lands in user's Postiz drafts/queue.
6. User opens Postiz, picks platforms, edits per-platform copy if desired, schedules or posts immediately. bragfast's job ends at step 5.

## Decisions Locked (from ideation + brainstorm)

| Decision | Value | Source |
|---|---|---|
| Posting backbone | Self-hosted Postiz | ideation |
| Multi-tenancy pattern | Pattern A: team-per-user | ideation |
| OAuth UX | Redirect to `connect.brag.fast` | ideation |
| Provisioning | Auto on signup | ideation |
| Postiz version | Pinned Docker tag (no `:latest`) | ideation |
| Engagement loop | Deferred post-MVP | ideation |
| Infra | Separate from Convex/Vercel (Fly/Railway/VPS) | ideation |
| Per-platform variants | None — single title+description+image | this brainstorm |
| Platform set | All Postiz-supported (17+); bragfast does not curate | this brainstorm |
| Scheduling UI | Postiz owns it; bragfast hands off after approval | this brainstorm |
| Approval flow | Manual approve → push to Postiz queue (not auto-post) | this brainstorm |

## Schema Deltas

- `integrationSecrets.provider` enum: add `"postiz"`.
- New table `postizTeams`: `{userId, postizTeamId, postizApiKey (sealed), createdAt, updatedAt}`. Indexed by `userId`.
- `drafts` table unchanged. `releases.socialCopy` already holds title+description; reuse.
- No `status`/`approvedAt`/`scheduledAt` columns on `drafts` in MVP — approval is a one-shot action that triggers the Postiz push and does not need persisted lifecycle states. (Revisit when Survivor #2 lands.)

## Success Criteria

- New user signs up → Postiz team exists for them within the signup transaction (or quickly thereafter via retry).
- User connects ≥1 social via `connect.brag.fast` and approves a draft → rendered JPEG + title + description appear in their Postiz queue within ~10s of approval.
- Postiz outage does not lose drafts: if Postiz API call fails, draft remains approved-but-not-pushed and is retried; user is informed.
- Zero platform tokens stored in bragfast Convex.
- AGPL compliance: Postiz core runs unmodified; any wrapper/glue code stays outside Postiz fork.

## Failure Modes & Handling

- **Postiz API down at approval time** — retry with backoff (Convex action retry pattern). Surface "queued, retrying" state to user. Do not lose content.
- **Postiz team provisioning fails at signup** — defer to first approval (lazy provision fallback). Log and alert.
- **User has no platforms connected in Postiz when they approve** — push content anyway; it sits as Postiz draft until user connects. No bragfast-side block.
- **Postiz upgrade breaks API contract** — pinned tag prevents surprise; staging environment validates upgrades before prod promotion.
- **Postiz instance loses data** — Postgres backup strategy is part of infra setup. bragfast retains the original `releases.socialCopy` + R2 image, so re-push is possible.

## Dependencies & Assumptions

**Verified in repo:**
- `integrationSecrets` table at `convex/schema.ts:172-194` exists with sealed-secret pattern.
- `internalAction "use node"` pattern at `convex/videoRender.ts` — reuse.
- `releases.socialCopy` field at `convex/schema.ts:85` already populated (JSON string `{twitter, linkedin}`).
- `composeCopy` at `src/lib/drafts/compose-copy.ts` produces `{title, description}`.

**Unverified assumptions (resolve in planning):**
- Postiz HTTP API exposes: create-team, generate team API key, push content with media URL, list connected platforms. Confirm against Postiz docs at plan time.
- Postiz accepts `mediaUrl` (R2 public URL) directly, vs requiring upload of binary. If binary-only, plan needs upload step before content push.
- Postiz team API key has scope of just that team (not super-admin). Required for safe per-user isolation.

## Outside This Product's Identity

- bragfast is not a posting tool. It is a content-generation tool. Postiz owns posting. Do not let UI scope creep into per-platform editing, scheduling calendars, or analytics dashboards — that road leads to rebuilding Postiz inside bragfast.
- bragfast is not a Postiz reseller. The Postiz instance is internal infrastructure; users see "Connect socials" and a redirect, not a Postiz brand or pricing surface.

## Deferred for Later

- Auto-post with kill window (Survivor #2) — layers on top of this once approval+push is stable.
- Engagement loop (Survivor #5) — needs posts in the wild + Postiz analytics or direct platform polling.
- Per-platform variant generation (Survivor #1 sub-feature).
- Quota/rate limits per-user on Postiz API calls (only matters at scale).
- Migration from manual single-instance Postiz to managed/clustered as user count grows.

## Open Questions for Planning

1. Where does Postiz infra live (Fly / Railway / dedicated VPS) and what's the Postgres+Redis+Temporal sizing for first 100 users?
2. How does the `connect.brag.fast` subdomain route to the Postiz UI — reverse proxy, custom domain feature in Postiz, or Cloudflare worker?
3. What's the Postiz API authentication model — per-team API key, or super-admin key + team impersonation header?
4. Does Postiz emit webhooks back to bragfast on post-published / post-failed? If yes, plumb them into a `postizEvents` table for future engagement loop.
5. Cost ceiling for Postiz infra at MVP launch (single tenant single region) and trigger to upgrade.
