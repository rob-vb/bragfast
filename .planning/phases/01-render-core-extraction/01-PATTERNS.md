# Phase 1: Render Core Extraction - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 13 new/modified files
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/render-core/src/image.ts` | service | transform (SVG→JPEG) | `src/lib/pipeline/render.ts` lines 159–195 | exact (extracted loop) |
| `packages/render-core/src/video.ts` | service | transform (composition→MP4) | `src/lib/pipeline/render-video.ts` lines 240–275 | exact (promoted fn) |
| `packages/render-core/src/fonts.ts` | utility | file-I/O + request-response | `src/lib/fonts.ts` | exact (one-line path fix) |
| `packages/render-core/src/pure-helpers.ts` | utility | transform | `src/lib/pipeline/shared.ts` lines 146–162, `src/lib/pipeline/signature.ts` | exact (relocation) |
| `packages/render-core/src/types.ts` | model | — | `src/lib/types.ts`, `src/lib/templates/canvas-types.ts` | role-match (subset + new type) |
| `packages/render-core/src/canvas-renderer.tsx` | component | transform | `src/lib/templates/canvas-renderer.tsx` | exact (relocation) |
| `packages/render-core/src/canvas-types.ts` | model | — | `src/lib/templates/canvas-types.ts` | exact (relocation) |
| `packages/render-core/src/index.ts` | utility | — | none (new barrel file) | no analog |
| `packages/render-core/package.json` | config | — | `package.json` (root) | role-match |
| `packages/render-core/tsconfig.json` | config | — | `tsconfig.json` (root) | role-match |
| `packages/render-core/tsup.config.ts` | config | — | none (new build tool) | no analog |
| `packages/render-core/scripts/test-image.ts` | test | transform | `src/lib/pipeline/render.ts` (test call shape) | partial |
| `packages/render-core/scripts/test-video.ts` | test | transform | `src/lib/pipeline/render-video.ts` (local render call shape) | partial |
| `packages/render-core/scripts/audit-purity.js` | utility | — | none (new script) | no analog |
| `packages/render-core/src/__tests__/fonts.test.ts` | test | file-I/O | `src/lib/fonts.ts` | partial |
| `.github/workflows/render-core-ci.yml` | config | — | none (no CI workflows yet) | no analog |
| `next.config.ts` (modified) | config | — | `next.config.ts` (self) | exact |
| `package.json` (modified, root) | config | — | `package.json` (self) | exact |

---

## Pattern Assignments

### `packages/render-core/src/image.ts` (service, transform)

**Analog:** `src/lib/pipeline/render.ts`

**What moves:** Lines 159–195 inside `renderReleaseAsync()` — the Satori/Sharp loop. The outer shell (Convex mutations, R2 upload, `releaseId`, `OUTPUT_LOCAL` branches) does NOT move.

**Imports pattern** — copy from `render.ts` lines 1–14, strip the app-only imports:
```typescript
// KEEP these imports in image.ts:
import satori from "satori";
import sharp from "sharp";
import { CanvasRenderer } from "./canvas-renderer";
import type { FormatKey } from "./canvas-types";
import { loadFontsForFamily, loadFontsForObjects } from "./fonts";
import type { LocalRenderRequest, ImageRenderResult } from "./types";
import { FORMAT_DIMENSIONS } from "./canvas-types";
import { injectStaticImages, applySignatureDefaults } from "./pure-helpers";

