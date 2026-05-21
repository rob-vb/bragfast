# Phase 7: Schedule-Time Upload + Posting - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

From the local Workspace, a developer opens a schedule panel on a locally-rendered
**image** Creation, picks Buffer channels (grouped per format), chooses **next queue
slot** or an **exact date/time**, and submits. At schedule-time the CLI uploads the
rendered JPEG(s) **directly to R2** via a backend-issued presigned URL, then calls a
single backend schedule endpoint with the public URLs; the backend **HEAD-checks every
URL (all-or-nothing — no partial post)**, pushes to **Buffer** (queue or custom-time),
creates a `releases` row marked **`status='scheduled'`**, and returns a confirmation the
Workspace shows (channel name + post time). The scheduled Creation then appears in the
Admin gallery with a **Scheduled** badge.

The backend stays thin: it never touches the rendered file bytes (presigned direct
upload), never re-renders, and adds **no cron** — Buffer holds the schedule and fires the
post at the right wall-clock moment.

**In scope:** schedule panel in the Workspace (channel pick + timing); Buffer channel
list surfaced from `integrationSecrets.extra`; per-format channel selection pre-seeded
from `BUILT_IN_FORMAT_DEFAULTS` and pre-selected from `routingDefaults` (saved back on
schedule); presigned-URL issuance + CLI direct R2 upload; backend schedule endpoint with
HEAD-check gate + Buffer push; `pushToBuffer` extension for exact-time (`schedulingType:
custom`, `scheduledAt`); creating a `releases` row with a new `scheduled` status + a new
`PixelBadge` variant; Workspace confirmation; gallery surfacing the scheduled Creation.

**Out of scope:** **video posting to Buffer** (deferred — current code blocks video at
both `pushToBuffer` and `approveDraftPost`); **Postiz** (SCHED-07, separate later
requirement); **published-status tracking** / Buffer status polling/webhook (Scheduled is
terminal this phase); any brag.fast-side scheduler/cron; server-side render (retired per
ADR-0002); template authoring; carousel/multi-slide; AI copy.

Requirements covered: SCHED-01 (Buffer connect — already exists, surfaced), SCHED-02,
SCHED-03, SCHED-04, SCHED-05, SCHED-06.
</domain>

<decisions>
## Implementation Decisions

### R2 upload path
- **D-01:** **Presigned + direct upload.** The CLI asks the backend for a presigned PUT
  URL (`createPresignedUploadUrl` already exists, 300s TTL), uploads the rendered file
  bytes **straight to R2 from the dev's machine**, then sends the resulting public URL(s)
  to the backend. The backend **never handles file bytes** — most aligned with the
  thin-backend constraint (ADR-0002). (Chosen over proxying file bytes through the
  hosted backend.)
- **D-02:** **Backend gates, all-or-nothing.** The CLI calls **one** backend schedule
  endpoint with the public URL(s). The backend **HEAD-checks every URL** (`headObject`)
  before any push; if **any** is missing it aborts the whole schedule (no partial post)
  and returns an actionable error the Workspace surfaces. Only after all pass does it
  push to Buffer. (Realizes criterion 2's "atomically… no silent partial post." Chosen
  over per-format independent success.)
- **D-03:** **The Buffer push runs on the backend**, because the Buffer API key is sealed
  server-side (`integrationSecrets` + secret-box) and only the backend can call
  `pushToBuffer`. The CLI's role ends at uploading bytes + calling the schedule endpoint.

### Scheduling model
- **D-04:** **Buffer holds the schedule.** At schedule-time the backend pushes to Buffer
  **once, immediately**, with either `mode: addToQueue` (next queue slot) or
  `schedulingType: custom` + `scheduledAt` (ISO, exact time). Buffer stores the post and
  fires it at the target wall-clock moment. **brag.fast adds no cron/scheduler** and
  never holds the file waiting. (Chosen over storing `scheduledAt` in Convex + a wake-up
  cron — that contradicts "upload at schedule-time" and adds infra.)
- **D-05:** `pushToBuffer` must be **extended to support custom-time scheduling** — today
  it hardcodes `schedulingType: "automatic"` / `mode: "addToQueue"`. Buffer's API supports
  `customScheduled` per the existing comment block; wire it for the exact-time path.
- **D-06:** **Images only this phase.** Schedule/post images (all 3 formats) to Buffer
  now; **video scheduling is deferred** to a follow-on (`pushToBuffer` throws on video and
  `approveDraftPost` blocks video; Buffer video asset handling differs and is riskier).
  Video Creations still render + download/copy locally — just no auto-schedule yet.

