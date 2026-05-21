# Phase 7: Schedule-Time Upload + Posting - Research

**Researched:** 2026-05-21
**Domain:** Buffer GraphQL scheduling, R2 presigned upload, Convex releases schema, Workspace schedule panel
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Presigned + direct upload. CLI asks backend for a presigned PUT URL, uploads rendered bytes straight to R2, then sends public URLs to backend. Backend never handles file bytes.
- **D-02:** Backend gates, all-or-nothing. One schedule endpoint; HEAD-checks every URL; any missing aborts the whole schedule with an actionable error. Only after all pass does it push to Buffer.
- **D-03:** Buffer push runs on the backend. CLI role ends at uploading bytes + calling the schedule endpoint.
- **D-04:** Buffer holds the schedule. Backend pushes to Buffer once, immediately, with `mode:addToQueue` or `schedulingType:custom`+`scheduledAt`. No brag.fast cron.
- **D-05:** `pushToBuffer` must be extended for custom-time: today hardcodes `schedulingType:"automatic"`/`mode:"addToQueue"`. Wire `customScheduled` for exact-time path.
- **D-06:** Images only this phase. Video scheduling deferred.
- **D-07:** Timing toggle: "Next queue slot" (default) vs "Exact time" (date+time picker).
- **D-08:** Pre-select from `routingDefaults` + save back on schedule.
- **D-09:** Per-format channel groups seeded from `BUILT_IN_FORMAT_DEFAULTS`.
- **D-10:** Create a `releases` row at schedule-time with `status='scheduled'` (new enum value + new `PixelBadge` variant). Gallery rewiring is zero.
- **D-11:** "Scheduled" is the terminal badge this phase. No published-status tracking.
- **D-12:** Workspace confirmation names channel(s) and post time. Failures surface in panel and terminal.

### Claude's Discretion
- Reuse `draftPushes`/`pushFanout` machinery vs fresh push path — FLAGGED (research decides).
- Exact endpoint paths + request/response shapes.
- R2 object key scheme for scheduled uploads.
- How `releases.status='scheduled'` reconciles with any `draftPushes` rows if fanout is reused.
- Whether the schedule endpoint accepts public URLs from CLI or re-derives keys; HEAD-check retry/backoff.
- Panel layout, channel grouping visuals, date/time picker component choice.

### Deferred Ideas (OUT OF SCOPE)
- Video posting to Buffer.
- Postiz scheduling (SCHED-07).
- Published-status tracking / Buffer status polling/webhook.
- brag.fast-side scheduler/cron.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHED-01 | User can connect Buffer via OAuth in the admin | Already exists; `integrationSecrets` row with `extra.channels`; surfaced via `GET /api/v1/sous-chef/integrations` |
| SCHED-02 | User can pick which Buffer channels a Creation posts to, in the Workspace | `routingDefaults` GET/PUT + `BUILT_IN_FORMAT_DEFAULTS` + per-format channel group UI in schedule panel |
| SCHED-03 | User can schedule with an exact date/time or the next queue slot | Toggle UI → Buffer `addToQueue` vs `customScheduled`+`scheduledAt` — `pushToBuffer` extension required |
| SCHED-04 | On schedule, rendered file uploads to R2 and its public URL is sent to Buffer | Presigned PUT from CLI process + HEAD-check gate + Buffer push in one schedule endpoint |
| SCHED-05 | User sees a confirmation when scheduling succeeds | Workspace confirmation component with channel name + time; failure shown in panel + terminal |
| SCHED-06 | Scheduled creations are marked as scheduled and visible in the admin gallery | `releases` schema + `status='scheduled'` + `PixelBadge` variant |
</phase_requirements>

---

## Summary

Phase 7 wires together four already-built surfaces: the R2 presigned-upload helper (`createPresignedUploadUrl`), the Buffer GraphQL push path (`pushToBuffer`), the existing `releases` table, and the CLI proxy. No new infrastructure is required — the work is seam extension and a new Workspace panel.

The most critical design decision (FLAGGED) is **whether to route the CLI-path Buffer push through `draftPushes`/`pushFanout` or build a fresh direct path**. Based on reading all relevant code, the recommendation is a **fresh schedule path** — see the Architecture Patterns section for the detailed rationale and concrete seam. The fanout carries draft-centric state (draftId, clientNonce, retry-with-same-row semantics) that is structurally misaligned with the CLI scheduling model, and bypassing the re-cook requires injecting `mediaUrlByFormat` which the fanout already guards against empty strings. A thin, direct schedule action in Convex cleanly owns the HEAD-check gate + Buffer push + `releases` insert without touching `draftPushes` at all, eliminating the gallery double-representation concern entirely.

The two new backend endpoints are narrow: a presigned-URL issuance endpoint (`POST /api/v1/schedule/upload-url`) and a schedule endpoint (`POST /api/v1/schedule`). Both are Bearer-authed and reach the CLI proxy without any proxy changes. The Workspace gains a schedule panel that reads channels from the already-proxied integrations and routing-defaults routes, requires no new proxy wiring, and saves selections back via the existing `PUT /api/v1/routing-defaults`.

**Primary recommendation:** Build a fresh Convex internalAction `convex/schedulePush.ts` (parallel to `pushFanout.ts`) that owns HEAD-check + `pushToBuffer` + `releases` insert; expose it through a single Next.js Route Handler; bypass `draftPushes` entirely; write only a `releases` row for the gallery.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Presigned upload-URL issuance | API / Backend (Next.js route) | — | R2 credentials are server-side env vars; CLI cannot sign URLs itself |
| R2 PUT upload (file bytes) | CLI process (Node.js) | — | Bytes are on the developer's machine; D-01 says backend never handles bytes |
| HEAD-check gate (R2 existence) | API / Backend (Convex action) | — | `headObject` uses server-side R2 creds; all-or-nothing decision must be atomic |
| Buffer push | API / Backend (Convex action) | — | Buffer API key is sealed server-side (D-03); cannot be called from browser/CLI |
| `releases` row creation | API / Backend (Convex action) | — | Convex DB write; scheduled status recorded server-side |
| Channel list display | Frontend (Workspace SPA) | — | Read from `GET /api/v1/sous-chef/integrations` via CLI proxy |
| Routing defaults read/write | Frontend + Backend | — | SPA reads/writes via `GET`/`PUT /api/v1/routing-defaults` (proxy-transparent) |
| Schedule confirmation UI | Frontend (Workspace SPA) | — | Response from schedule endpoint drives the panel state |
| "Scheduled" badge in gallery | Frontend (Admin Next.js) | — | `PixelBadge` variant add; `history-table.tsx` `Release` type extension |

