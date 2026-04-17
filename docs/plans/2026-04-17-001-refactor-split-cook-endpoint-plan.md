---
title: "refactor: Split /api/v1/cook into /cook/image and /cook/video"
type: refactor
status: active
date: 2026-04-17
---

# refactor: Split /api/v1/cook into /cook/image and /cook/video

## Overview

The single `POST /api/v1/cook` endpoint today dispatches to image or video rendering via a `body.video` flag. The branches share auth/rate-limit/credit-reserve logic but diverge in validation, credit math, pipeline entry, and response semantics. This refactor splits the endpoint into two siblings: `POST /api/v1/cook/image` and `POST /api/v1/cook/video`. The sub-routes under `/cook/[id]` (GET, download, copy) stay shared since the stored `output` field already disambiguates. This is a **hard cutover** — the legacy `POST /api/v1/cook` is removed in the same PR and all first-party callers migrate together.

## Problem Frame

- The current route handler (`src/app/api/v1/cook/route.ts`, 187 lines) carries two distinct flows separated by `if (isVideo)`. Validation, credit rates, pipeline dispatch, and error paths all branch.
- The `video` field has ambiguous typing (`true | { duration?, preset? }`) because it doubles as a discriminator and an options container.
- Future surfaces (MCP `generate_images` / `generate_video` tools per `docs/superpowers/plans/2026-03-24-mcp-server.md`) map naturally to two endpoints, not a discriminated one.
- Docs, SDKs, and OpenAPI specs are easier to describe per-resource than per-discriminator.

Splitting gives each output type its own route, its own validator, its own credit rate, and its own doc page — without any behavior change for the client-facing render pipeline.

## Requirements Trace

- R1. `POST /api/v1/cook/image` renders images with identical behavior to today's `POST /api/v1/cook` (no `video` field).
- R2. `POST /api/v1/cook/video` renders videos with identical behavior to today's `POST /api/v1/cook` (`video` field treated as options container, not discriminator).
- R3. `POST /api/v1/cook` returns `404` after cutover — no silent alias.
- R4. `GET /api/v1/cook/[id]`, `/cook/[id]/download`, `/cook/[id]/copy` continue to work unchanged for releases of either output type.
- R5. All first-party callers (Studio UI, onboarding wizard, demo script, integration tests, docs) use the new routes.
- R6. Credit reservation, refund, rate limit, webhook delivery, and `ReleaseResult` shape are unchanged.

## Scope Boundaries

- Not changing `ReleaseResult` shape or any Convex schema.
- Not changing credit math (still 1/slide image, 5/slide video via `calculateCredits`).
- Not changing auth, rate limiting, or webhook behavior.
- Not touching `guided-cook` (already image-only sibling).
- Not touching `src/app/api/github/webhooks/route.ts` or `src/app/api/github/releases/[id]/approve/route.ts` — they call pipeline functions directly, not HTTP.
- Not adding `/cook/image/[id]` or `/cook/video/[id]` — polling stays at `/cook/[id]`.
- No deprecation period — hard cutover.

### Deferred to Separate Tasks

- MCP server `generate_images` / `generate_video` tools wiring — planned separately.
- OpenAPI spec generation — no spec file exists today; out of scope.

## Context & Research

### Relevant Code and Patterns

- `src/app/api/v1/cook/route.ts` — current dispatch handler; branches on `isVideo = !!body.video`.
- `src/app/api/v1/cook/[id]/route.ts` — GET, output-agnostic. No change needed.
- `src/app/api/v1/cook/[id]/download/route.ts` — image-only; returns 400 on video. No change needed (per scope).
- `src/app/api/v1/cook/[id]/copy/route.ts` — PATCH, output-agnostic. No change needed.
- `src/app/api/v1/guided-cook/route.ts` — **reference pattern**: sibling image-only route, shares pipeline with `/cook`, reuses `/cook/[id]` for polling. The split endpoints mirror this pattern.
- `src/lib/pipeline/render.ts` — `createRelease`, `renderReleaseAsync` (image).
- `src/lib/pipeline/render-video.ts` — `renderVideoAsync` (used by Convex action; route calls `api.releases.scheduleVideoRender` instead).
- `src/lib/validation.ts` — `validateReleaseColors`, `validateFormats`, `validateVideoField`.
- `src/lib/auth/authenticate.ts` + `src/lib/auth/rate-limit.ts` — called at route entry.
- `src/lib/types.ts` — `calculateCredits({ video, formats })`.