### Time input UX
- **D-07:** Schedule panel offers a **toggle**: **"Next queue slot"** (default, no time
  picker → Buffer `addToQueue`) vs **"Exact time"** (reveals a date + time picker →
  Buffer custom `scheduledAt`). Default to queue slot — zero-effort, common case. Maps 1:1
  to the two Buffer modes.

### Channel pick UX
- **D-08:** **Pre-select from `routingDefaults` + save back.** On opening the panel, fetch
  `routingDefaults` and pre-check the user's saved channels per format; on schedule, `PUT`
  the selection back so the next session is pre-filled. The channel **list** itself comes
  from `GET /api/v1/sous-chef/integrations` (`extra` JSON), since channels are not a
  separate table.
- **D-09:** **Per-format channel groups.** The panel shows connected channels grouped
  under each format (Landscape → […], Square → […], Portrait → […]), **pre-seeded from
  `BUILT_IN_FORMAT_DEFAULTS`** (e.g. square→x/linkedin, portrait→instagram/tiktok). Each
  channel posts the format it's grouped under. This matches the existing
  `selections: [{format, provider, channelId}]` shape exactly. (Chosen over a flat pick
  with auto-format-assignment.)

### Scheduled status in the gallery
- **D-10:** **Create a `releases` row at schedule-time** with the R2 URLs + caption/
  metadata and **`status='scheduled'`** (new enum value + new `PixelBadge` variant). The
  existing gallery query (`releases.listByUser`) picks it up with **zero gallery
  rewiring**, and it sets up Phase 8's rendered/scheduled/published states cleanly. NOTE:
  this `releases` row is **NOT server-cooked** — it records a locally-rendered,
  R2-uploaded Creation. (Chosen over surfacing `draftPushes` in the gallery via a merged
  two-record-type query.)
- **D-11:** **"Scheduled" is the terminal badge** this phase. No published-status
  tracking, no Buffer status polling/webhook — those need a callback mechanism Buffer
  support for which is uncertain, and are out of scope. (Keeps the phase to its 4 success
  criteria; "Published" tracking is a later concern.)

### Confirmation (SCHED-05)
- **D-12:** On success the Workspace shows a confirmation naming the **channel(s) and the
  post time** ("Scheduled to Buffer — {channel} at {time}" / "next queue slot"). Exact
  copy/styling = Claude's discretion. Failures surface in the panel **and** terminal with
  an actionable message (carries Phase 5 never-silent rule).

