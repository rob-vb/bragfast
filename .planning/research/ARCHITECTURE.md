# Architecture Patterns

**Domain:** CLI-first local-render creation tool (brag.fast v2.0 reposition)
**Researched:** 2026-05-20
**Confidence:** HIGH — grounded in direct file inspection of the full existing codebase

---

## Overview

This document maps the integration points, new vs. modified components, and dependency-ordered build sequence for the CLI-first reposition. All findings are derived from reading the actual source files.

---

## Current Architecture (Server-Render Model)

```
Browser Admin  ──POST /api/v1/cook/image──►  Next.js API Route
                                                  │
                                            authenticate()
                                            reserveCredits()
                                            createRelease() → Convex
                                            after() ──────────────────────────►  renderReleaseAsync()
                                                                                      │
                                                                                resolveTemplate (shared.ts)
                                                                                resolveBrand (shared.ts)
                                                                                buildSlideDataMaps (shared.ts)
                                                                                CanvasRenderer (JSX → Satori → Sharp)
                                                                                uploadImage → R2
                                                                                markCompleted → Convex

Video: same route → convex/videoRender.ts (internalAction, "use node") → Remotion Lambda → R2
```

Key observation: `render-video.ts` already contains a `renderVideoLocal()` function (lines 240-275) that calls `@remotion/bundler` + `@remotion/renderer` directly — the local video path already exists in the codebase but is guarded by `OUTPUT_LOCAL=true`.

---

## Target Architecture (CLI-First Local-Render Model)

```
  npx brag
      │
      ├── device-flow auth ──────────────────► POST /api/v1/auth/device/start
      │       │                                       │
      │       │                                 Convex: mint pending deviceCode
      │       │                                       │
      │       ◄── poll ──────────────────────── GET  /api/v1/auth/device/poll
      │       │   (browser opens /device?code=)       │
      │       │   user logs in + approves              │
      │       │                                 Convex: apiKeys.create → return key
      │       │
      │   store key in ~/.brag/credentials.json
      │
      ├── spawn local HTTP server (localhost:3847)
      │       │
      │       ├── GET  /api/me          ──proxy──► GET  /api/v1/account
      │       ├── GET  /api/templates   ──proxy──► GET  /api/v1/templates
      │       ├── GET  /api/brands      ──proxy──► GET  /api/v1/brands
      │       ├── GET  /api/drafts      ──proxy──► GET  /api/v1/drafts
      │       ├── POST /api/drafts      ──proxy──► POST /api/v1/drafts
      │       ├── POST /api/render/image   (LOCAL — render-core, no proxy)
      │       ├── POST /api/render/video   (LOCAL — render-core, no proxy)
      │       ├── GET  /api/render/:id/status  (local state only)
      │       ├── POST /api/schedule      ──── upload R2 + proxy draftPushes
      │       ├── GET  /api/repo-context  (local file reads via git/package.json)
      │       └── static: serve Workspace SPA (localhost:3847/)
      │
      └── open browser → http://localhost:3847

Workspace (browser SPA, talks ONLY to CLI HTTP server)
      │
      ├── picks template from /api/templates
      ├── fills slots (copy + media drag-drop)
      ├── POST /api/render/image  (CLI renders locally)
      ├── GET rendered file (CLI serves from .brag-output/ temp dir)
      ├── POST /api/schedule  (CLI uploads to R2, then backend schedule)
      └── copy to clipboard (client-side, local file URL)

Backend (thin store + auth + schedule)
      │
      ├── Convex tables: drafts, brands, templates, apiKeys, draftPushes,
      │   integrationSecrets, routingDefaults (all reused unchanged)
      ├── NEW: device code table in Convex (deviceCodes)
      ├── NEW: /api/v1/auth/device/* routes (start + poll)
      ├── /api/v1/* CRUD routes (unchanged for Admin; reused for proxy)
      └── /api/v1/schedule-push (thin wrapper over approveDraftPost — reused)
```

---

## Integration Point 1: Render Core Extraction

### Problem

