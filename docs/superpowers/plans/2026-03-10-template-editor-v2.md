# Template Editor v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Figma-like canvas template editor with absolute positioning, replacing the block-based config model.

**Architecture:** Three-panel editor (left sidebar, canvas, right sidebar) using React state via `useReducer` with undo/redo. Templates store per-format object layouts with absolute x/y/w/h positioning. Satori renders positioned objects to PNG. Convex schema updated to support new config shape alongside legacy.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui, Convex, Satori, Sharp

---

## File Structure

### New files

```
src/lib/templates/canvas-types.ts          — New TemplateObject, TemplateConfig, FormatLayout types
src/lib/templates/canvas-renderer.tsx       — Absolute-position Satori renderer
src/lib/templates/canvas-defaults.ts        — Classic/split/hero as new canvas configs

src/components/editor/template-editor.tsx   — Main orchestrator, context provider
src/components/editor/editor-context.tsx     — React context + useReducer + undo/redo
src/components/editor/editor-left-sidebar.tsx
src/components/editor/editor-canvas.tsx
src/components/editor/editor-right-sidebar.tsx
src/components/editor/canvas-object.tsx      — Individual object on canvas (drag/resize/select)
src/components/editor/selection-handles.tsx   — 8-handle selection UI
src/components/editor/format-switcher.tsx
src/components/editor/brand-color-section.tsx
src/components/editor/object-layer-list.tsx
src/components/editor/add-object-button.tsx
src/components/editor/common-properties.tsx
src/components/editor/text-properties.tsx
src/components/editor/image-properties.tsx
src/components/editor/font-data.ts           — Re-exports FONT_CATALOG from src/lib/fonts.ts for editor UI

src/app/(admin)/admin/templates/[id]/edit/page.tsx  — Editor page (server component)
src/app/(admin)/admin/templates/[id]/edit/layout.tsx — Skip admin chrome
```

### Modified files

```
convex/schema.ts                            — Add v2 config validator (union with legacy)
convex/templates.ts                         — Accept v2 config in create/update/clone/seedDefaults
src/lib/fonts.ts                            — Multi-font loading (scan objects, fetch per weight)
src/lib/pipeline/render.ts                  — Support v2 config via canvas-renderer
src/lib/templates/default-configs.ts        — Add v2 config lookup
src/app/api/v1/templates/route.ts           — Accept v2 config in POST
src/app/api/v1/templates/[id]/route.ts      — Accept v2 config in PATCH
src/app/api/v1/templates/[id]/preview/route.ts — Use canvas-renderer for v2 templates
```

---

## Chunk 1: Data Model & Types

### Task 1: Canvas type definitions

**Files:**
- Create: `src/lib/templates/canvas-types.ts`

- [ ] **Step 1: Create canvas-types.ts with all type definitions**

```typescript
// src/lib/templates/canvas-types.ts
export type ObjectType = "title" | "description" | "image" | "logo" | "productName";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";
export type DeviceOption = "browser" | "mobile" | "none";
export type ObjectFit = "cover" | "contain";
export type FormatKey = "landscape" | "square" | "portrait";

export interface TemplateObject {
  id: string;
  type: ObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;

  // Text-only
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;

  // Image-only
  device?: DeviceOption;
  objectFit?: ObjectFit;

  // Editor-only
  previewText?: string;
}

export interface FormatLayout {
  objects: TemplateObject[];
}

export interface CanvasTemplateConfig {
  version: 2;
  colors: {
    background: string;
    text: string;
    primary: string;
  };
  brandId?: string;
  formats: Record<FormatKey, FormatLayout>;
}

export const FORMAT_DIMENSIONS: Record<FormatKey, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/canvas-types.ts
git commit -m "feat: add canvas template type definitions"
```

### Task 2: Default canvas template configs

**Files:**
- Create: `src/lib/templates/canvas-defaults.ts`

- [ ] **Step 1: Create canvas-defaults.ts with classic/split/hero positioned layouts**

Each default template needs objects positioned for all 3 formats. The positions should approximate the current visual output of the block-based templates.

```typescript
// src/lib/templates/canvas-defaults.ts
import type { CanvasTemplateConfig } from "./canvas-types";

// Helper to create an object with shared style props across formats
function textObj(id: string, type: "title" | "description" | "productName", overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: type as const,
    name: id,
    opacity: 1,
    zIndex: 0,
    fontFamily: "Plus Jakarta Sans",
    fontWeight: type === "title" ? 700 : 400,
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
    ...overrides,
  };
}

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  classic: {
    name: "Classic",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("logo", "productName"), x: 40, y: 24, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 40, y: 88, width: 1120, height: 380, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 40, y: 488, width: 1120, height: 80, fontSize: 36, zIndex: 2 },
            { ...textObj("description", "description"), x: 40, y: 576, width: 1120, height: 60, fontSize: 18, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 720, width: 984, height: 120, fontSize: 48, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 856, width: 984, height: 80, fontSize: 22, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 750, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 876, width: 984, height: 150, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 1044, width: 984, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
      },
    },
  },
  split: {
    name: "Split",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("logo", "productName"), x: 40, y: 24, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { ...textObj("title", "title"), x: 40, y: 200, width: 540, height: 200, fontSize: 36, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 620, y: 88, width: 540, height: 480, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("description", "description"), x: 40, y: 580, width: 540, height: 60, fontSize: 18, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { ...textObj("title", "title"), x: 48, y: 200, width: 480, height: 300, fontSize: 42, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 476, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("description", "description"), x: 48, y: 880, width: 984, height: 80, fontSize: 22, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 726, width: 984, height: 200, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 944, width: 984, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
      },
    },
  },
  hero: {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 100, y: 400, width: 1000, height: 120, fontSize: 48, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 200, y: 530, width: 800, height: 80, fontSize: 20, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 80, y: 720, width: 920, height: 160, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 140, y: 900, width: 800, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1350, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 80, y: 950, width: 920, height: 160, fontSize: 60, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 140, y: 1130, width: 800, height: 100, fontSize: 26, zIndex: 3 },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/canvas-defaults.ts
git commit -m "feat: add canvas-format default template configs"
```

### Task 3: Update Convex schema to support v2 config

**Files:**
- Modify: `convex/schema.ts:35-62`
- Modify: `convex/templates.ts:1-21`

- [ ] **Step 1: Add v2 config validator to convex/templates.ts**

Add a new `canvasConfigValidator` alongside the existing `configValidator`. The schema uses `v.union()` to accept either format.

In `convex/templates.ts`, add after line 21:

```typescript
const templateObjectValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("title"),
    v.literal("description"),
    v.literal("image"),
    v.literal("logo"),
    v.literal("productName")
  ),
  name: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  opacity: v.number(),
  zIndex: v.number(),
  fontFamily: v.optional(v.string()),
  fontSize: v.optional(v.number()),
  fontWeight: v.optional(v.number()),
  letterSpacing: v.optional(v.number()),
  lineHeight: v.optional(v.number()),
  textAlign: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
  verticalAlign: v.optional(v.union(v.literal("top"), v.literal("center"), v.literal("bottom"))),
  device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
  objectFit: v.optional(v.union(v.literal("cover"), v.literal("contain"))),
  previewText: v.optional(v.string()),
});

const formatLayoutValidator = v.object({
  objects: v.array(templateObjectValidator),
});

const canvasConfigValidator = v.object({
  version: v.literal(2),
  colors: v.object({
    background: v.string(),
    text: v.string(),
    primary: v.string(),
  }),
  brandId: v.optional(v.string()),
  formats: v.object({
    landscape: formatLayoutValidator,
    square: formatLayoutValidator,
    portrait: formatLayoutValidator,
  }),
});
```