---

## Standard Stack

### Core (all verified in codebase — no new packages needed)

| Module | Version | Purpose | Status |
|--------|---------|---------|--------|
| `src/lib/storage/r2.ts` | existing | `createPresignedUploadUrl`, `headObject` | Ready |
| `src/lib/integrations/buffer/push.ts` | existing | `pushToBuffer` — extend for custom-time | Extend (D-05) |
| `src/lib/integrations/buffer/graphql.ts` | existing | `bufferGraphQL`, error classes | Ready |
| `convex/schema.ts` `releases` table | existing | Add `scheduled` status + `scheduledAt` + `scheduleMetadata` fields | Schema change |
| `src/app/api/v1/routing-defaults/route.ts` | existing | Channel selection persistence | Ready, no change |
| `src/app/api/v1/sous-chef/integrations/route.ts` | existing | Channel list source | Ready, no change |
| `packages/cli/src/proxy.ts` | existing | Auto-proxies all `/api/*` with Bearer | Ready, no change |

### New Modules to Create

| File | Purpose |
|------|---------|
| `src/app/api/v1/schedule/upload-url/route.ts` | Presigned-URL issuance endpoint |
| `src/app/api/v1/schedule/route.ts` | Schedule endpoint (HEAD-check + push + releases insert) |
| `convex/schedulePush.ts` | internalAction: HEAD-check + `pushToBuffer` + `releases` insert |
| `packages/workspace/src/components/SchedulePanel.tsx` | Schedule panel UI |
| `packages/workspace/src/hooks/useSchedule.ts` | Schedule state + submit logic |

### No New npm Packages Required

The date/time picker can be a native HTML `<input type="datetime-local">` — it works across modern browsers, avoids a dependency, and matches the DESIGN.md "zero-friction" philosophy. No third-party picker needed.

[ASSUMED] — confirmed by inspecting the existing Workspace component set and the DESIGN.md constraint.

---

## Package Legitimacy Audit

No new external packages are introduced by this phase. All work is seam extension and new files within the existing package graph.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Developer machine (CLI process)
  1. brag-output/<draftId>/<format>.jpg  (from Phase 5)
  2. POST /api/v1/schedule/upload-url  ──► [Next.js route]
        { draftId, formats: ["landscape","square","portrait"] }
  3. ◄── { uploads: [{ format, uploadUrl, publicUrl, key }] }
  4. PUT <uploadUrl>  ──────────────────► [Cloudflare R2 direct]
        binary JPEG bytes (300s presigned TTL)
  5. POST /api/v1/schedule  ────────────► [Next.js route]
        { draftId, urls: {format→publicUrl},
          selections: [{format,provider,channelId}],
          caption, scheduling: {type:"queue"|"custom", scheduledAt?} }
  6.                          ──► [Convex internalAction: schedulePush.run]
                                     a. headObject(key) each URL — all-or-nothing
                                     b. unseal Buffer API key
                                     c. pushToBuffer() for each selection
                                     d. ctx.db.insert("releases", {status:"scheduled",...})
  7. ◄── { ok:true, releaseId, channels:[{name,time}] }  or  { error }
  8. Workspace shows confirmation or error
```

### Recommended Project Structure

```
src/
├── app/api/v1/schedule/
│   ├── upload-url/route.ts    # Endpoint 1: presign
│   └── route.ts               # Endpoint 2: HEAD-check + push + releases insert
convex/
└── schedulePush.ts            # internalAction owned by the schedule endpoint
packages/workspace/src/
├── components/
│   └── SchedulePanel.tsx      # Channel groups + timing toggle + confirmation
└── hooks/
    └── useSchedule.ts         # State: channel fetch, selection, submit, confirmation
```

### Pattern 1: Fresh Schedule Path (Recommended over fanout reuse)

**What:** A dedicated `convex/schedulePush.ts` internalAction handles the full pipeline: HEAD-check gate → Buffer push → `releases` insert. Called by the Next.js schedule route handler with a `trustedActor`.

**Why not reuse `draftPushes`/`pushFanout`:**

Concrete structural mismatches found in code:
1. `pushFanout.ts` line 101-110: guards `if (!row.mediaUrl)` and immediately fails the row with `errorClass:"media"`. The correct fix (pre-populating `mediaUrlByFormat` in `approveDraft`) works for the cook-and-approve path, but `approveDraft` (`draftPushes.ts` line 399: `mediaUrl: mediaUrlByFormat?.[format] ?? ""`) shows it still inserts an empty string when the key is absent from the map — meaning the guard would fail any format the planner missed.
2. `approveDraft` mutation requires a `draftId` (a `drf_*` external ID). CLI-rendered Creations don't have a meaningful draft in this flow — or if they do, the existing draft is still alive (the dev hasn't posted it through the legacy path). The fanout deletes the draft row on success (`approve-draft.ts` line 246). That would silently nuke the dev's in-progress workspace draft.
3. `draftPushes` rows have `clientNonce` idempotency scoped to 60 seconds. The CLI scheduling flow is synchronous and user-initiated — idempotency is better handled at the `releases` table level (uniqueness on `externalId`).
4. Adding a `scheduledAt` to `draftPushes` rows (no such field exists in schema) for the custom-time path would require a schema migration that leaks scheduling semantics into a table that was designed for immediate-dispatch state-machine tracking.
5. The `pushFanout.ts` finalizes rows as `queued | drafted | failed` — none of these states map to "scheduled for future delivery" (which is what `customScheduled` produces in Buffer: the post exists in Buffer but hasn't fired yet).

**The clean seam:** A thin `convex/schedulePush.ts` internalAction reuses only the atomic primitives it needs: `getSealedForUser` (already an internalQuery on `draftPushes.ts`), `open` (secret-box), and `pushToBuffer` (buffer/push.ts). It does **not** write `draftPushes` rows at all.

```typescript
// convex/schedulePush.ts — "use node" (needs secret-box crypto)
"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { open } from "../src/lib/crypto/secret-box";
import { pushToBuffer, type BufferPushParams } from "../src/lib/integrations/buffer/push";
import { headObject } from "../src/lib/storage/r2";
import { PushError } from "../src/lib/integrations/error-classes";
import { nanoid } from "nanoid";  // already in deps via existing usage