// REMOVE (app-only — never import in render-core):
// import { ConvexHttpClient } from "convex/browser";
// import { api } from "@convex/_generated/api";
// import { uploadImage } from "../storage/r2";
// import { ReleaseRequest, calculateCredits } from "../types";
// import { resolveTemplate, resolveAllTemplates, resolveBrand, buildSlideDataMaps, prefetchStaticImages } from "./shared";
// import { collectUploadKeys, cleanupUploads } from "./cleanup";
```

**Core render loop** — extracted from `render.ts` lines 104–195, stripping I/O shell:
```typescript
// render.ts lines 104–107 (format loop setup) — keep as-is:
for (const formatEntry of req.formats) {
  const format = formatEntry.name;
  const { width, height } = FORMAT_DIMENSIONS[format];
  const slideBuffers: Buffer[] = [];

// render.ts lines 112–126 (normalizeDataUri + inject/signature per slide):
  for (const dataMap of slideDataMaps) {
    for (const entry of Object.values(dataMap)) {
      if (entry.imageBase64) {
        entry.imageBase64 = await normalizeDataUri(entry.imageBase64);
      }
    }
  }
  formatEntry.slides.forEach((slide, idx) => {
    const cfg = resolveSlideConfig(slide);
    const layout = cfg.formats[format as FormatKey] ?? cfg.formats.landscape;
    injectStaticImages([slideDataMaps[idx]], layout, aggregateSrcMap);
    applySignatureDefaults(slideDataMaps[idx], layout, brand);
  });

// render.ts lines 160–176 (Satori → Sharp → Buffer) — the pure core:
  const jsx = CanvasRenderer({
    config: slideConfig,
    format: format as FormatKey,
    objectData: slideDataMaps[i],
    brand,
    backgroundImageBase64: bgPerTemplate.get(slideTemplateName),
    skipEmpty: true,
  });
  const svg = await satori(jsx, { width, height, fonts });
  const jpg = await sharp(Buffer.from(svg))
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85 })
    .toBuffer();
  // In render-core: push to slideBuffers[], NOT writeFile/uploadImage
  slideBuffers.push(jpg);
}
result.formats[format] = { slides: slideBuffers, dimensions: `${width}x${height}` };
```

**Output — return Buffer, not URL** (`render.ts` lines 178–188 are the disk/R2 branch to DELETE):
```typescript
// render.ts lines 178–188 — this entire block is REMOVED in render-core:
// if (OUTPUT_LOCAL) { ... writeFile ... } else { ... uploadImage ... }
// Replace with:
slideBuffers.push(jpg);  // already shown above
// Return:
return result; // ImageRenderResult: { formats: { [name]: { slides: Buffer[], dimensions: string } } }
```

**normalizeDataUri** — `render.ts` lines 269–275 — promoted from private to exported helper in `pure-helpers.ts`:
```typescript
// render.ts lines 269-275 — move verbatim to pure-helpers.ts as named export:
export async function normalizeDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return dataUri;
  const raw = Buffer.from(match[1], "base64");
  const png = await sharp(raw).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
```

---

### `packages/render-core/src/video.ts` (service, transform)

**Analog:** `src/lib/pipeline/render-video.ts` lines 240–275

**What moves:** The `renderVideoLocal()` private function becomes the exported `renderVideo()`. The outer shell (`renderVideoAsync`, Convex mutations, R2 upload, `createVideoRelease`) does NOT move.

**Current `renderVideoLocal` signature** (`render-video.ts` lines 240–244):
```typescript
async function renderVideoLocal(
  compositionId: string,
  inputProps: Record<string, unknown>,
  outputPath: string   // currently writes to caller-specified path
)
```

**Promoted signature — accepts entry point as parameter, returns Buffer** (per D-06):
```typescript
// render-video.ts lines 240-275 — promoted to exported fn; change entryPoint + return Buffer:
export async function renderVideo(req: LocalVideoRenderRequest): Promise<VideoRenderResult> {
  // entryPoint comes from req, NOT process.cwd() (Pitfall 3 in RESEARCH.md):
  const entryPoint = req.remotionEntryPoint;  // was: path.join(process.cwd(), "src/remotion/index.ts")

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition, ensureBrowser } = await import("@remotion/renderer");

  // D-05 / RESEARCH §Chromium download: call ensureBrowser first
  await ensureBrowser({
    onBrowserDownload: req.onBrowserDownload,
  });

  console.log(`[LOCAL] Bundling Remotion project...`);
  const bundleLocation = await bundle({ entryPoint });

  console.log(`[LOCAL] Selecting composition: ${req.compositionId}`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: req.compositionId,
    inputProps: req.inputProps,
  });

  // Write to os.tmpdir(), read Buffer, unlink (D-06: core never writes to caller paths)
  const tmpFile = path.join(os.tmpdir(), `render-core-${crypto.randomUUID()}.mp4`);
  console.log(`[LOCAL] Rendering ${req.compositionId} → tmpFile`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    crf: 28,                    // render-video.ts line 264
    x264Preset: "slow",         // render-video.ts line 265
    encodingMaxRate: "5M",      // render-video.ts line 266
    encodingBufferSize: "10M",  // render-video.ts line 267
    muted: true,                // render-video.ts line 268
    outputLocation: tmpFile,
    inputProps: req.inputProps,
  });
  const buffer = await fs.readFile(tmpFile);
  await fs.unlink(tmpFile);
  return { buffer, compositionId: req.compositionId };
}
```

**Imports for video.ts** — copy from `render-video.ts` lines 1–13, strip app-only:
```typescript
import crypto from "crypto";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
// Dynamic imports: @remotion/bundler and @remotion/renderer (same pattern as render-video.ts:245-246)
// REMOVE: import { ConvexHttpClient } from "convex/browser";
// REMOVE: import { api } from "@convex/_generated/api";
// REMOVE: import { renderVideo } from "../video/lambda";
// REMOVE: import { uploadImage } from "../storage/r2";
```

---

### `packages/render-core/src/fonts.ts` (utility, file-I/O + request-response)

**Analog:** `src/lib/fonts.ts`

**What moves:** Entire file — relocate verbatim with ONE line changed and disk-cache tier added (D-04, D-05).

**The single critical change** — `fonts.ts` line 24:
```typescript
// BEFORE (src/lib/fonts.ts line 24):
const dir = path.join(process.cwd(), "src/assets/fonts");

