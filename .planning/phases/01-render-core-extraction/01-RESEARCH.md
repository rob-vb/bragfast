# Phase 1: Render Core Extraction - Research

**Researched:** 2026-05-20
**Domain:** npm workspace package, Satori/Sharp image render, Remotion local video render, TypeScript build tooling, purity boundary seam-cutting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `render-core` takes fully-resolved, in-memory inputs only — `CanvasTemplateConfig`, resolved `Brand`, and media already as base64/Buffer. Zero Convex reads, zero R2 access, zero network fetch of templates/brands/media.
- **D-02:** All I/O moves to the caller. `resolveTemplate` / `resolveAllTemplates` / `resolveBrand` / `buildSlideDataMaps` / `prefetchStaticImages` / `fetchImageAsBase64` Convex+HTTP work stays app-side. Pure data helpers (`injectStaticImages`, `applySignatureDefaults`, `CanvasRenderer`, Satori/Sharp loop) move into the package.
- **D-03:** Public request type is a new `LocalRenderRequest` — distinct from `ReleaseRequest` (which carries `userId`, credits, `webhook_url`, `brand_id` and stays in the app). Credit accounting, release-record creation, failure refunds, and webhook delivery are caller concerns.
- **D-04:** Bundle Plus Jakarta Sans **inside the package**, resolved via `__dirname` — never `process.cwd()`. (`src/lib/fonts.ts:24` currently uses `process.cwd()` and must change.)
- **D-05:** Non-default Google Fonts fetched at runtime, cached to `~/.brag/fonts` for offline repeat renders. Bundled default always works with no network. Keep in-process cache on top of disk cache.
- **D-06:** `render-core` returns Buffers (JPEG per format/slide, MP4 for video) plus metadata. Never writes `file://`, never calls `uploadImage`. Caller decides destination.
- **D-07:** Set up as an npm workspace (`packages/render-core`). Next app consumes via workspace protocol. Future CLI consumes same package.

### Claude's Discretion

- ESM vs CJS / build tooling for the package.
- Exact `LocalRenderRequest` field names and app-side resolver layer refactor.
- How Sharp native binaries and Remotion Chromium download are verified in CI.
- Whether `renderVideoLocal()` is promoted from existing code or lifted from the Lambda composition path.

### Deferred Ideas (OUT OF SCOPE)

- CLI shell, device-flow auth, Workspace UI, scheduling/providers — Phases 2–8.
- R2 upload at schedule-time and credit/billing flow.
- Server-side cook API routes as the render path — being retired per ADR-0002; not removed in this phase.
</user_constraints>

---

## Summary

Phase 1 extracts the existing render pipeline into a standalone `packages/render-core` npm workspace package. The critical insight from reading the actual source: **the pure render logic and the Convex/R2/Next coupling are intermixed in the same files, not different files** — seam-cutting is surgical removal of the outer I/O shell, not a file reorganization. `renderVideoLocal()` already exists at `render-video.ts:240-275` and is the exact function to promote: it calls `@remotion/bundler` and `@remotion/renderer` directly with no Lambda. The font path fix is a one-liner (`process.cwd()` → `__dirname` + `path.resolve()` — but ESM requires `fileURLToPath(import.meta.url)` instead of `__dirname`).

The biggest architectural decision is **CJS output**, not ESM. Sharp is CJS-only (`type: commonjs`, no exports map). Satori is pure ESM (`type: module`). Remotion packages ship CJS with `exports` maps. Next.js's `serverExternalPackages` already bypasses bundling for `sharp` and `@remotion/*` — those same packages are dependencies of `render-core` and will be externalized the same way. **Recommendation: ship `render-core` as CJS (TypeScript compiled to CommonJS via `tsup`) with `__dirname` working natively.** This sidesteps the ESM/CJS interop complexity while satisfying all constraints.

**Primary recommendation:** Build `packages/render-core` as a CJS TypeScript package compiled with `tsup`, listing `sharp`, `satori`, `@remotion/*`, and `react` as `peerDependencies` to avoid binary duplication across workspaces.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Satori/Sharp JPEG render loop | `render-core` package | — | Pure CPU transform: SVG → JPEG, no I/O |
| Remotion local video render | `render-core` package | — | `renderVideoLocal()` already isolated; calls `@remotion/renderer` directly |
| Font loading (bundled default) | `render-core` package | — | `__dirname` resolution locks this to the package |
| Font loading (Google Fonts disk cache) | `render-core` package | — | D-05 disk cache logic lives here, not in callers |
| Template resolution (built-in + Convex custom) | App API route / CLI file reader | — | Requires Convex `ConvexHttpClient`; stays caller-side (D-02) |
| Brand resolution (Convex lookup + logo fetch) | App API route / CLI file reader | — | Same: needs Convex + HTTP fetch |
| `buildSlideDataMaps` (URL → base64 conversion) | App API route / CLI file reader | — | Contains `fetchImageAsBase64` which hits R2 and CDN |
| `injectStaticImages` + `applySignatureDefaults` | `render-core` package | — | Pure data transforms on already-resolved maps (D-02 explicit) |
| `normalizeDataUri` (Sharp PNG normalization) | `render-core` package | — | Pure Sharp operation, no I/O |
| `uploadImage` + R2 storage | App only (stays) | — | D-06: core returns Buffers; caller writes/uploads |
| Convex mutation (markCompleted, refund) | App only (stays) | — | D-01/D-03: caller concern |
| Credit accounting + webhook delivery | App only (stays) | — | D-03: caller concern |
| `collectUploadKeys` + `cleanupUploads` | App only (stays) | — | Depends on R2 URL format; stays in app cleanup path |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `satori` | 0.26.0 (latest) | JSX → SVG renderer | Already used; pure ESM, no Node deps, designed for server-side image gen [VERIFIED: npm registry] |
| `sharp` | 0.34.5 (latest) | SVG → JPEG conversion, PNG normalization | Already used; CJS, platform-native binaries [VERIFIED: npm registry] |
| `@remotion/bundler` | 4.0.448 (project pin) | Webpack-bundles the Remotion composition for local render | Required by `renderVideoLocal()`; already installed [VERIFIED: npm registry] |
| `@remotion/renderer` | 4.0.448 (project pin — note: latest is 4.0.464) | `renderMedia`, `selectComposition`, `ensureBrowser` | Core local headless render API; already installed in node_modules [VERIFIED: npm registry] |
| `tsup` | 8.5.1 | TypeScript → CJS/ESM build tool for the package | Zero-config, handles `.tsx`, dual output, sourcemaps [VERIFIED: npm registry] |

