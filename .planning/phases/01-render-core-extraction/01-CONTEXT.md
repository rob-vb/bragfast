# Phase 1: Render Core Extraction - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the existing server render pipeline into a standalone `packages/render-core`
npm-workspace package that produces image (Satori/Sharp → JPEG) and video (Remotion
local headless Chrome → MP4) outputs from in-memory inputs, with **zero imports of
`convex`, `@aws-sdk` (R2), or `next`**. The package is the engine that Phases 2–8
(CLI shell, auth, workspace, scheduling) import.

This phase moves and decouples code — it does not add user-facing features. No CLI,
no Workspace UI, no auth, no scheduling here. Success is proven by standalone Node
scripts calling `renderImage()` / `renderVideo()` and a dependency audit reporting a
clean boundary.

</domain>

<decisions>
## Implementation Decisions

### Purity Boundary (input contract)
- **D-01:** `render-core` takes **fully-resolved, in-memory inputs only** — a
  `CanvasTemplateConfig`, a resolved `Brand`, and media already supplied as
  base64/Buffer. The core performs **no** Convex reads, **no** R2 access, and **no
  network fetch** of templates, brands, remote images, or logos.
- **D-02:** All I/O moves to the **caller**. The Next app route resolves
  template/brand via Convex and fetches remote media to base64 (today's
  `resolveTemplate` / `resolveAllTemplates` / `resolveBrand` / `buildSlideDataMaps` /
  `prefetchStaticImages` / `fetchImageAsBase64` Convex+HTTP work stays app-side); the
  future CLI does the equivalent from local files. The pure, data-only helpers
  (`injectStaticImages`, `applySignatureDefaults`, `CanvasRenderer`, the Satori/Sharp
  render loop) move into the package.
- **D-03:** The package's public request type is a new `LocalRenderRequest` — the
  resolved/pure shape, distinct from today's `ReleaseRequest` (which carries
  `userId`, credits, `webhook_url`, `brand_id` and stays in the app). Credit
  accounting, release-record creation, failure refunds, and webhook delivery are
  **caller concerns**, not core concerns.

### Font Strategy
- **D-04:** Bundle the default family (Plus Jakarta Sans) **inside the package**,
  resolved via **`__dirname`** — never `process.cwd()` (this is Success Criteria #4;
  `src/lib/fonts.ts:24` currently uses `process.cwd()` and must change).
- **D-05:** Non-default Google Fonts are still fetched at runtime, but **cached to a
  persistent on-disk directory** (e.g. `~/.brag/fonts`) so repeat renders work
  offline after first fetch. The bundled default always works with no network. Keep
  the existing in-process cache layer on top of the disk cache.

### Output Contract
- **D-06:** `render-core` **returns Buffers** (JPEG per format/slide, MP4 for video)
  plus metadata (dimensions, format keys). The core has **no filesystem or R2
  opinion** — it never writes `file://`, never calls `uploadImage`. The caller
  decides destination: CLI writes Buffers to disk, the app uploads them to R2 at
  schedule-time.