// AFTER (packages/render-core/src/fonts.ts):
const dir = path.join(__dirname, "fonts");
// __dirname in CJS output = dist/ directory; fonts copied to dist/fonts/ by tsup
```

**Full `loadLocalFonts` function** (`fonts.ts` lines 21–37) — copy verbatim with the above fix:
```typescript
function loadLocalFonts(): FontConfig[] {
  if (fontCache.has(LOCAL_FAMILY)) return fontCache.get(LOCAL_FAMILY)!;
  try {
    const dir = path.join(__dirname, "fonts");  // CHANGED: was process.cwd() + "src/assets/fonts"
    const regular = readFileSync(path.join(dir, "PlusJakartaSans-Regular.ttf"));
    const bold = readFileSync(path.join(dir, "PlusJakartaSans-Bold.ttf"));
    const fonts: FontConfig[] = [
      { name: LOCAL_FAMILY, data: regular.buffer as ArrayBuffer, weight: 400, style: "normal" },
      { name: LOCAL_FAMILY, data: bold.buffer as ArrayBuffer, weight: 700, style: "normal" },
    ];
    fontCache.set(LOCAL_FAMILY, fonts);
    return fonts;
  } catch {
    return [];
  }
}
```

**Disk-cache tier to ADD** — new function inserted between `fetchGoogleFontBuffer` and `loadGoogleFont` (D-05):
```typescript
const FONT_DISK_CACHE_DIR = path.join(os.homedir(), ".brag", "fonts");

async function readFontFromDisk(family: string, weight: number): Promise<ArrayBuffer | null> {
  const file = path.join(FONT_DISK_CACHE_DIR, `${family.replace(/\s+/g, "_")}-${weight}.ttf`);
  try {
    const buf = await fs.readFile(file);
    return buf.buffer as ArrayBuffer;
  } catch {
    return null;
  }
}