export const run = internalAction({
  args: {
    userId: v.string(),
    urls: v.record(v.string(), v.string()),           // format → publicUrl
    keys: v.record(v.string(), v.string()),           // format → r2 key (for headObject)
    selections: v.array(v.object({
      format: v.string(),
      provider: v.literal("buffer"),
      channelId: v.string(),
    })),
    caption: v.string(),
    scheduling: v.object({
      type: v.union(v.literal("queue"), v.literal("custom")),
      scheduledAt: v.optional(v.string()),  // ISO-8601; only when type="custom"
    }),
    draftId: v.optional(v.string()),        // surfaced in releases.metadata if present
  },
  handler: async (ctx, args) => {
    // 1. HEAD-check all URLs — all-or-nothing
    const headResults = await Promise.all(
      Object.entries(args.keys).map(async ([format, key]) => ({
        format, ok: (await headObject(key)) !== null,
      }))
    );
    const missing = headResults.filter(r => !r.ok).map(r => r.format);
    if (missing.length > 0) {
      return { ok: false as const, error: "upload_missing", missing };
    }

    // 2. Unseal Buffer API key
    const sealedRow = await ctx.runQuery(internal.draftPushes.getSealedForUser, {
      userId: args.userId, provider: "buffer",
    });
    if (!sealedRow) {
      return { ok: false as const, error: "buffer_not_connected" };
    }
    let apiKey: string;
    try { apiKey = open(sealedRow); } catch {
      return { ok: false as const, error: "auth_unseal_failed" };
    }

    // 3. Push to Buffer for each selection
    const pushResults: Array<{
      format: string; channelId: string; providerPostId: string;
    }> = [];
    for (const sel of args.selections) {
      const mediaUrl = args.urls[sel.format];
      if (!mediaUrl) continue; // already guarded by HEAD-check
      const params: BufferPushParams = {
        apiKey,
        channelId: sel.channelId,
        title: "",
        description: args.caption,
        mediaUrl,
        format: sel.format,
        postState: "queue",
        // D-05 extension:
        scheduling: args.scheduling,
      };
      const result = await pushToBuffer(params);
      pushResults.push({ format: sel.format, channelId: sel.channelId, providerPostId: result.providerPostId });
    }

    // 4. Create releases row
    const releaseId = `rel_${nanoid(21)}`;
    await ctx.runMutation(internal.schedulePush.insertRelease, {
      userId: args.userId,
      externalId: releaseId,
      urls: args.urls,
      caption: args.caption,
      selections: args.selections,
      scheduledAt: args.scheduling.scheduledAt ?? null,
      pushResults,
      draftId: args.draftId ?? null,
    });

    return { ok: true as const, releaseId, pushResults };
  },
});
```

[VERIFIED: codebase grep] — `getSealedForUser` is exported as `internalQuery` from `convex/draftPushes.ts`; it is safe to call from the new action without any changes.

### Pattern 2: `pushToBuffer` Extension for Custom-Time (D-05)

**Current code** (`src/lib/integrations/buffer/push.ts` line 151-155):
```typescript
const input: Record<string, unknown> = {
  channelId,
  text,
  schedulingType: "automatic",
  mode: "addToQueue",
};
```

**The comment block already anticipates this** — the file header reads:
> Valid modes are `addToQueue | shareNow | shareNext | customScheduled`.

**Extension — add `scheduling` param to `BufferPushParams`:**

```typescript
export interface BufferPushParams {
  apiKey: string;
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  format: string;
  postState: "queue" | "draft";
  // D-05: optional custom-time scheduling
  scheduling?: {
    type: "queue" | "custom";
    scheduledAt?: string;  // ISO-8601; required when type="custom"
  };
}
```

**Build the input object conditionally:**

```typescript
const isCustomTime = params.scheduling?.type === "custom" && params.scheduling?.scheduledAt;
const input: Record<string, unknown> = {
  channelId,
  text,
  ...(isCustomTime
    ? {
        schedulingType: "customScheduled",
        scheduledAt: params.scheduling!.scheduledAt,  // ISO-8601 string
      }
    : {
        schedulingType: "automatic",
        mode: "addToQueue",
      }),
};
```

[ASSUMED] — Buffer GraphQL `createPost` input field names `schedulingType:"customScheduled"` and `scheduledAt` are based on the existing comment in `push.ts` referencing `customScheduled`. The GraphQL schema itself was not verified against live Buffer API docs in this session. The planner should add a verification checkpoint before the push extension task goes to execution.

### Pattern 3: Presigned Upload — CLI Process Issues the PUT

**Recommendation: CLI process issues the PUT, not the browser.**

Rationale from code:
1. `packages/cli/src/server.ts` already has the rendered JPEG bytes at `./brag-output/<id>/<format>.jpg` (Phase 5 output convention). The browser SPA only has a relative URL to the CLI-served static file; it does not hold the raw bytes.
2. The presigned PUT URL is signed for `PutObjectCommand` with `ContentType: "image/jpeg"` and `CacheControl: "public, max-age=31536000, immutable"`. The browser would need to fetch the bytes from the CLI (`/output/<id>/<format>.jpg`), then PUT them to Cloudflare R2 — a redundant round-trip through the loopback.
3. R2 CORS: Cloudflare R2 allows CORS configuration, but it requires explicit `AllowedOrigins` configuration per bucket. The localhost dev origin (`http://127.0.0.1:<port>`) would need to be added to R2 CORS policy — this is an ops-side hurdle with no upside vs. the CLI doing the PUT directly.
4. The `packages/workspace/src/api.ts` uses relative URLs exclusively (`/api/...`). Issuing a PUT to an absolute Cloudflare URL (`https://<hash>.r2.cloudflarestorage.com/<key>?...`) would break the relative-URL-only SPA rule from Phase 4 context.

