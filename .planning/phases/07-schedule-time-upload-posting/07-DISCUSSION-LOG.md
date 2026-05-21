# Phase 7: Schedule-Time Upload + Posting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 7-schedule-time-upload-posting
**Areas discussed:** R2 upload path, Scheduling model, Channel pick UX, Scheduled status

---

## R2 upload path

### Q1 — How does the locally-rendered file reach R2 at schedule-time?

| Option | Description | Selected |
|--------|-------------|----------|
| Presigned + direct (Rec) | CLI asks backend for a presigned PUT URL (createPresignedUploadUrl), uploads bytes straight to R2, then tells backend the public URL. Backend never touches file bytes. | ✓ |
| Proxy upload to backend | CLI POSTs file bytes through the proxy; backend writes to R2. Simpler client but routes media through hosted backend. | |
| You decide | Pick during planning. | |

**User's choice:** Presigned + direct
**Notes:** Most aligned with ADR-0002 thin backend.

### Q2 — Where does the HEAD-check gate fit, and abort granularity for 3-format image?

| Option | Description | Selected |
|--------|-------------|----------|
| Backend gates, all-or-nothing (Rec) | CLI calls one backend schedule endpoint with URLs; backend HEAD-checks every URL, aborts whole schedule if any missing, only then pushes to Buffer. | ✓ |
| Backend gates, per-format independent | Each format/channel independent; a passed format pushes even if another failed. | |
| You decide | Pick during planning. | |

**User's choice:** Backend gates, all-or-nothing
**Notes:** Realizes criterion 2's "atomically… no silent partial post." Push runs backend-side because Buffer key is sealed server-side.

---

## Scheduling model

### Q1 — Who holds the schedule?

| Option | Description | Selected |
|--------|-------------|----------|
| Buffer holds schedule (Rec) | Backend pushes once at schedule-time with addToQueue or schedulingType=custom+scheduledAt; Buffer fires at wall-clock time. No brag.fast cron. | ✓ |
| brag.fast holds schedule | Store scheduledAt in Convex + cron to upload+push at target time. Contradicts upload-at-schedule-time, adds infra. | |

**User's choice:** Buffer holds schedule
**Notes:** Requires extending pushToBuffer for custom-time (currently hardcodes addToQueue).

### Q2 — Is video posting to Buffer in scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Images only this phase (Rec) | Schedule/post images now; video scheduling deferred. Video still renders + download/copy locally. | ✓ |
| Images + video | Extend pushToBuffer + approveDraftPost for video asset URL. Larger scope, more Buffer-API risk. | |
| You decide | Decide during research. | |

**User's choice:** Images only this phase
**Notes:** Current code blocks video at pushToBuffer and approveDraftPost.

### Q3 — How to present the two timing choices?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle: queue vs exact (Rec) | "Next queue slot" (default, no picker → addToQueue) vs "Exact time" (date+time picker → custom scheduledAt). | ✓ |
| Always exact time | Always show picker; treat soonest as queue. Loses genuine queue-slot semantics. | |
| You decide | Pick during UI/planning. | |

**User's choice:** Toggle: queue vs exact
**Notes:** Maps 1:1 to Buffer modes; default to queue slot.

---

## Channel pick UX

### Q1 — Should the panel use routingDefaults?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-select + save back (Rec) | Fetch routingDefaults, pre-check saved channels per format; PUT selection back on schedule. Channel list from /sous-chef/integrations. | ✓ |
| Fresh pick each time | List channels, pick every time, ignore routingDefaults. | |
| You decide | Decide during planning. | |

**User's choice:** Pre-select + save back

### Q2 — How to map channels to the 3 image formats?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-format channel groups (Rec) | Channels grouped under each format, seeded from BUILT_IN_FORMAT_DEFAULTS. Matches selections:[{format,provider,channelId}]. | ✓ |
| Flat pick, auto-assign format | Check channels; system auto-picks best format per class. Hides which image goes where; needs class→format resolver. | |
| You decide | Pick during UI/planning. | |

**User's choice:** Per-format channel groups

---

## Scheduled status

### Q1 — What record represents a scheduled CLI Creation in the gallery?

| Option | Description | Selected |
|--------|-------------|----------|
| Create a release row (Rec) | Backend creates releases row with R2 URLs + metadata, status='scheduled' (new enum + badge). Existing gallery query picks it up; sets up Phase 8. Not server-cooked. | ✓ |
| Surface draftPushes | Show draftPushes (state=queued) via new merged query. More gallery plumbing, joins two record types. | |
| You decide | Pick during planning. | |

**User's choice:** Create a release row

### Q2 — Is "Scheduled" terminal or do we track "Published"?

| Option | Description | Selected |
|--------|-------------|----------|
| Scheduled is terminal (Rec) | Stop at "Scheduled" once Buffer push succeeds. No published-tracking/polling. | ✓ |
| Track Published too | Poll/receive Buffer status and flip badge to Published. Adds polling/webhook of uncertain support. | |

**User's choice:** Scheduled is terminal

---

## Claude's Discretion

- **FLAGGED for research+planner:** reuse the `draftPushes`/`pushFanout` machinery for the
  Buffer push (retry/idempotency/error-classes/key-unsealing) bypassing its server re-cook,
  vs a fresh schedule path — recommendation is to reuse the push+retry machinery but ensure
  the gallery-facing record is the new `releases` row.
- Exact schedule/presigned endpoint paths + request/response shapes.
- R2 object key scheme for scheduled uploads; HEAD-check retry/backoff for R2 consistency.
- Confirmation copy/styling; panel layout; date/time picker component.
- Whether the presigned PUT is issued from the CLI process or the browser.

## Deferred Ideas

- Video posting to Buffer (deferred this phase).
- Postiz scheduling (SCHED-07, separate later requirement).
- Published-status tracking / Buffer status polling (revisit Phase 8).
- brag.fast-side scheduler/cron (rejected — Buffer holds the schedule).