async function writeFontToDisk(family: string, weight: number, data: ArrayBuffer): Promise<void> {
  await fs.mkdir(FONT_DISK_CACHE_DIR, { recursive: true });
  const file = path.join(FONT_DISK_CACHE_DIR, `${family.replace(/\s+/g, "_")}-${weight}.ttf`);
  await fs.writeFile(file, Buffer.from(data));
}
```

**Updated `fetchGoogleFontBuffer`** — check disk cache before fetching (wraps existing function):
```typescript
// Existing fetchGoogleFontBuffer (fonts.ts lines 46-57) becomes the inner fetch.
// Outer wrapper checks disk first:
async function fetchGoogleFontBufferCached(family: string, weight: number): Promise<ArrayBuffer | null> {
  const cached = await readFontFromDisk(family, weight);
  if (cached) return cached;
  const buf = await fetchGoogleFontBuffer(family, weight);  // existing fn
  if (buf) await writeFontToDisk(family, weight, buf);
  return buf;
}
// Replace calls to fetchGoogleFontBuffer() with fetchGoogleFontBufferCached() throughout fonts.ts
```

**Exports** — all public exports from `fonts.ts` carry over unchanged:
```typescript
export { FONT_CATALOG, VALID_FONTS } from "./font-catalog";  // remove if font-catalog doesn't move to core
export type { FontConfig };
export { loadFontsForFamily, loadFonts, loadFontsForObjects };
```

---

### `packages/render-core/src/pure-helpers.ts` (utility, transform)

**Analogs:** `src/lib/pipeline/shared.ts` lines 146–162, `src/lib/pipeline/signature.ts` full file, `render.ts` lines 269–275

**What moves:** Three functions relocated verbatim + one promoted.

**`injectStaticImages`** — `shared.ts` lines 146–160 — copy verbatim:
```typescript
// shared.ts lines 146-160
export function injectStaticImages(
  slideDataMaps: ObjectDataMap[],
  formatLayout: FormatLayout,
  srcMap: Record<string, string>
): void {
  for (const obj of formatLayout.objects) {
    if (obj.type === "visual" && obj.src && srcMap[obj.src]) {
      for (const dataMap of slideDataMaps) {
        if (!dataMap[obj.id]?.imageBase64) {
          dataMap[obj.id] = { ...dataMap[obj.id], imageBase64: srcMap[obj.src] };
        }
      }
    }
  }
}
```

**`applySignatureDefaults`** — `signature.ts` lines 8–20 — copy verbatim:
```typescript
// signature.ts lines 8-20
export function applySignatureDefaults(
  dataMap: ObjectDataMap,
  layout: FormatLayout,
  brand: Brand,
): void {
  const ids = new Set(layout.objects.map((o) => o.id));
  if (ids.has("signature_avatar") && !dataMap.signature_avatar?.imageBase64 && brand.logoBase64) {
    dataMap.signature_avatar = { ...dataMap.signature_avatar, imageBase64: brand.logoBase64 };
  }
  if (ids.has("signature_name") && !dataMap.signature_name?.text && brand.name) {
    dataMap.signature_name = { ...dataMap.signature_name, text: brand.name };
  }
}
```

**`normalizeDataUri`** — `render.ts` lines 269–275 — promote from private to named export:
```typescript
// render.ts lines 269-275 (was private `async function normalizeDataUri`)
export async function normalizeDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return dataUri;
  const raw = Buffer.from(match[1], "base64");
  const png = await sharp(raw).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
```

**Imports for pure-helpers.ts:**
```typescript
import sharp from "sharp";
import type { FormatLayout } from "./canvas-types";
import type { ObjectDataMap } from "./canvas-renderer";
import type { Brand } from "./types";
```

---

### `packages/render-core/src/types.ts` (model)

**Analogs:** `src/lib/types.ts` (lines 1–16, 110–114), `src/lib/templates/canvas-types.ts`

**What moves:** Pure type definitions and `FORMAT_DIMENSIONS` constant. Credit logic and app request types stay.

**Types that move verbatim** — from `types.ts` lines 1–16:
```typescript
// types.ts lines 3-16 — move as-is:
export interface BrandColors {
  background: string
  text: string
  primary: string
}
export interface Brand {
  name: string
  logoBase64: string
  website: string
  colors: BrandColors
  font_family?: string
}
```

**`FORMAT_DIMENSIONS`** — from `types.ts` lines 110–114:
```typescript
// types.ts lines 110-114 — move as-is:
export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
}
```

**`AnimationPreset`** — from `types.ts` lines 40–43 — move (used by `CanvasTemplateConfig`):
```typescript
export type AnimationPreset = 'showcase' | '3d-tilt-angles' | 'simple-fade'
```

**New types — `LocalRenderRequest` and result shapes** (per D-03, RESEARCH §Pattern 3):
```typescript
// New in render-core — not in any existing file:
export interface LocalRenderSlide {
  objectData: ObjectDataMap;
  templateConfig: CanvasTemplateConfig;
  backgroundImageBase64?: string;
  srcMap?: Record<string, string>;  // needed by injectStaticImages
}
export interface LocalRenderFormat {
  name: "landscape" | "square" | "portrait";
  slides: LocalRenderSlide[];
}
export interface LocalRenderRequest {
  formats: LocalRenderFormat[];
  brand: Brand;
}
export interface ImageRenderResult {
  formats: Record<string, {
    slides: Buffer[];
    dimensions: string;
  }>;
}
export interface VideoRenderResult {
  buffer: Buffer;
  compositionId: string;
}
export interface LocalVideoRenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  remotionEntryPoint: string;  // absolute path — caller provides; never hardcoded in core
  onBrowserDownload?: Parameters<typeof ensureBrowser>[0]["onBrowserDownload"];
}
```

**Types that STAY in app** — do NOT re-export from render-core:
```typescript
// types.ts lines 74-130 — stays app-side:
// ReleaseRequest (has userId, webhook_url, brand_id)
// ReleaseResult
// calculateCredits
// FormatEntry, ObjectModification (these contain API-contract shapes)
```

---

### `packages/render-core/src/canvas-renderer.tsx` (component, transform)

**Analog:** `src/lib/templates/canvas-renderer.tsx`

**What moves:** Entire file — relocate verbatim. No logic changes. All imports are internal to render-core.

**Imports block** (`canvas-renderer.tsx` lines 1–8) — update paths only:
```typescript
// BEFORE (src/lib/templates/canvas-renderer.tsx lines 1-8):
import type { CanvasTemplateConfig, TemplateObject, FormatKey, ColorRole } from "./canvas-types";
import type { Brand } from "../types";
import { FORMAT_DIMENSIONS, getObjectBorderRadius, resolveTextColor } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";
import { resolveBackground } from "./mesh-gradient";