**Data flow:**
```
1. Workspace calls POST /api/v1/schedule/upload-url  (via CLI proxy → backend)
2. Backend returns presigned PUTs + public URLs
3. CLI server receives the response (it's the proxy)
4. CLI server reads ./brag-output/<draftId>/<format>.jpg
5. CLI server PUTs each file to the presigned URL
6. CLI server calls POST /api/v1/schedule with the public URLs
```

This requires the schedule submission to be **CLI-server-mediated**, not fired directly from the browser. The Workspace SPA POSTs to `/api/local/schedule` (a local-only CLI route, not proxied to backend), and the CLI server orchestrates the full upload+schedule sequence. The SPA polls or awaits the CLI local route response.

Alternatively, the CLI server could expose a single `/api/local/schedule` endpoint that internally does steps 1-6 and returns the confirmation to the SPA. This keeps the SPA interface clean: one POST, one response.

### Pattern 4: R2 Object Key Scheme

Reuse the render-output convention: `scheduled/<draftId>/<format>-<timestamp>.jpg`

- Prefix `scheduled/` distinguishes these from cook-pipeline outputs (`releases/<id>/...`).
- Including `<timestamp>` (epoch ms) prevents key collision if the same draft is scheduled multiple times.
- `keyFromUrl(url)` already handles this prefix cleanly.

[VERIFIED: codebase grep] — `createPresignedUploadUrl(key, contentType)` takes the key as a string; no constraints on key format.

### Pattern 5: Schedule Endpoint Request/Response (Exact Shapes)

**Endpoint 1: Presigned Upload URL**

```
POST /api/v1/schedule/upload-url
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "draftId": "drf_abc123",
  "formats": ["landscape", "square", "portrait"]
}

200 OK
{
  "uploads": [
    {
      "format": "landscape",
      "uploadUrl": "https://...",
      "publicUrl": "https://pub.r2.dev/scheduled/drf_abc.../landscape-1716300000000.jpg",
      "key": "scheduled/drf_abc123/landscape-1716300000000.jpg"
    },
    ...
  ]
}

400 { "error": "formats must be a non-empty array of 'landscape'|'square'|'portrait'" }
401 { "error": "Unauthorized" }
```

**Endpoint 2: Schedule**

```
POST /api/v1/schedule
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "draftId": "drf_abc123",
  "urls": {
    "landscape": "https://pub.r2.dev/scheduled/drf_abc123/landscape-1716300000000.jpg",
    "square":    "https://pub.r2.dev/scheduled/drf_abc123/square-1716300000000.jpg"
  },
  "keys": {
    "landscape": "scheduled/drf_abc123/landscape-1716300000000.jpg",
    "square":    "scheduled/drf_abc123/square-1716300000000.jpg"
  },
  "selections": [
    { "format": "landscape", "provider": "buffer", "channelId": "chan_001" },
    { "format": "square",    "provider": "buffer", "channelId": "chan_002" }
  ],
  "caption": "Shipped v1.4! 🚀",
  "scheduling": {
    "type": "queue"
  }
}

// OR with custom time:
"scheduling": {
  "type": "custom",
  "scheduledAt": "2026-05-25T14:00:00Z"
}

200 OK
{
  "ok": true,
  "releaseId": "rel_xyz789",
  "channels": [
    { "channelId": "chan_001", "channelName": "LinkedIn", "format": "landscape",
      "scheduledAt": null, "queueSlot": true },
    { "channelId": "chan_002", "channelName": "X / Twitter", "format": "square",
      "scheduledAt": null, "queueSlot": true }
  ]
}

// Upload missing (HEAD-check failed):
422 { "error": "upload_missing", "missing": ["landscape"] }

// Buffer not connected:
409 { "error": "buffer_not_connected" }

// Buffer push error:
502 { "error": "buffer_push_failed", "class": "auth|channel_gone|transient|...", "message": "..." }

401 { "error": "Unauthorized" }
```

Note: `keys` is sent separately from `urls` so the backend can `headObject(key)` without needing to re-derive the key from the public URL via `keyFromUrl`. This is safer — `keyFromUrl` relies on `R2_PUBLIC_URL` env var being consistent between issuance and check time.

**Style mirrors existing routes:**
- `src/app/api/v1/sous-chef/integrations/route.ts`: `authenticate(request)` → `Response.json(...)` pattern
- `src/app/api/v1/drafts/[id]/approve/route.ts`: Bearer + session dual-auth, `maxDuration=300`
- New schedule endpoint should also set `export const maxDuration = 300` (upload + Buffer push can take time)

### Pattern 6: HEAD-Check Retry/Backoff

**Finding:** `headObject` in `r2.ts` uses `GetObjectCommand` (not a true HTTP HEAD but functionally identical for existence check). R2 is strongly consistent for object reads after a PUT from the same client — Cloudflare R2 guarantees read-after-write consistency. [ASSUMED — based on Cloudflare R2 documentation knowledge from training; not verified against live docs in this session.]

**Recommendation:** A single retry with 500ms backoff is sufficient for defense-in-depth:

