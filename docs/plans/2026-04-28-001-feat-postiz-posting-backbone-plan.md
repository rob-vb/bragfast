---
title: "feat: Postiz posting backbone"
type: feat
status: superseded
superseded_by: docs/brainstorms/2026-04-28-buffer-postiz-byo-posting-requirements.md
superseded_reason: Self-hosted Postiz dropped 2026-04-28. New direction is BYO (Buffer OAuth + Postiz API key); replacement plan to follow.
date: 2026-04-28
origin: docs/brainstorms/2026-04-27-postiz-posting-backbone-requirements.md
target_branch: feat/carousel-templates (in-flight; another session is on this branch — coordinate before stacking commits)
ceo_review: ~/.gstack/projects/rob-vb-bragfast/ceo-plans/2026-04-28-postiz-posting-backbone.md
---

> **Superseded 2026-04-28.** Direction changed to BYO providers — see `docs/brainstorms/2026-04-28-buffer-postiz-byo-posting-requirements.md`. Replacement plan via `/ce-plan` on that doc. Original plan kept below for reference.

# feat: Postiz posting backbone

## Overview

Wire bragfast into a single bragfast-hosted Postiz instance so approved drafts reach the user's social platforms with image attached. bragfast generates content (title, description, JPEG); Postiz owns OAuth, scheduling, per-platform editing, and posting. bragfast never holds platform tokens.

---

## Problem Frame

Sous-Chef pipeline produces drafts but cannot publish. Founders manually copy text + download image + paste per platform. "Autopilot" terminates at a to-do list. (See origin: `docs/brainstorms/2026-04-27-postiz-posting-backbone-requirements.md`.)

---

## Requirements Trace

- R1. New user can connect Postiz from bragfast admin UI. (origin: success criteria)
- R2. User connects ≥1 social inside Postiz, clicks "Post to socials" on a completed release → rendered JPEG(s) + title + description appear in user's Postiz draft queue within ~10s.
- R3. Postiz outage does not lose drafts. Failed pushes surface in UI with a stable error code; user retries. Auth failures auto-disable the integration.
- R4. Zero platform tokens stored in bragfast Convex.
- R5. AGPL compliance: Postiz core runs unmodified; wrapper code stays outside Postiz fork.
- R6. Image-as-media architecture (no link in post body) — sidesteps X $0.20 link-fee.

---

## CEO Review Decisions (locked, 2026-04-28)

These decisions OVERRIDE the original origin-doc framing. The document below already reflects them; listing here for traceability.

| Decision area | Locked outcome |
|---|---|
| Push helper location | **Convex `internalAction` (`"use node"`) at `convex/postiz.ts`**. Sealed cred read via existing `internalQuery` pattern; plaintext key never leaves Convex. |
| Trigger model | **Button-only.** No render-time auto-push. No `postizPushRequested` flag (dropped). |
| Atomic push lock | **`claimPush` mutation in Next.js BEFORE `convex.action(...)`**. Enforces `release.userId === auth.userId` + atomic transition `idle\|failed → pushing`. |
| Route response shape | **Fire-and-poll**: route returns 202 after claim; UI polls `release.postizPushStatus` until `posted\|failed`. |
| Multi-format / multi-slide | **All available formats × all slides uploaded** per push. Up to 16 Postiz API calls per release. |
| Rate-limit handling | **Cooldown badge IN scope.** Parse 429 Retry-After → `lastPushError = "rate_limited:until=<ISO>"` → UI countdown disables button. |
| Post-success DB-write race (E10) | **Retry mutation 3× with backoff, then status=posted with console.error**. Acceptable lost-URL rate. |
| Postiz hosting model | **Single bragfast-hosted shared instance.** `POSTIZ_BASE_URL` from env; no per-user baseUrl. Users supply only API key. |
| AGPL §13 | **Footer link to upstream repo + one paragraph in `infra/postiz/README.md`** explicitly stating no source mods, users hit Postiz UI directly. |
| Test runner | **convex-test + vitest** for the Convex action. |
| Held (NOT in scope) | R2 reachability probe at connect; X 280-char truncation; cred rotation; video pipeline integration. |

---

## Forced Re-Decisions From Research

| Origin decision | Forced re-decision | Reason |
|---|---|---|
| Auto-provision Postiz team on signup via admin API | **User pastes Postiz API key** (matches stripe/posthog/ga4 connect UX) | Postiz has no public org-creation endpoint; forking triggers AGPL source-disclosure. |
| Auto-provision tied to Better Auth signup hook | **Lazy connect** — explicit "Connect Postiz" action | No signup hook in this repo's Better Auth. |
| `fetch` from `renderReleaseAsync` (`src/lib/pipeline/render.ts`) | **Convex `internalAction "use node"`** invoked from Next.js route after a `claimPush` mutation | Sealed cred handling stays Convex-side (never crosses HTTP boundary in plaintext). Decouples push from render lifecycle (button-only trigger). Generalizes naturally to video pipeline later. |