- [ ] **Step 2: Update create/update mutations to accept either config format**

Replace `config: configValidator` with `config: v.union(configValidator, canvasConfigValidator)` in the `create` and `update` mutation args.

- [ ] **Step 3: Update convex/schema.ts templates table to accept union config**

Replace the config field in the schema definition (lines 40-57) with `v.any()` temporarily since Convex schema validation doesn't support complex unions well. The Convex mutation validators handle the actual validation.

```typescript
// In schema.ts, replace config: v.object({...}) with:
config: v.any(),
```

- [ ] **Step 4: Update clone mutation to handle both formats**

No changes needed — clone copies config as-is, which works for both formats.

- [ ] **Step 5: Update seedDefaults to seed v2 format templates**

Add new v2 defaults alongside existing ones. Import `CANVAS_DEFAULTS` and seed them with `isDefault: true` and externalIds `tmpl_classic_v2`, `tmpl_split_v2`, `tmpl_hero_v2`.

- [ ] **Step 6: Run `npx convex dev` to verify schema deploys**

```bash
npx convex dev --once
```

Expected: Schema deploys without errors.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/templates.ts
git commit -m "feat: convex schema supports v2 canvas config alongside legacy"
```

### Task 4: Restore font loading functions and add multi-font support

**Files:**
- Modify: `src/lib/fonts.ts`

**CRITICAL:** The current `src/lib/fonts.ts` only has `FONT_CATALOG` — the font loading functions (`loadFontsForFamily`, `loadFonts`, `loadLocalFonts`, `fetchGoogleFontBuffer`) were accidentally overwritten. They must be restored from git history (`git show 132fa47:src/lib/fonts.ts`) and then extended.

- [ ] **Step 1: Restore the font loading functions**

Append the font loading code back into `src/lib/fonts.ts` after the existing `FONT_CATALOG` and `VALID_FONTS` exports. The full code to append:

```typescript
// --- Font loading ---
import { readFileSync } from 'fs'
import path from 'path'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type FontStyle = 'normal' | 'italic'

export interface FontConfig {
  name: string
  data: ArrayBuffer
  weight: Weight
  style: FontStyle
}

const fontCache = new Map<string, FontConfig[]>()
const LOCAL_FAMILY = 'Plus Jakarta Sans'

function loadLocalFonts(): FontConfig[] {
  if (fontCache.has(LOCAL_FAMILY)) return fontCache.get(LOCAL_FAMILY)!
  const dir = path.join(process.cwd(), 'src/assets/fonts')
  const regular = readFileSync(path.join(dir, 'PlusJakartaSans-Regular.ttf'))
  const bold = readFileSync(path.join(dir, 'PlusJakartaSans-Bold.ttf'))
  const fonts: FontConfig[] = [
    { name: LOCAL_FAMILY, data: regular.buffer as ArrayBuffer, weight: 400, style: 'normal' },
    { name: LOCAL_FAMILY, data: bold.buffer as ArrayBuffer, weight: 700, style: 'normal' },
  ]
  fontCache.set(LOCAL_FAMILY, fonts)
  return fonts
}

async function fetchGoogleFontBuffer(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      { headers: { 'User-Agent': 'curl/7.85.0' } }
    ).then((r) => r.text())
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.(?:ttf|otf|woff2?))\)/)
    if (!match) return null
    return fetch(match[1]).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

async function loadGoogleFont(family: string): Promise<FontConfig[]> {
  if (fontCache.has(family)) return fontCache.get(family)!
  const [regularBuf, boldBuf] = await Promise.all([
    fetchGoogleFontBuffer(family, 400),
    fetchGoogleFontBuffer(family, 700),
  ])
  if (!regularBuf) {
    console.warn(`Failed to fetch Google Font "${family}", falling back to ${LOCAL_FAMILY}`)
    return loadLocalFonts()
  }
  const fonts: FontConfig[] = [
    { name: family, data: regularBuf, weight: 400, style: 'normal' },
    { name: family, data: boldBuf ?? regularBuf, weight: 700, style: 'normal' },
  ]
  fontCache.set(family, fonts)
  return fonts
}

export async function loadFontsForFamily(family: string | undefined): Promise<FontConfig[]> {
  if (!family || family === LOCAL_FAMILY) return loadLocalFonts()
  return loadGoogleFont(family)
}

// Backward compat (sync, local only)
export function loadFonts(): FontConfig[] {
  return loadLocalFonts()
}
```

- [ ] **Step 2: Add `loadFontsForObjects` function for multi-font loading**

Append after the restored functions. This scans template objects, collects unique (fontFamily, fontWeight) pairs, fetches each individually. `fetchGoogleFontBuffer` already accepts arbitrary weights since it passes the weight directly to the Google Fonts API URL.

```typescript
import type { TemplateObject } from "./templates/canvas-types";

export async function loadFontsForObjects(objects: TemplateObject[]): Promise<FontConfig[]> {
  const needed = new Map<string, Set<number>>();

  for (const obj of objects) {
    if (obj.fontFamily && obj.fontFamily !== LOCAL_FAMILY) {
      if (!needed.has(obj.fontFamily)) needed.set(obj.fontFamily, new Set());
      needed.get(obj.fontFamily)!.add(obj.fontWeight ?? 400);
    }
  }

  if (needed.size === 0) return loadLocalFonts();

  const allFonts: FontConfig[] = [];
  const cacheKey = (f: string, w: number) => `${f}:${w}`;
  const fetched = new Set<string>();

  for (const [family, weights] of needed) {
    for (const weight of weights) {
      const key = cacheKey(family, weight);
      if (fetched.has(key)) continue;
      const buf = await fetchGoogleFontBuffer(family, weight);
      if (buf) {
        allFonts.push({ name: family, data: buf, weight: weight as Weight, style: "normal" });
        fetched.add(key);
      }
    }
  }

  // Always include local font as fallback
  allFonts.push(...loadLocalFonts());
  return allFonts;
}
```

- [ ] **Step 3: Verify font tests pass**

```bash
npx vitest run src/lib/__tests__/fonts.test.ts
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/fonts.ts
git commit -m "feat: multi-font loading for canvas templates"
```

---

## Chunk 2: Canvas Renderer

### Task 5: Canvas renderer

**Files:**
- Create: `src/lib/templates/canvas-renderer.tsx`

- [ ] **Step 1: Create canvas-renderer.tsx**

```tsx
// src/lib/templates/canvas-renderer.tsx
import type { CanvasTemplateConfig, TemplateObject, FormatKey } from "./canvas-types";
import type { Brand } from "../types";
import { FORMAT_DIMENSIONS } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";

interface Slide {
  title: string;
  description?: string;
  imageBase64?: string;
  device?: "browser" | "mobile";
  align?: "left" | "center" | "right";
}

interface CanvasRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  slide: Slide;
  brand: Brand;
  transparent?: boolean;
}