`src/lib/pipeline/render.ts` is entangled with Next.js server context:
- Imports `after` from `"next/server"` (API route only)
- Instantiates `ConvexHttpClient` at module load via `process.env.NEXT_PUBLIC_CONVEX_URL`
- Calls `uploadImage → R2` inline during render
- References `api.releases.*` mutations for lifecycle tracking

`src/lib/pipeline/shared.ts` takes `ConvexHttpClient` as a parameter — it is already almost fully portable.

`src/lib/fonts.ts` uses Node's `readFileSync` and `process.cwd()` — compatible with local Node. The `fontCache` is module-level, which works fine for a single-process CLI.

`src/lib/templates/canvas-renderer.tsx` has no server dependencies — it is pure JSX + utilities.

### Solution: Extract `packages/render-core`

Create a new package at `packages/render-core/` (or `src/render-core/` if keeping a monorepo lite). This package exports:

```
packages/render-core/
  src/
    image.ts          # renderImage(request: LocalRenderRequest) → LocalRenderResult
    video.ts          # renderVideo(request: LocalRenderRequest) → LocalRenderResult
    shared.ts         # resolveTemplate, resolveBrand, buildSlideDataMaps (decoupled from Convex)
    fonts.ts          # unchanged copy from src/lib/fonts.ts
    canvas-renderer.tsx  # unchanged from src/lib/templates/canvas-renderer.tsx
    canvas-types.ts   # unchanged
    types.ts          # LocalRenderRequest, LocalRenderResult (no ReleaseRequest/credits)
  package.json
```

`LocalRenderRequest` replaces `ReleaseRequest`. The key differences:
- No `brand_id` → brand is pre-resolved and passed in (the CLI HTTP server resolved it by proxying /api/v1/brands)
- No R2 upload — render writes to a temp dir and returns local file paths
- No Convex mutations — no `markCompleted`/`markFailed` lifecycle; the CLI local server owns render state
- No credits — no `reserve`/`refund` (credits replaced by flat subscription)

`shared.ts` in render-core takes a pre-fetched `CanvasTemplateConfig` directly — no ConvexHttpClient parameter. The CLI HTTP server resolves templates from the backend before handing off to render-core.

`video.ts` in render-core is essentially `renderVideoLocal()` (lines 240-275 of the existing `render-video.ts`), promoted to the primary code path. No Lambda path in render-core.

### What Changes in the Next.js App

`src/lib/pipeline/render.ts` and `render-video.ts` remain in the Next.js app for the legacy cook API routes. They continue to work for Admin's gallery view of past server-rendered releases. These routes are not removed — they are just no longer the primary render path.

Long term: the cook routes can be deprecated, but in MVP they are left intact.

---

## Integration Point 2: Device-Flow Auth

### Handshake Sequence

```
1. CLI: POST /api/v1/auth/device/start
        → body: { client_id: "brag-cli/1.0" }
        ← body: { device_code: "dc_xxx", user_code: "WXYZ-1234",
                   verification_uri: "https://brag.fast/device",
                   expires_in: 600, interval: 5 }

2. CLI: open browser → https://brag.fast/device?code=WXYZ-1234

3. Browser: user sees code + "Approve CLI access" button
            user must be logged in (Better Auth session) — redirect to login if not
            user clicks Approve
            → POST /api/v1/auth/device/approve
               → Convex: deviceCodes.approve(device_code, userId)
               → Convex: apiKeys.create(userId, "CLI") → returns { key }
               → Convex: deviceCodes.attachKey(device_code, key)

4. CLI: polling GET /api/v1/auth/device/poll?device_code=dc_xxx  (every 5s)
        ← { status: "pending" | "approved" | "expired" }
        when approved: ← { status: "approved", key: "bf_..." }

5. CLI: store key at ~/.brag/credentials.json (chmod 600)
        all subsequent CLI HTTP server proxy calls use Bearer: bf_...
```

### New Convex Table: `deviceCodes`

```typescript
deviceCodes: defineTable({
  deviceCode: v.string(),    // "dc_" + uuid — CLI polls on this
  userCode: v.string(),      // short human-readable e.g. "WXYZ-1234" — shown in browser
  status: v.union(v.literal("pending"), v.literal("approved"), v.literal("expired")),
  userId: v.optional(v.string()),  // set when approved
  apiKeyValue: v.optional(v.string()),  // set when approved — returned once to CLI
  expiresAt: v.number(),     // epoch ms
  created_at: v.string(),
})
  .index("by_deviceCode", ["deviceCode"])
  .index("by_userCode", ["userCode"])
  .index("by_expires", ["expiresAt"])
```