```typescript
async function headWithRetry(key: string, maxAttempts = 2): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await headObject(key);
    if (result !== null) return true;
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 500));
  }
  return false;
}
```

Do NOT implement elaborate backoff — the HEAD-check gate is the last step before Buffer push. If the object isn't there after 2 attempts (1s total), the upload genuinely failed and the error should be surfaced immediately.

### Anti-Patterns to Avoid

- **Routing the CLI push through `approveDraftPost`:** It re-cooks server-side (ADR-0002 violation), deletes the draft row (destroys workspace state), and has no `scheduledAt` support.
- **Writing `draftPushes` rows for CLI-scheduled posts:** Creates gallery double-representation (a `draftPushes` row in a terminal state + a `releases` row with `status:"scheduled"`). The gallery queries only `releases.listByUser` — `draftPushes` is invisible to the gallery. If the fanout is not used, no `draftPushes` rows are created, so no reconciliation is needed.
- **Browser SPA issuing the presigned PUT:** R2 CORS constraint + relative-URL-only SPA rule + bytes-on-CLI-disk make this the wrong tier. CLI process owns the upload.
- **Using `datetime-local` without UTC normalization:** Native `<input type="datetime-local">` returns a local-time string. Convert to ISO-8601 UTC before sending to the backend: `new Date(value).toISOString()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Presigned R2 upload URL | Custom S3 signing | `createPresignedUploadUrl` in `r2.ts` | Already uses `@aws-sdk/s3-request-presigner`; correct `CacheControl` and expiry |
| R2 object existence check | Custom polling loop | `headObject` in `r2.ts` | GetObjectCommand already implemented; catches errors as null |
| Buffer API error classification | Custom error parsing | `classifyBufferError` in `buffer/push.ts` | Handles auth/rate_limit/channel_gone/media/transient/unknown cases |
| Secret unsealing | In-line crypto | `open` from `src/lib/crypto/secret-box.ts` | AES-256-GCM; consistent with all other push paths |
| Channel list | Separate Convex table | `integrationSecrets.extra` via `GET /api/v1/sous-chef/integrations` | Channels already cached in `extra` JSON at connect-time |
| Per-format channel defaults | Hardcoded per-phase logic | `BUILT_IN_FORMAT_DEFAULTS` from `channel-classes.ts` | Already maps square→x/linkedin, portrait→instagram/tiktok/threads, landscape→linkedin |
| Date/time picker UI component | npm package | Native `<input type="datetime-local">` | No dependency; works in all modern browsers; convert to UTC before submit |

---

## Schema Changes Required

### `releases` table in `convex/schema.ts`

Current `status` enum: `v.literal("pending") | v.literal("completed") | v.literal("failed")`

Required addition:
```typescript
status: v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("scheduled"),   // ← ADD
),
```

Required new optional fields:
```typescript
scheduledAt: v.optional(v.string()),       // ISO-8601; null for queue-slot posts
scheduleMetadata: v.optional(v.string()),  // JSON: { channels:[{channelId,channelName,format,providerPostId}] }
```

`scheduleMetadata` is a JSON string (consistent with `metadata`, `socialCopy` existing string fields) to avoid schema churn as the channel metadata shape evolves.

### `releases` row shape for CLI-scheduled Creation

```typescript
{
  userId,
  externalId: "rel_...",       // nanoid
  template: draftConfig.templateId ?? "unknown",
  status: "scheduled",
  output: "image",
  images: {                    // same shape as cook-pipeline images
    landscape: { slides: [publicUrl] },
    square:    { slides: [publicUrl] },
    portrait:  { slides: [publicUrl] },
  },
  credits_used: 0,             // locally rendered — no credit charge
  source: "dashboard",         // closest existing value; "cli" not in enum yet
  scheduledAt: "2026-05-25T14:00:00Z" | null,
  scheduleMetadata: JSON.stringify({ channels: [...] }),
  created_at: now,
}
```

Note: `source` enum currently is `v.literal("api") | v.literal("dashboard") | v.literal("github")`. Adding `v.literal("cli")` is optional but clean — the planner should decide whether to add it or use `"dashboard"` as a stop-gap.

### `PixelBadge` — `pixel-badge.tsx`

Add `scheduled` to `statusStyles`:
```typescript
const statusStyles: Record<string, string> = {
  completed: "bg-green-400 text-brand",
  pending: "bg-yellow-300 text-brand",
  failed: "bg-red-400 text-white",
  scheduled: "bg-blue-400 text-white",   // ← ADD
  // ... existing entries
};
```

### `history-table.tsx` — `Release` type

Current: `status: "completed" | "pending" | "failed"`

Required: `status: "completed" | "pending" | "failed" | "scheduled"`

The `DownloadButton` component checks `status !== "completed"` to disable. A `scheduled` release has no downloadable ZIP yet (the images are in R2 but not in the cook-pipeline format). The download button should remain disabled for `scheduled` rows — the existing `status !== "completed"` check already covers this with no change needed.

---

## Channel List + Routing Defaults — Exact Shapes

### `GET /api/v1/sous-chef/integrations` response shape

From `convex/integrationSecrets.ts` `listByUser` (line 63-80), the route (`/integrations/route.ts` line 322-325) wraps it:

```json
{
  "integrations": [
    {
      "provider": "buffer",
      "enabled": true,
      "extra": "{\"organizationId\":\"org_...\",\"channels\":[{\"id\":\"chan_001\",\"service\":\"twitter\",\"displayName\":\"@myhandle\"},{\"id\":\"chan_002\",\"service\":\"linkedin\",\"displayName\":\"My Company\"}]}",
      "lastScanAt": null,
      "lastScanOkAt": null,
      "lastScanError": null,
      "lastSnapshotJson": null
    }
  ]
}
```

The `extra` field is a **JSON string**. The Workspace must `JSON.parse(integration.extra)` to get the `channels` array. Channel shape: `{ id: string, service: string, displayName?: string }`.

### `GET /api/v1/routing-defaults` response shape

```json
{
  "formats": [
    { "format": "square",    "channels": [{ "provider": "buffer", "channelId": "chan_001" }] },
    { "format": "landscape", "channels": [{ "provider": "buffer", "channelId": "chan_002" }] }
  ]
}
```

### `PUT /api/v1/routing-defaults` body

```json
{ "format": "square", "channels": [{ "provider": "buffer", "channelId": "chan_001" }] }
```

One format per PUT (the existing handler processes one format at a time).

### `BUILT_IN_FORMAT_DEFAULTS` seeding logic (D-09)

```typescript
// channel-classes.ts lines 95-102
export const BUILT_IN_FORMAT_DEFAULTS: Record<string, ChannelClass[]> = {
  square:    ["x", "linkedin"],
  landscape: ["linkedin"],
  portrait:  ["instagram", "tiktok", "threads"],
};
```

Pre-seeding logic: for each format, if `routingDefaults` has no saved entry, pre-check channels whose `channelClassFromBufferService(channel.service)` is in `BUILT_IN_FORMAT_DEFAULTS[format]`.

---

## Common Pitfalls

### Pitfall 1: Deleting the Active Draft
**What goes wrong:** If the planner routes the CLI push through `approveDraftPost`, the function calls `fetchMutation(api.drafts.remove, ...)` on success (line 246). This deletes the draft the developer is actively editing in the Workspace.
**Why it happens:** `approveDraftPost` was designed for the legacy server-cook-and-post flow where the draft is ephemeral.
**How to avoid:** Do not use `approveDraftPost` for the CLI scheduling path. The fresh schedule path (`schedulePush.ts`) does not touch the `drafts` table.
**Warning signs:** If `draftId` is being passed to anything in `approve-draft.ts`, stop and reconsider.

### Pitfall 2: Browser PUT to Presigned URL Fails CORS
**What goes wrong:** Browser SPA tries to PUT directly to the Cloudflare R2 presigned URL. R2 returns a CORS error because the bucket does not have `http://127.0.0.1:*` in its `AllowedOrigins`.
**Why it happens:** Presigned URLs are for server-to-storage or controlled browser uploads; they don't automatically inherit CORS permissions.
**How to avoid:** Route the upload through the CLI server process, not the browser. See Pattern 3.