// AFTER (packages/render-core/src/canvas-renderer.tsx):
// Same, but paths adjust to render-core's flat src/ layout.
// BrowserFrame, MobileFrame, and mesh-gradient must also move to render-core/src/.
```

**`ObjectDataMap` interface** (`canvas-renderer.tsx` lines 59–72) — this is the key shared type:
```typescript
// canvas-renderer.tsx lines 59-72 — relocate verbatim:
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    videoUrl?: string;
    fontFamily?: string;
    fontWeight?: number;
    color?: string;
    visualFrame?: string;
    visualFrameColor?: string;
    anchorX?: string;
    anchorY?: string;
  };
}
```

**`CanvasRenderer` function signature** (`canvas-renderer.tsx` lines 87–104):
```typescript
// canvas-renderer.tsx lines 74-104 — relocate verbatim:
interface CanvasRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  objectData: ObjectDataMap;
  brand: Brand;
  backgroundImageBase64?: string;
  skipEmpty?: boolean;
  showPlaceholders?: boolean;
}

export function CanvasRenderer({ config, format, objectData, brand, backgroundImageBase64, skipEmpty, showPlaceholders }: CanvasRendererProps) {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format] ?? config.formats.landscape;
  const colors = brand.colors ?? config.colors;
  // ... rest is pure JSX, relocates unchanged
}
```

---

### `packages/render-core/src/canvas-types.ts` (model)

**Analog:** `src/lib/templates/canvas-types.ts`

**What moves:** Entire file — relocate verbatim. No changes needed.

**Key exports to confirm are present** (`canvas-types.ts` lines 1–175):
```typescript
// All of these export from render-core's canvas-types.ts:
export type { ObjectType, ColorRole, TextAlign, VerticalAlign, VisualFrame, ObjectFit, AnchorX, AnchorY, FormatKey }
export type { TemplateObject, FormatLayout, BackgroundMode, BackgroundConfig, CanvasTemplateConfig }
export { resolveTextColor, slugify, uniqueSlug, migrateConfig, getObjectBorderRadius }
// FORMAT_DIMENSIONS moves to types.ts (also re-exported here for convenience)
```

**`CanvasTemplateConfig` interface** (lines 163–174) — the central pure config type:
```typescript
// canvas-types.ts lines 163-174 — relocate verbatim:
export interface CanvasTemplateConfig {
  version: 2;
  colors: {
    background: string;
    text: string;
    primary: string;
  };
  brandId?: string;
  animation_preset?: AnimationPreset;
  background?: BackgroundConfig;
  formats: Record<"landscape" | "square" | "portrait", FormatLayout>;
}
```

---

### `packages/render-core/src/index.ts` (barrel, no analog)

**No existing analog** — new public API barrel.

**Pattern:** Follow the app's own barrel pattern (each lib file exports named symbols). Expose only the public contract:
```typescript
// packages/render-core/src/index.ts
export { renderImage } from "./image";
export { renderVideo } from "./video";
export type { LocalRenderRequest, LocalRenderFormat, LocalRenderSlide, ImageRenderResult } from "./types";
export type { LocalVideoRenderRequest, VideoRenderResult } from "./types";
export type { Brand, BrandColors, AnimationPreset } from "./types";
export type { CanvasTemplateConfig, FormatLayout, TemplateObject, FormatKey } from "./canvas-types";
export type { ObjectDataMap } from "./canvas-renderer";
export { FORMAT_DIMENSIONS, migrateConfig } from "./canvas-types";
export { injectStaticImages, applySignatureDefaults, normalizeDataUri } from "./pure-helpers";
export { loadFontsForFamily, loadFontsForObjects } from "./fonts";
export type { FontConfig } from "./fonts";
```

---

### `packages/render-core/package.json` (config)

**Analog:** `package.json` (root) — for dep version pins and script conventions.

**Pattern** — from root `package.json` + RESEARCH.md §workspace:
```json
{
  "name": "@bragfast/render-core",
  "version": "0.1.0",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "fonts"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "audit:purity": "node scripts/audit-purity.js"
  },
  "peerDependencies": {
    "sharp": "^0.34.5",
    "satori": "^0.24.1",
    "@remotion/bundler": "4.0.448",
    "@remotion/renderer": "4.0.448",
    "remotion": "4.0.448",
    "react": "19.2.3"
  },
  "devDependencies": {
    "tsup": "8.5.1",
    "tsx": "4.22.3",
    "typescript": "5.9.3"
  }
}
```

**Version pins** come directly from root `package.json`:
- `sharp`: `^0.34.5` (root line 51)
- `satori`: `^0.24.1` (root line 49)
- `@remotion/bundler`: `4.0.448` (root line 28)
- `remotion`: `4.0.448` (root line 47)
- `react`: `19.2.3` (root line 44)

---

### `packages/render-core/tsconfig.json` (config)

**Analog:** `tsconfig.json` (root)

**Pattern** — extends root, overrides for CJS + emit:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "scripts"]
}
```