### Claude's Discretion / flagged for research+planner
- **Reuse `draftPushes` fanout vs fresh push path** — FLAGGED. The existing
  `approveDraftPost` → `draftPushes` → `pushFanout` machinery has retry, idempotency
  (`clientNonce`), error-classification, and sealed-key unsealing, but it **re-cooks
  server-side** (ADR-0002 violation for the CLI flow) and writes `draftPushes` rows (not
  `releases`). Researcher/planner decide whether to: (a) reuse the fanout for the actual
  Buffer push by feeding it CLI-uploaded `mediaUrlByFormat` (bypassing the re-cook) +
  extending it with `scheduledAt`, and write/update a `releases` row alongside for the
  gallery; or (b) build a fresh schedule path (HEAD-check + `pushToBuffer` + `releases`
  row) that skips `draftPushes`. Recommendation: **reuse the fanout's push + retry/error
  machinery** (don't reinvent error-classification/idempotency), but bypass the re-cook
  and ensure the gallery-facing record is the `releases` row.
- Exact schedule/presigned endpoint paths + request/response shapes (mirror existing
  `/api/v1/*` Bearer conventions; reachable through the CLI proxy unchanged).
- R2 object key scheme for scheduled uploads (reuse render `<id>`/format convention).
- How `releases.status='scheduled'` reconciles with any `draftPushes` rows if the fanout
  is reused (avoid double-representation in the gallery).
- Whether the schedule endpoint accepts the public URLs from the CLI or re-derives keys;
  HEAD-check retry/backoff for R2 eventual consistency.
- Panel layout, channel grouping visuals, date/time picker component choice.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (constraints)
- `docs/adr/0002-local-render-thin-backend.md` — thin backend, no Lambda, no server
  render, **R2 upload only at schedule-time** (the constraint this phase realizes), backend
  never handles file bytes (D-01).
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction.
- `docs/adr/0003-byo-ai-no-server-copy-gen.md` — no server-side AI / copy gen.
- `CONTEXT.md` (repo root) — domain glossary: Render, Draft, Creation, Schedule,
  "backend never renders".

### Buffer integration (the push API to call/extend)
- `src/lib/integrations/buffer/push.ts` — `pushToBuffer(params)`; **hardcodes
  `schedulingType: "automatic"` / `mode: "addToQueue"` — extend for custom-time (D-05)**;
  throws on video (D-06 out-of-scope); `classifyBufferError()`.
- `src/lib/integrations/buffer/client.ts` — `validateApiKey`, `fetchChannels` (channels =
  `{id,name,service}`). No OAuth flow — Buffer uses static API-key paste.
- `src/lib/integrations/buffer/graphql.ts` — `bufferGraphQL`, Buffer error classes.
- `src/lib/integrations/channel-classes.ts` — `ChannelClass`,
  `channelClassFromBufferService`, **`BUILT_IN_FORMAT_DEFAULTS`** (per-format channel
  seeding for D-09).

### Push fanout / approve path (reuse-vs-fresh decision — FLAGGED)
- `src/lib/posts/approve-draft.ts` — `approveDraftPost({actor, draftId, body})`;
  `ApproveDraftPostBody` (`selections:[{format,provider,channelId}]`, `postState`,
  `clientNonce`, `cookId?`). **Re-cooks server-side unless `cookId` given (ADR-0002
  conflict for CLI flow); blocks video.**
- `src/app/api/v1/drafts/[id]/approve/route.ts` — the only existing approve/schedule
  endpoint; Bearer or session auth; `maxDuration=300`.
- `convex/draftPushes.ts` — `approveDraft` mutation (one row per format×provider×channel,
  `runAfter(0)` = immediate, no `scheduledAt` field); state machine
  `pending→in_flight→queued|drafted|failed`; retry/backoff; `clientNonce` idempotency;
  `getSealedForUser` internalQuery.
- `convex/pushFanout.ts` — `run` internalAction: claims rows, `dispatchPush`, finalizes.
- `src/lib/integrations/push.ts` — `dispatchPush` (unseal key → `pushToBuffer`/Postiz).

### Channels + routing defaults (channel pick UX)
- `src/app/api/v1/sous-chef/integrations/route.ts` — `GET` lists `integrationSecrets`
  rows incl. `extra` (channel list source, D-08); `POST` connect, `DELETE` disconnect.
- `src/app/api/v1/routing-defaults/route.ts` — `GET`/`PUT` per-format saved channel
  selections (pre-select + save-back, D-08).
- `convex/routingDefaults.ts` + schema `routingDefaults` table
  (`userId, format, channels:[{provider,channelId}]`).

### R2 storage (upload + HEAD-check)
- `src/lib/storage/r2.ts` — **`createPresignedUploadUrl(key, contentType, expiresIn?)`**
  (D-01), **`headObject(key)`** existence check (D-02), `uploadImage`, `isR2Url`,
  `keyFromUrl`. Public URL = `${R2_PUBLIC_URL}/${key}`.

### Secrets (why push is server-side, D-03)
- `convex/integrationSecrets.ts` — sealed credential storage; `getSealedForScan`,
  `listByUser` (no ciphertext to browser).
- `src/lib/crypto/secret-box.ts` — `seal`/`open` (AES-256-GCM, `SECRET_BOX_KEY`).

### Admin gallery (scheduled status display)
- `src/components/admin/history-client.tsx` — queries `releases.listByUser`, filters by
  `?status=`; **shows releases only today**.
- `src/components/admin/history-table.tsx` — `Release` type
  (`status:"completed"|"pending"|"failed"`); columns incl. Status via `PixelBadge`.
- `src/components/admin/pixel-badge.tsx` — `statusStyles`; **no `scheduled` variant —
  add one (D-10)**.
- `convex/schema.ts` — `releases` (`status` enum — **add `scheduled` (D-10)**, `output`,
  `images`, `socialCopy`, `metadata`), `draftPushes`, `drafts`, `integrationSecrets`,
  `routingDefaults`, `oauthStates` (vestigial). Add status value + any `scheduledAt`/
  channel metadata fields the planner needs.
- `convex/releases.ts` (and `src/app/(admin)/admin/history/page.tsx`) — release
  create/list path the new `scheduled` row hooks into.

### CLI server + proxy (where the Workspace reaches backend)
- `packages/cli/src/proxy.ts` — `createBackendProxy(apiKey)`: all `/api/*` auto-proxied
  with Bearer injected — **channel-list, routing-defaults, and the new schedule endpoint
  need no new proxy wiring**.
- `packages/cli/src/server.ts` — local routes (`/output`, `/media`, render); the presigned
  **direct R2 upload** runs from the CLI (or Workspace via CLI) — planner decides whether
  the PUT is issued from the CLI process or the browser using the presigned URL.
- `packages/workspace/src/pages/Editor.tsx` — editor + render panel; schedule panel lands
  here (or a sibling). `packages/workspace/src/api.ts` (relative URLs only),
  `packages/workspace/src/types.ts`.

### Prior phase context (dependencies)
- `.planning/phases/05-local-image-render/05-CONTEXT.md` — produces the rendered JPEGs in
  `./brag-output/<id>/<format>.jpg`; never-silent failures; `/output` serving.
- `.planning/phases/06-local-video-render/06-CONTEXT.md` — video output (deferred for
  posting this phase, D-06).
- `.planning/phases/04-workspace-editor-slot-filling/04-CONTEXT.md` — caption on
  `DraftConfig`, full-config PATCH, CLI proxy / relative-URL rule.

### Project guides
- `CLAUDE.md` — posting backbone modules, API routes, Convex tables, storage.
- `.planning/ROADMAP.md` §"Phase 7" — goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` — SCHED-01..06 wording.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **R2 helpers ready:** `createPresignedUploadUrl` (direct upload, D-01), `headObject`
  (HEAD-check, D-02), `uploadImage`, `isR2Url`/`keyFromUrl` — the upload + gate surface
  already exists.
- **Buffer push ready (needs one extension):** `pushToBuffer` works for queue mode; needs
  custom-time wiring (D-05). `fetchChannels`/`validateApiKey` list channels.
- **Channel + routing infra ready:** channels read from `integrationSecrets.extra` via
  `GET /sous-chef/integrations`; per-format selections via `routingDefaults` `GET`/`PUT`;
  `BUILT_IN_FORMAT_DEFAULTS` seeds the per-format groups (D-08/D-09).
- **Push machinery exists:** `approveDraftPost` + `draftPushes` + `pushFanout` provide
  retry/idempotency/error-classification + sealed-key unsealing — candidate to reuse for
  the push step (FLAGGED; bypass its server re-cook).
- **CLI proxy needs no changes:** `/api/*` auto-proxied with Bearer (D's reachability).
- **Gallery surfaces releases already:** `releases.listByUser` + `history-table` —
  a new `scheduled` release row + badge variant shows up with no gallery rewiring (D-10).

### Established Patterns
- Sealed credentials → push must be server-side (D-03).
- `selections:[{format,provider,channelId}]` is the canonical channel-selection shape
  across `routingDefaults`, `approveDraftPost`, and `BUILT_IN_FORMAT_DEFAULTS` (D-09).
- All Workspace→backend calls go through the CLI proxy; SPA uses relative URLs only.
- Convex scheduler is used only as `runAfter(0)` (immediate) today — no future-time
  pattern exists, reinforcing D-04 (Buffer holds the schedule, not brag.fast).

### Integration Points
- **New:** backend presigned-URL issuance endpoint + a schedule endpoint
  (HEAD-check gate → Buffer push → create `releases` row). Both Bearer-auth, reachable via
  the CLI proxy unchanged.
- **New:** Workspace schedule panel (channel groups + timing toggle + confirmation) in/
  beside `Editor.tsx`; `api.ts` gains channel-list / routing-defaults / schedule calls.
- **Extend:** `pushToBuffer` custom-time (D-05); `releases` schema `status` enum +
  `PixelBadge` `scheduled` variant (D-10); possibly `draftPushes`/`scheduledAt` if the
  fanout is reused (FLAGGED).
- **CLI:** presigned PUT upload of `./brag-output/<id>/<format>.jpg` to R2 at
  schedule-time, then call the schedule endpoint with the public URLs.

</code_context>

<specifics>
## Specific Ideas

- Schedule panel timing toggle: "Next queue slot" (default) vs "Exact time" with a
  date+time picker — maps 1:1 to Buffer `addToQueue` vs custom `scheduledAt` (D-07).
- Per-format channel groups seeded from `BUILT_IN_FORMAT_DEFAULTS`
  (square→x/linkedin, portrait→instagram/tiktok, etc.), pre-selected from `routingDefaults`
  (D-08/D-09).
- Confirmation names channel + post time; "Scheduled" badge in the existing gallery
  (D-12/D-10).
- All-or-nothing HEAD-check gate before any Buffer push (D-02).

</specifics>

<deferred>
## Deferred Ideas

- **Video posting to Buffer** — render + download/copy works (Phase 6); auto-scheduling
  video deferred (current code blocks it; Buffer video asset handling differs) (D-06).
- **Postiz scheduling** (SCHED-07) — separate later requirement; this phase is Buffer-only.
- **Published-status tracking** — flip the badge to "Published" when Buffer posts the
  Creation; needs Buffer status polling/webhook, out of scope (D-11). Phase 8 references
  a "published" state — revisit there.
- **brag.fast-side scheduler/cron** — explicitly rejected (D-04); Buffer holds the
  schedule.

None of the above were scope creep — noted for orientation.

</deferred>

---

*Phase: 7-schedule-time-upload-posting*
*Context gathered: 2026-05-21*