### Pitfall 3: `datetime-local` Returns Local Time, Not UTC
**What goes wrong:** `<input type="datetime-local">` value is `"2026-05-25T14:00"` — no timezone. Sending this to Buffer as `scheduledAt` causes Buffer to interpret it as UTC when the user meant their local timezone.
**How to avoid:** `new Date(inputValue).toISOString()` converts to UTC ISO-8601. Display the converted time back to the user in the confirmation so they can verify.

### Pitfall 4: HEAD-Check Uses Public URL Instead of R2 Key
**What goes wrong:** Calling `headObject` with the public R2 URL (`https://pub.r2.dev/...`) instead of the object key (`scheduled/drf_.../landscape-...jpg`). `headObject` uses `GetObjectCommand` which requires the bucket key, not the public URL.
**How to avoid:** The schedule endpoint receives both `urls` (public) and `keys` (R2 keys). Use `keys` for `headObject`, `urls` for Buffer's `mediaUrl`.

### Pitfall 5: `source` Enum Missing `cli` Value
**What goes wrong:** Inserting a `releases` row with `source: "cli"` fails Convex schema validation because `cli` is not in the current `v.union` for `source`.
**How to avoid:** Either add `v.literal("cli")` to the schema alongside `v.literal("dashboard")`, or use `"dashboard"` as the short-term value. Schema migrations in Convex are non-blocking but require a deploy.

### Pitfall 6: `routingDefaults` PUT Sends One Format at a Time
**What goes wrong:** After scheduling, saving-back the channel selection with a single PUT for all formats at once — but the route handler only accepts one format per request.
**How to avoid:** The save-back in the schedule flow should fire one `PUT /api/v1/routing-defaults` per format that has selections (2-3 requests max). This matches the existing `upsert` mutation which handles one `(userId, format)` pair.

---

## Code Examples

### `pushToBuffer` Extension (D-05)

```typescript
// src/lib/integrations/buffer/push.ts — extend BufferPushParams
export interface BufferPushParams {
  apiKey: string;
  channelId: string;
  title: string;
  description: string;
  mediaUrl: string;
  format: string;
  postState: "queue" | "draft";
  /** D-05: custom-time scheduling support */
  scheduling?: {
    type: "queue" | "custom";
    scheduledAt?: string;  // ISO-8601 UTC; required when type="custom"
  };
}

// Inside pushToBuffer, replace the hardcoded input block:
const isCustomTime =
  params.scheduling?.type === "custom" && !!params.scheduling?.scheduledAt;

const input: Record<string, unknown> = {
  channelId,
  text,
  ...(isCustomTime
    ? {
        schedulingType: "customScheduled",
        scheduledAt: params.scheduling!.scheduledAt,
      }
    : {
        schedulingType: "automatic",
        mode: "addToQueue",
      }),
};
```

### Presigned Upload URL Route

```typescript
// src/app/api/v1/schedule/upload-url/route.ts
import { authenticate } from "@/lib/auth/authenticate";
import { createPresignedUploadUrl } from "@/lib/storage/r2";

const IMAGE_FORMATS = new Set(["landscape", "square", "portrait"]);

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { draftId?: string; formats?: string[] };
  if (!body.draftId || !Array.isArray(body.formats) || body.formats.length === 0) {
    return Response.json({ error: "draftId and formats required" }, { status: 400 });
  }
  if (body.formats.some(f => !IMAGE_FORMATS.has(f))) {
    return Response.json({ error: "formats must be landscape|square|portrait" }, { status: 400 });
  }

  const timestamp = Date.now();
  const uploads = await Promise.all(
    body.formats.map(async (format) => {
      const key = `scheduled/${body.draftId}/${format}-${timestamp}.jpg`;
      const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, "image/jpeg");
      return { format, uploadUrl, publicUrl, key };
    }),
  );

  return Response.json({ uploads });
}
```