Note: root `tsconfig.json` uses `"module": "esnext"` and `"moduleResolution": "bundler"` (line 8-9) — both must be overridden here for CJS output.

---

### `packages/render-core/tsup.config.ts` (config, no analog)

**No existing analog** — new build tool config. Pattern from RESEARCH.md §tsup configuration:

```typescript
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",
  // Mark heavy peer deps as external — workspace root satisfies them
  external: ["sharp", "satori", "@remotion/bundler", "@remotion/renderer", "remotion", "react", "react-dom"],
  async onSuccess() {
    const { copyFileSync, mkdirSync } = await import("fs");
    mkdirSync("dist/fonts", { recursive: true });
    copyFileSync("fonts/PlusJakartaSans-Regular.ttf", "dist/fonts/PlusJakartaSans-Regular.ttf");
    copyFileSync("fonts/PlusJakartaSans-Bold.ttf", "dist/fonts/PlusJakartaSans-Bold.ttf");
  },
});
```

---

### `packages/render-core/scripts/test-image.ts` (test, transform)

**Analog:** RESEARCH.md §SC#1 Test Script Shape + `render.ts` call shape

**Pattern** — matches how `renderReleaseAsync` is called (minus Convex inputs), run with `tsx`:
```typescript
// Run with: tsx packages/render-core/scripts/test-image.ts (from repo root)
// Must succeed from ANY cwd (validates SC#4 indirectly)
import path from "path";
import { writeFileSync } from "fs";
import { renderImage } from "../src/index";
// Import template config from app side (test-only dependency — acceptable):
import { getDefaultConfig } from "../../src/lib/templates/default-configs";

// Minimal brand: matches Brand interface in types.ts lines 10-16
const brand = {
  name: "Test Brand",
  logoBase64: "",
  website: "",
  colors: { background: "#ffffff", text: "#000000", primary: "#ff0000" },
};
const config = getDefaultConfig("standard-browser")!;
const objectData = { title: { text: "Hello render-core SC#1" } };

const result = await renderImage({
  formats: [
    { name: "landscape", slides: [{ objectData, templateConfig: config }] },
    { name: "square",    slides: [{ objectData, templateConfig: config }] },
    { name: "portrait",  slides: [{ objectData, templateConfig: config }] },
  ],
  brand,
});

for (const [fmt, { slides, dimensions }] of Object.entries(result.formats)) {
  if (!slides[0] || slides[0].length < 1000) throw new Error(`SC#1 FAIL: ${fmt} buffer too small`);
  writeFileSync(`/tmp/test-render-core-${fmt}.jpg`, slides[0]);
  console.log(`SC#1 PASS: ${fmt} → ${slides[0].length} bytes (${dimensions})`);
}
```

---

### `packages/render-core/scripts/test-video.ts` (test, transform)

**Analog:** `render-video.ts` lines 240–275 (the local render call shape)

**Key seam** — must pass `remotionEntryPoint` (app repo's composition), per RESEARCH §Open Question 2:
```typescript
// Run with: tsx packages/render-core/scripts/test-video.ts (from repo root)
import path from "path";
import { writeFileSync } from "fs";
import { renderVideo } from "../src/index";