Origin's locked defaults that survive: pinned Postiz Docker tag, engagement loop deferred, `integrationSecrets.postiz` provider, separate Postiz infra (Fly/Railway/VPS), all 17+ Postiz platforms exposed via Postiz UI.

---

## Scope Boundaries

**IN scope:**
- `claimPush` mutation with ownership + atomic transition
- Convex internalAction push helper (multi-format, multi-slide upload sequencing)
- Connect-Postiz UI + route (paste-key only; baseUrl from env)
- "Post to socials" button on release-detail page AND history list (with status badge)
- Status state machine on release: `idle → pushing → posted|failed`
- Auto-disable integration on Postiz auth failure
- Rate-limit cooldown badge with Retry-After parsing
- Retry-3× then status=posted on E10 (post succeeded but DB write failed)
- Bragfast-hosted Postiz infra + AGPL paragraph

**NOT in scope:**
- Per-platform copy variants (single `{title, description}` + image)
- Auto-post / kill-window flow
- Engagement feedback loop (Postiz lacks lifecycle webhooks today — issue #1191)
- bragfast-side per-platform editing or scheduling — Postiz owns that
- Video posting (revisit when image MVP stable; same Convex action shape will fit)
- R2 reachability probe at connect time
- X 280-char truncation
- Postiz cred rotation

### Deferred to Follow-Up Work

- Auto-post with kill window (Survivor #2): separate plan.
- Engagement polling: blocked on Postiz webhooks or `GET /public/v1/posts` polling cron.
- Postiz API rate-limit raise (default 30/hr): requires source patch + AGPL disclosure. Defer until throttling bites.

---

## Context & Research

### Relevant Code and Patterns

- `src/lib/crypto/secret-box.ts` — AES-256-GCM `seal`/`open`. `SECRET_BOX_KEY` env var. Reuse verbatim. Convex action imports from `src/`.
- `convex/integrationSecrets.ts` — provider union + upsert/getSealedForScan pattern. Add `"postiz"` literal at every call site (lines 11-15, 17, 80, 95, 139, 158, 173, 202, 217 — mechanical).
- `src/app/api/v1/sous-chef/integrations/route.ts:71` — atomic upsert+validate+rollback pattern. Connect-Postiz route mirrors this exactly: seal → `upsertAction` → probe → on probe failure, call `disconnectAction` to roll back → return 502.
- `src/lib/pipeline/render.ts:206` — `callWebhook` invocation site (definition line 277). Plan previously cited line 250 in error.
- `convex/videoRender.ts` — `internalAction "use node"` reference shape for `convex/postiz.ts`.

### Institutional Learnings

- `docs/solutions/` is sparse. Capture learnings post-merge: Convex node action + sealed-cred read pattern; AGPL §13 service-operator stance; multi-format multi-slide upload sequencing.

### External References

- Postiz public API: https://docs.postiz.com/public-api/introduction
- `upload-from-url`: https://docs.postiz.com/public-api/uploads/upload-from-url
- Reverse-proxy guide: https://docs.postiz.com/reverse-proxies/nginx
- Docker compose: https://docs.postiz.com/installation/docker-compose
- Webhook feature request (NOT implemented): https://github.com/gitroomhq/postiz-app/issues/1191
- AGPL §13 (network use): https://www.gnu.org/licenses/agpl-3.0.en.html

### Postiz API Verified Capabilities

| Capability | Status |
|---|---|
| Per-org API key auth (`Authorization: <key>`, bare, no `Bearer`) | Verified |
| `POST /public/v1/upload-from-url { url }` → `{ id, path }` | Verified |
| `POST /public/v1/posts` with media array | Verified |
| Create post without platforms → lands as draft | Documented; runtime-verify at U4 |
| Default rate limit | 30 req/hr (configurable only via source patch) |
| Programmatic org creation | **NOT supported** — drives U2 design |
| Webhooks on post lifecycle | **NOT supported** — drives engagement deferral |

---

## Open Questions

### Resolved

- Provisioning model: paste-API-key.
- Push trigger location: Convex internalAction, button-only.
- Image URL contract: R2 public URL → Postiz `upload-from-url` two-step.
- Where the "approve" action lives: post-render button on release detail + history badge.
- Multi-format multi-slide: all formats × all slides per push.
- Postiz hosting: single bragfast-hosted instance, env-configured baseUrl.
- Sync vs poll: fire-and-poll.
- Atomic lock placement: Next.js `claimPush` mutation before `convex.action`.
- Test runner: convex-test + vitest.

### Deferred to Implementation

- Exact Postiz `POST /posts` request body when omitting platforms+schedule. Runtime-verify against pinned Docker tag in U4.
- Postiz error body shape — pin to `{error?: string, message?: string}`, fall back to status text. Verify in U3 against real instance.
- Postiz infra cost ceiling at MVP (Postgres × 2, Redis, Temporal, Elasticsearch). Sized in U7; revisit if it exceeds budget.

---

## High-Level Technical Design

```
[bragfast user]
       │
       │ 1. Connect Postiz (one-time)
       ▼
   /admin/integrations/postiz   (paste apiKey only)
       │
       │ Next.js route:
       │   authenticate → seal(apiKey) → convex.action(upsertAction)
       │   → probe Postiz GET /public/v1/integrations
       │   → on failure: convex.action(disconnectAction) + 502
       ▼
   integrationSecrets row {provider:"postiz", sealed, enabled:true}

       │
       │ 2. User opens Postiz UI directly → OAuths X/LinkedIn/etc
       ▼
   Postiz instance has user's platform tokens

       │
       │ 3. Click "Post to socials" on completed release
       ▼
   POST /api/v1/cook/[id]/post-to-postiz
       │
       │ Next.js:
       │   authenticate
       │   → convex.mutation(api.releases.claimPush, {releaseId, userId})
       │     ↳ asserts release.userId===userId
       │     ↳ asserts postizPushStatus ∈ {idle, failed}
       │     ↳ atomically sets postizPushStatus = "pushing"
       │     ↳ throws on conflict → route returns 409
       │   → convex.action(api.postiz.pushReleaseAction, {releaseId, userId})
       │     (FIRE-AND-FORGET, no await)
       │   → return 202
       ▼
   Convex action (use node):
       ├─ runQuery(internal.integrationSecrets.getSealedForPush, {userId})
       │   ↳ returns ciphertext+iv+tag if enabled
       ├─ open(sealed) → apiKey (stays in Convex memory)
       ├─ runQuery(internal.releases.getById, {releaseId}) → release record
       ├─ for each available format ∈ {landscape, square, portrait}:
       │     for each slide URL:
       │       client.uploadFromUrl({url, apiKey}) → {id, path}
       │   collect mediaRefs[]
       ├─ client.createPost({content, media: mediaRefs, apiKey}) → {postId, postUrl}
       ├─ retry 3× with backoff:
       │     runMutation(internal.releases.recordPushSuccess, {releaseId, postizPostId, postizPostUrl})
       │   on final failure: console.error("[push:<releaseId>] DB write failed, post lost url <postUrl>")
       │   then runMutation(internal.releases.setPushStatus, {status:"posted"})
       └─ on Postiz error:
             ├─ PostizAuthError → recordPushFailure({lastPushError:"auth", disable:true})
             ├─ PostizRateLimitError → recordPushFailure({lastPushError:"rate_limited:until=<ISO>"})
             ├─ otherwise → recordPushFailure({lastPushError:"<typed>:<status>"})

       │
       │ 4. UI polls release-by-id every 1.5s until status ∈ {posted, failed}
       ▼
   Detail page + history list update badge

       │
       │ 5. User opens Postiz, picks platforms, schedules/publishes
       ▼
   Posts ship to X/LinkedIn/Bluesky etc
```

---

## Implementation Units

### U1. Schema delta

**Goal:** Extend `integrationSecrets` provider union to accept `"postiz"`. Add push-tracking fields to `releases` and integration health fields to `integrationSecrets`.

**Requirements:** R1, R3, R4

**Dependencies:** None

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/integrationSecrets.ts` (provider union at every callsite — lines 11-15, 17, 80, 95, 139, 158, 173, 202, 217)
- Modify: `convex/sousChef.ts` (add to `sousChefProvider` if scan/seed routing later applies)
- Modify: `src/lib/types.ts` (TS union mirror, if any)
- Test: `src/lib/__tests__/integrations-postiz-schema.test.ts`

**Schema additions:**

```ts
// integrationSecrets — provider union extended; new health fields
provider: v.union(
  v.literal("stripe"), v.literal("posthog"), v.literal("ga4"),
  v.literal("postiz"),  // NEW
),
// NEW columns:
lastPushAt: v.optional(v.string()),
lastPushError: v.optional(v.string()),  // "auth" | "rate_limited:until=<ISO>" | "client:<status>" | "server:<status>" | "decrypt_failed" | "timeout"

// releases — push state machine
postizPushStatus: v.optional(v.union(
  v.literal("idle"),     // never pushed (or treat absence-of-field as idle)
  v.literal("pushing"),  // claim taken, action running
  v.literal("posted"),   // success
  v.literal("failed"),   // last push failed; can retry
)),
postizPostId: v.optional(v.string()),
postizPostUrl: v.optional(v.string()),
postizPushedAt: v.optional(v.string()),
```

**Approach:**
- Add `v.literal("postiz")` to provider union throughout `integrationSecrets.ts`.
- For postiz rows, `extra` is unused (baseUrl is env-side). Document.
- No data migration needed — additive.

**Test scenarios:**
- Happy path: write a sealed `postiz` row; read back; decryption matches.
- Schema accepts each `postizPushStatus` literal.

**Verification:** `npm run build` passes (Convex codegen accepts new literals).

---

### U2. Connect Postiz UI + API route

**Goal:** Page under `/admin/integrations/postiz` where user pastes `apiKey`. Server seals, persists, probes the Postiz API, rolls back on failure.

**Requirements:** R1, R4

**Dependencies:** U1

**Files:**
- Create: `src/app/(admin)/admin/integrations/postiz/page.tsx`
- Create: `src/app/api/v1/sous-chef/integrations/postiz/route.ts`
- Create: `src/lib/integrations/postiz/connect-probe.ts` — server-only helper that hits `GET {POSTIZ_BASE_URL}/public/v1/integrations` with the supplied key (5s timeout) and returns `{ok: true} | {error: string}`.
- Modify: `src/components/admin/sous-chef-integrations.tsx` (add Postiz card)
- Test: `src/app/api/v1/sous-chef/integrations/postiz/__tests__/route.test.ts`

**Approach:**
- Form field: `apiKey` (password input). NO baseUrl input — bragfast-hosted shared instance.
- Help text: "1. Visit `connect.brag.fast` 2. Sign up / log in 3. Create org 4. Settings → Developers → API key 5. Paste below. Note: posting is rate-limited to ~15 releases/hr by Postiz default."
- Submit flow follows `src/app/api/v1/sous-chef/integrations/route.ts:71` exactly:
  1. `authenticate(request)` → `userId`
  2. validate body
  3. `seal(apiKey)`
  4. `convex.action(api.integrationSecrets.upsertAction, {userId, provider:"postiz", ...sealed})`
  5. probe via `connect-probe.ts` (5s timeout)
  6. on probe failure → `convex.action(api.integrationSecrets.disconnectAction, ...)` + return 502
- On 401 from probe → return 400 `{error: "key rejected by Postiz"}`.
- On unreachable → return 504 `{error: "couldn't reach Postiz instance"}`.
- Display: "Connected" + Disconnect button. If `enabled=false` (auto-disabled by U4), show "Reconnect Postiz" CTA.

**AGPL §13 footer:** Add `<footer>` to admin layout (or page) with "Powered by Postiz (source)" → `https://github.com/gitroomhq/postiz-app`.

**Test scenarios:**
- Happy path: valid key → probe 200 → row persisted.
- Error: invalid key → probe 401 → row rolled back, 400 returned.
- Error: Postiz unreachable → row rolled back, 504 returned.
- Auth: unauthenticated request → 401.
- Edge: re-submit with new key → upsert path replaces ciphertext.

---

### U3. Postiz HTTP client (Convex-side)

**Goal:** Typed wrapper for `uploadFromUrl` and `createPost`. Lives in `convex/postiz/client.ts` because the action consumes it; Convex bundler can import from `src/` if we ever need to share, but starting Convex-side avoids cross-boundary plaintext.

**Requirements:** R2, R3, R6

**Dependencies:** None (parallelizable with U1/U2)

**Files:**
- Create: `convex/postiz/client.ts` — exports `postizClient({apiKey, baseUrl})` returning `{uploadFromUrl, createPost}`.
- Create: `convex/postiz/types.ts` — `PostizMediaRef`, `PostizCreatePostInput`, `PostizPostResponse`, error classes.
- Test: `convex/postiz/__tests__/client.test.ts` (vitest, mock fetch)

**Error classes:**
```ts
class PostizAuthError extends Error { constructor(public body: string) {...} }
class PostizRateLimitError extends Error {
  constructor(public retryAfterSec: number, public retryUntilIso: string, public body: string) {...}
}
class PostizClientError extends Error { constructor(public status: number, public body: string) {...} }
class PostizServerError extends Error { constructor(public status: number, public body: string) {...} }
class PostizTimeoutError extends Error {}
```

**Approach:**
- Native `fetch`. Header: `Authorization: <key>` (bare).
- `uploadFromUrl({url})`: 30s timeout. Body: `{url}`. Parse `{id, path}`.
- `createPost({content, media})`: 10s timeout. Body shape per Postiz spec; omit `integrations` + `date` to land as draft. Parse `{id, postUrl?}`. If Postiz doesn't return URL, leave undefined (handled by caller; URL field stays absent).
- Error mapping:
  - 401/403 → `PostizAuthError`
  - 429 → `PostizRateLimitError`. Read `Retry-After` header (seconds). Compute `retryUntilIso = new Date(Date.now() + retryAfterSec*1000).toISOString()`.
  - 4xx → `PostizClientError`
  - 5xx → `PostizServerError`
  - timeout / network → `PostizTimeoutError`
- Body parse: try JSON `{error?, message?}`, fall back to status text. Truncate stored body to 200 chars.
- Logging: structured `console.warn` on non-2xx with redacted key.

**Test scenarios:**
- Happy `uploadFromUrl` → typed `PostizMediaRef`.
- Happy `createPost` → typed response.
- 401 → `PostizAuthError`.
- 429 with `Retry-After: 600` → `PostizRateLimitError` with `retryAfterSec=600`.
- 500 → `PostizServerError`.
- AbortController timeout → `PostizTimeoutError`.
- Edge: response body missing `id` → parse error surfaced as typed.

---

### U4. Push helper: Convex internalAction

**Goal:** `convex/postiz.ts` exports `pushReleaseAction` (`"use node"` internalAction) that:
1. reads sealed Postiz cred for user,
2. opens it,
3. uploads every slide of every available format,
4. creates the post,
5. records the result on the release row with retry on the final mutation,
6. handles every error class with the right status / lastPushError write.

**Requirements:** R2, R3, R4, R6

**Dependencies:** U1, U3

**Files:**
- Create: `convex/postiz.ts` (with `"use node"` directive)
- Modify: `convex/integrationSecrets.ts` — add `getSealedForPush` internalQuery returning `{ciphertext, iv, tag} | null` for enabled rows
- Modify: `convex/releases.ts` — add `getById` internalQuery + `setPushStatus`, `recordPushSuccess`, `recordPushFailure` internalMutations
- Test: `convex/__tests__/postiz.test.ts` (convex-test + vitest)

**Action signature:**
```ts
export const pushReleaseAction = internalAction({
  args: { releaseId: v.id("releases"), userId: v.string() },
  handler: async (ctx, { releaseId, userId }) => { ... }
});
```

**Caller path:**
- Next.js route (U6) calls `convex.action(api.postiz.pushReleaseAction, ...)` after `claimPush` succeeds.
- Action runs detached from the route — fire-and-poll model.

**Approach:**

```
1. Read sealed cred:
   const sealed = await ctx.runQuery(internal.integrationSecrets.getSealedForPush, {userId});
   if (!sealed) {
     await ctx.runMutation(internal.releases.recordPushFailure, {
       releaseId, lastPushError: "no_integration", disable: false
     });
     return;
   }
2. Decrypt:
   try { apiKey = open(sealed); }
   catch {
     await recordPushFailure({lastPushError: "decrypt_failed", disable: false});
     return;
   }
3. Read release:
   const release = await ctx.runQuery(internal.releases.getById, {releaseId});
4. Build content:
   const {title, description} = JSON.parse(release.socialCopy ?? "{}");
   const content = [title, description].filter(Boolean).join("\n\n") || release.template;
5. Collect URLs:
   const urls: string[] = [];
   for (const format of ["landscape","square","portrait"] as const) {
     const f = release.images?.[format];
     if (f?.slides) urls.push(...f.slides);
   }
   if (urls.length === 0) {
     await recordPushFailure({lastPushError: "no_images", disable: false});
     return;
   }
6. Upload sequentially (Postiz rate-limit conscious):
   const client = postizClient({apiKey, baseUrl: process.env.POSTIZ_BASE_URL!});
   const mediaRefs = [];
   try {
     for (const url of urls) mediaRefs.push(await client.uploadFromUrl({url}));
   } catch (err) { await mapErrorToFailure(err); return; }
7. Create post:
   let post: PostizPostResponse;
   try { post = await client.createPost({content, media: mediaRefs}); }
   catch (err) { await mapErrorToFailure(err); return; }
8. Record success with retry (E10):
   for (let attempt = 1; attempt <= 3; attempt++) {
     try {
       await ctx.runMutation(internal.releases.recordPushSuccess, {
         releaseId, postizPostId: post.id, postizPostUrl: post.postUrl ?? null
       });
       return;
     } catch (err) {
       if (attempt === 3) {
         console.error(`[push:${releaseId}] DB write failed; post live at ${post.postUrl ?? post.id}`);
         await ctx.runMutation(internal.releases.setPushStatus, {releaseId, status:"posted"});
         return;
       }
       await sleep(500 * attempt);
     }
   }
```

**`mapErrorToFailure(err)` helper:**
- `PostizAuthError` → `recordPushFailure({lastPushError:"auth", disable:true})` (sets `integrationSecrets.enabled=false`)
- `PostizRateLimitError` → `recordPushFailure({lastPushError: "rate_limited:until=" + err.retryUntilIso, disable:false})`
- `PostizClientError` → `recordPushFailure({lastPushError: "client:" + err.status, disable:false})`
- `PostizServerError` → `recordPushFailure({lastPushError: "server:" + err.status, disable:false})`
- `PostizTimeoutError` → `recordPushFailure({lastPushError: "timeout", disable:false})`
- unknown throw → `recordPushFailure({lastPushError: "unknown:" + truncate(err.message, 100), disable:false})`

**`recordPushFailure` mutation:**
- Updates release: `postizPushStatus = "failed"`.
- Updates `integrationSecrets`: `lastPushAt = now`, `lastPushError = <code>`. If `disable=true`, sets `enabled = false`.

**Test scenarios:**
- Happy path: sealed cred + 3 formats × 1 slide → 3 uploads + 1 post → status posted, postizPostId+Url persisted.
- Edge: no integration row → status failed with "no_integration", disable=false.
- Edge: decrypt failure → "decrypt_failed".
- Edge: release has zero images → "no_images".
- Auth error from upload → status failed, integration disabled.
- 429 from upload → status failed with "rate_limited:until=<ISO>".
- 500 from createPost AFTER successful uploads → status failed (orphan media in Postiz; documented).
- E10: createPost succeeds but `recordPushSuccess` mutation throws 2× then succeeds → status=posted, URL persisted.
- E10: mutation throws 3× → console.error fires, status=posted (no URL).
- Auth check: if `release.userId !== args.userId`, action throws (caller must enforce — see U8 on claimPush).

**Verification:**
- `npx convex test convex/__tests__/postiz.test.ts` passes.
- Manual smoke against local Postiz from a dev script.

---

### U5. Render-pipeline contract documentation (no-op for image pipeline)

**Goal:** Document that image renders MUST persist R2 *public* URLs in `release.images[format].slides[]`. Postiz `upload-from-url` requires reachable URLs.

**Requirements:** R2, R6

**Dependencies:** U1

**Files:**
- Modify: `src/lib/pipeline/render.ts` — add comment near `markCompleted` mutation (line 197) noting R2 public URL contract.
- No code changes — current pipeline already produces public R2 URLs via `uploadImage`.

**Approach:**
- Audit `src/lib/storage/r2.ts` to confirm `uploadImage` returns a public-accessible URL (no signed expiry).
- If signed: add a note to defer Postiz integration until R2 bucket policy supports public reads.
- Document in `convex/postiz.ts` action: "REQUIRES `release.images[*].slides[]` to be R2 public URLs reachable from the bragfast-hosted Postiz instance."

**Test scenarios:** none — documentation unit.

**Verification:** Manual review of R2 URL output.

---

### U6. "Post to socials" UI + route

**Goal:** Surface push action on release detail page AND history list. Route uses `claimPush` mutation then fires Convex action; UI polls status.

**Requirements:** R1, R2, R3

**Dependencies:** U1, U2, U4, U8

**Files:**
- Modify: `src/components/kitchen/cook-page.tsx` — add "Post to socials" button + status surface.
- Modify: `src/components/admin/history-table.tsx` — add per-row badge component.
- Create: `src/components/admin/postiz-push-button.tsx` — shared component used by both pages with size variant prop.
- Create: `src/app/api/v1/cook/[id]/post-to-postiz/route.ts` — POST handler (claimPush + fire action + 202).
- Test: `src/components/admin/__tests__/postiz-push-button.test.tsx`
- Test: `src/app/api/v1/cook/[id]/__tests__/post-to-postiz.test.ts`

**Route handler:**
```ts
export async function POST(request, {params}) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({error:"Unauthorized"}, {status:401});
  const {id} = await params;
  try {
    await convex.mutation(api.releases.claimPush, {externalId: id, userId: auth.userId});
  } catch (err) {
    if (err.message.includes("conflict")) return Response.json({error:"already in progress or posted"}, {status:409});
    if (err.message.includes("forbidden")) return Response.json({error:"not your release"}, {status:403});
    if (err.message.includes("not found")) return Response.json({error:"release not found"}, {status:404});
    throw err;
  }
  // Fire-and-forget: do NOT await
  convex.action(api.postiz.pushReleaseAction, {externalId: id, userId: auth.userId})
    .catch(err => console.error(`[push:${id}] action invocation failed:`, err));
  return Response.json({ok:true, status:"pushing"}, {status:202});
}
```

**Button states (5):**
1. **Hidden** — `release.status !== "completed"` OR no `images` field.
2. **Active** ("Post to socials") — `postizPushStatus ∈ {undefined, "idle", "failed"}` AND user has Postiz integration enabled.
3. **In flight** ("Posting…", disabled) — `postizPushStatus === "pushing"`.
4. **Posted** ("Posted ✓ → link" if `postizPostUrl`, else "Posted ✓") — `postizPushStatus === "posted"`. Button replaced by link element. **No re-push from this state.**
5. **Reconnect** ("Reconnect Postiz") — integration `enabled=false`. Links to `/admin/integrations/postiz`.

**Rate-limit cooldown variant:**
- If `lastPushError` matches `/^rate_limited:until=(.+)$/` and `untilIso > now`: button disabled, label shows "Postiz cooldown — Nm Ns" with live countdown. Re-enables after `until`.

**Polling:**
- After click, UI polls `release.getByExternalId` every 1500ms.
- Stop polling when `postizPushStatus ∈ {posted, failed}` or after 60s timeout (show "Push timed out — check Postiz" message; status field unchanged).

**Test scenarios:**
- Happy: click → 202 → poll → posted → button flips to "Posted ✓ → link".
- Conflict: button disabled while pushing — server-side claim guard handles concurrent click from another tab (returns 409).
- Failed: status=failed → button shows "Retry post" + error text below (truncated `lastPushError`).
- Auth-fail integration disabled: button shows "Reconnect Postiz" linking to U2 page.
- Cooldown: `lastPushError = "rate_limited:until=<future>"` → button disabled with countdown.
- Auth: route rejects request for release owned by another user (404 hides existence).
- Auth: route rejects unauthenticated (401).

**Verification:**
- Manual click-through against local Postiz from `/admin/kitchen` and `/admin/history`.
- Tests pass.

---

### U7. Postiz infra deployment

**Goal:** Stand up bragfast-operated Postiz at `connect.brag.fast`, pinned Docker tag, behind reverse proxy. Documented + reproducible.

**Requirements:** R5

**Dependencies:** None (infra is parallel)

**Files:**
- Create: `infra/postiz/docker-compose.yml` (or `infra/postiz/fly.toml`)
- Create: `infra/postiz/.env.example`
- Create: `infra/postiz/README.md`
- Modify: `CLAUDE.md` (add "Postiz infra" stack line)

**Approach:**
- Host: Fly.io machines or Railway. Single region.
- Stack: `postiz`, `postiz-postgres`, `redis`, `temporal`, `temporal-postgres`, `elasticsearch`.
- Version pinned to `gitroomhq/postiz-app:v<latest-stable>`. No `:latest`. Manual review on bumps.
- Reverse proxy: Cloudflare → Fly app port 5000. Domain `connect.brag.fast`.
- Postgres backups: managed by host. Document RPO/RTO.
- Sizing: 4 GB RAM / 2 vCPU. Revisit at 50 connected users.
- Secrets: `JWT_SECRET`, DB passwords in host secret manager.
- Health check: `connect.brag.fast/api/health` → uptime monitor.
- Set `POSTIZ_BASE_URL=https://connect.brag.fast` in bragfast Vercel + Convex env.

**AGPL §13 paragraph (in `infra/postiz/README.md`):**

> bragfast operates a self-hosted instance of Postiz (`gitroomhq/postiz-app`) at `connect.brag.fast`. We make NO modifications to Postiz source — the published Docker image runs unmodified. Users who connect via bragfast are redirected to the Postiz web UI directly to manage their org, OAuth integrations, and platform tokens (bragfast does not proxy or wrap the Postiz UI). bragfast's own application code (HTTP client, push helper, schema) is independent and AGPL-unaffected. Per AGPL §13, the upstream Postiz source is linked from the bragfast admin footer.

**Test scenarios:** none — infra deployment, validated by U2 + U6 smoke tests.

**Verification:**
- DNS resolves; HTTPS works; signup works; API key works.
- Backup procedure documented + one restore-from-backup dry run.
- Cost vs. estimate logged after first month.

---

### U8. `claimPush` mutation

**Goal:** Atomic ownership + state-transition guard. Single source of truth for "this release is mine, and it's safe to push now."

**Requirements:** R3, R4

**Dependencies:** U1

**Files:**
- Modify: `convex/releases.ts` — add `claimPush` mutation
- Test: `convex/__tests__/releases-claimPush.test.ts`

**Mutation:**
```ts
export const claimPush = mutation({
  args: { externalId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_externalId", q => q.eq("externalId", args.externalId))
      .first();
    if (!release) throw new Error("not found");
    if (release.userId !== args.userId) throw new Error("forbidden");
    if (release.status !== "completed") throw new Error("conflict: render not complete");
    const status = release.postizPushStatus ?? "idle";
    if (status !== "idle" && status !== "failed") {
      throw new Error(`conflict: postizPushStatus=${status}`);
    }
    await ctx.db.patch(release._id, { postizPushStatus: "pushing" });
    return { releaseId: release._id };
  }
});
```

**Test scenarios:**
- Happy path (idle → pushing): success.
- Failed → pushing: success (retry path).
- Posted → pushing: throws conflict (no re-push).
- Pushing → pushing: throws conflict (in-flight).
- Wrong userId: throws forbidden.
- Missing release: throws not found.
- Render not completed: throws conflict.
- Race: two simultaneous calls — Convex serializes; one wins, other throws.

---

## System-Wide Impact

- **Interaction graph:** New external service (Postiz). Two HTTP call sites: `connect-probe.ts` (U2), `convex/postiz/client.ts` (U4). One new Next.js route (U6). One new admin page (U2). One new Convex action (`pushReleaseAction`, U4) + one new mutation (`claimPush`, U8) + new internal queries / mutations on `releases.ts` and `integrationSecrets.ts`.
- **Error propagation:** Postiz failures NEVER crash render. Push state machine is independent. Status persisted on release. Integration health persisted on integrationSecrets. UI distinguishes (a) no integration, (b) integration disabled (auth fail), (c) rate-limited cooldown, (d) push failed (other), (e) posted.
- **Logging surfaces split:** Convex action logs in Convex dashboard. Next.js route logs in Vercel runtime. Use `[push:<releaseId>]` prefix everywhere for correlation.
- **API surface parity:** Existing `releases.images` contract holds (must remain R2 public URLs). Outbound webhook payload is unchanged in v1 (Postiz block could be added later).
- **Multi-format multi-slide cost:** A push consumes `(1 + N_formats × N_slides)` Postiz API calls. At a 5-slide × 3-format release: 16 calls. Default 30/hr ceiling = ~1.8 such pushes per hour. Connect page surfaces this in copy.
- **Unchanged invariants:** Existing image and video pipelines work identically when Postiz is absent. Existing `socialCopy` field shape unchanged. Existing webhooks unaffected for non-Postiz users.

---

## Failure Modes Registry

| ID | Trigger | Surface | Recovery |
|----|---------|---------|----------|
| F1 | Connect probe times out (5s) | 504, row rolled back | User retries |
| F2 | Connect probe 401 | 400 "key rejected" | User regenerates key |
| F3 | Sealed cred decrypt fails | release: failed; integrationSecrets.lastPushError="decrypt_failed" | User reconnects |
| F4 | Postiz auth fail mid-push (401/403) | release: failed; integrationSecrets.lastPushError="auth"; **enabled=false** | UI shows "Reconnect Postiz" |
| F5 | Postiz 429 | release: failed; lastPushError="rate_limited:until=<ISO>" | UI countdown; auto re-enables |
| F6 | Postiz 4xx other | release: failed; lastPushError="client:<status>" | User retries; if persistent, debug |
| F7 | Postiz 5xx / timeout | release: failed; lastPushError="server:<status>" or "timeout" | User retries |
| F8 | Upload OK, createPost fails | release: failed; ORPHAN media in Postiz | Acceptable for v1; Postiz GC |
| F9 | claimPush conflict (concurrent) | route: 409 | User waits or refreshes |
| F10 | createPost OK, DB write fails 3× | release: posted (no URL); console.error logs lost URL | Operator recovers URL from Postiz dashboard |
| F11 | Render fails | claimPush throws "conflict: render not complete" | UI hides button |
| F12 | No images on release | release: failed; lastPushError="no_images" | Should not happen; investigate |

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Postiz API changes between pinned tags | Pinned Docker tag + manual review of upgrade PRs. Smoke test in staging. |
| `POST /posts` shape ambiguous | Runtime-verify against pinned tag in U4. Document discovered body shape. |
| User's Postiz key revoked → silent failures | F4: auto-disable + UI "Reconnect Postiz". |
| Self-hosted Postiz outage | F7: per-release failed status; user retries. Document SLA on Connect page. |
| AGPL accidental violation | No fork. No core mods. README paragraph + footer link. |
| R2 URL not reachable from Postiz instance | Out of v1 scope (held). Failures surface as F7 server error; manual debug. |
| Rate limit (30/hr) hit at high carousel/format counts | F5: cooldown badge + countdown. Connect page warns "~15 releases/hr ceiling". |
| Coordination with in-flight session on `feat/carousel-templates` | Confirm before stacking commits. If schema deltas (U1) collide, branch off `main` and merge-sequence with the other session owner. |
| `POSTIZ_BASE_URL` env mismatch between Vercel and Convex | Document in `infra/postiz/README.md`. Set in both. |
| Convex action timeout on 16-call worst case | Convex action default 10 min; well above 16 × 1s. Log push duration to detect drift. |

---

## Documentation / Operational Notes

- `infra/postiz/README.md`: deployment runbook, upgrade procedure, backup/restore, AGPL §13 paragraph.
- `CLAUDE.md`: one-line stack mention + brief Postiz module note.
- `/admin/integrations/postiz` page: in-page help + 15/hr ceiling note.
- Post-merge: `docs/solutions/best-practices/`:
  - Convex `internalAction` + sealed-cred read pattern (no plaintext on HTTP wire).
  - AES-GCM sealed-secret pattern for paste-key integrations (already partial; extend with this work).
  - Postiz v1 API quirks discovered during implementation.
  - claimPush atomic-transition pattern for fire-and-poll workflows.

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-27-postiz-posting-backbone-requirements.md`
- **CEO review:** `~/.gstack/projects/rob-vb-bragfast/ceo-plans/2026-04-28-postiz-posting-backbone.md`
- **Ideation:** `docs/ideation/2026-04-27-building-in-public-on-autopilot-ideation.md`
- Related files: `convex/schema.ts`, `convex/integrationSecrets.ts`, `src/lib/crypto/secret-box.ts`, `src/lib/pipeline/render.ts:206`, `src/app/api/v1/sous-chef/integrations/route.ts:71`, `convex/videoRender.ts`
- Postiz public API: https://docs.postiz.com/public-api/introduction
- Postiz reverse proxy: https://docs.postiz.com/reverse-proxies/nginx
- Postiz docker compose: https://docs.postiz.com/installation/docker-compose
- Postiz webhook feature request (NOT implemented): https://github.com/gitroomhq/postiz-app/issues/1191
- Postiz upload-from-url bug (closed): https://github.com/gitroomhq/postiz-app/issues/1147