export function CanvasRenderer({ config, format, slide, brand, transparent }: CanvasRendererProps) {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format];
  const colors = config.brandId ? brand.colors : config.colors;
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div style={{
      width, height,
      background: transparent ? "transparent" : colors.background,
      position: "relative",
      overflow: "hidden",
    }}>
      {sortedObjects.map((obj) => (
        <div key={obj.id} style={{
          position: "absolute",
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          opacity: obj.opacity,
          display: "flex",
          flexDirection: "column",
          justifyContent: obj.verticalAlign === "center" ? "center"
                        : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start",
        }}>
          {renderObject(obj, slide, brand, colors, width, height)}
        </div>
      ))}
    </div>
  );
}

function renderObject(
  obj: TemplateObject,
  slide: Slide,
  brand: Brand,
  colors: { background: string; text: string; primary: string },
  canvasWidth: number,
  canvasHeight: number,
) {
  switch (obj.type) {
    case "title":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 48,
          fontWeight: obj.fontWeight || 700,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          width: "100%",
          wordWrap: "break-word",
        }}>
          {slide.title || "Title here"}
        </div>
      );

    case "description":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 22,
          fontWeight: obj.fontWeight || 400,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.4,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          opacity: 0.85,
          width: "100%",
          wordWrap: "break-word",
        }}>
          {slide.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
        </div>
      );

    case "productName":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 14,
          fontWeight: obj.fontWeight || 700,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          width: "100%",
        }}>
          {brand.name || "Product"}
        </div>
      );

    case "logo":
      if (!brand.logoBase64) return null;
      return (
        <img
          src={brand.logoBase64}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: obj.objectFit || "contain",
          }}
        />
      );

    case "image": {
      const imgSrc = slide.imageBase64;
      if (!imgSrc) {
        return (
          <div style={{
            width: "100%", height: "100%",
            background: "#e0e0e0",
            borderRadius: 8,
          }} />
        );
      }
      const device = obj.device || slide.device || "browser";
      if (device === "none") {
        return (
          <img
            src={imgSrc}
            style={{
              width: "100%", height: "100%",
              objectFit: obj.objectFit || "cover",
              borderRadius: 8,
            }}
          />
        );
      }
      if (device === "mobile") {
        return (
          <MobileFrame
            imageBase64={imgSrc}
            maxWidth={obj.width}
            maxHeight={obj.height}
          />
        );
      }
      return (
        <BrowserFrame
          imageBase64={imgSrc}
          maxWidth={obj.width}
          maxHeight={obj.height}
        />
      );
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/canvas-renderer.tsx
git commit -m "feat: canvas renderer with absolute positioning for Satori"
```

### Task 6: Integrate canvas renderer into render pipeline

**Files:**
- Modify: `src/lib/pipeline/render.ts`
- Modify: `src/lib/templates/default-configs.ts`

- [ ] **Step 1: Update render.ts to detect and use v2 configs**

In `renderReleaseAsync`, after resolving `templateConfig`, check if it has `version: 2`. If so, use `CanvasRenderer` instead of `ConfigRenderer`. Update font loading to use `loadFontsForObjects` for v2 configs.

Add imports and type guard:

```typescript
import { CanvasRenderer } from "../templates/canvas-renderer";
import type { CanvasTemplateConfig, FormatKey } from "../templates/canvas-types";
import { loadFontsForObjects } from "../fonts";

function isCanvasConfig(config: unknown): config is CanvasTemplateConfig {
  return typeof config === "object" && config !== null && "version" in config && (config as any).version === 2;
}
```

In the rendering loop (around line 141-165), add a branch:

```typescript
const isCanvas = isCanvasConfig(templateConfig);

// Font loading
const fonts = isCanvas
  ? await loadFontsForObjects((templateConfig as CanvasTemplateConfig).formats[format as FormatKey].objects)
  : await loadFontsForFamily(brand.font);

// JSX generation
const jsx = isCanvas
  ? CanvasRenderer({
      config: templateConfig as CanvasTemplateConfig,
      format: format as FormatKey,
      slide: slides[i],
      brand,
      transparent,
    })
  : ConfigRenderer({
      config: templateConfig as TemplateConfig,
      slide: slides[i],
      brand,
      width,
      height,
      transparent,
    });
```

- [ ] **Step 2: Update default-configs.ts to also check canvas defaults**

```typescript
import { getCanvasDefaultConfig } from "./canvas-defaults";
import type { CanvasTemplateConfig } from "./canvas-types";

// Update getDefaultConfig to check both
export function getDefaultConfig(name: string): TemplateConfig | CanvasTemplateConfig | null {
  // Check v2 canvas configs first
  const canvasConfig = getCanvasDefaultConfig(name);
  if (canvasConfig) return canvasConfig;
  // Fall back to legacy
  return DEFAULT_TEMPLATES[name]?.config ?? null;
}
```

- [ ] **Step 3: Update preview route to support v2**

In `src/app/api/v1/templates/[id]/preview/route.ts`, add similar v2 detection logic. When the config has `version: 2`, use `CanvasRenderer` with `format: "landscape"` for the preview.

- [ ] **Step 4: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: All existing tests pass (no breaking changes to legacy path).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/render.ts src/lib/templates/default-configs.ts src/app/api/v1/templates/[id]/preview/route.ts
git commit -m "feat: render pipeline supports v2 canvas configs"
```

---

## Chunk 3: Editor State Management

### Task 7: Font data for editor

**Files:**
- Create: `src/components/editor/font-data.ts`

- [ ] **Step 1: Create font-data.ts that re-exports from the single source of truth**

```typescript
// src/components/editor/font-data.ts
// Re-export from canonical source. Editor uses FONT_CATEGORIES for grouped dropdown.
// Rename "Display" → "Novelty" for user-facing label.
import { FONT_CATALOG } from "@/lib/fonts";

export const FONT_CATEGORIES = {
  "Serif": FONT_CATALOG["Serif"],
  "Sans Serif": FONT_CATALOG["Sans Serif"],
  "Novelty": FONT_CATALOG["Display"],
  "International": FONT_CATALOG["International"],
};

// "Plus Jakarta Sans" is the local bundled font — always available
export const LOCAL_FONT = "Plus Jakarta Sans";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/font-data.ts
git commit -m "feat: font list data for editor"
```

### Task 8: Editor context and reducer

**Files:**
- Create: `src/components/editor/editor-context.tsx`

This is the core state management. Handles all actions, undo/redo, and provides context to all editor components.

- [ ] **Step 1: Create editor-context.tsx**

```typescript
// src/components/editor/editor-context.tsx
"use client";

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CanvasTemplateConfig, TemplateObject, FormatKey, ObjectType } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

// --- State ---
interface EditorState {
  templateId: string;
  name: string;
  config: CanvasTemplateConfig;
  activeFormat: FormatKey;
  selectedObjectId: string | null;
  isDirty: boolean;
}

// --- Actions ---
type EditorAction =
  | { type: "SELECT_OBJECT"; objectId: string | null }
  | { type: "MOVE_OBJECT"; objectId: string; x: number; y: number }
  | { type: "RESIZE_OBJECT"; objectId: string; x: number; y: number; width: number; height: number }
  | { type: "UPDATE_PROPERTY"; objectId: string; property: string; value: unknown; allFormats?: boolean }
  | { type: "ADD_OBJECT"; objectType: ObjectType }
  | { type: "REMOVE_OBJECT"; objectId: string }
  | { type: "REORDER_OBJECTS"; objectIds: string[] }
  | { type: "SWITCH_FORMAT"; format: FormatKey }
  | { type: "SET_COLORS"; colors: { background: string; text: string; primary: string } }
  | { type: "SET_BRAND"; brandId: string | undefined; previewColors?: { background: string; text: string; primary: string } }
  | { type: "SET_NAME"; name: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_SAVED" };

// --- Undo/Redo wrapper ---
interface UndoableState {
  current: EditorState;
  past: EditorState[];
  future: EditorState[];
}

const MAX_UNDO = 50;
const NON_UNDOABLE_ACTIONS = new Set(["SELECT_OBJECT", "SWITCH_FORMAT", "UNDO", "REDO", "MARK_SAVED"]);

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SELECT_OBJECT":
      return { ...state, selectedObjectId: action.objectId };

    case "MOVE_OBJECT": {
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        x: action.x, y: action.y,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "RESIZE_OBJECT": {
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        x: action.x, y: action.y, width: action.width, height: action.height,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "UPDATE_PROPERTY": {
      if (action.allFormats) {
        // Style properties apply to all formats
        const newConfig = { ...state.config, formats: { ...state.config.formats } };
        for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
          newConfig.formats[fmt] = {
            objects: newConfig.formats[fmt].objects.map((obj) =>
              obj.id === action.objectId ? { ...obj, [action.property]: action.value } : obj
            ),
          };
        }
        return { ...state, config: newConfig, isDirty: true };
      }
      const newConfig = updateObjectInActiveFormat(state, action.objectId, {
        [action.property]: action.value,
      });
      return { ...state, config: newConfig, isDirty: true };
    }

    case "ADD_OBJECT": {
      const dims = FORMAT_DIMENSIONS[state.activeFormat];
      const newObj: TemplateObject = createDefaultObject(action.objectType, dims.width, dims.height);
      const maxZ = Math.max(0, ...state.config.formats[state.activeFormat].objects.map((o) => o.zIndex));
      newObj.zIndex = maxZ + 1;

      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        const fmtDims = FORMAT_DIMENSIONS[fmt];
        const fmtObj = { ...newObj };
        // Scale position proportionally to each format
        fmtObj.x = Math.round((newObj.x / dims.width) * fmtDims.width);
        fmtObj.y = Math.round((newObj.y / dims.height) * fmtDims.height);
        fmtObj.width = Math.round((newObj.width / dims.width) * fmtDims.width);
        fmtObj.height = Math.round((newObj.height / dims.height) * fmtDims.height);
        newConfig.formats[fmt] = {
          objects: [...newConfig.formats[fmt].objects, fmtObj],
        };
      }
      return { ...state, config: newConfig, selectedObjectId: newObj.id, isDirty: true };
    }

    case "REMOVE_OBJECT": {
      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        newConfig.formats[fmt] = {
          objects: newConfig.formats[fmt].objects.filter((o) => o.id !== action.objectId),
        };
      }
      return {
        ...state,
        config: newConfig,
        selectedObjectId: state.selectedObjectId === action.objectId ? null : state.selectedObjectId,
        isDirty: true,
      };
    }

    case "REORDER_OBJECTS": {
      // zIndex is cross-format — reorder in all formats
      const newConfig = { ...state.config, formats: { ...state.config.formats } };
      for (const fmt of ["landscape", "square", "portrait"] as FormatKey[]) {
        newConfig.formats[fmt] = {
          objects: newConfig.formats[fmt].objects.map((obj) => {
            const idx = action.objectIds.indexOf(obj.id);
            return idx >= 0 ? { ...obj, zIndex: idx } : obj;
          }),
        };
      }
      return { ...state, config: newConfig, isDirty: true };
    }

    case "SWITCH_FORMAT":
      return { ...state, activeFormat: action.format, selectedObjectId: null };

    case "SET_COLORS":
      return {
        ...state,
        config: { ...state.config, colors: action.colors, brandId: undefined },
        isDirty: true,
      };

    case "SET_BRAND":
      return {
        ...state,
        config: {
          ...state.config,
          brandId: action.brandId,
          ...(action.previewColors ? { colors: action.previewColors } : {}),
        },
        isDirty: true,
      };

    case "SET_NAME":
      return { ...state, name: action.name, isDirty: true };

    case "MARK_SAVED":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

function undoableReducer(state: UndoableState, action: EditorAction): UndoableState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const prev = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      current: prev,
      future: [state.current, ...state.future],
    };
  }
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.current],
      current: next,
      future: state.future.slice(1),
    };
  }

  const newCurrent = editorReducer(state.current, action);
  if (newCurrent === state.current) return state;

  if (NON_UNDOABLE_ACTIONS.has(action.type)) {
    return { ...state, current: newCurrent };
  }

  return {
    past: [...state.past.slice(-MAX_UNDO + 1), state.current],
    current: newCurrent,
    future: [],
  };
}

// --- Helpers ---
function updateObjectInActiveFormat(
  state: EditorState,
  objectId: string,
  updates: Partial<TemplateObject>,
): CanvasTemplateConfig {
  const fmt = state.activeFormat;
  return {
    ...state.config,
    formats: {
      ...state.config.formats,
      [fmt]: {
        objects: state.config.formats[fmt].objects.map((obj) =>
          obj.id === objectId ? { ...obj, ...updates } : obj
        ),
      },
    },
  };
}

function updateFormatObjects(
  state: EditorState,
  updater: (objects: TemplateObject[]) => TemplateObject[],
): CanvasTemplateConfig {
  const fmt = state.activeFormat;
  return {
    ...state.config,
    formats: {
      ...state.config.formats,
      [fmt]: { objects: updater(state.config.formats[fmt].objects) },
    },
  };
}

function createDefaultObject(type: ObjectType, canvasW: number, canvasH: number): TemplateObject {
  const base = {
    id: type,
    type,
    name: type,
    opacity: 1,
    zIndex: 0,
  };

  const textDefaults = {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: 400,
    fontSize: 24,
    letterSpacing: 0,
    lineHeight: 1.3,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
  };

  switch (type) {
    case "title":
      return { ...base, ...textDefaults, x: 48, y: canvasH * 0.6, width: canvasW - 96, height: 120, fontSize: 48, fontWeight: 700 };
    case "description":
      return { ...base, ...textDefaults, x: 48, y: canvasH * 0.75, width: canvasW - 96, height: 80, fontSize: 22 };
    case "productName":
      return { ...base, ...textDefaults, x: 48, y: 32, width: 200, height: 48, fontSize: 14, fontWeight: 700 };
    case "image":
      return { ...base, x: 48, y: 96, width: canvasW - 96, height: canvasH * 0.5, device: "browser" as const, objectFit: "cover" as const };
    case "logo":
      return { ...base, x: 48, y: 32, width: 120, height: 48, objectFit: "contain" as const };
  }
}

// --- Context ---
interface EditorContextValue {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  activeObjects: TemplateObject[];
  selectedObject: TemplateObject | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

interface EditorProviderProps {
  templateId: string;
  initialName: string;
  initialConfig: CanvasTemplateConfig;
  children: ReactNode;
}

export function EditorProvider({ templateId, initialName, initialConfig, children }: EditorProviderProps) {
  const initialState: EditorState = {
    templateId,
    name: initialName,
    config: initialConfig,
    activeFormat: "landscape",
    selectedObjectId: null,
    isDirty: false,
  };

  const [undoState, rawDispatch] = useReducer(undoableReducer, {
    current: initialState,
    past: [],
    future: [],
  });

  const dispatch = useCallback((action: EditorAction) => rawDispatch(action), []);

  // Keyboard shortcuts — use ref to avoid re-registering on every state change
  const stateRef = useRef(undoState.current);
  stateRef.current = undoState.current;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const s = stateRef.current;
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && s.selectedObjectId) {
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
        dispatch({ type: "REMOVE_OBJECT", objectId: s.selectedObjectId });
      }
      if (e.key === "Escape") {
        dispatch({ type: "SELECT_OBJECT", objectId: null });
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && s.selectedObjectId) {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        const obj = s.config.formats[s.activeFormat].objects.find((o) => o.id === s.selectedObjectId);
        if (!obj) return;
        const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
        dispatch({ type: "MOVE_OBJECT", objectId: obj.id, x: obj.x + dx, y: obj.y + dy });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  const state = undoState.current;
  const activeObjects = state.config.formats[state.activeFormat].objects;
  const selectedObject = activeObjects.find((o) => o.id === state.selectedObjectId) ?? null;

  return (
    <EditorContext.Provider value={{
      state,
      dispatch,
      canUndo: undoState.past.length > 0,
      canRedo: undoState.future.length > 0,
      activeObjects,
      selectedObject,
    }}>
      {children}
    </EditorContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/editor-context.tsx
git commit -m "feat: editor context with reducer, undo/redo, keyboard shortcuts"
```

---

## Chunk 4: Editor UI — Left Sidebar

### Task 9: Install required shadcn components

- [ ] **Step 1: Install missing shadcn components**

```bash
npx shadcn@latest add select separator scroll-area dropdown-menu tooltip slider popover
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shadcn components for editor"
```

### Task 10: Format switcher

**Files:**
- Create: `src/components/editor/format-switcher.tsx`

- [ ] **Step 1: Create format-switcher.tsx**

Three buttons showing format name + dimensions. Active format highlighted.

```tsx
"use client";
import { useEditor } from "./editor-context";
import { FORMAT_DIMENSIONS, type FormatKey } from "@/lib/templates/canvas-types";
import { cn } from "@/lib/utils";

const FORMATS: { key: FormatKey; label: string }[] = [
  { key: "landscape", label: "Landscape" },
  { key: "square", label: "Square" },
  { key: "portrait", label: "Portrait" },
];

export function FormatSwitcher() {
  const { state, dispatch } = useEditor();

  return (
    <div className="flex flex-col gap-1">
      {FORMATS.map(({ key, label }) => {
        const dims = FORMAT_DIMENSIONS[key];
        return (
          <button
            key={key}
            onClick={() => dispatch({ type: "SWITCH_FORMAT", format: key })}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
              state.activeFormat === key
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <span>{label}</span>
            <span className="text-xs text-zinc-400">{dims.width}x{dims.height}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/format-switcher.tsx
git commit -m "feat: format switcher component"
```

### Task 11: Brand color section

**Files:**
- Create: `src/components/editor/brand-color-section.tsx`

- [ ] **Step 1: Create brand-color-section.tsx**

Fetches brands from API. Shows brand dropdown OR color pickers (mutually exclusive). When brand selected, colors hidden. "No brand" option shows manual pickers.

```tsx
"use client";
import { useEffect, useState } from "react";
import { useEditor } from "./editor-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BrandOption {
  id: string;
  name: string;
  colors: { background: string; text: string; primary: string };
}

export function BrandColorSection() {
  const { state, dispatch } = useEditor();
  const [brands, setBrands] = useState<BrandOption[]>([]);

  useEffect(() => {
    fetch("/api/v1/brands")
      .then((r) => r.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => {});
  }, []);

  const hasBrand = !!state.config.brandId;

  function handleBrandChange(value: string) {
    if (value === "none") {
      dispatch({ type: "SET_BRAND", brandId: undefined });
    } else {
      const brand = brands.find((b) => b.id === value);
      dispatch({ type: "SET_BRAND", brandId: value, previewColors: brand?.colors });
    }
  }

  function handleColorChange(key: "background" | "text" | "primary", value: string) {
    dispatch({
      type: "SET_COLORS",
      colors: { ...state.config.colors, [key]: value },
    });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Colors</Label>

      <Select value={state.config.brandId || "none"} onValueChange={handleBrandChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select brand..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Manual colors</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hasBrand && (
        <div className="space-y-2">
          {(["background", "text", "primary"] as const).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 w-20 capitalize">{key}</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="color"
                  value={state.config.colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                />
                <Input
                  value={state.config.colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/brand-color-section.tsx
git commit -m "feat: brand/color section with mutually exclusive UI"
```

### Task 12: Object layer list

**Files:**
- Create: `src/components/editor/object-layer-list.tsx`

- [ ] **Step 1: Create object-layer-list.tsx**

Displays objects sorted by zIndex (highest first = top of list). Drag to reorder. Click to select. X to delete.

```tsx
"use client";
import { useEditor } from "./editor-context";
import { cn } from "@/lib/utils";
import { GripVertical, X } from "lucide-react";
import { useRef, useState } from "react";

export function ObjectLayerList() {
  const { state, dispatch, activeObjects } = useEditor();
  const sorted = [...activeObjects].sort((a, b) => b.zIndex - a.zIndex);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dragOverIdx.current = idx;
  }

  function handleDrop() {
    if (dragIdx === null || dragOverIdx.current === null || dragIdx === dragOverIdx.current) {
      setDragIdx(null);
      return;
    }
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dragOverIdx.current, 0, moved);
    // Reverse back: highest zIndex = first in list
    const ids = reordered.map((o) => o.id);
    dispatch({ type: "REORDER_OBJECTS", objectIds: ids.reverse() });
    setDragIdx(null);
  }

  return (
    <div className="space-y-1">
      {sorted.map((obj, idx) => (
        <div
          key={obj.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={handleDrop}
          onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: obj.id })}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer group",
            state.selectedObjectId === obj.id
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "hover:bg-zinc-50 border border-transparent"
          )}
        >
          <GripVertical className="w-3 h-3 text-zinc-400 cursor-grab" />
          <span className="flex-1 truncate">{obj.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_OBJECT", objectId: obj.id });
            }}
            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/object-layer-list.tsx
git commit -m "feat: draggable object layer list"
```

### Task 13: Add object button

**Files:**
- Create: `src/components/editor/add-object-button.tsx`

- [ ] **Step 1: Create add-object-button.tsx**

Dropdown showing available types not already in the template.

```tsx
"use client";
import { useEditor } from "./editor-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import type { ObjectType } from "@/lib/templates/canvas-types";

const ALL_TYPES: { type: ObjectType; label: string }[] = [
  { type: "title", label: "Title" },
  { type: "description", label: "Description" },
  { type: "image", label: "Image" },
  { type: "logo", label: "Logo" },
  { type: "productName", label: "Product Name" },
];

export function AddObjectButton() {
  const { dispatch, activeObjects } = useEditor();
  const existingTypes = new Set(activeObjects.map((o) => o.type));
  const available = ALL_TYPES.filter((t) => !existingTypes.has(t.type));

  if (available.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-1" /> Add Object
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {available.map(({ type, label }) => (
          <DropdownMenuItem key={type} onClick={() => dispatch({ type: "ADD_OBJECT", objectType: type })}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/add-object-button.tsx
git commit -m "feat: add object dropdown button"
```

### Task 14: Left sidebar assembly

**Files:**
- Create: `src/components/editor/editor-left-sidebar.tsx`

- [ ] **Step 1: Create editor-left-sidebar.tsx**

Assembles all left sidebar components: back button, save, name, format switcher, brand/colors, add object, layer list.

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEditor } from "./editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormatSwitcher } from "./format-switcher";
import { BrandColorSection } from "./brand-color-section";
import { ObjectLayerList } from "./object-layer-list";
import { AddObjectButton } from "./add-object-button";
import { ArrowLeft, Save } from "lucide-react";