### Schedule Route (Next.js Route Handler)

```typescript
// src/app/api/v1/schedule/route.ts — thin shim; all logic in Convex action
import { authenticate } from "@/lib/auth/authenticate";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@convex/_generated/api";

export const maxDuration = 300;
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  // Validate body shape ...

  const result = await convex.action(internal.schedulePush.run, {
    userId: auth.userId,
    urls: body.urls,
    keys: body.keys,
    selections: body.selections,
    caption: body.caption ?? "",
    scheduling: body.scheduling,
    draftId: body.draftId ?? undefined,
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      upload_missing: 422,
      buffer_not_connected: 409,
      buffer_push_failed: 502,
      auth_unseal_failed: 500,
    };
    return Response.json(result, { status: statusMap[result.error] ?? 500 });
  }

  return Response.json(result);
}
```

### SchedulePanel Workspace Component (structure)

```typescript
// packages/workspace/src/components/SchedulePanel.tsx
// State:
//   channels: { [format: string]: BufferChannel[] }  — from integrations extra
//   selections: { [format: string]: string[] }       — channelIds, pre-loaded from routingDefaults
//   scheduling: { type: "queue" | "custom"; scheduledAt?: string }
//   phase: "idle" | "uploading" | "scheduling" | "done" | "failed"
//   confirmation: { channels: ...; time: string } | null

// On mount: fetch GET /api/v1/sous-chef/integrations + GET /api/v1/routing-defaults
// Seed selections from routingDefaults; where no saved default, seed from BUILT_IN_FORMAT_DEFAULTS
// On submit:
//   1. POST /api/local/schedule (CLI local route) — CLI server orchestrates upload+schedule
// On success: set phase="done", show confirmation
// On error: set phase="failed", show actionable message
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Buffer OAuth token | Buffer static API key (paste-in) | Pivoted 2026-04-29; sealed in secret-box |
| Server-side render before push | CLI local render; backend uses pre-rendered URLs | ADR-0002; this phase realizes the R2 upload half |
| `draftPushes` + `pushFanout` for all posts | `draftPushes` for legacy draft-approval; new `schedulePush` action for CLI-scheduled posts | Phase 7 introduces the second post path |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Buffer GraphQL `createPost` input accepts `schedulingType:"customScheduled"` and `scheduledAt` ISO string | Buffer custom-time wiring (D-05), Code Examples | pushToBuffer extension would need different field names; verify against Buffer API docs before shipping |
| A2 | Cloudflare R2 is read-after-write consistent (no retry needed beyond 1 short retry) | HEAD-check retry/backoff | If eventually consistent, the 2-attempt retry may still miss fresh objects; could increase to 3 attempts with 1s delay |
| A3 | `datetime-local` is sufficient for the date/time picker (no npm package) | Don't Hand-Roll, Standard Stack | If project design constraints require a NES-retro styled picker, a custom component or small dependency may be needed |
| A4 | `source: "dashboard"` is an acceptable stop-gap for CLI-scheduled releases | Schema Changes | Minor labeling issue only; no functional impact. Adding `v.literal("cli")` is the correct long-term fix |

---

## Open Questions

1. **Buffer `scheduledAt` field name and `schedulingType:"customScheduled"` spelling**
   - What we know: The comment in `buffer/push.ts` explicitly names `customScheduled` as a valid mode; no live API call was made to confirm.
   - What's unclear: Whether the param is `scheduledAt` (camelCase) or `scheduled_at` (snake_case) in the Buffer GraphQL schema.
   - Recommendation: Before executing the `pushToBuffer` extension task, the implementer should run a test Buffer mutation with `schedulingType:"customScheduled"` and inspect the error to confirm field names. Alternatively, check Buffer's published GraphQL schema at `https://api.buffer.com/graphql` with an introspection query.

2. **`/api/local/schedule` CLI route vs direct backend call from SPA**
   - What we know: The SPA uses relative URLs only; bytes are on the CLI disk; the presigned PUT must come from the CLI process.
   - What's unclear: Whether the planner wants a clean `/api/local/schedule` CLI-local route (cleanest SPA API surface) or a multi-step SPA flow (upload-url → browser-fetches-bytes → CLI-proxy-PUT → schedule endpoint).
   - Recommendation: Single `/api/local/schedule` CLI route. The CLI server owns the multi-step orchestration; the SPA sees one request+response. This is consistent with how Phase 5 exposed `/api/local/render` as a single CLI-local route.

3. **Gallery date filter — `history-client.tsx` filters "today only"**
   - What we know: `src/components/admin/history-client.tsx` filters by `?status=` and shows "releases today". A `scheduled` release created today appears, but one created yesterday may not show.
   - What's unclear: Whether the gallery should show all `scheduled` releases regardless of date (since "scheduled for future" is inherently forward-looking).
   - Recommendation: Phase 8 owns the Admin trim; for Phase 7, confirm the `releases.listByUser` Convex query and the history page filter. If `scheduled` rows need to persist beyond today, the planner may need a minor filter tweak.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cloudflare R2 bucket | Presigned upload, HEAD-check | Assumed ✓ (used by existing render pipeline) | — | None — blocking |
| Buffer API key (user-configured) | pushToBuffer | User-dependent | — | Panel shows "connect Buffer first" |
| `SECRET_BOX_KEY` env var | secret-box `open` | Assumed ✓ (used by all existing push paths) | — | None — blocking |