### Callers to Migrate

| Caller | File | Migration |
|---|---|---|
| Studio UI | `src/components/kitchen/cook-page.tsx` | POST to `/cook/image` or `/cook/video` based on mode |
| Onboarding wizard | `src/components/admin/first-cook-wizard.tsx` | POST to `/cook/image` (image-only flow) |
| Demo script | `scripts/generate-demo-images.ts` | POST to `/cook/image` |
| Live integration test | `src/lib/__tests__/cook-api.test.ts` | Update endpoint URLs |
| Static auth test | `src/lib/__tests__/cook-auth.test.ts` | Update file-path references |
| API docs | `src/lib/docs/api-reference.ts` | Split into two endpoint entries |
| Homepage/demo curl | `src/app/page.tsx`, `src/app/demo/page.tsx` | Update curl snippet URLs |

### Institutional Learnings

- `docs/solutions/` contains only `best-practices/` — no direct prior-art on endpoint splits.
- `guided-cook` sibling pattern (not under `/cook/`) suggests the codebase accepts parallel routes; this plan follows that convention but nests under `/cook/` since they are variants of the same resource.

### External References

None — this is a local Next.js App Router refactor with strong internal patterns.

## Key Technical Decisions

- **Sibling sub-routes, not separate top-level routes.** Put new routes at `src/app/api/v1/cook/image/route.ts` and `src/app/api/v1/cook/video/route.ts`. Keeps the `/cook/` namespace as the "render" resource; preserves the `/cook/[id]` polling path without any Next.js routing conflicts (the `[id]` dynamic segment and static `image`/`video` segments coexist — static wins when matched).
- **Shared helpers over shared base handler.** Extract common pre-flight (`authenticateAndRateLimit`, `validateBrandAndColors`, `reserveCreditsOr429`) into `src/app/api/v1/cook/_shared.ts`. Each route handler composes them inline. Keeps each route readable top-to-bottom; avoids a mini-framework.
- **Request body stays identical.** Both routes accept the same `ReleaseRequest` shape. `/cook/video` treats `body.video` as an options container (`{ duration?, preset? }`); missing or `true` means defaults. `/cook/image` rejects `body.video !== undefined` with 400 to surface client bugs early.
- **Hard cutover.** Delete `src/app/api/v1/cook/route.ts` in the same PR. External API-key users get a `404 Not Found` + documented error body. No deprecation alias.
- **Polling stays unified.** `GET /api/v1/cook/[id]` already returns a unified `ReleaseResult` with both `images` and `videos` fields — no reason to split.
- **Download stays image-only where it is.** `/cook/[id]/download` is documented as image-only; out of scope to relocate.

## Open Questions

### Resolved During Planning

- **BC strategy:** Hard cutover, no alias. (User-confirmed.)
- **Split depth:** POST only. (User-confirmed.)
- **Body shape:** Identical, `video` field is options-only on `/cook/video`, rejected on `/cook/image`. (User-confirmed.)

### Deferred to Implementation

- Exact shape of `_shared.ts` helper signatures — prefer small free functions over a class; settle during implementation based on how naturally the current handler's sections decompose.
- Whether `validateVideoField`'s existing signature needs relaxing now that the discriminator is in the URL — revisit when writing `/cook/video` validation.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
POST /api/v1/cook/image
  ├─ authenticate + rate limit         ─┐
  ├─ validate colors + brand ownership  │
  ├─ validate formats                   ├─ _shared.ts
  ├─ validate template                  │
  ├─ reject body.video                  │
  ├─ reserve credits (1/slide)         ─┘
  ├─ createRelease(body, userId, api) → result
  ├─ after() → renderReleaseAsync
  └─ 202 {ReleaseResult}