> **Version pin note:** The project pins Remotion at `4.0.448` in `package.json`. The workspace package should pin to the same version to avoid a version split across the monorepo. Latest on registry as of research date is `4.0.464`. Pin to `4.0.448` to match the existing lock.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | 4.22.3 | Run TypeScript directly in Node for standalone test scripts | Use in `packages/render-core/scripts/` test harness (SC#1 and SC#2) [VERIFIED: npm registry] |
| `depcheck` | 1.4.7 | Dependency audit for SC#3 | Audit that no `convex`, `@aws-sdk`, `next` imports exist [VERIFIED: npm registry] |
| `typescript` | 5.9.3 (workspace root) | TypeScript compiler | Already in devDeps; workspace packages share root install |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsup` (CJS output) | `tsc` direct | `tsc --outDir` with `"module": "CommonJS"` works but requires a separate `tsconfig.build.json`; `tsup` is simpler with native `.tsx` support and does asset copying |
| `tsup` (CJS output) | ESM output | ESM requires `fileURLToPath(import.meta.url)` shim for `__dirname`, adds Convex codegen interop risk (Convex `"use node"` actions use CJS), and no upside for this package's consumers |
| `depcheck` | Custom Node script | `depcheck` is well-understood; for the specific "zero imports of X" assertion a simpler custom script scanning resolved deps is more precise (see Dependency Audit section below) |

**Installation (workspace root):**
```bash
npm install --save-dev tsup tsx --workspace=packages/render-core
```

**Version verification ran:**
```bash
npm view tsup version       # 8.5.1 (published 2025-11-12)
npm view tsx version        # 4.22.3 (published 2026-05-19)
npm view depcheck version   # 1.4.7 (published 2023-10-17)
npm view satori version     # 0.26.0 (published 2026-03-20)
npm view sharp version      # 0.34.5 (published 2025-11-06)
npm view @remotion/bundler version    # 4.0.464 (latest); project uses 4.0.448
npm view @remotion/renderer version   # 4.0.464 (latest); project uses 4.0.448
```

---

## Package Legitimacy Audit

> slopcheck was not available at research time. All packages below are tagged `[ASSUMED]` from npm registry checks. The planner must gate each new package install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `tsup` | npm | ~5 yrs | ~10M/wk | github.com/egoist/tsup | [ASSUMED] | Approved — widely used TypeScript build tool |
| `tsx` | npm | ~4 yrs | ~7M/wk | github.com/privatenumber/tsx | [ASSUMED] | Approved — standard TS executor |
| `depcheck` | npm | ~10 yrs | ~1M/wk | github.com/depcheck/depcheck | [ASSUMED] | Approved — established audit tool |
| `satori` | npm | ~3 yrs | varies | github.com/vercel/satori | [ASSUMED] | Already in project deps |
| `sharp` | npm | ~11 yrs | ~20M/wk | github.com/lovell/sharp | [ASSUMED] | Already in project deps |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — all packages are either already in project dependencies or are well-known tools. Planner should add `checkpoint:human-verify` before `tsup` and `tsx` install as slopcheck was unavailable.

---

## Architecture Patterns

### System Architecture Diagram

```
   packages/render-core (pure Node, CJS, zero Convex/R2/Next)
   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │  renderImage(req: LocalRenderRequest): ImageRenderResult │
   │    ├── injectStaticImages()  ─────── already pure       │
   │    ├── applySignatureDefaults() ──── already pure       │
   │    ├── normalizeDataUri() ──────────── uses Sharp        │
   │    ├── loadFontsForFamily()  ─────── fixed __dirname    │
   │    ├── CanvasRenderer JSX  ────────── already pure      │
   │    ├── satori() ──────────────────── SVG out            │
   │    └── sharp().jpeg().toBuffer() ──── Buffer out        │
   │                                                         │
   │  renderVideo(req: LocalRenderRequest): VideoRenderResult │
   │    ├── ensureBrowser() ────────────── Chromium DL/cache  │
   │    ├── bundle({ entryPoint }) ──────── Webpack bundle    │
   │    ├── selectComposition() ────────── pick format comp   │
   │    └── renderMedia() ──────────────── MP4 Buffer out     │
   │                                                         │
   │  Shared pure helpers (moved from shared.ts):            │
   │    injectStaticImages, applySignatureDefaults,          │
   │    normalizeDataUri (new name for inline helper)        │
   │                                                         │
   │  Font module (fixed):                                    │
   │    loadLocalFonts()  → path.join(__dirname, 'fonts/')   │
   │    loadGoogleFont()  → disk cache ~/.brag/fonts/         │
   └─────────────────────────────────────────────────────────┘
           ↑ consumed via npm workspace protocol
   ┌────────────────────┐      ┌──────────────────────────┐
   │  Next.js app route │      │  Future CLI (Phase 2+)   │
   │  resolveTemplate() │      │  reads local files       │
   │  resolveBrand()    │      │  builds LocalRenderReq   │
   │  buildSlideDataMaps│      └──────────────────────────┘
   │  → LocalRenderReq  │
   │  → renderImage()   │
   │  → upload to R2    │
   └────────────────────┘
```

### Recommended Project Structure

```
packages/render-core/
├── package.json             # name: "@bragfast/render-core", type: "commonjs"
├── tsconfig.json            # extends root, module: CommonJS, outDir: dist
├── tsup.config.ts           # entry: src/index.ts, format: ['cjs'], dts: true
├── src/
│   ├── index.ts             # public API: renderImage, renderVideo, LocalRenderRequest
│   ├── image.ts             # renderImage() — extracted Satori/Sharp loop
│   ├── video.ts             # renderVideo() — promoted renderVideoLocal()
│   ├── fonts.ts             # loadFontsForFamily() — __dirname-fixed version
│   ├── pure-helpers.ts      # injectStaticImages, applySignatureDefaults, normalizeDataUri
│   └── types.ts             # LocalRenderRequest, ImageRenderResult, VideoRenderResult
├── fonts/
│   ├── PlusJakartaSans-Regular.ttf   # copied from src/assets/fonts/
│   └── PlusJakartaSans-Bold.ttf
├── scripts/
│   ├── test-image.ts        # standalone SC#1 validation script (tsx)
│   └── test-video.ts        # standalone SC#2 validation script (tsx)
└── dist/                    # tsup output (gitignored)
```

App side — files that STAY and gain a thin adapter:
```
src/lib/pipeline/
├── render.ts          → keep outer shell (Convex mutations, R2 upload, webhook)
│                        replace inner render loop with renderImage() call
├── render-video.ts    → keep outer shell (Convex mutations, R2 upload)
│                        replace renderVideoLocal() + Lambda path with renderVideo() call
├── shared.ts          → keep resolveTemplate, resolveAllTemplates, resolveBrand,
│                        buildSlideDataMaps, prefetchStaticImages
│                        REMOVE injectStaticImages, applySignatureDefaults (moved)
├── signature.ts       → MOVE to render-core/src/pure-helpers.ts
└── cleanup.ts         → STAYS (depends on r2.ts)
```

### Pattern 1: CJS Package with `__dirname` Font Resolution

**What:** TypeScript compiled to CJS. `__dirname` is available natively in CJS. Font files sit in `packages/render-core/fonts/` and are copied to `dist/fonts/` by tsup's asset copying.

**When to use:** Whenever the package has bundled binary assets that must resolve relative to the installed package location, not the consumer's cwd.

```typescript
// packages/render-core/src/fonts.ts
// Source: pattern verified against current src/lib/fonts.ts + __dirname CJS behavior
import { readFileSync } from "fs";
import path from "path";

// __dirname is the compiled dist/ directory in CJS — reliable in all Node versions
const BUNDLED_FONTS_DIR = path.join(__dirname, "fonts");

function loadLocalFonts(): FontConfig[] {
  const dir = BUNDLED_FONTS_DIR;  // was: path.join(process.cwd(), "src/assets/fonts")
  const regular = readFileSync(path.join(dir, "PlusJakartaSans-Regular.ttf"));
  const bold = readFileSync(path.join(dir, "PlusJakartaSans-Bold.ttf"));
  // ... rest unchanged
}
```

**ESM alternative (NOT recommended):** In ESM `.mjs` output, `__dirname` does not exist. The shim is:
```typescript
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```
This would work but adds complexity and risks Convex codegen (`"use node"` actions use CJS require) breaking on the ESM package. CJS avoids all of this.

### Pattern 2: `renderVideoLocal()` Promotion (Already Exists)

**What:** `renderVideoLocal()` at `src/lib/pipeline/render-video.ts:240-275` is the exact function to move. It calls `@remotion/bundler.bundle()` + `@remotion/renderer.renderMedia()` and `selectComposition()`. It already produces a file — the promoted version should write to a temp path and return the Buffer.

**Current signature:**
```typescript
// Source: src/lib/pipeline/render-video.ts:240-275
async function renderVideoLocal(
  compositionId: string,
  inputProps: Record<string, unknown>,
  outputPath: string   // currently writes to caller-specified path
)
```

**Promoted signature (core returns Buffer, no filesystem opinion per D-06):**
```typescript
// packages/render-core/src/video.ts
export async function renderVideo(req: LocalVideoRenderRequest): Promise<VideoRenderResult> {
  // ensureBrowser() first — downloads Chromium on first run, cached after
  await ensureBrowser({
    onBrowserDownload({ version }) {
      req.onBrowserDownload?.({ version });  // caller can show progress to user
      return { version, onProgress: req.onBrowserDownloadProgress };
    }
  });
  const entryPoint = req.remotionEntryPoint;  // caller provides — NOT hardcoded process.cwd()
  const bundleLocation = await bundle({ entryPoint });
  const composition = await selectComposition({ serveUrl: bundleLocation, id: req.format, inputProps: req.inputProps });
  // Write to os.tmpdir() temp file, read back as Buffer, unlink
  const tmpFile = path.join(os.tmpdir(), `render-core-${crypto.randomUUID()}.mp4`);
  await renderMedia({ composition, serveUrl: bundleLocation, codec: "h264", outputLocation: tmpFile, inputProps: req.inputProps, ...req.renderOptions });
  const buffer = await fs.readFile(tmpFile);
  await fs.unlink(tmpFile);
  return { buffer, durationSeconds: ..., format: req.format };
}
```

**Key difference from current:** entryPoint must NOT use `process.cwd()`. The Remotion composition entry point (`src/remotion/index.ts`) is part of the **app** repo, not the package. The caller (app route or CLI) passes the absolute path. This is a critical seam.

### Pattern 3: `LocalRenderRequest` Type Design

**What:** The pure input contract for `renderImage()`. Derived from what `renderReleaseAsync()` uses **after** the resolve* calls complete.

```typescript
// packages/render-core/src/types.ts
export interface LocalRenderRequest {
  formats: Array<{
    name: "landscape" | "square" | "portrait";
    slides: Array<{
      objectData: ObjectDataMap;        // already-resolved (was buildSlideDataMaps output)
      templateConfig: CanvasTemplateConfig;  // already-resolved (was resolveTemplate output)
    }>;
  }>;
  brand: Brand;                          // already-resolved (logoBase64 not logo_url)
  // No userId, no brand_id, no webhook_url, no credits — those are caller concerns (D-03)
}

export interface ImageRenderResult {
  formats: Record<string, {
    slides: Buffer[];      // one JPEG Buffer per slide (D-06: caller writes/uploads)
    dimensions: string;    // "1200x675" etc.
  }>;
}
```

### Anti-Patterns to Avoid

- **`process.cwd()` for asset resolution:** The package runs from wherever the CLI or app process starts. `process.cwd()` is the caller's working directory. In a monorepo, `process.cwd()` when called from the Next.js app is `/Users/rob/Development/bragfast` — it works by accident today. When the package installs globally via `npx brag`, it breaks. Always use `__dirname`.
- **Importing `convex`, `@aws-sdk`, or `next` in any `render-core` source file:** These are the purity constraints of D-01/D-07. Even a type-only import (`import type { ConvexHttpClient }`) would pollute the package's type graph.
- **Hardcoding the Remotion entry point inside `render-core`:** The composition file (`src/remotion/index.ts`) lives in the app repo, not the package. The package must accept it as a caller-provided parameter. This is the key architectural seam for video render.
- **Shipping `@remotion/renderer` and `sharp` as `dependencies` (not `peerDependencies`):** These have platform-specific native binaries. Installing them twice (in the root and in `packages/render-core`) risks binary conflicts and doubles install size. They should be `peerDependencies` with the workspace root satisfying them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript → CJS build | Custom `tsc` script | `tsup` | Handles `.tsx`, asset copying, declaration emit, watch mode in one config |
| Chromium download + cache | Custom downloader | `@remotion/renderer.ensureBrowser()` | Handles version pinning, OS-specific binary selection, download progress callback |
| Dependency boundary audit | Custom import graph walker | `depcheck` + custom Node script over `node_modules/.package-lock.json` | `depcheck` finds declared dep mismatches; a small Node script asserting absence of `convex/` dirs in the transitive closure is more precise than grep |
| SVG → JPEG conversion | Custom Sharp pipeline | Existing `sharp(Buffer.from(svg)).flatten().jpeg().toBuffer()` pattern (already in `render.ts:173-176`) | Already tested; handles JPEG artifact-free flatten |
| Satori font loading | Custom CSS/font parse | Existing `loadFontsForObjects()` + `loadGoogleFont()` pattern in `fonts.ts` | Already handles weight fallback, cache, partial failure |
| Google Font disk cache | Custom HTTP cache | `node:fs` + `node:path` under `~/.brag/fonts/` | Simple: check file exists → read; else fetch + write. No library needed — the existing in-process cache is ~60 lines; add disk tier below it |

**Key insight:** The hard parts (Satori, Sharp, Remotion render loop, font loading) already work. Phase 1 is about boundary enforcement, not capability building.

---

## Purity Boundary: Exact Function Inventory

This is the primary research output for the seam-cutting work. Every function listed is verified against the actual source files.

### Functions to MOVE into `render-core`

| Function | Current Location | Pure? | Notes |
|----------|-----------------|-------|-------|
| `CanvasRenderer` (default export) | `canvas-renderer.tsx` | YES — relocate as-is | No external I/O; takes pre-resolved `objectData: ObjectDataMap` |
| `renderObject` (named export) | `canvas-renderer.tsx` | YES | Used by `VideoCanvasComposition` directly |
| `ObjectDataMap` (type) | `canvas-renderer.tsx` | YES | Pure type |
| `injectStaticImages` | `shared.ts:146-160` | YES — relocate as-is | Pure data transform on already-resolved srcMap |
| `applySignatureDefaults` | `signature.ts:8-20` (re-exported from `shared.ts:162`) | YES — relocate as-is | Pure; no imports beyond canvas-types/renderer/types |
| `normalizeDataUri` | `render.ts:269-275` (private fn) | YES — promote to exported helper | Uses `sharp` but no I/O |
| Satori/Sharp render loop | `render.ts:159-195` (inside `renderReleaseAsync`) | YES — extract as `renderImage()` | Needs font + objectData already resolved |
| `renderVideoLocal` | `render-video.ts:240-275` (private fn) | MOSTLY — see note | Uses `process.cwd()` for entryPoint; must accept path as parameter |
| `loadFontsForFamily` | `fonts.ts:117-120` | YES with fix | `loadLocalFonts()` uses `process.cwd()` — one-line fix to `__dirname` |
| `loadFontsForObjects` | `fonts.ts:127-161` | YES with fix | Same dependency on `loadLocalFonts()` |
| `loadLocalFonts` (internal) | `fonts.ts:22-37` | NEEDS FIX | Line 24: `process.cwd()` → `__dirname` |
| `CanvasTemplateConfig` (type + `migrateConfig`) | `canvas-types.ts` | YES — relocate or re-export | `migrateConfig` has no external deps |
| `FORMAT_DIMENSIONS` | `canvas-types.ts` (also re-exported from `types.ts`) | YES | Pure constant |
| `Brand`, `BrandColors` (types) | `types.ts` | YES — pure types, move | No app concerns |
| `ObjectModification` (type) | `types.ts` | PARTIAL — move minimal fields | `image_url`/`video_url` are URL strings; the pure core needs only the resolved `ObjectDataMap` form, not `ObjectModification` |

### Functions to STAY app-side (NEVER import in `render-core`)

| Function | Current Location | Reason |
|----------|-----------------|--------|
| `resolveTemplate` | `shared.ts:10-28` | Takes `ConvexHttpClient`; queries `api.templates` |
| `resolveAllTemplates` | `shared.ts:31-48` | Same |
| `resolveBrand` | `shared.ts:50-82` | Takes `ConvexHttpClient`; calls `fetchImageAsBase64` |
| `buildSlideDataMaps` | `shared.ts:84-108` | Calls `fetchImageAsBase64` which hits R2/CDN |
| `prefetchStaticImages` | `shared.ts:115-143` | Calls `fetchImageAsBase64` |
| `fetchImageAsBase64` | `images.ts` | Hits R2 (`getImageBuffer`) + CDN fetch |
| `uploadImage` | `storage/r2.ts` | `@aws-sdk` dependency |
| `createRelease` / `getRelease` | `render.ts` | `ConvexHttpClient` + `api.releases` |
| `createVideoRelease` / `renderVideoAsync` | `render-video.ts` | `ConvexHttpClient` + `api.*` + `uploadImage` |
| `collectUploadKeys` / `cleanupUploads` | `cleanup.ts` | Depends on `isR2Url` / `deleteByKey` from `r2.ts` |
| `calculateCredits` | `types.ts` | App business logic (stays in app's types) |
| `ReleaseRequest` / `ReleaseResult` | `types.ts` | Carries `userId`, `webhook_url`, `brand_id` (D-03) |

### Types that need to be defined freshly in `render-core`

`LocalRenderRequest` is new. It takes as input what the app-side resolver layer produces:

```typescript
// The app-side flow today:
//   resolveAllTemplates() → Map<string, CanvasTemplateConfig>  ← pure config
//   resolveBrand()        → Brand                              ← already-resolved (logoBase64)
//   buildSlideDataMaps()  → ObjectDataMap[]                    ← already-resolved (base64)
//   prefetchStaticImages()→ { srcMap, backgroundImageBase64 }  ← already-resolved (base64)
// Then: injectStaticImages, applySignatureDefaults → move to core, called inside renderImage()
```

So `LocalRenderRequest` wraps the already-resolved outputs:

```typescript
export interface LocalRenderSlide {
  objectData: ObjectDataMap;
  templateConfig: CanvasTemplateConfig;
  backgroundImageBase64?: string;  // from prefetchStaticImages result
}
export interface LocalRenderFormat {
  name: "landscape" | "square" | "portrait";
  slides: LocalRenderSlide[];
}
export interface LocalRenderRequest {
  formats: LocalRenderFormat[];
  brand: Brand;
}
```

---

## Dependency Audit Enforcement (SC#3)

The dependency audit asserting zero `convex`/`@aws-sdk`/`next` imports needs to be both fast and precise.

**Recommended approach: two-tier check**

**Tier 1 — Static import scan (fast, CI-friendly):**
```bash
# Run from packages/render-core/
node -e "
const { execSync } = require('child_process');
const forbidden = ['convex', '@aws-sdk', 'next'];
const output = execSync('grep -r --include=\"*.ts\" --include=\"*.tsx\" -l ' + forbidden.map(p => '-e \"from .\\\"' + p + '\"' + ' -e \"require(.\\\"' + p + '\"').join(' ') + ' src/').toString().trim();
if (output) { console.error('FAIL: forbidden imports found:', output); process.exit(1); }
console.log('PASS: no forbidden imports');
"
```

**Tier 2 — Resolved dependency check (thorough):**
```bash
# After npm install, check that none of the forbidden packages appear
# in packages/render-core/node_modules/ (if using hoisting) or the
# package-lock transitive deps for this workspace
node -e "
const lock = require('./package-lock.json');
const forbidden = ['convex', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'next'];
const found = forbidden.filter(p => p in (lock.packages || {}));
if (found.length) { console.error('FAIL transitive deps:', found); process.exit(1); }
console.log('PASS: no forbidden transitive deps');
"
```

**Integrate as a `package.json` script:**
```json
{
  "scripts": {
    "audit:purity": "node scripts/audit-purity.js"
  }
}
```

**Simpler alternative using `depcheck`:**
```bash
cd packages/render-core && npx depcheck --ignores='typescript,tsup,tsx' 2>&1
# depcheck won't tell you "this dep should NOT be here" — it finds missing or unused deps.
# The static grep scan is more appropriate for the SC#3 assertion.
```

**Verdict: use the static grep scan (Tier 1) as the primary SC#3 check.** It runs in < 1 second, requires no install, and is the correct tool for "assert absence."

---

## Sharp Native Binaries (SC#5)

### How Sharp installs in a workspace

Sharp uses a `postinstall` script that downloads a prebuilt platform-specific binary tarball from `https://github.com/lovell/sharp/releases`. [CITED: sharp.pixelplumbing.com/install]

In an npm workspace, Sharp is hoisted to the root `node_modules/` by default. When `packages/render-core` declares `sharp` as a `peerDependency`, the root install satisfies it — no separate binary per workspace package. **This is the correct configuration.**

If `packages/render-core` instead lists `sharp` as a regular `dependency`, npm may install it twice (root + workspace), causing binary version conflicts (Node native modules are not ABI-compatible across versions). [ASSUMED — based on npm hoisting behavior]

### Cross-platform CI strategy (macOS arm64 + Linux x64)

GitHub Actions provides the needed matrix natively:
```yaml
# .github/workflows/render-core-ci.yml
jobs:
  test:
    strategy:
      matrix:
        os: [macos-14, ubuntu-22.04]  # macos-14 is arm64, ubuntu-22.04 is x64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci  # installs workspace root + all packages
      - run: npm run audit:purity --workspace=packages/render-core
      - run: npm run test --workspace=packages/render-core
```

Sharp's binary is automatically selected by `npm ci` for the runner's platform — no manual `--cpu`/`--os` flags needed when running natively (not cross-compiling). [CITED: sharp.pixelplumbing.com/install]

**Verification test (SC#5):**
```typescript
// packages/render-core/scripts/test-sharp.ts
import sharp from "sharp";
const info = await sharp(Buffer.alloc(100)).png().toBuffer();
console.log("Sharp OK, platform:", process.platform, process.arch);
```

---

## Remotion Local Render: `renderVideoLocal()` Promotion

### Is there an existing local render path?

**Yes.** `renderVideoLocal()` exists at `src/lib/pipeline/render-video.ts:240-275`. It is already the active code path when `OUTPUT_LOCAL=true`. It calls:
- `@remotion/bundler.bundle({ entryPoint })` — Webpack-bundles the composition
- `@remotion/renderer.selectComposition(...)` — resolves composition metadata
- `@remotion/renderer.renderMedia(...)` — headless Chrome render

The Lambda path (`renderVideo()` from `src/lib/video/lambda.ts`) is NOT used when `OUTPUT_LOCAL=true`. The local path is battle-tested in development.

### Does local render avoid the "Remotion Lambda redeploy" requirement?

**Yes, completely.** The project memory note ("Remotion Lambda redeploy required after src/remotion changes") applies only to the Lambda deployment — the bundled serve URL deployed to AWS S3. Local render re-bundles from source on every call via `bundle({ entryPoint })`, so it always uses the latest composition code. [ASSUMED — based on how `@remotion/bundler.bundle()` works]

### Chromium download

`@remotion/renderer.ensureBrowser()` handles Chromium download automatically. [CITED: remotion.dev/docs/renderer/ensure-browser]
- On first call: downloads platform-appropriate Chromium, caches it in `~/.remotion/` (Remotion's default cache dir).
- On subsequent calls: cache hit, instant return.
- The `onBrowserDownload` callback surfaces download progress (`percent`, `downloadedBytes`, `totalSizeInBytes`).
- Phase 6 uses this callback to show "one-time Chrome download" messaging to the user; Phase 1 (this phase) just calls `ensureBrowser()` in the standalone test script to verify it works.

### Entry point constraint

The Remotion composition entry point is `src/remotion/index.ts` — a file in the **app** repo. The `render-core` package must not hardcode this path. The promoted `renderVideo()` function accepts `remotionEntryPoint: string` as a parameter so the caller (app route or CLI) provides the absolute path.

```typescript
// Current in render-video.ts:248 — MUST CHANGE:
const entryPoint = path.join(process.cwd(), "src/remotion/index.ts");
// Becomes a parameter:
const entryPoint = req.remotionEntryPoint;  // caller provides
```

### `@remotion/renderer` package status

Not listed in `package.json` `dependencies`, but **is installed** in `node_modules/@remotion/renderer/` (confirmed via `ls node_modules/@remotion/`). It is a transitive dep via `@remotion/bundler` or `@remotion/cli`. The workspace package should list it explicitly as a `peerDependency` at version `4.0.448` to match the project pin.

---

## ESM vs CJS Decision

### Current module formats in the stack

| Package | Type | Notes |
|---------|------|-------|
| `satori` | ESM (`"type": "module"`) | Pure ESM, no CJS fallback |
| `sharp` | CJS (`"type": "commonjs"`) | Native bindings, no exports map |
| `remotion` | CJS + exports map | Ships CJS `dist/cjs/` |
| `@remotion/bundler` | CJS | Node package, uses `require` |
| `@remotion/renderer` | CJS | Node package, uses `require` |

### What Next.js 16 requires

Next.js `serverExternalPackages` already lists `sharp`, `@remotion/bundler`, `@remotion/renderer` — these are excluded from Next's webpack bundle and loaded via native `require`. [VERIFIED: next.config.ts in the project]

For a workspace package (`packages/render-core`), Next.js will try to bundle it unless it is listed in `transpilePackages` or `serverExternalPackages`. [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages]

Options:
1. **`serverExternalPackages: ['@bragfast/render-core']`** — tells Next to `require()` it as-is. Works with CJS output. Correct choice since the package uses Node-specific APIs (Sharp native, fs, path).
2. **`transpilePackages: ['@bragfast/render-core']`** — tells Next to webpack-transpile the source. Works with TypeScript source (no `dist/`). Incorrect here because the package has native deps.

**Recommendation: CJS output + `serverExternalPackages`.** [ASSUMED — based on Next.js docs pattern for native-dep packages]

### Why not ESM

1. `sharp` is CJS-only. An ESM package importing CJS with `import sharp from 'sharp'` works in Node 22 (dynamic interop) but breaks in some bundler contexts. [ASSUMED]
2. `__dirname` requires a shim in ESM. CJS has it natively.
3. Convex `"use node"` actions (`convex/videoRender.ts`) use `require()`-style CJS. A future adapter calling `render-core` from Convex would need CJS. [ASSUMED]
4. No consumer upside: neither the Next app nor the CLI has a reason to prefer ESM for a Node-only package.

### `tsup` configuration

```typescript
// packages/render-core/tsup.config.ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",
  // Copy font assets to dist/fonts/
  async onSuccess() {
    const { copyFileSync, mkdirSync } = await import("fs");
    mkdirSync("dist/fonts", { recursive: true });
    copyFileSync("fonts/PlusJakartaSans-Regular.ttf", "dist/fonts/PlusJakartaSans-Regular.ttf");
    copyFileSync("fonts/PlusJakartaSans-Bold.ttf", "dist/fonts/PlusJakartaSans-Bold.ttf");
  },
  // Mark heavy deps as external — workspace root satisfies them
  external: ["sharp", "satori", "@remotion/bundler", "@remotion/renderer", "remotion", "react", "react-dom"],
});
```

---

## Common Pitfalls

### Pitfall 1: `process.cwd()` in font loading

**What goes wrong:** `loadLocalFonts()` at `src/lib/fonts.ts:24` uses `path.join(process.cwd(), "src/assets/fonts")`. This works when Next.js runs from the repo root. When `render-core` is installed as a package (CLI scenario), `process.cwd()` is whatever directory the user runs `brag` from — font files won't be found, render silently falls back to Google Fonts, first render requires network.

**Why it happens:** `process.cwd()` is the current working directory of the Node process, not the file's location. It is ambiguous in a library.

**How to avoid:** In CJS, `__dirname` is the directory of the compiled file (in `dist/`). Font files copied to `dist/fonts/` are always adjacent to the compiled module.
```typescript
const FONTS_DIR = path.join(__dirname, "fonts");  // reliable
```

**Warning signs:** Render succeeds in dev (cwd = repo root) but fails in test-scripts run from `packages/render-core/` (cwd ≠ repo root). SC#4 catches this.

### Pitfall 2: Sharp installed as `dependency` (not `peerDependency`) in the workspace package

**What goes wrong:** npm may install Sharp twice — once at the root, once in `packages/render-core/node_modules/`. Two instances of a native module that use C++ bindings can cause `Error: Cannot find module '.../sharp/build/Release/sharp.node'` or silent ABI mismatches.

**Why it happens:** npm workspace hoisting is imperfect; adding Sharp to `dependencies` instead of `peerDependencies` triggers a second install.

**How to avoid:** Declare `sharp`, `satori`, `@remotion/*`, `react` as `peerDependencies` in `packages/render-core/package.json`. The workspace root's `dependencies` satisfy them via hoisting.

### Pitfall 3: Remotion entry point path baked into package

**What goes wrong:** If `renderVideo()` contains `path.join(__dirname, "../../src/remotion/index.ts")` (or any hardcoded relative path to the app's Remotion composition), it breaks when:
- The package is installed in a different repo layout (CLI in Phase 2)
- The app is restructured

**Why it happens:** The Remotion composition lives in the app, not the package. This is a natural reflex to make it "just work."

**How to avoid:** Accept `remotionEntryPoint: string` as a parameter on `renderVideo()`. The app route passes `path.join(process.cwd(), "src/remotion/index.ts")` — that's fine; the app knows its own structure. The package stays ignorant.

### Pitfall 4: Satori yoga.wasm not found in CJS bundle

**What goes wrong:** Satori (`type: module`) exports `yoga.wasm` as a separate file. When bundled into a CJS output via tsup, the wasm file may not be found at runtime if tsup doesn't copy it.

**Why it happens:** Satori uses `new URL('./yoga.wasm', import.meta.url)` internally (ESM). When the consuming module is CJS, the URL resolution may fail.

**How to avoid:** Mark `satori` as `external` in tsup config (it IS listed as external above). When external, satori resolves from `node_modules/satori/` where its wasm file is already co-located. Do NOT bundle satori into the package output.

**Warning signs:** `Error: Cannot find module '.../yoga.wasm'` at render time.

### Pitfall 5: Google Fonts disk cache directory not created

**What goes wrong:** D-05 requires caching to `~/.brag/fonts/`. If the directory doesn't exist, `writeFile()` throws and the font falls through to re-fetch on every render (breaking the "works offline after first fetch" guarantee).

**How to avoid:** Call `fs.mkdir(cacheDir, { recursive: true })` before writing. Check cache with `fs.access()` before fetching.

---

## Code Examples

### `renderImage()` core loop (extracted)

```typescript
// Source: src/lib/pipeline/render.ts:159-195 — adapted for Buffer return
// packages/render-core/src/image.ts
import satori from "satori";
import sharp from "sharp";
import { CanvasRenderer } from "./canvas-renderer";
import { injectStaticImages, applySignatureDefaults } from "./pure-helpers";
import { loadFontsForObjects, loadFontsForFamily } from "./fonts";
import type { LocalRenderRequest, ImageRenderResult } from "./types";
import { FORMAT_DIMENSIONS } from "./canvas-types";

export async function renderImage(req: LocalRenderRequest): Promise<ImageRenderResult> {
  const result: ImageRenderResult = { formats: {} };
  for (const formatEntry of req.formats) {
    const { name: format, slides } = formatEntry;
    const { width, height } = FORMAT_DIMENSIONS[format];
    const slideBuffers: Buffer[] = [];
    // Font loading aggregation (same logic as render.ts:130-157)
    // ... (omitted for brevity — see render.ts)
    for (const slide of slides) {
      const { objectData, templateConfig, backgroundImageBase64 } = slide;
      injectStaticImages([objectData], templateConfig.formats[format] ?? templateConfig.formats.landscape, slide.srcMap ?? {});
      applySignatureDefaults(objectData, templateConfig.formats[format] ?? templateConfig.formats.landscape, req.brand);
      const jsx = CanvasRenderer({ config: templateConfig, format, objectData, brand: req.brand, backgroundImageBase64, skipEmpty: true });
      const svg = await satori(jsx, { width, height, fonts });
      const jpg = await sharp(Buffer.from(svg)).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
      slideBuffers.push(jpg);
    }
    result.formats[format] = { slides: slideBuffers, dimensions: `${width}x${height}` };
  }
  return result;
}
```

### Font path fix

```typescript
// Source: src/lib/fonts.ts:24 — one-line change
// Before:
const dir = path.join(process.cwd(), "src/assets/fonts");
// After (CJS __dirname):
const dir = path.join(__dirname, "fonts");
```

### `workspace:*` protocol in `package.json`

```json
// bragfast/package.json (root) — new fields
{
  "workspaces": ["packages/*"],
  ...
}

// packages/render-core/package.json
{
  "name": "@bragfast/render-core",
  "version": "0.1.0",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "sharp": "^0.34.5",
    "satori": "^0.24.0",
    "@remotion/bundler": "4.0.448",
    "@remotion/renderer": "4.0.448",
    "remotion": "4.0.448",
    "react": "^19.0.0"
  }
}

// Next app's package.json — add to dependencies:
{
  "@bragfast/render-core": "workspace:*"
}

// next.config.ts — add to serverExternalPackages:
serverExternalPackages: [
  "@bragfast/render-core",  // add this
  "@remotion/lambda",
  "@remotion/bundler",
  "@remotion/renderer",
  // ... existing
]
```

---

## Runtime State Inventory

> This phase moves and decouples code. It does not rename identifiers or migrate stored data.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no string keys or collection names change | None |
| Live service config | None — no n8n workflows, no Datadog tags reference file paths | None |
| OS-registered state | None | None |
| Secrets/env vars | `NEXT_PUBLIC_CONVEX_URL` used by `ConvexHttpClient` in `render.ts:18` and `render-video.ts:16` — stays app-side; render-core never reads env vars | None — env var stays in app |
| Build artifacts | `src/assets/fonts/` contains the font TTF files; they will be copied to `packages/render-core/fonts/` | Copy files; keep originals in `src/assets/fonts/` for the app's `outputFileTracingIncludes` (Next.js serverless) |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tsup build, test scripts | ✓ | v22.20.0 | — |
| npm | workspace setup | ✓ | 11.10.1 | — |
| `@remotion/renderer` | `renderVideoLocal()` promotion | ✓ | 4.0.448 (installed) | — |
| `@remotion/bundler` | `renderVideoLocal()` promotion | ✓ | 4.0.448 (installed) | — |
| `sharp` | Image render | ✓ | 0.34.5 (installed) | — |
| `satori` | Image render | ✓ | 0.26.0 (installed) | — |
| Headless Chrome | Local video render test | Remotion downloads automatically via `ensureBrowser()` | — | `ensureBrowser()` |
| GitHub Actions | SC#5 cross-platform CI | ✗ (no `.github/workflows/` yet) | — | Create in Wave 0 |

**Missing dependencies with no fallback:** None that block code changes.

**Missing with setup required:**
- GitHub Actions CI workflow does not exist yet — must be created in Wave 0 to satisfy SC#5.

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly `false` in config — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 (root) + tsx 4.22.3 (standalone scripts) |
| Config file | `vitest.config.ts` (root — needs alias update for `@bragfast/render-core`) |
| Quick run command | `npx vitest run packages/render-core` (unit tests) |
| Full suite command | `tsx packages/render-core/scripts/test-image.ts && tsx packages/render-core/scripts/test-video.ts` |

### Success Criteria → Test Map

| SC | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| SC#1 | `renderImage()` produces valid JPEGs for all 3 formats | Integration script | `tsx packages/render-core/scripts/test-image.ts` | ❌ Wave 0 |
| SC#2 | `renderVideo()` produces valid `.mp4` | Integration script | `tsx packages/render-core/scripts/test-video.ts` | ❌ Wave 0 |
| SC#3 | Zero `convex`/`@aws-sdk`/`next` imports | Static analysis | `npm run audit:purity --workspace=packages/render-core` | ❌ Wave 0 |
| SC#4 | Font paths resolve from `__dirname` | Unit test | `npx vitest run packages/render-core/src/__tests__/fonts.test.ts` | ❌ Wave 0 |
| SC#5 | Sharp binaries on macOS arm64 + Linux x64 | CI matrix | GitHub Actions `.github/workflows/render-core-ci.yml` | ❌ Wave 0 |

### SC#1 Test Script Shape

```typescript
// packages/render-core/scripts/test-image.ts — run with tsx from ANY directory (tests SC#4 indirectly)
import path from "path";
import { writeFileSync } from "fs";
import { renderImage } from "../src/index";
import { getDefaultConfig } from "../../src/lib/templates/default-configs";  // app-side, OK in test only

const config = getDefaultConfig("standard-browser")!;
const result = await renderImage({
  formats: [
    { name: "landscape", slides: [{ objectData: { title: { text: "Hello" } }, templateConfig: config }] },
    { name: "square",    slides: [{ objectData: { title: { text: "Hello" } }, templateConfig: config }] },
    { name: "portrait",  slides: [{ objectData: { title: { text: "Hello" } }, templateConfig: config }] },
  ],
  brand: { name: "Test", logoBase64: "", website: "", colors: { background: "#fff", text: "#000", primary: "#f00" } },
});
for (const [fmt, { slides }] of Object.entries(result.formats)) {
  if (!slides[0] || slides[0].length < 1000) throw new Error(`SC#1 FAIL: ${fmt} buffer too small`);
  writeFileSync(`/tmp/test-${fmt}.jpg`, slides[0]);
  console.log(`SC#1 PASS: ${fmt} → ${slides[0].length} bytes`);
}
```

### SC#4 Unit Test Shape

```typescript
// packages/render-core/src/__tests__/fonts.test.ts
import { describe, it, expect } from "vitest";
import { loadFontsForFamily } from "../fonts";
import { execSync } from "child_process";
import path from "path";

describe("font __dirname resolution", () => {
  it("loads Plus Jakarta Sans from package-relative path regardless of cwd", async () => {
    // Change cwd to a directory that does NOT contain src/assets/fonts/
    process.chdir("/tmp");
    const fonts = await loadFontsForFamily("Plus Jakarta Sans");
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts[0].data.byteLength).toBeGreaterThan(0);
  });
});
```

### Sampling Rate

- **Per task commit:** `npm run audit:purity --workspace=packages/render-core`
- **Per wave merge:** full suite — image script + video script + vitest unit tests
- **Phase gate:** All 5 success criteria green (SC#5 via CI matrix) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/render-core/scripts/test-image.ts` — covers SC#1
- [ ] `packages/render-core/scripts/test-video.ts` — covers SC#2
- [ ] `packages/render-core/scripts/audit-purity.js` — covers SC#3
- [ ] `packages/render-core/src/__tests__/fonts.test.ts` — covers SC#4
- [ ] `.github/workflows/render-core-ci.yml` — covers SC#5 (macOS arm64 + Linux x64 matrix)
- [ ] `packages/render-core/package.json` — workspace package manifest
- [ ] `packages/render-core/tsup.config.ts` — build config

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-transpile-modules` npm package | `transpilePackages` in `next.config.js` | Next.js v13.0.0 | Built-in; no extra dep needed [CITED: nextjs.org/docs] |
| `serverComponentsExternalPackages` | `serverExternalPackages` | Next.js v15.0.0 | Renamed; project already uses the new name [CITED: nextjs.org/docs] |
| Remotion Lambda for all renders | `@remotion/renderer.renderMedia()` local | Remotion 4.x | Local render is first-class; `ensureBrowser()` handles Chrome |
| `@remotion/lambda-client` separate package | Lambda client split from renderer | Remotion 4.x | `@remotion/renderer` now handles only local; Lambda is `@remotion/lambda-client` |

**Deprecated/outdated:**
- `next-transpile-modules` — replaced by built-in `transpilePackages`
- `serverComponentsExternalPackages` — renamed to `serverExternalPackages` in Next 15

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@remotion/renderer` is a transitive dep (not direct) — safe to add as explicit peerDep at `4.0.448` | Standard Stack | Low — it's installed; version just needs to be pinned explicitly |
| A2 | npm workspace hoisting prevents duplicate Sharp binary when Sharp is `peerDependency` | Sharp Pitfall | Medium — if npm doesn't hoist, may need `npm dedupe` or explicit root dep; verify with `ls node_modules/@bragfast/render-core/node_modules/sharp` after install |
| A3 | `satori` ESM + CJS consumer is safe when satori is `external` in tsup (no bundling) | ESM/CJS section | Medium — verified satori is `type: module`; the "external" pattern avoids bundler issues but relies on Node's CJS↔ESM interop |
| A4 | Remotion `bundle()` re-bundles from source on every local `renderVideo()` call | Video section | Low — this is the designed behavior; causes slow first render (known) but avoids stale bundle |
| A5 | Adding `@bragfast/render-core` to `serverExternalPackages` is the correct Next.js config | ESM/CJS → Next section | Low — confirmed by docs pattern for native-dep Node packages |

**If A2 or A3 are wrong:** planner should add a Wave 1 integration task that verifies `npm ls sharp --workspace=packages/render-core` shows exactly one Sharp install.

---

## Open Questions

1. **Google Font disk cache cross-user permissions on CI**
   - What we know: D-05 requires `~/.brag/fonts/` for caching.
   - What's unclear: On CI runners, `~` resolves to `/root` or `/home/runner` — fine for tests. But if the test script hits Google Fonts (network available in CI), it may fail on corporate proxies or restricted environments.
   - Recommendation: SC#1 test script should pass a pre-bundled font (Plus Jakarta Sans from the package) as the only font, bypassing Google Fonts entirely. Google Font disk-cache behavior tested separately with a mock.

2. **`process.cwd()` usage in Remotion `bundle()` within test scripts**
   - What we know: `bundle({ entryPoint })` needs the Remotion entry file — currently `src/remotion/index.ts` in the app. The test scripts for SC#2 will call this.
   - What's unclear: The test script lives in `packages/render-core/scripts/` — can it reference the app's Remotion composition?
   - Recommendation: The SC#2 test script is a test-only helper, not shipped code. It may use `path.join(process.cwd(), "src/remotion/index.ts")` from the monorepo root, or the planner can create a minimal standalone composition in `packages/render-core/scripts/fixtures/` for the test.

3. **`tsup` font asset copying vs `files` field**
   - What we know: `tsup`'s `onSuccess` hook can copy TTF files to `dist/fonts/`.
   - What's unclear: Alternatively, the `package.json` `files` field can include `fonts/` directly from the source, meaning `dist/` only has JS/types and fonts resolve from the package root. Either works.
   - Recommendation: Include `fonts/` in the `files` field and use `path.join(__dirname, "../fonts/")` (one level up from `dist/`) to keep font files out of the compilation step. Planner chooses.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/pipeline/render.ts` — direct read; all seam locations and function names
- `src/lib/pipeline/render-video.ts` — direct read; `renderVideoLocal()` at lines 240-275
- `src/lib/pipeline/shared.ts` — direct read; function inventory and purity classification
- `src/lib/fonts.ts` — direct read; `process.cwd()` at line 24
- `src/remotion/Root.tsx`, `VideoCanvasComposition.tsx`, `src/remotion/fonts.ts` — direct read
- `package.json` — direct read; confirmed library versions
- `next.config.ts` — direct read; confirmed `serverExternalPackages` pattern
- `node_modules/satori/package.json` — direct read; `"type": "module"` confirmed
- `node_modules/sharp/package.json` — direct read; `"type": "commonjs"` confirmed
- `node_modules/remotion/package.json` — direct read; CJS + exports map confirmed
- [nextjs.org transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) — confirmed v13+ built-in
- [nextjs.org serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — confirmed rename from v15, `sharp` auto-listed
- [remotion.dev ensureBrowser](https://www.remotion.dev/docs/renderer/ensure-browser) — confirmed API and `onBrowserDownload` callback
- [sharp.pixelplumbing.com/install](https://sharp.pixelplumbing.com/install) — confirmed cross-platform install and `--cpu`/`--os` flags

### Secondary (MEDIUM confidence)
- npm registry: `tsup@8.5.1`, `tsx@4.22.3`, `depcheck@1.4.7` — version and publish date confirmed

### Tertiary (LOW confidence)
- npm workspace hoisting + Sharp peerDependency behavior — based on known npm hoisting rules, not tested with this specific monorepo layout

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm registry and local node_modules
- Architecture (purity boundary): HIGH — verified against actual source files with line references
- Pitfalls: HIGH (process.cwd, satori external) — sourced from actual code; MEDIUM (Sharp peerDep) — npm hoisting behavior
- ESM/CJS recommendation: MEDIUM-HIGH — confirmed satori is ESM, sharp is CJS, Next.js docs confirmed; tsup CJS output is a standard pattern

**Research date:** 2026-05-20
**Valid until:** 2026-08-20 (stable ecosystem; Remotion releases frequently but the API used here — `renderMedia`, `bundle`, `selectComposition`, `ensureBrowser` — is stable since v4.0)