**Missing dependencies with no fallback:** None at the code level; R2 and `SECRET_BOX_KEY` are already required by the existing system.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | Buffer connected → channels appear in panel | manual smoke | — | N/A |
| SCHED-02 | Channel groups seeded from `BUILT_IN_FORMAT_DEFAULTS`; saved/pre-loaded from routingDefaults | unit | `npx vitest run src/lib/integrations/__tests__/channel-defaults.test.ts` | ❌ Wave 0 |
| SCHED-03 | Queue slot → `addToQueue`; exact time → `customScheduled`+`scheduledAt` | unit | `npx vitest run src/lib/integrations/__tests__/buffer-push.test.ts` | ❌ Wave 0 |
| SCHED-04 | Upload-URL endpoint issues signed URL; schedule endpoint HEAD-checks + pushes | integration | `npx vitest run src/app/api/v1/schedule/__tests__/schedule.test.ts` | ❌ Wave 0 |
| SCHED-04 | HEAD-check aborts on missing object (no partial post) | unit | included in above | ❌ Wave 0 |
| SCHED-05 | Workspace confirmation shows channel name + time | manual smoke | — | N/A |
| SCHED-06 | `releases` row created with `status:"scheduled"` | unit | `npx vitest run convex/__tests__/schedulePush.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `src/lib/integrations/__tests__/channel-defaults.test.ts` — unit tests for `BUILT_IN_FORMAT_DEFAULTS` seeding logic and `channelClassFromBufferService`
- [ ] `src/lib/integrations/__tests__/buffer-push.test.ts` — extend existing or create: test `pushToBuffer` with `scheduling:{type:"custom",scheduledAt:"..."}` produces correct GraphQL input
- [ ] `src/app/api/v1/schedule/__tests__/schedule.test.ts` — integration: mock `headObject` + `pushToBuffer` + Convex mutation; verify all-or-nothing gate behavior
- [ ] `convex/__tests__/schedulePush.test.ts` — unit: mock `getSealedForUser`, `open`, `pushToBuffer`, `headObject`; verify HEAD-check gate, releases insert args, success/error responses

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Security Domain

`security_enforcement` is absent from config — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `authenticate()` (Bearer + session) on both new endpoints |
| V3 Session Management | no | CLI proxy handles session; not directly touched |
| V4 Access Control | yes | `userId` ownership verified before `getSealedForUser`; releases row is scoped to `userId` |
| V5 Input Validation | yes | Validate `formats`, `selections`, `scheduling.type`, `scheduledAt` ISO format in route handlers |
| V6 Cryptography | yes | `open()` from secret-box — never hand-roll; already in use |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via presigned PUT URL (attacker supplies their own URL) | Tampering | `uploadUrl` is generated server-side; CLI never receives a user-supplied upload URL |
| Timing attack on HEAD-check (schedule with a URL the user doesn't own) | Elevation of Privilege | `key` derived from `draftId` + `userId`-scoped prefix; the backend issues the presigned URL so the key is server-controlled |
| Buffer API key exposure | Info Disclosure | Key is sealed with secret-box; `getSealedForUser` is `internalQuery` (not callable from browser) |
| Double-submit / replay (schedule the same Creation twice) | Repudiation | `releases.externalId` nanoid prevents collision; the planner may wish to add a `clientNonce` to the schedule endpoint for explicit idempotency |

---

## Sources

### Primary (HIGH confidence — verified by reading codebase)
- `src/lib/integrations/buffer/push.ts` — current `pushToBuffer` signature, hardcoded `addToQueue`, comment about `customScheduled` modes
- `src/lib/integrations/buffer/graphql.ts` — `bufferGraphQL`, error classes
- `src/lib/storage/r2.ts` — `createPresignedUploadUrl(key, contentType, expiresIn=300)`, `headObject(key)` implementation
- `convex/schema.ts` — `releases` table (status enum, fields), `draftPushes` table, `routingDefaults` table
- `convex/draftPushes.ts` — `approveDraft` mutation, `getSealedForUser` internalQuery, `pushFanout` coupling
- `convex/pushFanout.ts` — full fanout action; `mediaUrl` guard, retry logic
- `src/lib/posts/approve-draft.ts` — draft-delete on success, cookId bypass path
- `src/lib/integrations/channel-classes.ts` — `BUILT_IN_FORMAT_DEFAULTS`, `channelClassFromBufferService`
- `src/app/api/v1/routing-defaults/route.ts` — GET/PUT shapes
- `convex/routingDefaults.ts` — `upsert` (one format per call), `listByUser`
- `src/app/api/v1/sous-chef/integrations/route.ts` — GET returns `integrations` array with `extra` JSON string
- `convex/integrationSecrets.ts` — `listByUser` returns `extra` without ciphertext
- `src/components/admin/pixel-badge.tsx` — current `statusStyles`, no `scheduled` variant
- `src/components/admin/history-table.tsx` — `Release` type, status union, download button logic
- `packages/workspace/src/api.ts` — relative-URL-only SPA pattern
- `packages/cli/src/proxy.ts` — `/api/*` auto-proxied with Bearer; no changes needed

### Secondary (MEDIUM confidence)
- `.planning/phases/07-schedule-time-upload-posting/07-CONTEXT.md` — locked decisions, canonical refs, flagged questions
- `packages/cli/src/server.ts` — CLI server structure; local output path convention

### Tertiary (LOW confidence — training knowledge, not verified in session)
- Cloudflare R2 read-after-write consistency guarantee
- Buffer GraphQL `createPost` exact field names for `schedulingType:"customScheduled"` and `scheduledAt`

---

## Metadata

**Confidence breakdown:**
- Fanout reuse vs fresh path recommendation: HIGH — based on direct code reading; structural mismatches are concrete
- Buffer custom-time extension: MEDIUM — field names assumed from comment; not verified against live Buffer API
- R2 presigned PUT from CLI: HIGH — CORS constraint + relative-URL SPA rule + bytes-on-disk reasoning is airtight
- Schema changes: HIGH — current schema fully read; additions are minimal and non-breaking
- Endpoint shapes: HIGH — mirrors existing patterns verified by reading three existing routes
- HEAD-check retry: MEDIUM — R2 consistency claim is training knowledge

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable stack; Buffer GraphQL field names should be verified before execution)