POST /api/v1/cook/video
  ├─ authenticate + rate limit         ─┐
  ├─ validate colors + brand ownership  │
  ├─ validate formats                   ├─ _shared.ts
  ├─ validate template                  │
  ├─ validateVideoField(body.video ?? {}, maxSlides)
  ├─ reserve credits (5/slide)         ─┘
  ├─ api.releases.create({ output: "video" })
  ├─ api.releases.scheduleVideoRender
  └─ 202 {ReleaseResult}

POST /api/v1/cook  ──────────────────  DELETED (404)
GET  /api/v1/cook/[id]         ────── unchanged
GET  /api/v1/cook/[id]/download ───── unchanged
PATCH /api/v1/cook/[id]/copy   ────── unchanged
```

## Implementation Units

- [ ] **Unit 1: Extract shared pre-flight helpers**

**Goal:** Pull auth/rate-limit/validation/credit-reserve logic into `_shared.ts` so both new routes compose the same pipeline without duplication.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Create: `src/app/api/v1/cook/_shared.ts`
- Test: `src/app/api/v1/cook/_shared.test.ts`

**Approach:**
- Export small free functions, not a class: `authenticateRequest(request)`, `validateCommonFields(body, userId)`, `reserveCreditsOrError(userId, amount)`.
- Return `Response` objects directly for error cases or structured results for success cases — keeps route handlers as straight-line code.
- Do not include video-specific validation here; `validateVideoField` stays in `src/lib/validation.ts` and is called only from the video route.
- Template validation list (`standard-browser`, `standard-mobile`, `split-browser`, `split-mobile`, `hero`) lives here.

**Patterns to follow:**
- Current `src/app/api/v1/cook/route.ts` structure (lines 14-113) — lift the shared prelude verbatim.

**Test scenarios:**
- Happy path: valid authenticated body with all shared checks passing returns success result.
- Error path: missing auth header → 401 response returned.
- Error path: rate limit exceeded → rate-limit response returned.
- Error path: brand_id not owned by user → 404 response.
- Error path: invalid `formats` → 400 response with validation message.
- Error path: invalid template name → 400 response listing valid templates.
- Error path: `reserve` throws `Insufficient credits` → 429 response with `credits_needed` in body.
- Error path: `reserve` throws `User profile not found` → 403 response.

**Verification:**
- Tests pass.
- `npm run lint` clean.

---

- [ ] **Unit 2: Add POST /api/v1/cook/image route**

**Goal:** New image render endpoint using shared helpers and the existing image pipeline.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Create: `src/app/api/v1/cook/image/route.ts`
- Test: `src/app/api/v1/cook/image/route.test.ts`

**Approach:**
- Compose the shared helpers in order.
- After common validation, reject `body.video !== undefined` with 400 and message `"video field is not allowed on /cook/image; use /cook/video instead"`.
- Credit reservation amount: `calculateCredits({ formats: body.formats })` (no `video`).
- Success path mirrors today's image branch (lines 167-186 of current `route.ts`): `createRelease` → `after(renderReleaseAsync)` → `202 ReleaseResult`.
- Error path: refund + `500` with `"Something burned. Try again."`.
- `export const maxDuration = 60;` preserved.
- Pipeline functions imported from `src/lib/pipeline/render.ts` unchanged.

**Patterns to follow:**
- Current image branch of `src/app/api/v1/cook/route.ts`.
- `src/app/api/v1/guided-cook/route.ts` for composition style.

**Test scenarios:**
- Happy path: valid image body → 202 with `output: "image"`, `status: "pending"`, `cook_id`, `credits_used`, `credits_remaining`.
- Happy path: `webhook_url` + `metadata` in body are echoed on the response.
- Edge case: minimal body (only `formats`) → 202 with defaults.
- Error path: body contains `video: true` → 400 with the new rejection message.
- Error path: body contains `video: { duration: 5 }` → 400 (any `video` value is rejected).
- Error path: `createRelease` throws → 500 and credits are refunded (assert `refund` called).
- Integration: after 202, a `release` record exists in Convex with `output: "image"` (or the implicit default).

**Verification:**
- Route returns 202 for valid input; 400/429/500 for appropriate error cases.
- Refund is invoked on pipeline-creation failure.

---

- [ ] **Unit 3: Add POST /api/v1/cook/video route**

**Goal:** New video render endpoint using shared helpers, video validation, and the Convex action pipeline.

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Create: `src/app/api/v1/cook/video/route.ts`
- Test: `src/app/api/v1/cook/video/route.test.ts`

**Approach:**
- Compose shared helpers.
- After common validation, normalize `body.video`: treat `undefined`, `true`, and `{}` as empty options object. Call `validateVideoField(normalizedVideo, maxSlides)` from `src/lib/validation.ts`.
- Credit reservation: `calculateCredits({ video: body.video ?? true, formats: body.formats })`.
- Success path mirrors today's video branch (lines 115-164): generate `cook_id`, build `ReleaseResult` with `output: "video"`, call `api.releases.create` with `output: "video"`, then `api.releases.scheduleVideoRender` passing `JSON.stringify(body)` as the request payload.
- The Convex action downstream consumes the stringified body as-is; do not mutate it to add a `video: true` flag — the Convex action and `renderVideoAsync` branch are output-agnostic and don't require it (verify during implementation; if they do, add it before stringifying).
- Error path: refund + `500` with `"Something burned. Try again."`.
- `export const maxDuration = 60;` preserved.

**Patterns to follow:**
- Current video branch of `src/app/api/v1/cook/route.ts`.

**Test scenarios:**
- Happy path: valid body with `video: { duration: 6, preset: "fade" }` → 202 with `output: "video"`, `status: "pending"`.
- Happy path: body omits `video` entirely → 202, defaults used.
- Happy path: `scheduleVideoRender` is called with the stringified request body.
- Edge case: `video: true` accepted, normalized to `{}`.
- Error path: `video.duration` too long for slide count → 400 via `validateVideoField`.
- Error path: credit reservation fails → 429 with `credits_needed`.
- Error path: `api.releases.create` throws → 500 and credits refunded.
- Integration: after 202, Convex record exists with `output: "video"`.

**Verification:**
- Route returns 202 for valid input; validation errors surface correctly.
- Credits reserved at 5/slide rate (assert via mock call argument).

---

- [ ] **Unit 4: Migrate frontend callers**

**Goal:** Studio UI and onboarding wizard POST to the new split routes.

**Requirements:** R5

**Dependencies:** Units 2, 3

**Files:**
- Modify: `src/components/kitchen/cook-page.tsx`
- Modify: `src/components/admin/first-cook-wizard.tsx`
- Test: existing component tests, if any, plus manual verification

**Approach:**
- In `cook-page.tsx`, pick URL based on the existing video-mode flag: `const url = videoMode ? "/api/v1/cook/video" : "/api/v1/cook/image";`. Request body stays as is; polling URL `/api/v1/cook/${cook_id}` unchanged.
- In `first-cook-wizard.tsx`, change POST URL to `/api/v1/cook/image` (wizard is image-only).
- No change to response handling — `ReleaseResult` shape unchanged.
- Grep-check for any other same-origin POSTs to `/api/v1/cook` in `src/components/` before finishing.

**Patterns to follow:**
- Existing fetch call sites in each file.

**Test scenarios:**
- Manual: run `npm run dev`, create an image cook in Studio — verify network tab shows POST to `/api/v1/cook/image` and UI shows completion.
- Manual: create a video cook in Studio — verify POST to `/api/v1/cook/video` and video renders.
- Manual: complete the first-cook wizard — verify POST to `/api/v1/cook/image` and onboarding completes.
- Integration: existing component tests (if any) updated to assert new URL.

**Verification:**
- Golden path image + video renders succeed via UI.
- No lingering references to bare `/api/v1/cook` POST in `src/components/`.

---

- [ ] **Unit 5: Migrate demo script and integration tests**

**Goal:** Non-UI callers point at the new routes.

**Requirements:** R5

**Dependencies:** Units 2, 3

**Files:**
- Modify: `scripts/generate-demo-images.ts`
- Modify: `src/lib/__tests__/cook-api.test.ts`
- Modify: `src/lib/__tests__/cook-auth.test.ts`

**Approach:**
- `generate-demo-images.ts`: change POST URL to `${BASE}/api/v1/cook/image`.
- `cook-api.test.ts`: update the live integration URL to `/api/v1/cook/image` (and add a `/cook/video` case if the existing suite covers it; otherwise leave video coverage to Unit 3 unit tests).
- `cook-auth.test.ts`: this is a static source-file inspection test. Update the file paths it reads (`src/app/api/v1/cook/route.ts` → `src/app/api/v1/cook/image/route.ts` and `src/app/api/v1/cook/video/route.ts`). Assert both new files include `authenticate(request)` calls.

**Patterns to follow:**
- Existing test structure in each file.

**Test scenarios:**
- `npx vitest run src/lib/__tests__/cook-auth.test.ts` passes after path updates.
- `npx vitest run src/lib/__tests__/cook-api.test.ts` passes against deployed or local server (if it requires network, note as manual).
- Demo script succeeds: `tsx scripts/generate-demo-images.ts` produces images using an API key.

**Verification:**
- All automated tests pass.
- Demo script produces expected artifacts.

---

- [ ] **Unit 6: Update documentation and public copy**

**Goal:** Public docs, curl examples, and any marketing copy reflect the split.

**Requirements:** R5

**Dependencies:** Units 2, 3

**Files:**
- Modify: `src/lib/docs/api-reference.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/demo/page.tsx`
- Modify: `docs/openapi.yaml` (only if present — not found in current scan; skip otherwise)

**Approach:**
- `api-reference.ts`: split the single `/cook` endpoint entry into two entries (`POST /api/v1/cook/image`, `POST /api/v1/cook/video`). Keep the shared `GET /cook/[id]`, download, and copy entries. Document that `/cook/image` rejects `body.video` and `/cook/video` accepts it as an options object.
- Homepage + demo: update curl snippets to use `/cook/image` (these are marketing snippets; image is the landing-page default).
- Add a short callout on the video endpoint page noting credit rate is 5/slide vs 1/slide for image.
- Do not create new doc files — modify existing entries.

**Patterns to follow:**
- Existing endpoint entries in `src/lib/docs/api-reference.ts`.

**Test scenarios:**
- `npm run build` completes without errors.
- Manual: `/docs` page renders both new endpoints with correct curl snippets.
- Manual: homepage curl copy-paste works end-to-end against local dev server.

**Verification:**
- Docs page lists both new endpoints.
- No remaining occurrences of `POST /api/v1/cook` (bare, without `/image` or `/video`) in user-visible copy.

---

- [ ] **Unit 7: Delete legacy POST /api/v1/cook**

**Goal:** Remove the old dispatcher. Hard cutover completes here.

**Requirements:** R3

**Dependencies:** Units 4, 5, 6

**Files:**
- Delete: `src/app/api/v1/cook/route.ts`

**Approach:**
- Delete the file. Next.js App Router treats `/api/v1/cook` as having no handler at the directory level; it returns 404 automatically.
- Sub-routes (`[id]`, `[id]/download`, `[id]/copy`) continue to resolve since they have their own `route.ts` files.
- Grep-check: zero references to `POST /api/v1/cook` (bare) remain in `src/`, `scripts/`, `docs/`, or `public/`.

**Patterns to follow:**
- N/A — this is a deletion.

**Test scenarios:**
- Happy path (negative): `curl -X POST http://localhost:3000/api/v1/cook` → 404.
- Integration: `GET /api/v1/cook/[id]` for an existing release still returns 200.
- Integration: `/cook/[id]/download` still returns a ZIP for image releases.
- Build passes (`npm run build`).