export function EditorLeftSidebar({ onSave }: { onSave: () => Promise<void> }) {
  const router = useRouter();
  const { state, dispatch } = useEditor();

  return (
    <div className="w-60 border-r border-zinc-200 bg-white flex flex-col h-full">
      {/* Top actions */}
      <div className="p-3 space-y-2 border-b border-zinc-200">
        <Button onClick={onSave} className="w-full" size="sm">
          <Save className="w-4 h-4 mr-1" /> Save Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => router.push("/admin/templates")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Template name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Name</Label>
            <Input
              value={state.name}
              onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          <Separator />

          {/* Format */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Format</Label>
            <FormatSwitcher />
          </div>

          <Separator />

          {/* Brand / Colors */}
          <BrandColorSection />

          <Separator />

          {/* Objects */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Objects</Label>
            <AddObjectButton />
            <ObjectLayerList />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/editor-left-sidebar.tsx
git commit -m "feat: editor left sidebar assembly"
```

---

## Chunk 5: Editor UI — Canvas

### Task 15: Selection handles

**Files:**
- Create: `src/components/editor/selection-handles.tsx`

- [ ] **Step 1: Create selection-handles.tsx**

8 resize handles (4 corners + 4 midpoints) with cursor styles. Each handle reports which edge(s) it controls.

```tsx
"use client";
export type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { pos: HandlePosition; cursor: string; style: React.CSSProperties }[] = [
  { pos: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
  { pos: "n", cursor: "ns-resize", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
  { pos: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
  { pos: "e", cursor: "ew-resize", style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
  { pos: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
  { pos: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
  { pos: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
  { pos: "w", cursor: "ew-resize", style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
];

interface SelectionHandlesProps {
  onResizeStart: (handle: HandlePosition, e: React.PointerEvent) => void;
}

export function SelectionHandles({ onResizeStart }: SelectionHandlesProps) {
  return (
    <>
      {HANDLES.map(({ pos, cursor, style }) => (
        <div
          key={pos}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(pos, e);
          }}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            background: "white",
            border: "1.5px solid #3b82f6",
            borderRadius: 2,
            cursor,
            zIndex: 999,
            ...style,
          }}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/selection-handles.tsx
git commit -m "feat: selection handles component"
```

### Task 16: Canvas object

**Files:**
- Create: `src/components/editor/canvas-object.tsx`

- [ ] **Step 1: Create canvas-object.tsx**

Renders a single object on the canvas. Handles click-to-select, drag-to-move, resize via handles, double-click-to-edit for text.

```tsx
"use client";
import { useRef, useState, useCallback } from "react";
import { useEditor } from "./editor-context";
import { SelectionHandles, type HandlePosition } from "./selection-handles";
import type { TemplateObject } from "@/lib/templates/canvas-types";

interface CanvasObjectProps {
  obj: TemplateObject;
  scale: number;
  isSelected: boolean;
}

export function CanvasObject({ obj, scale, isSelected }: CanvasObjectProps) {
  const { dispatch, state } = useEditor();
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);
  const resizeStart = useRef<{
    handle: HandlePosition;
    startX: number; startY: number;
    objX: number; objY: number;
    objW: number; objH: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (resizeStart.current) return;
    e.stopPropagation();
    dispatch({ type: "SELECT_OBJECT", objectId: obj.id });
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      objX: obj.x, objY: obj.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [dispatch, obj.id, obj.x, obj.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStart.current && !resizeStart.current) {
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      dispatch({
        type: "MOVE_OBJECT",
        objectId: obj.id,
        x: Math.round(dragStart.current.objX + dx),
        y: Math.round(dragStart.current.objY + dy),
      });
    }
    if (resizeStart.current) {
      const rs = resizeStart.current;
      const dx = (e.clientX - rs.startX) / scale;
      const dy = (e.clientY - rs.startY) / scale;
      let { objX: x, objY: y, objW: w, objH: h } = rs;

      if (rs.handle.includes("e")) { w = Math.max(20, rs.objW + dx); }
      if (rs.handle.includes("w")) { w = Math.max(20, rs.objW - dx); x = rs.objX + (rs.objW - w); }
      if (rs.handle.includes("s")) { h = Math.max(20, rs.objH + dy); }
      if (rs.handle.includes("n")) { h = Math.max(20, rs.objH - dy); y = rs.objY + (rs.objH - h); }

      dispatch({
        type: "RESIZE_OBJECT",
        objectId: obj.id,
        x: Math.round(x), y: Math.round(y),
        width: Math.round(w), height: Math.round(h),
      });
    }
  }, [dispatch, obj.id, scale]);

  const handlePointerUp = useCallback(() => {
    dragStart.current = null;
    resizeStart.current = null;
  }, []);

  const handleResizeStart = useCallback((handle: HandlePosition, e: React.PointerEvent) => {
    resizeStart.current = {
      handle,
      startX: e.clientX, startY: e.clientY,
      objX: obj.x, objY: obj.y,
      objW: obj.width, objH: obj.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [obj.x, obj.y, obj.width, obj.height]);

  const handleDoubleClick = useCallback(() => {
    if (obj.type === "title" || obj.type === "description" || obj.type === "productName") {
      setIsEditing(true);
    }
  }, [obj.type]);

  const colors = state.config.colors;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        opacity: obj.opacity,
        cursor: isSelected ? "move" : "pointer",
        outline: isSelected ? "2px solid #3b82f6" : "none",
        outlineOffset: -1,
        zIndex: obj.zIndex,
      }}
    >
      {/* Object content */}
      {renderObjectPreview(obj, colors, isEditing, (text) => {
        dispatch({ type: "UPDATE_PROPERTY", objectId: obj.id, property: "previewText", value: text, allFormats: true });
      }, () => setIsEditing(false))}

      {/* Selection handles */}
      {isSelected && <SelectionHandles onResizeStart={handleResizeStart} />}
    </div>
  );
}

function renderObjectPreview(
  obj: TemplateObject,
  colors: { background: string; text: string; primary: string },
  isEditing: boolean,
  onTextChange: (text: string) => void,
  onBlur: () => void,
) {
  const textStyle: React.CSSProperties = {
    fontFamily: obj.fontFamily || "Plus Jakarta Sans, sans-serif",
    fontSize: obj.fontSize || 24,
    fontWeight: obj.fontWeight || 400,
    letterSpacing: obj.letterSpacing || 0,
    lineHeight: obj.lineHeight || 1.3,
    textAlign: obj.textAlign || "left",
    color: colors.text,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: obj.verticalAlign === "center" ? "center"
                  : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start",
  };

  const placeholders: Record<string, string> = {
    title: "TITLE GOES HERE",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    productName: "Product",
  };

  if (obj.type === "title" || obj.type === "description" || obj.type === "productName") {
    const text = obj.previewText || placeholders[obj.type] || "";
    if (isEditing) {
      return (
        <textarea
          autoFocus
          defaultValue={text}
          onBlur={(e) => { onTextChange(e.target.value); onBlur(); }}
          style={{ ...textStyle, border: "none", outline: "none", resize: "none", background: "transparent", padding: 0 }}
        />
      );
    }
    return <div style={textStyle}>{text}</div>;
  }

  if (obj.type === "image") {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "repeating-conic-gradient(#d4d4d4 0% 25%, #e5e5e5 0% 50%) 0 0 / 20px 20px",
        borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#a1a1aa", fontSize: 12,
      }}>
        {obj.device !== "none" ? (obj.device || "browser") : "Image"}
      </div>
    );
  }

  if (obj.type === "logo") {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "#f4f4f5",
        borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#a1a1aa", fontSize: 11,
      }}>
        Logo
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/canvas-object.tsx
git commit -m "feat: canvas object with drag/resize/edit"
```

### Task 17: Editor canvas

**Files:**
- Create: `src/components/editor/editor-canvas.tsx`

- [ ] **Step 1: Create editor-canvas.tsx**

The main canvas viewport. Scales the canvas to fit the available space. Renders all objects.

```tsx
"use client";
import { useRef, useEffect, useState } from "react";
import { useEditor } from "./editor-context";
import { CanvasObject } from "./canvas-object";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

export function EditorCanvas() {
  const { state, dispatch, activeObjects } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dims = FORMAT_DIMENSIONS[state.activeFormat];

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 64;
      const scaleX = (clientWidth - padding) / dims.width;
      const scaleY = (clientHeight - padding) / dims.height;
      setScale(Math.min(scaleX, scaleY, 1));
    }
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [dims.width, dims.height]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-zinc-100 flex items-center justify-center overflow-hidden"
      onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: null })}
    >
      <div
        style={{
          width: dims.width,
          height: dims.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: state.config.colors.background,
          position: "relative",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Click on canvas background to deselect */}
        <div
          style={{ position: "absolute", inset: 0 }}
          onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: null })}
        />

        {activeObjects.map((obj) => (
          <CanvasObject
            key={obj.id}
            obj={obj}
            scale={scale}
            isSelected={state.selectedObjectId === obj.id}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/editor-canvas.tsx
git commit -m "feat: editor canvas with auto-scaling viewport"
```

---

## Chunk 6: Editor UI — Right Sidebar

### Task 18: Common properties panel

**Files:**
- Create: `src/components/editor/common-properties.tsx`

- [ ] **Step 1: Create common-properties.tsx**

Shows X, Y, W, H number inputs + opacity slider for the selected object.

```tsx
"use client";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function CommonProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;

  function update(property: string, value: number, allFormats = false) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats });
  }

  return (
    <div className="space-y-3">
      {/* Name */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Name</Label>
        <Input
          value={selectedObject.name}
          onChange={(e) => dispatch({
            type: "UPDATE_PROPERTY", objectId: selectedObject.id,
            property: "name", value: e.target.value, allFormats: true,
          })}
          className="h-8 text-sm"
        />
      </div>

      {/* Position & Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">W</Label>
          <Input
            type="number" value={selectedObject.width}
            onChange={(e) => update("width", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">H</Label>
          <Input
            type="number" value={selectedObject.height}
            onChange={(e) => update("height", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">X</Label>
          <Input
            type="number" value={selectedObject.x}
            onChange={(e) => update("x", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Y</Label>
          <Input
            type="number" value={selectedObject.y}
            onChange={(e) => update("y", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs text-zinc-500">Opacity</Label>
          <span className="text-xs text-zinc-400">{Math.round(selectedObject.opacity * 100)}%</span>
        </div>
        <Slider
          value={[selectedObject.opacity]}
          min={0} max={1} step={0.01}
          onValueChange={([v]) => update("opacity", v)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/common-properties.tsx
git commit -m "feat: common properties panel (position, size, opacity)"
```

### Task 19: Text properties panel

**Files:**
- Create: `src/components/editor/text-properties.tsx`

- [ ] **Step 1: Create text-properties.tsx**

Font family (grouped), size, weight, letter spacing, line height, text align, vertical align. Style properties apply to all formats (`allFormats: true`).

```tsx
"use client";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_CATEGORIES } from "./font-data";

export function TextProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;
  if (selectedObject.type !== "title" && selectedObject.type !== "description" && selectedObject.type !== "productName") return null;

  function update(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Text</Label>

      {/* Font family */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Font</Label>
        <Select value={selectedObject.fontFamily || "Plus Jakarta Sans"} onValueChange={(v) => update("fontFamily", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectGroup>
              <SelectLabel>System</SelectLabel>
              <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
            </SelectGroup>
            {Object.entries(FONT_CATEGORIES).map(([group, fonts]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {fonts.map((font) => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Size</Label>
          <Input
            type="number" value={selectedObject.fontSize || 24}
            onChange={(e) => update("fontSize", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Weight</Label>
          <Select value={String(selectedObject.fontWeight || 400)} onValueChange={(v) => update("fontWeight", Number(v))}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                <SelectItem key={w} value={String(w)}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Letter spacing & Line height */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Spacing</Label>
          <Input
            type="number" value={selectedObject.letterSpacing || 0} step={0.5}
            onChange={(e) => update("letterSpacing", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Line H</Label>
          <Input
            type="number" value={selectedObject.lineHeight || 1.3} step={0.05}
            onChange={(e) => update("lineHeight", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Text align */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Align</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update("textAlign", a)}
              className={`flex-1 py-1 text-xs rounded border ${
                (selectedObject.textAlign || "left") === a
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical align */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">V. Align</Label>
        <div className="flex gap-1">
          {(["top", "center", "bottom"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update("verticalAlign", a)}
              className={`flex-1 py-1 text-xs rounded border ${
                (selectedObject.verticalAlign || "top") === a
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/text-properties.tsx
git commit -m "feat: text properties panel with font selection"
```

### Task 20: Image properties panel

**Files:**
- Create: `src/components/editor/image-properties.tsx`

- [ ] **Step 1: Create image-properties.tsx**

```tsx
"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ImageProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;
  if (selectedObject.type !== "image" && selectedObject.type !== "logo") return null;

  function update(property: string, value: string) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Image</Label>

      {selectedObject.type === "image" && (
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Device Frame</Label>
          <Select value={selectedObject.device || "browser"} onValueChange={(v) => update("device", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Browser</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Object Fit</Label>
        <Select value={selectedObject.objectFit || "cover"} onValueChange={(v) => update("objectFit", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/image-properties.tsx
git commit -m "feat: image properties panel"
```

### Task 21: Right sidebar assembly

**Files:**
- Create: `src/components/editor/editor-right-sidebar.tsx`

- [ ] **Step 1: Create editor-right-sidebar.tsx**

```tsx
"use client";
import { useEditor } from "./editor-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CommonProperties } from "./common-properties";
import { TextProperties } from "./text-properties";
import { ImageProperties } from "./image-properties";

export function EditorRightSidebar() {
  const { selectedObject } = useEditor();

  return (
    <div className="w-72 border-l border-zinc-200 bg-white flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!selectedObject ? (
            <p className="text-sm text-zinc-400 text-center mt-8">
              Select an object to edit its properties
            </p>
          ) : (
            <div className="space-y-4">
              <CommonProperties />
              <Separator />
              <TextProperties />
              <ImageProperties />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/editor-right-sidebar.tsx
git commit -m "feat: editor right sidebar assembly"
```

---

## Chunk 7: Editor Page & Integration

### Task 22: Main editor component

**Files:**
- Create: `src/components/editor/template-editor.tsx`

- [ ] **Step 1: Create template-editor.tsx**

Orchestrates the three panels. Handles save via API.

```tsx
"use client";
import { useCallback } from "react";
import { EditorProvider, useEditor } from "./editor-context";
import { EditorLeftSidebar } from "./editor-left-sidebar";
import { EditorCanvas } from "./editor-canvas";
import { EditorRightSidebar } from "./editor-right-sidebar";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

function EditorInner() {
  const { state, dispatch } = useEditor();

  const handleSave = useCallback(async () => {
    const res = await fetch(`/api/v1/templates/${state.templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        config: state.config,
      }),
    });
    if (!res.ok) {
      console.error("Save failed:", await res.text());
      return;
    }
    dispatch({ type: "MARK_SAVED" });
  }, [state.templateId, state.name, state.config, dispatch]);

  return (
    <div className="h-screen flex bg-white">
      <EditorLeftSidebar onSave={handleSave} />
      <EditorCanvas />
      <EditorRightSidebar />
    </div>
  );
}

interface TemplateEditorProps {
  templateId: string;
  name: string;
  config: CanvasTemplateConfig;
}

export function TemplateEditor({ templateId, name, config }: TemplateEditorProps) {
  return (
    <EditorProvider templateId={templateId} initialName={name} initialConfig={config}>
      <EditorInner />
    </EditorProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/template-editor.tsx
git commit -m "feat: main template editor orchestrator"
```

### Task 23: Editor page and layout

**Files:**
- Create: `src/app/(admin)/admin/templates/[id]/edit/layout.tsx`
- Create: `src/app/(admin)/admin/templates/[id]/edit/page.tsx`

- [ ] **Step 1: Create layout.tsx to skip admin chrome**

```tsx
// src/app/(admin)/admin/templates/[id]/edit/layout.tsx
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create page.tsx as server component**

Fetches template from Convex, passes config to TemplateEditor client component. If template uses legacy config, redirects or shows error.

```tsx
// src/app/(admin)/admin/templates/[id]/edit/page.tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/editor/template-editor";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await convex.query(api.templates.getByExternalId, { externalId: id });

  if (!template) {
    redirect("/admin/templates");
  }

  const config = template.config as CanvasTemplateConfig;

  // If legacy config (no version field), redirect to templates list
  if (!("version" in config) || config.version !== 2) {
    redirect("/admin/templates");
  }

  return (
    <TemplateEditor
      templateId={template.externalId}
      name={template.name}
      config={config}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/templates/\[id\]/edit/
git commit -m "feat: editor page with layout that skips admin chrome"
```

### Task 24: Update template list to create v2 templates

**Files:**
- Modify: `src/app/(admin)/admin/templates/template-list-client.tsx`

- [ ] **Step 1: Update create blank handler**

Change the "Create Blank" button to create a v2 canvas config instead of the old block config.

The default blank template should have:

```typescript
const blankConfig = {
  version: 2,
  colors: { background: "#ffffff", text: "#000000", primary: "#3b82f6" },
  formats: {
    landscape: { objects: [
      { id: "title", type: "title", name: "title", x: 48, y: 400, width: 1104, height: 120, opacity: 1, zIndex: 1,
        fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
    ]},
    square: { objects: [
      { id: "title", type: "title", name: "title", x: 48, y: 720, width: 984, height: 120, opacity: 1, zIndex: 1,
        fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
    ]},
    portrait: { objects: [
      { id: "title", type: "title", name: "title", x: 48, y: 900, width: 984, height: 150, opacity: 1, zIndex: 1,
        fontFamily: "Plus Jakarta Sans", fontSize: 56, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top" },
    ]},
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/templates/template-list-client.tsx
git commit -m "feat: create blank now uses v2 canvas config"
```

### Task 25: Update API routes to accept v2 config

**Files:**
- Modify: `src/app/api/v1/templates/route.ts`
- Modify: `src/app/api/v1/templates/[id]/route.ts`

- [ ] **Step 1: Update POST /api/v1/templates to accept v2 config**

In the validation logic, detect `config.version === 2` and skip the old block validation. For v2, validate that formats exist with objects arrays.

- [ ] **Step 2: Update PATCH /api/v1/templates/:id to accept v2 config**

Same approach — detect version and skip legacy block validation for v2.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/templates/route.ts src/app/api/v1/templates/\[id\]/route.ts
git commit -m "feat: API routes accept v2 canvas config"
```

### Task 26: Verify full flow works

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to /admin/templates, click Create Blank**

Expected: Creates v2 template, redirects to editor page.

- [ ] **Step 3: In editor: add objects, move/resize them, change format, change colors**

Expected: All interactions work, canvas updates in real-time.

- [ ] **Step 4: Save and reload**

Expected: Template persists, editor loads with saved state.

- [ ] **Step 5: Test undo/redo**

Expected: Cmd+Z undoes last action, Cmd+Shift+Z redoes.

- [ ] **Step 6: Run existing tests**

```bash
npx vitest run
```

Expected: All tests pass (legacy path unchanged).

---

## Chunk 8: Seed v2 defaults & cleanup

### Task 27: Seed v2 default templates

**Files:**
- Modify: `convex/templates.ts`

- [ ] **Step 1: Update seedDefaults to include v2 templates**

Import `CANVAS_DEFAULTS` from canvas-defaults and seed alongside or replace existing defaults.

- [ ] **Step 2: Run seed**

```bash
npx convex run templates:seedDefaults
```

- [ ] **Step 3: Commit**

```bash
git add convex/templates.ts
git commit -m "feat: seed v2 canvas default templates"
```

### Post-stabilization cleanup (future task, not part of this plan)

Once the v2 editor is stable and all user templates have been migrated:
- Remove `src/lib/templates/config-renderer.tsx`
- Remove `src/lib/templates/config-types.ts`
- Remove `src/lib/templates/default-configs.ts` (only the legacy part)
- Remove `src/lib/templates/components/LogoBar.tsx`
- Remove `src/lib/templates/components/TextBlock.tsx`
- Remove legacy config validator from `convex/templates.ts`
- Tighten `convex/schema.ts` config field from `v.any()` back to typed validator