// The Remotion composition lives in the app repo — pass absolute path:
const remotionEntryPoint = path.join(process.cwd(), "src/remotion/index.ts");

// inputProps shape mirrors render-video.ts lines 139-152:
const inputProps = {
  config: /* minimal CanvasTemplateConfig */,
  format: "landscape",
  slides: [{ title: { text: "Hello video SC#2" } }],
  brand: { name: "Test", logoBase64: "", website: "", colors: { background: "#fff", text: "#000", primary: "#f00" }, font_family: "Plus Jakarta Sans" },
  slideDuration: 4,
  slideDurations: [4],
};

const result = await renderVideo({
  compositionId: "landscape",
  inputProps,
  remotionEntryPoint,
});

if (!result.buffer || result.buffer.length < 10000) throw new Error("SC#2 FAIL: MP4 buffer too small");
writeFileSync("/tmp/test-render-core-video.mp4", result.buffer);
console.log(`SC#2 PASS: landscape video → ${result.buffer.length} bytes`);
```

---

### `packages/render-core/scripts/audit-purity.js` (utility, no analog)

**No existing analog** — per RESEARCH.md §Dependency Audit (Tier 1 static grep scan):

```javascript
#!/usr/bin/env node
// packages/render-core/scripts/audit-purity.js
const { execSync } = require("child_process");
const path = require("path");
const srcDir = path.join(__dirname, "../src");
const forbidden = ["convex", "@aws-sdk", "next"];
let failed = false;
for (const pkg of forbidden) {
  try {
    const result = execSync(
      `grep -r --include="*.ts" --include="*.tsx" -l "${pkg}" "${srcDir}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (result) {
      console.error(`FAIL: "${pkg}" found in:\n${result}`);
      failed = true;
    }
  } catch {
    // grep exits 1 when no matches — that's the success case
  }
}
if (failed) process.exit(1);
console.log("PASS: no forbidden imports (convex, @aws-sdk, next)");
```

---

### `packages/render-core/src/__tests__/fonts.test.ts` (test, file-I/O)

**Analog:** `src/lib/fonts.ts` (testing the fix to line 24)

**Pattern** — from RESEARCH.md §SC#4 Unit Test Shape; uses vitest (root config):
```typescript
import { describe, it, expect, afterEach } from "vitest";
import { loadFontsForFamily } from "../fonts";

describe("font __dirname resolution", () => {
  const originalCwd = process.cwd();
  afterEach(() => process.chdir(originalCwd));

  it("loads Plus Jakarta Sans regardless of cwd", async () => {
    process.chdir("/tmp");  // simulate wrong cwd (SC#4 guard)
    const fonts = await loadFontsForFamily("Plus Jakarta Sans");
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts[0].data.byteLength).toBeGreaterThan(0);
  });
});
```

---

### `next.config.ts` (modified)

**Analog:** `next.config.ts` (self) — add one entry to `serverExternalPackages`.

**Existing pattern** (`next.config.ts` lines 4–11):
```typescript
serverExternalPackages: [
  "@remotion/lambda",
  "@remotion/bundler",
  "@remotion/renderer",
  "@remotion/lambda-client",
  "@remotion/serverless-client",
  "sharp",
],
```

**Change — add `@bragfast/render-core`:**
```typescript
serverExternalPackages: [
  "@bragfast/render-core",   // ADD: native deps (Sharp, Remotion) inside; must not be bundled
  "@remotion/lambda",
  "@remotion/bundler",
  "@remotion/renderer",
  "@remotion/lambda-client",
  "@remotion/serverless-client",
  "sharp",
],
```

Also update `outputFileTracingIncludes` — fonts now live in render-core's dist, but the app should keep its own copy for the existing API routes during the transition:
```typescript
outputFileTracingIncludes: {
  "/api/**": [
    "./src/assets/fonts/**/*",            // existing — keep
    "./packages/render-core/fonts/**/*",  // ADD: render-core bundled fonts
  ],
},
```

---

### `package.json` (root, modified)

**Analog:** `package.json` (self) — add workspace fields and render-core dep.

**Changes** — two new fields:
```json
{
  "workspaces": ["packages/*"],   // ADD: enable npm workspace

  "dependencies": {
    "@bragfast/render-core": "workspace:*",  // ADD: consume local package
    // ... existing deps unchanged
  }
}
```

---

## Shared Patterns

### Satori + Sharp Pipeline
**Source:** `src/lib/pipeline/render.ts` lines 172–176
**Apply to:** `packages/render-core/src/image.ts` (renderImage loop)
```typescript
const svg = await satori(jsx, { width, height, fonts });
const jpg = await sharp(Buffer.from(svg))
  .flatten({ background: '#ffffff' })
  .jpeg({ quality: 85 })
  .toBuffer();
```

### Dynamic Remotion Imports
**Source:** `src/lib/pipeline/render-video.ts` lines 245–246
**Apply to:** `packages/render-core/src/video.ts`
```typescript
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
// Use dynamic import (not top-level) — Remotion packages are CJS with side effects
```

### Error Pattern in Render Functions
**Source:** `src/lib/pipeline/render.ts` lines 208–235 (outer catch block)
**Apply to:** `packages/render-core/src/image.ts`, `packages/render-core/src/video.ts`
**Note:** render-core does NOT do Convex mutations or credit refunds on error. It re-throws:
```typescript
// Caller (app route) wraps renderImage() in try/catch and handles:
//   - convex.mutation(api.releases.markFailed)
//   - convex.mutation(api.userProfiles.refund)
//   - webhook delivery
// render-core simply throws on error:
try {
  // ... render loop
} catch (err) {
  throw err; // let caller handle Convex/R2/credit concerns
}
```

### Font Aggregation Pattern
**Source:** `src/lib/pipeline/render.ts` lines 129–157
**Apply to:** `packages/render-core/src/image.ts`
```typescript
// Per-format font aggregation across unique templates:
const seenLayouts = new Set<string>();
let fonts: Awaited<ReturnType<typeof loadFontsForObjects>> = [];
for (const slide of formatEntry.slides) {
  const layout = slide.templateConfig.formats[format as FormatKey] ?? slide.templateConfig.formats.landscape;
  const key = /* unique template key */;
  if (seenLayouts.has(key)) continue;
  seenLayouts.add(key);
  const layoutFonts = await loadFontsForObjects(layout.objects);
  fonts = [...fonts, ...layoutFonts];
}
if (req.brand.font_family) {
  const brandFonts = await loadFontsForFamily(req.brand.font_family);
  fonts = [...fonts, ...brandFonts];
}
```

### In-Process fontCache (Keep As-Is)
**Source:** `src/lib/fonts.ts` line 18
**Apply to:** `packages/render-core/src/fonts.ts`
```typescript
const fontCache = new Map<string, FontConfig[]>();
// Keep: fast path for repeat renders in the same process (CLI batch renders benefit)
// Disk cache (D-05) sits below this — check in-process first, then disk, then network
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/render-core/src/index.ts` | barrel | — | No barrel pattern exists for a standalone package; follows existing lib file conventions |
| `packages/render-core/tsup.config.ts` | build config | — | No tsup configuration exists in the project yet |
| `packages/render-core/scripts/audit-purity.js` | utility | — | No dependency audit scripts exist |
| `.github/workflows/render-core-ci.yml` | CI config | — | No GitHub Actions workflows exist in repo |

---

## Metadata

**Analog search scope:** `src/lib/pipeline/`, `src/lib/templates/`, `src/lib/fonts.ts`, `src/lib/types.ts`, `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`
**Files read:** 13 source files
**Pattern extraction date:** 2026-05-20