**Verification:**
- `ripgrep -n "POST.*\"/api/v1/cook\"\\s*[^/]" src/ scripts/` returns nothing unexpected.
- Application behavior verified against Units 4-6 golden paths.

## System-Wide Impact

- **Interaction graph:** No Convex mutations or actions change. `scheduleVideoRender` signature untouched. `createRelease`, `renderReleaseAsync`, `api.releases.create`, `api.releases.markCompleted`, `api.releases.markFailed` all unchanged.
- **Error propagation:** Unchanged per route. Each handler still refunds credits on pipeline-setup failure and relies on the pipeline to refund on render failure.
- **State lifecycle risks:** None — no schema changes, no new writes, no migration of existing records.
- **API surface parity:** GitHub webhook + approve flows bypass HTTP and are unaffected. `guided-cook` unchanged.
- **Integration coverage:** `cook-api.test.ts` is the only live HTTP integration coverage. Ensure both new endpoints are exercised.
- **Unchanged invariants:** `GET /api/v1/cook/[id]`, `/cook/[id]/download`, `/cook/[id]/copy` — same paths, same behavior, same response shapes. `ReleaseResult` shape unchanged. Credit rates unchanged. Rate limit unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| External API-key users hitting `POST /api/v1/cook` get 404 with no migration path. | Changelog + `src/lib/docs/api-reference.ts` update call this out. Accept per user decision (hard cutover). |
| Next.js static-vs-dynamic routing conflict — `[id]` and `image`/`video` coexisting. | Static segments (`image`, `video`) take precedence over dynamic `[id]` in App Router; verified by the existing `[id]/download` + `[id]/copy` pattern. Manually verify in implementation by hitting `/cook/image` (route handler) vs `/cook/foobar` (matches `[id]`, returns 404 for unknown id via GET handler). |
| Missed caller still POSTs to `/api/v1/cook` and breaks. | Grep audit in Unit 7 before deletion; integration test in Unit 5 catches the most important case. |
| `scheduleVideoRender` downstream (Convex action) expects a `video` field in the stringified request. | Verify during Unit 3 implementation by reading `convex/videoRender.ts` and `convex/releases.ts`. If required, inject `video: body.video ?? true` before stringifying. Unit 3 test asserts the actual payload. |
| Shared `_shared.ts` becomes an over-abstracted god module. | Keep it to small free functions; stop extracting when duplication is trivial. |

## Documentation / Operational Notes

- Add a short CHANGELOG-style note in the PR description flagging the breaking change for anyone consuming the HTTP API directly.
- No monitoring, feature flag, or staged rollout needed — the old and new routes can coexist during the PR's review window since new routes live at different paths; deletion of the old route is the cutover moment.
- No data migration.
- `/docs` API reference page is the only public surface that needs copy updates (handled in Unit 6).

## Sources & References

- Related code: `src/app/api/v1/cook/route.ts`, `src/app/api/v1/cook/[id]/`, `src/app/api/v1/guided-cook/route.ts`, `src/lib/pipeline/render.ts`, `src/lib/pipeline/render-video.ts`, `src/lib/validation.ts`, `src/lib/types.ts`
- Related docs: `CLAUDE.md` (Render Pipeline section), `src/lib/docs/api-reference.ts`
- Prior art in repo: `src/app/api/v1/guided-cook/route.ts` (sibling-route pattern)