### New Backend Routes

- `POST /api/v1/auth/device/start` — no auth required; creates deviceCode row
- `GET /api/v1/auth/device/poll` — no auth required; returns status + key when approved
- `POST /api/v1/auth/device/approve` — session auth required (admin); marks approved + creates apiKey

### New Admin Page: `/device`

Thin page: shows the user_code, confirms identity, shows "Approve CLI Access" button. Redirects to login if no session. After approval, shows "CLI authenticated — you can close this tab."

### Key Reuse

The `apiKeys.create` Convex mutation (convex/apiKeys.ts) is reused unchanged. The key is stored in the `apiKeys` table exactly like a manually created key. Verification (`verifyKey.ts`) is unchanged.

---

## Integration Point 3: CLI HTTP Server / Workspace / Backend Proxy Data Flow

### CLI HTTP Server Structure

The CLI spawns an HTTP server (e.g. via Node's `http` module or a minimal framework like `hono` or `fastify`) on a fixed port (3847 or configurable). The server:

1. Serves the Workspace SPA (pre-built static bundle)
2. Handles render requests locally (calling render-core)
3. Proxies store/auth/schedule requests to the backend with the stored API key injected as Bearer

```
Workspace SPA request
    │
    ▼
CLI HTTP Server (localhost:3847)
    │
    ├── /api/render/*  → render-core (local, no network)
    │       │
    │       ├── image.ts: CanvasRenderer → satori → sharp → write .brag-output/<id>/<format>.jpg
    │       └── video.ts: @remotion/bundler + @remotion/renderer → write .brag-output/<id>/<format>.mp4
    │
    ├── /api/repo-context → local git/package.json reads
    │       │
    │       └── returns: { repoName, latestTag, commitSha, prTitle, packageVersion }
    │
    ├── /api/schedule → upload-then-proxy
    │       │
    │       ├── for each rendered format:
    │       │     read local file → POST /api/v1/upload (multipart) → R2 URL
    │       └── POST /api/v1/drafts/:id/approve → creates draftPushes
    │
    └── /api/* (all others) → proxy to backend with Bearer injected
            POST headers: { Authorization: "Bearer " + storedKey }
```

### Local File Read: Repo Context

The CLI reads local context on startup and exposes it via `/api/repo-context`. Sources:

```typescript
// packages/cli/src/repo-context.ts
{
  repoName:       git remote get-url origin → parse
  latestTag:      git describe --tags --abbrev=0
  commitSha:      git rev-parse --short HEAD
  prTitle:        git log -1 --format=%s  (last commit message as proxy)
  packageVersion: package.json .version
  packageName:    package.json .name
}
```

The Workspace uses this to pre-fill text slots (version number, repo name, etc.) as slot default content.

### Auto-Derive: One Format to Three

The "author one format, derive the rest" logic lives in the Workspace UI, not in render-core. The Workspace:

1. User designs in landscape (primary format, 1200x675)
2. Auto-derive algorithm computes square (1080x1080) and portrait (1080x1350) layouts:
   - Each object is re-positioned using its anchor point (anchorX/anchorY) relative to the new canvas edges
   - Object size scales by `shorterSide_new / shorterSide_original` ratio
   - User can nudge per-format in the Workspace (stored as per-format overrides in the draft config)
3. The derived configs are sent to the CLI render endpoint as three separate `FormatEntry` items in one render request

The render-core `image.ts` already handles multiple formats in one call (matching the existing `renderReleaseAsync` loop over `request.formats`).

---

## Integration Point 4: Remotion Local Rendering

### Current State

`render-video.ts` lines 240-275 implement `renderVideoLocal()` using:
- `@remotion/bundler` — bundles the Remotion composition from `src/remotion/index.ts`
- `@remotion/renderer` — `selectComposition` + `renderMedia` (headless Chrome)

This already works. It is the `OUTPUT_LOCAL=true` path. The CLI render-core simply promotes this to the primary path.

### First-Run Heavy Downloads

Remotion's `renderMedia` triggers Chrome download on first run (~170MB). This must be handled gracefully:

```
CLI: before first render, call ensureBrowser() from @remotion/renderer
     → downloads Chromium if not cached (in ~/.cache/puppeteer or Remotion's own cache)
     → shows progress bar in terminal
     → subsequent renders skip download
```

### Bundle Caching

The `bundle()` call is expensive (~5-10s). The CLI should cache the bundle path between renders in a session-local variable. The bundle only changes when the Workspace is upgraded:

```typescript
// packages/cli/src/video-render.ts
let cachedBundle: string | null = null;

async function getBundle(): Promise<string> {
  if (cachedBundle) return cachedBundle;
  cachedBundle = await bundle({ entryPoint: getRemotionEntryPoint() });
  return cachedBundle;
}
```

### Remotion Entry Point in CLI Package

The `src/remotion/index.ts` + `VideoCanvasComposition.tsx` need to be accessible from the CLI package. Options:

**Option A (recommended for MVP):** Include the Remotion source in the CLI package bundle. The CLI package re-exports the Remotion entry point. The `bundle()` call uses the bundled path.

**Option B:** Reference `src/remotion/index.ts` from the Next.js app directory at a well-known relative path. Fragile and couples CLI release to app directory structure.

Option A is cleaner. The `VideoCanvasComposition.tsx` imports from `canvas-renderer.tsx` (already in render-core), so the shared dep graph is:

```
render-core (canvas-renderer, canvas-types, fonts)
    ▲
    │
Remotion composition (VideoCanvasComposition.tsx)
    ▲
    │
CLI video renderer (bundle + renderMedia)
```

---

## Integration Point 5: Schedule-Time R2 Upload and draftPushes

### Current Flow (approve-draft.ts)

The existing `approveDraftPost()` in `src/lib/posts/approve-draft.ts`:
1. Resolves a `cookId` (existing R2 URL) OR re-renders from draft config
2. Calls `api.draftPushes.approveDraft` with `mediaUrlByFormat` (R2 URLs, one per format)
3. The draftPushes mutation creates push rows; a background process pushes to Buffer/Postiz

### CLI Schedule Flow

The CLI `/api/schedule` endpoint replaces the "re-render from draft" path entirely. The Workspace always renders locally first; the CLI schedule endpoint always takes the `cookId`-style path (uses pre-rendered files):

```
Workspace: POST /api/schedule
    body: {
      draftId: "drf_...",
      renderedFormats: [
        { format: "landscape", localPath: "/tmp/.brag-output/abc/landscape.jpg" },
        { format: "square",    localPath: "/tmp/.brag-output/abc/square.jpg" },
        { format: "portrait",  localPath: "/tmp/.brag-output/abc/portrait.jpg" },
      ],
      title: "...",
      description: "...",
      selections: [{ format: "landscape", provider: "buffer", channelId: "..." }],
      postState: "queue",
      clientNonce: "...",
    }

CLI HTTP server /api/schedule:
    1. For each format in renderedFormats:
       - read file buffer from localPath
       - POST multipart to backend /api/v1/upload → returns { url: "https://r2.../..." }
    2. Build mediaUrlByFormat: { landscape: url, square: url, portrait: url }
    3. POST /api/v1/drafts/:draftId/approve (proxy to backend with Bearer)
       body: { ...selections, mediaUrlByFormat, postState, clientNonce, title, description }
    4. Backend approveDraftPost() runs the existing draftPushes path
    5. Return result to Workspace
```

The existing `/api/v1/upload/route.ts` accepts multipart form data and calls `uploadImage → R2`. This is reused unchanged. The CLI reads the local file and POSTs it as a `File` in a `FormData`.

The `draftPushes` table and `approveDraftPost` function are reused unchanged.

### Draft Save Flow

When the user saves a Creation (draft) from the Workspace, the CLI proxies to the backend:

```
POST /api/schedule or auto-save → proxy → POST /api/v1/drafts
    body: DraftConfig JSON (templateId, brandId, objectContent with text/image_url refs)
```

Media that was dragged into the Workspace is already uploaded to R2 at drag-time (not just schedule-time) because the Workspace needs a stable URL to reference in `objectContent.image_url`. The CLI `/api/upload` endpoint proxies the multipart upload to the backend `/api/v1/upload` for media Slots.

---

## Component Map: New vs. Modified

### NEW Components

| Component | Location | What It Does |
|-----------|----------|--------------|
| `packages/cli/` | new top-level package | CLI entry point, `npx brag` binary |
| `packages/cli/src/server.ts` | new | Local HTTP server (hono or fastify), routing |
| `packages/cli/src/auth.ts` | new | Device-flow handshake, credential storage (~/.brag/credentials.json) |
| `packages/cli/src/proxy.ts` | new | Generic backend proxy: inject Bearer, forward request/response |
| `packages/cli/src/repo-context.ts` | new | Local git + package.json reads |
| `packages/cli/src/video-render.ts` | new | Bundle cache + renderMedia wrapper |
| `packages/cli/src/schedule.ts` | new | Upload local files to R2 then proxy approve |
| `packages/render-core/` | new top-level package | Shared render logic, CLI-importable |
| `packages/render-core/src/image.ts` | new | Local image render (extracted from render.ts) |
| `packages/render-core/src/video.ts` | new | Local video render (extracted from render-video.ts renderVideoLocal) |
| `packages/render-core/src/shared.ts` | new | resolveTemplate/resolveBrand without ConvexHttpClient |
| `packages/render-core/src/types.ts` | new | LocalRenderRequest, LocalRenderResult |
| `src/app/api/v1/auth/device/start/route.ts` | new | Device-flow: issue device_code + user_code |
| `src/app/api/v1/auth/device/poll/route.ts` | new | Device-flow: CLI polls for key |
| `src/app/api/v1/auth/device/approve/route.ts` | new | Device-flow: browser approves, mints key |
| `src/app/(admin)/device/page.tsx` | new | Browser approval page ("/device?code=...") |
| `convex/deviceCodes.ts` | new | Convex mutations/queries for device-flow |
| Workspace SPA | new | React SPA served by CLI (template pick, slot fill, render preview, schedule) |

### MODIFIED Components

| Component | Location | Change |
|-----------|----------|--------|
| `convex/schema.ts` | existing | Add `deviceCodes` table |
| `src/lib/pipeline/shared.ts` | existing | Extract portable version into render-core; original kept for server cook routes |
| `src/lib/fonts.ts` | existing | Copied into render-core; original kept for server |
| `src/lib/templates/canvas-renderer.tsx` | existing | Copied into render-core; original kept for server |
| `src/lib/templates/canvas-types.ts` | existing | Copied into render-core; original kept for server |
| `src/lib/templates/default-configs.ts` | existing | Copied into render-core (needed by resolveTemplate) |
| `src/lib/pipeline/render.ts` | existing | No changes to server path; render-core extracts the inner render loop |
| `src/lib/pipeline/render-video.ts` | existing | `renderVideoLocal()` promoted to render-core/video.ts; Lambda path kept for legacy |
| `src/app/(admin)/` routes | existing | Remove cook/release creation flows; keep login, gallery, brand setup, API keys, billing, provider connect |
| `package.json` | existing | Add workspace reference to packages/cli + packages/render-core |

### UNCHANGED Components (reused as-is)

| Component | Reuse |
|-----------|-------|
| `convex/apiKeys.ts` | Device-flow calls `apiKeys.create` unchanged |
| `convex/verifyKey.ts` | API key verification unchanged |
| `src/lib/auth/validate-api-key.ts` | Bearer token validation unchanged |
| `src/lib/storage/r2.ts` | Upload at schedule-time, unchanged |
| `src/lib/posts/approve-draft.ts` | Schedule proxy calls `approveDraftPost`, unchanged |
| `convex/draftPushes.ts` | draftPushes table + mutations unchanged |
| `convex/drafts.ts` | Draft CRUD unchanged |
| `convex/brands.ts` | Brand CRUD unchanged |
| `convex/templates.ts` | Template CRUD unchanged |
| `src/lib/integrations/` | Buffer/Postiz posting unchanged |
| `src/app/api/v1/brands/` | Proxied through CLI unchanged |
| `src/app/api/v1/templates/` | Proxied through CLI unchanged |
| `src/app/api/v1/drafts/` | Proxied through CLI unchanged |
| `src/app/api/v1/upload/` | Used by CLI schedule upload unchanged |
| `src/remotion/VideoCanvasComposition.tsx` | Moved into render-core bundle |

---

## Data Flow Diagrams

### Image Render Data Flow (new)

```
Workspace (browser)
  │
  POST /api/render/image  { templateConfig, brand, objectContent, formats: ["landscape","square","portrait"] }
  │
  ▼
CLI HTTP Server
  │
  ├── resolve template: CanvasTemplateConfig (from in-memory cache, originally fetched from backend)
  ├── resolve brand: Brand (from in-memory cache)
  ├── buildSlideDataMaps (render-core/shared.ts)
  ├── prefetchStaticImages (render-core/shared.ts — HTTP fetch, no Convex)
  │
  for each format:
  ├── CanvasRenderer JSX → satori(jsx, { width, height, fonts }) → SVG
  ├── sharp(svg).jpeg() → Buffer
  └── writeFile(.brag-output/<id>/<format>.jpg)
  │
  ← { id, formats: { landscape: "file:///...", square: "file:///...", portrait: "file:///..." } }
  │
Workspace: display preview via <img src="http://localhost:3847/output/<id>/landscape.jpg">
(CLI serves static files from .brag-output/)
```

### Video Render Data Flow (new)

```
Workspace (browser)
  │
  POST /api/render/video  { templateConfig, brand, objectContent, format: "landscape", preset: "showcase" }
  │
  ▼
CLI HTTP Server → cli/src/video-render.ts
  │
  ├── getBundle() → @remotion/bundler.bundle(entryPoint) [cached after first call]
  ├── selectComposition(bundleLocation, compositionId, inputProps)
  ├── renderMedia(composition, ...) → headless Chrome → .brag-output/<id>/landscape.mp4
  │
  ← { id, format: "landscape", localPath: "http://localhost:3847/output/<id>/landscape.mp4" }
  │
Workspace: display video preview via <video src="http://localhost:3847/output/<id>/landscape.mp4">
```

### Schedule Data Flow (new)

```
Workspace (browser)
  │
  POST /api/schedule  { draftId, renderedFormats: [{format, localPath}], selections, title, description, ... }
  │
  ▼
CLI HTTP Server → cli/src/schedule.ts
  │
  for each renderedFormat:
  ├── read Buffer from localPath
  ├── POST multipart FormData → backend /api/v1/upload
  │     Authorization: Bearer bf_...
  │     ← { url: "https://r2.brag.fast/uploads/.../landscape.jpg" }
  │
  ├── POST → backend /api/v1/drafts/:draftId/approve
  │     body: { selections, mediaUrlByFormat: { landscape: "https://r2..." }, ... }
  │     ← approveDraftPost() runs unchanged → draftPushes rows created
  │
  ← { pushIds, status }
  │
Workspace: show "Scheduled to Buffer" confirmation
```

### Device-Flow Auth Handshake

```
Terminal                    CLI process              Backend              Browser (admin)
────────────────────────────────────────────────────────────────────────────────────────
npx brag
  │
  ▼
cli/src/auth.ts
  │── POST /api/v1/auth/device/start ──────────────►
  │                                                  Convex: deviceCodes.insert()
  │◄── { device_code, user_code, verification_uri } ─
  │
  │── open browser: https://brag.fast/device?code=XXXX-1234
  │                                                               user logs in (session)
  │                                                               sees "Approve CLI Access"
  │                                                               clicks Approve
  │                                         ◄── POST /api/v1/auth/device/approve
  │                                             Convex: deviceCodes.approve()
  │                                             Convex: apiKeys.create() → key = "bf_..."
  │                                             Convex: deviceCodes.attachKey(device_code, key)
  │
  │── (poll every 5s) GET /api/v1/auth/device/poll?device_code=dc_... ──►
  │                                                  Convex: deviceCodes.get()
  │◄── { status: "approved", key: "bf_..." } ──────────────────────────
  │
  │── write ~/.brag/credentials.json { key: "bf_..." }
  │── chmod 600 ~/.brag/credentials.json
  │
  ▼
start local HTTP server
open workspace in browser
```

---

## Dependency-Ordered Build Sequence

```
Phase 1: Render Core Extraction
  ├── Extract canvas-types.ts, canvas-renderer.tsx, fonts.ts, default-configs.ts
  │   into packages/render-core/ (copy, not move — server paths kept intact)
  ├── Write render-core/shared.ts (decouple from ConvexHttpClient)
  ├── Write render-core/image.ts (inner render loop from render.ts, no R2, no Convex)
  ├── Write render-core/video.ts (renderVideoLocal promoted, bundle cache)
  └── Write render-core/types.ts (LocalRenderRequest, LocalRenderResult)
  DEPENDENCY: nothing upstream

Phase 2: CLI Shell + Auth
  ├── packages/cli/ scaffold (package.json, tsconfig, bin entry)
  ├── cli/src/auth.ts (device-flow handshake, ~/.brag/credentials.json)
  ├── cli/src/proxy.ts (generic backend proxy with Bearer inject)
  ├── NEW: convex/deviceCodes.ts + schema.ts deviceCodes table
  ├── NEW: /api/v1/auth/device/* routes (start, poll, approve)
  └── NEW: /device page in admin
  DEPENDENCY: render-core done (for later phases); auth independent

Phase 3: CLI Local HTTP Server + Workspace Shell
  ├── cli/src/server.ts (hono/fastify, routing table)
  ├── cli/src/repo-context.ts (git + package.json reads)
  ├── Workspace SPA scaffold (React, served as static from CLI)
  ├── Proxy routes: /api/templates, /api/brands, /api/drafts, /api/me
  └── CLI startup: auth check → start server → open browser
  DEPENDENCY: Phase 2 (auth, proxy)

Phase 4: Workspace Editor + Slot Filling
  ├── Template picker (fetch /api/templates, render preview via CanvasRenderer in browser)
  ├── Slot fill UI (text inputs, media drag-drop)
  ├── Media drag-drop → upload via proxy /api/upload → return R2 URL for slot ref
  ├── Auto-derive (one format → three) logic in Workspace
  └── Draft save (proxy POST /api/drafts)
  DEPENDENCY: Phase 3 (server + workspace shell)

Phase 5: Local Image Render
  ├── Workspace: POST /api/render/image
  ├── cli/src/server.ts: /api/render/image handler → render-core/image.ts
  ├── render-core/image.ts: full image render pipeline
  ├── CLI serves .brag-output/ as static → Workspace preview
  └── Copy-to-clipboard (client-side from served URL)
  DEPENDENCY: Phase 1 (render-core), Phase 4 (slot filling gives objectContent)

Phase 6: Local Video Render
  ├── Workspace: POST /api/render/video
  ├── cli/src/video-render.ts (bundle cache + renderMedia)
  ├── First-run: ensureBrowser() with progress output
  └── CLI serves .mp4 as static → Workspace video preview
  DEPENDENCY: Phase 1 (render-core/video.ts), Phase 4

Phase 7: Schedule-Time Upload + Posting
  ├── cli/src/schedule.ts (read local file → upload R2 → approveDraftPost proxy)
  ├── Workspace: schedule panel (channel selection, post state)
  └── Reuse: /api/v1/upload, approveDraftPost, draftPushes
  DEPENDENCY: Phase 5 or 6 (must have rendered files), Phase 3 (proxy)

Phase 8: Admin Trim
  ├── Remove cook/release-authoring UI from Admin
  ├── Keep: login, gallery (read-only releases), brand setup, API keys, billing, provider connect
  └── Add /device approval page (Phase 2 backend exists; add Admin UI page)
  DEPENDENCY: Phase 2 backend (device routes), independent of CLI phases
```

---

## Satori / Sharp / Remotion: "Runs in Local Node, Not Server" — Concrete Notes

**Satori** (`^0.24.1`): Pure JS/TS, no native bindings, no server assumptions. Runs in any Node process. The render-core image.ts imports it directly.

**Sharp** (`^0.34.5`): Native bindings (libvips), but ships prebuilt binaries for all major platforms. When the CLI is installed via `npx`, Sharp downloads its native binary on first install (standard behavior, not specific to server context). No change needed; works in CLI Node process.

**Font loading** (`src/lib/fonts.ts`): Uses `readFileSync` with `process.cwd()` to find bundled font files. In the CLI package, the Plus Jakarta Sans TTFs must be bundled into the package. The `fontCache` is module-level — works correctly in a single-process CLI (cache persists across renders in a session).

**Remotion** (`4.0.448`): 
- `@remotion/bundler` — uses webpack, runs in Node, no browser needed for the bundling step
- `@remotion/renderer` — downloads Chromium on first use, then spawns it headless for render. This is already tested in the codebase (the `OUTPUT_LOCAL=true` path in render-video.ts). The CLI just removes the `OUTPUT_LOCAL` guard.
- `@remotion/lambda` — can be removed from the CLI package.json; kept in the Next.js app for legacy cook routes

**ConvexHttpClient** — NOT in render-core. The CLI proxies data fetches to the backend before calling render-core. This cleanly severs the server dependency.

---

## Scalability Considerations

| Concern | CLI (single user) | Admin backend |
|---------|------------------|---------------|
| Concurrent renders | N/A (one user per CLI instance) | No change — cook routes still exist |
| Font cache | In-process, resets per CLI run | Unchanged server behavior |
| Chromium download | One-time per machine, ~170MB | Not applicable (no Lambda path in CLI) |
| R2 upload at schedule | Sequential per format (~3 uploads) | Same R2 client |
| Convex polling (device-flow) | 5s interval, TTL 600s, auto-expire | Add cleanup cron for expired deviceCodes |

---

## Open Questions / Flags for Phase Research

- **Workspace SPA tech**: Next.js SPA export vs. Vite standalone app. Vite is lighter for a pure SPA; however, reusing existing React components (CanvasRenderer preview) from the repo is simpler if both share the same TS config. Decide in Phase 3.
- **CLI package distribution**: `npx brag` requires the package to be on npm as `brag` or a scoped name. Name availability and package structure (monorepo workspace vs. separate repo) needs resolution before Phase 2.
- **Font bundling in CLI**: The Plus Jakarta Sans TTFs are in `src/assets/fonts/`. The CLI package must bundle these. Ensure the package.json `files` array includes them.
- **Chromium path isolation**: Remotion's headless Chrome may conflict with system Chrome or Puppeteer caches. Test on macOS and Linux before Phase 6.
- **Device-flow PKCE**: The current design does not use PKCE (no code_verifier/code_challenge). For MVP this is acceptable (same security level as a personal API key), but worth noting.
- **Credential rotation**: If the CLI-minted API key is revoked in Admin, the CLI needs to detect the 401 and re-trigger device-flow. Add this to the proxy error handling.

---

## Sources

- `src/lib/pipeline/render.ts` — server render pipeline, server entanglements identified
- `src/lib/pipeline/render-video.ts` — `renderVideoLocal()` already exists (lines 240-275)
- `src/lib/pipeline/shared.ts` — ConvexHttpClient parameter pattern, mostly portable
- `src/lib/fonts.ts` — `readFileSync`/`process.cwd()` usage, `fontCache` module-level
- `src/lib/templates/canvas-renderer.tsx` — pure JSX, no server deps, VideoComponent render-prop pattern
- `src/lib/auth/authenticate.ts` + `validate-api-key.ts` — Bearer + session dual auth
- `src/app/api/v1/api-keys/route.ts` + `convex/apiKeys.ts` — key minting pattern reused for device-flow
- `src/lib/posts/approve-draft.ts` — approveDraftPost reuse at schedule-time
- `src/lib/storage/r2.ts` — uploadImage signature
- `convex/schema.ts` — full table inventory
- `docs/adr/0002-local-render-thin-backend.md` — ADR confirms render-core extraction intent
- `.planning/PROJECT.md` + `CONTEXT.md` — authoritative glossary and constraint set