### Packaging
- **D-07:** Set up as an **npm workspace** (`packages/render-core`). The Next app
  consumes it via the workspace protocol; the future CLI (Phase 2+) consumes the same
  package. This gives a clean, auditable dependency boundary (enables Success
  Criteria #3's `convex`/`@aws-sdk`/`next` audit).

### Claude's Discretion
- ESM vs CJS / build tooling for the package — research must confirm what works with
  `__dirname` resolution, Next 16 consumption, and Convex codegen, then the planner
  picks. (Deferred to research per discussion.)
- Exact `LocalRenderRequest` field names and how the app-side resolver layer is
  refactored to feed it.
- How Sharp native binaries and the Remotion Chromium download are verified in CI
  (macOS arm64 + Linux x64 per Success Criteria #5).
- Whether `renderVideoLocal()` is promoted from existing code or lifted from the
  Lambda composition path — research the current `render-video.ts` / `videoRender.ts`
  split first.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (the why)
- `docs/adr/0001-cli-first-reposition.md` — the CLI-first pivot this phase enables
- `docs/adr/0002-local-render-thin-backend.md` — locks local render, no Lambda, no
  server render; render core is imported by the CLI; upload only at schedule-time
- `CONTEXT.md` (repo root) — domain glossary: Render, Draft, CanvasTemplateConfig,
  Creation; "backend never renders"

### Code being extracted (the what)
- `src/lib/pipeline/render.ts` — image render loop (Convex/R2 coupled today; pure
  render parts move to core)
- `src/lib/pipeline/render-video.ts` — video render path (promote local render)
- `src/lib/pipeline/shared.ts` — `resolveTemplate`/`resolveBrand`/`buildSlideDataMaps`/
  `prefetchStaticImages`/`injectStaticImages`/`applySignatureDefaults`; split
  Convex-bound resolvers (stay app-side) from pure data helpers (move to core)
- `src/lib/pipeline/signature.ts`, `src/lib/pipeline/cleanup.ts` — supporting pipeline
- `src/lib/fonts.ts` — font loading; `process.cwd()` → `__dirname` (SC#4)
- `src/lib/templates/canvas-renderer.tsx` — Satori JSX renderer (pure, moves to core)
- `src/lib/templates/canvas-types.ts` — `CanvasTemplateConfig`, `migrateConfig()`
- `src/lib/types.ts` — `Brand`, `ReleaseRequest`, `FORMAT_DIMENSIONS`, `calculateCredits`
  (the pure types move; credit logic stays app-side)
- `src/lib/storage/r2.ts` — `uploadImage` (stays app-side; core must NOT import)
- `src/lib/video/lambda.ts`, `convex/videoRender.ts` — current Lambda video path
  (reference for what local render replaces)
- `src/remotion/VideoCanvasComposition.tsx`, `src/remotion/Root.tsx`,
  `src/remotion/fonts.ts` — Remotion composition the local renderer drives

### Project guides
- `CLAUDE.md` — render pipeline overview, key modules table, dimensions
- `.planning/ROADMAP.md` §"Phase 1" — goal + 5 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CanvasRenderer` (`canvas-renderer.tsx`) and the Satori→Sharp loop in `render.ts`
  are already pure given resolved inputs — they relocate with minimal change.
- `migrateConfig()` handles legacy template schema at read time — keep in core.
- In-process `fontCache` in `fonts.ts` — keep, add disk cache below it (D-05).

### Established Patterns
- `render.ts` instantiates `ConvexHttpClient` at module load and calls
  `convex.mutation/query` + `uploadImage` inline through the render flow — these are
  the exact seams to cut (D-01/D-02/D-06).
- `shared.ts` already separates "resolve" (Convex-bound) from "build/inject/prefetch"
  (data) functions — the split maps cleanly onto core vs caller.
- `fonts.ts` already falls back to Google Fonts when local files are absent — extend
  with disk caching rather than rewrite.

### Integration Points
- Today's `POST /api/v1/cook/image` and `convex/videoRender.ts` call the pipeline;
  after extraction they become callers that resolve inputs, invoke core, then handle
  R2/credits/webhook. (App rewiring may be minimal in this phase — focus is the
  package boundary; full CLI wiring is Phase 2+.)

</code_context>

<specifics>
## Specific Ideas

- Font disk cache location suggested as `~/.brag/fonts` (CLI-namespaced); planner may
  align with a broader `~/.brag/` config dir convention if one is established later.
- Dependency audit (SC#3) should be enforceable — e.g. a test/script asserting the
  package's resolved imports exclude `convex`, `@aws-sdk`, `next`.

</specifics>

<deferred>
## Deferred Ideas

- CLI shell, device-flow auth, Workspace UI, scheduling/providers — Phases 2–8.
- R2 upload at schedule-time and credit/billing flow — stays in the app/backend;
  core stays oblivious to both.
- Server-side cook API routes as the render path — being retired per ADR 0002; not
  removed in this phase, just no longer the engine.

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-render-core-extraction*
*Context gathered: 2026-05-20*
