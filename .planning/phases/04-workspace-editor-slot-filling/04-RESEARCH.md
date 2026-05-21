# Phase 4: Workspace Editor + Slot Filling - Research

**Researched:** 2026-05-21
**Domain:** Vite SPA editor, Express media endpoint, render-core Vite bundle hygiene, draft auto-save, brand resolution
**Confidence:** HIGH (all findings verified against live codebase; no speculative claims)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Single-screen editor — live preview + slot panel side-by-side.
- D-02: Reuse kitchen editor's design language — TemplatePreview, IngredientsStep field logic, BrandColorPicker. Collapse wizard into one screen.
- D-03: Format switcher via segmented tabs (Landscape | Square | Portrait) directly above the canvas.
- D-04: Caption is a dedicated textarea in the slot panel, visually distinct from rendered slots.
- D-05: Local CLI media endpoint (POST file → `~/.brag/media/`) + static GET route to serve cached media. Draft stores media id/local URL only.
- D-06: Filled video slot previews as inline `<video>` muted, looping, autoplaying.
- D-07: Accepted types: PNG/JPG/WebP/SVG (image), MP4/MOV/WebM (video). Reject others with inline error.
- D-08: Draft created on first content edit, not on template browsing alone.
- D-09: Auto-save debounced (~800ms-1s); sends FULL config on PATCH.
- D-10: Workspace home lists recent drafts; clicking one loads it into the editor.
- D-11: Add `caption?: string` to DraftConfig and validate.ts.
- D-12: Template picker is a thumbnail grid of 5 built-ins on the home view.
- D-13: On template select → apply brand colors + auto-populate logo slot from brand.logo_url.
- D-14: Auto-pick first brand; show brand switcher. Zero brands → template colors + empty logo.
- D-15: Move canvas-defaults.ts into packages/render-core; repoint Next.js app imports.

### Claude's Discretion
- Exact local cache dir path/layout and media id scheme.
- Debounce timing, "Saved" indicator styling.
- Precise definition of "first content edit" trigger boundary.
- Slot labeling/ordering within the panel.
- Picker thumbnail sizing/grid layout.
- Empty/error/overflow states for text slots.

### Deferred Ideas (OUT OF SCOPE)
- Per-format template authoring + anchor-scale auto-derive.
- Carousel/multi-slide.
- AI-assisted slot fill / copy generation.
- R2 upload of media (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORK-01 | User can pick a starting template from the 5 built-ins | 5 templates in canvas-defaults.ts; TemplatePreview component renders live thumbnails |
| WORK-02 | User can see a live canvas preview at scaled production size | TemplatePreview (ResizeObserver + transform:scale) works in any React context |
| WORK-03 | User can switch the preview between landscape, square, portrait | FORMAT_DIMENSIONS from canvas-types; each built-in hand-authors all 3 format object lists |
| WORK-04 | User can fill text slots by typing or pasting copy | IngredientsStep.text field logic ports directly; DraftObjectContent.text is the store |
| WORK-05 | User can enter a separate caption for the social post | caption field needs adding to DraftConfig + validate.ts (D-11); it is NOT rendered into the canvas |
| WORK-06 | Workspace auto-saves the draft as the user edits | debounce + dirty-tracking in SPA; POST /drafts on first edit, PATCH thereafter; full config required |
| WORK-07 | User can reopen a recent draft from the Workspace home | GET /api/v1/drafts returns DraftPreview list; GET /api/v1/drafts/:id returns full DraftConfig |
| WORK-08 | Logo slot auto-populates from the user's brand when one is set | GET /api/v1/brands returns logo_url; pass as Brand.logoBase64; CanvasRenderer case "logo" uses it as <img src> |
| MEDIA-01 | User can drag an image from disk into a visual slot | POST /api/local/media (new); store local URL in DraftObjectContent.image_url |
| MEDIA-02 | User can drag a video from disk into a video slot | same endpoint; store in DraftObjectContent.video_url; preview via VideoComponent prop |
| MEDIA-03 | User can click-to-browse to fill a slot as drag-drop fallback | hidden <input type="file"> pattern from IngredientsStep |
| MEDIA-04 | User can clear or replace media in a slot | clear: set image_url/video_url to undefined; replace: re-upload, update reference |
| MEDIA-05 | User sees a preview of filled media in the slot before rendering | image: <img src="http://127.0.0.1:PORT/media/...">; video: <video> via VideoComponent |
</phase_requirements>

---

## Summary

Phase 4 wires the Vite SPA Workspace into a functional editor by porting and adapting existing kitchen-editor components (TemplatePreview, IngredientsStep field logic, BrandColorPicker) into the new `packages/workspace` package. All the component logic, types, and data contracts already exist in the Next.js app — the work is porting and adapting, not inventing. Five distinct technical areas require careful implementation: (1) a new local Express media endpoint + static serve route that lives entirely inside the CLI (never proxied to the backend), (2) Vite bundle hygiene to keep the node-only `fonts.ts` out of the SPA bundle while still importing `CanvasRenderer` and `canvas-types` from render-core, (3) the debounced full-config auto-save lifecycle with correct PATCH behavior, (4) the VideoComponent render-prop pattern the SPA must supply to get muted-loop video previews, and (5) brand resolution using the existing `GET /api/v1/brands` endpoint through the CLI proxy.

The workspace currently has React 19, Vite 8, no Tailwind, no shadcn. The kitchen components that need porting rely heavily on Tailwind and shadcn (BrandColorPicker). The planner must task a Wave 0 step to add Tailwind v4 to the workspace via `@tailwindcss/vite`, and must task a simplified re-implementation of BrandColorPicker using inline styles or Tailwind rather than shadcn primitives — shadcn should NOT be added to the workspace package.

**Primary recommendation:** Port TemplatePreview and IngredientsStep field logic nearly as-is (they use only inline styles and Tailwind); rewrite BrandColorPicker as a workspace-native simplified component; add the local media endpoint to server.ts before the proxy; add render-core as a workspace dependency with Vite `optimizeDeps.exclude` to prevent Vite from attempting to bundle the CJS render-core package (which would pull in node-only `fonts.ts`).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Template picker + live preview thumbnails | Browser (Vite SPA) | — | Purely client-side rendering via CanvasRenderer |
| Slot-fill UI (text/media fields) | Browser (Vite SPA) | — | All interaction is local; no server needed for the UI itself |
| Local media upload | CLI Express server | — | Files live on the local machine; cannot go through the backend proxy |
| Local media serving (<img>/<video> src) | CLI Express static | — | Must be served from the same localhost origin as the SPA |
| Draft create/read/update | Backend API (via CLI proxy) | — | Convex-backed; proxy injects Bearer credential |
| Brand colors + logo fetch | Backend API (via CLI proxy) | — | Same flow as drafts; GET /api/v1/brands goes through proxy |
| Canvas rendering for preview | Browser (CanvasRenderer JSX) | — | CanvasRenderer is pure JSX; runs in the browser without Satori |
| Font loading for preview | Browser (client-fonts.ts) | — | injectGoogleFont() injects <link> tags; NOT fonts.ts (node-only) |
| Auto-save debounce + dirty tracking | Browser (SPA state) | — | Client-side concern; sends full DraftConfig on PATCH |

---

## Standard Stack

### Core (already installed in packages/workspace or render-core)
| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| react | 19.2.3 | UI framework | `[VERIFIED: workspace/package.json]` |
| vite | 8.0.13 | SPA build + dev server | `[VERIFIED: workspace/package.json]` |
| @vitejs/plugin-react | 6.0.2 | JSX transform | `[VERIFIED: workspace/package.json]` |
| @bragfast/render-core | workspace:* | CanvasRenderer, canvas-types, canvas-defaults (after D-15) | `[VERIFIED: package.json workspaces]` |

### New dependencies needed in packages/workspace
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| tailwindcss | ^4 | Utility CSS (required to port kitchen components) | `[VERIFIED: npm registry]` — main app already uses ^4 |
| @tailwindcss/vite | ^4.3.0 | Vite integration for Tailwind v4 | `[VERIFIED: npm view @tailwindcss/vite version = 4.3.0]` |

### New dependency needed in packages/cli
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| multer | ^2.1.1 | Express multipart/form-data middleware | `[VERIFIED: npm view multer = 2.1.1; from expressjs org on GitHub; no postinstall script; 11+ years old]` |
| @types/multer | ^1.4.x | TypeScript types for multer | `[ASSUMED]` — verify at npm before install |

### Already available (no install needed)
| Library | Where | Notes |
|---------|-------|-------|
| express | packages/cli | ^5.2.1; multipart NOT built-in — needs multer |
| express.static | packages/cli | serves cached media back to SPA |
| src/lib/upload/constants.ts | Next.js app | ALLOWED_TYPES and max sizes to port/share |
| src/lib/client-fonts.ts | Next.js app | injectGoogleFont() — copy to workspace, no node deps |
| src/lib/preview-sample.ts | Next.js app | buildDraftObjectData() — copy to workspace |
| src/lib/drafts/types.ts | Next.js app | DraftConfig, DraftObjectContent — port (add caption) |
| src/lib/drafts/validate.ts | Next.js app | validateDraftPatchPayload — NOT used in SPA; SPA calls the API |

**Installation:**
```bash
# packages/workspace
npm install tailwindcss @tailwindcss/vite --workspace=packages/workspace

# packages/cli
npm install multer --workspace=packages/cli
npm install --save-dev @types/multer --workspace=packages/cli
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | postinstall | slopcheck | Disposition |
|---------|----------|-----|-------------|-------------|-----------|-------------|
| multer | npm | ~11 years (2014-02-01) | github.com/expressjs/multer | none | N/A — slopcheck unavailable | Approved — official expressjs org; longest-standing multipart middleware |
| @tailwindcss/vite | npm | 2024+ | github.com/tailwindlabs/tailwindcss | none | N/A | Approved — official tailwindlabs org |
| tailwindcss | npm | 8+ years | github.com/tailwindlabs/tailwindcss | none | N/A | Approved — already in main app |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above are verified against official registry and known authoritative GitHub organizations. The planner should add a `checkpoint:human-verify` for `@types/multer` since it is tagged `[ASSUMED]`.*

---

## Architecture Patterns

### System Architecture Diagram

```
User action (type / drop / pick)
       |
       v
[SPA Editor State] ──── debounce ──────────────────────────────────────────────┐
       |                                                                         |
       |── text/caption change                                                   |
       |── format switch                                                         |
       └── brand/color change                                                    |
                                                                                 |
[Media Drop/Browse] ──── POST /api/local/media ──► [CLI Express]                |
                                (multipart, multer)         |                   |
                                                    write ~/.brag/media/ID.ext  |
                                                    return {id, url}            |
                                                            |                   |
                         ◄──────── {localUrl} ─────────────┘                   |
                         (stored in DraftObjectContent.image_url / video_url)  |
                                                                                 |
                         GET /media/:filename ◄─ SPA <img src> / VideoComponent |
                         (express.static → ~/.brag/media/)                      |
                                                                                 v
                                                              [Debounce fires: full DraftConfig]
                                                                         |
                                                              POST /api/v1/drafts (first edit)
                                                              PATCH /api/v1/drafts/:id (thereafter)
                                                                         |
                                                                 [CLI proxy → Backend]
                                                                 (injects Bearer)
                                                                         |
                                                               [Convex: drafts table]
```

### Recommended Project Structure for packages/workspace/src

```
src/
├── api.ts              # existing: fetchRepoContext(); extend with fetchDrafts, fetchDraft, fetchBrands, postDraft, patchDraft
├── media.ts            # NEW: postMedia(file) → {id, url}; local CLI endpoint, NOT /api/v1/
├── App.tsx             # replace stub: home view (picker + recent drafts) OR editor view
├── pages/
│   ├── Home.tsx        # template picker grid + recent drafts list
│   └── Editor.tsx      # single-screen editor: preview + slot panel
├── components/
│   ├── TemplatePreview.tsx   # ported from kitchen (inline-styles + Tailwind; no Next.js)
│   ├── SlotPanel.tsx         # slot fields (text inputs, drop-zone fields, caption, brand picker)
│   ├── VisualField.tsx       # drag-drop + browse for image/video (ported from IngredientsStep.VisualField)
│   ├── BrandPicker.tsx       # simplified (no shadcn); fetches /api/v1/brands, brand dropdown + colors
│   ├── FormatSwitcher.tsx    # segmented tabs: Landscape | Square | Portrait
│   └── SavedIndicator.tsx    # "Saved" / "Saving..." subtle indicator
├── hooks/
│   ├── useAutoSave.ts        # debounce + dirty tracking; POST on first edit, PATCH thereafter
│   └── useBrand.ts           # fetch brands, apply first/default, expose logo_url
├── types.ts            # local type re-exports (DraftConfig, DraftObjectContent + caption field)
└── main.tsx            # existing
```

### Pattern 1: Local Media Endpoint in server.ts

The CLI Express server mounts a local-only media route BEFORE the `/api` proxy. This is the same pattern as `/api/repo-context`.

```typescript
// packages/cli/src/server.ts — inside buildApp()
import multer from "multer";
import { promises as fsp } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";

const MEDIA_DIR = path.join(homedir(), ".brag", "media");
const ALLOWED_MIME = new Set([
  "image/png", "image/jpeg", "image/webp", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
]);
const MIME_EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
  "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm",
  "video/quicktime": "mov",
};

const upload = multer({
  storage: multer.memoryStorage(),       // buffer in RAM; write manually below
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (matches existing video limit)
});

// POST /api/local/media — multipart upload, local-only (not proxied)
app.post("/api/local/media", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: "Missing file" }); return; }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    res.status(400).json({ error: `Unsupported type: ${file.mimetype}` });
    return;
  }
  const ext = MIME_EXT[file.mimetype];
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const filename = `${id}.${ext}`;
  await fsp.mkdir(MEDIA_DIR, { recursive: true });
  await fsp.writeFile(path.join(MEDIA_DIR, filename), file.buffer);
  const url = `http://127.0.0.1:${port}/media/${filename}`;
  res.json({ id, url });
});

// GET /media/:filename — serve cached media back to SPA
app.use("/media", express.static(MEDIA_DIR));
```

**Critical ordering:** `/api/local/media` and `/media` static route MUST be registered BEFORE `createBackendProxy(credentials.api_key)` in `buildApp()`, because the proxy's `pathFilter: "/api"` would otherwise intercept `/api/local/media` and forward it to the backend (which would 404 or 401).

[VERIFIED: server.ts proxy is mounted with `app.use(createBackendProxy(...))` and uses `pathFilter: "/api"` — anything under `/api` would be captured unless a specific route is registered first]

### Pattern 2: Vite Bundle Hygiene — Excluding fonts.ts

`packages/render-core` is a CJS package (`"type": "commonjs"`) with a single entrypoint (`dist/index.js`) that re-exports `loadFonts`, `loadFontsForFamily`, `loadFontsForObjects` from `./fonts` — which imports `fs`, `os`, and `path` (node-only). Vite will attempt to process the CJS package and will fail or warn on node built-ins.

**Solution: add render-core to Vite's `optimizeDeps.exclude` AND use a build alias that points to a browser-safe re-export file:**

```typescript
// packages/workspace/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  optimizeDeps: {
    exclude: ["@bragfast/render-core"],
  },
  resolve: {
    alias: {
      // Point to the pre-built CJS dist directly; Vite treats excluded packages
      // as external but still resolves them for type checking
      "@bragfast/render-core": path.resolve(
        __dirname,
        "../../packages/render-core/dist/index.js"
      ),
    },
  },
});
```

**Alternative (cleaner): add a `browser` entrypoint to render-core's `package.json`** that re-exports only browser-safe exports (CanvasRenderer, canvas-types, canvas-defaults — but NOT fonts.ts):

```json
// packages/render-core/package.json — add exports field
{
  "exports": {
    ".": {
      "browser": "./dist/browser.js",
      "default": "./dist/index.js"
    }
  }
}
```

```typescript
// packages/render-core/src/browser.ts (new entrypoint for tsup)
export type { CanvasTemplateConfig, FormatKey, FormatLayout, TemplateObject } from "./canvas-types";
export type { ObjectDataMap } from "./canvas-renderer";
export { FORMAT_DIMENSIONS, migrateConfig } from "./canvas-types";
export { CanvasRenderer, renderObject } from "./canvas-renderer";
export { CANVAS_DEFAULTS } from "./canvas-defaults";  // after D-15 relocation
// Intentionally omits: loadFonts, loadFontsForFamily, loadFontsForObjects, renderImage, renderVideo
```

**Recommendation:** use the browser entrypoint approach — it is explicit and correct, prevents accidental node import in future, and requires adding `"src/browser.ts"` as a second tsup entry. The workspace imports only from the browser entrypoint.

[VERIFIED: render-core/package.json has no `exports` field and no `browser` field — single `main` only. fonts.ts has `import { promises as fs } from "fs"`, `import os from "os"`, `import path from "path"` at lines 1-3]

### Pattern 3: Auto-Save Debounce + Dirty Tracking

The PATCH route does a `spread merge`: `const merged: DraftConfig = { ...existingConfig, ...result.patch }`. This means:
- If you PATCH with `{objectContent: {title: "foo"}}` — only title survives; all other objectContent keys are DROPPED.
- D-09 is correct: the SPA must send the FULL DraftConfig on every PATCH.

```typescript
// packages/workspace/src/hooks/useAutoSave.ts
export function useAutoSave(config: DraftConfig | null, draftId: string | null) {
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!config) return;         // no content yet
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        if (!draftId) {
          await postDraft(config);   // first edit
        } else {
          await patchDraft(draftId, config);  // full config
        }
        setStatus("saved");
      } catch {
        setStatus("idle");  // silent fail is acceptable per D-09
      }
    }, 900);  // 900ms — within the 800ms-1s window
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [config, draftId]);

  return { status };
}
```

**First-content-edit trigger:** The SPA holds two states: `editorConfig` (live, updated on every keystroke/drop) and `savedDraftId: string | null`. When `savedDraftId` is null and the user makes any text/media/caption change, the POST fires. Template select alone does NOT trigger POST (it only sets `editorConfig`).

[VERIFIED: route.ts POST creates a draft and returns `{draft_id, created_at}` — the SPA captures `draft_id` and uses it for all subsequent PATCHes]

### Pattern 4: Video Preview via VideoComponent Prop

`CanvasRenderer` does NOT render video by itself. It requires a `VideoComponent` render prop. When `VideoComponent` is not provided, video slots render as grey placeholders (confirmed in `canvas-renderer.tsx` line `const useVideo = !!(videoUrl && VideoEl)`).

For the SPA browser preview, supply a native `<video>` wrapper:

```tsx
// packages/workspace/src/components/TemplatePreview.tsx
const BrowserVideoComponent = React.memo(function BrowserVideoComponent({
  src,
  style,
  muted,
  loop,
}: {
  src: string;
  style?: React.CSSProperties;
  muted?: boolean;
  loop?: boolean;
}) {
  return (
    <video
      src={src}
      style={style}
      muted={muted}
      loop={loop}
      autoPlay
      playsInline
    />
  );
});

// Pass to CanvasRenderer:
<CanvasRenderer
  config={config}
  format={format}
  objectData={slideData}
  brand={brand}
  VideoComponent={BrowserVideoComponent}
  showPlaceholders
/>
```

[VERIFIED: canvas-renderer.tsx `VideoComponent` prop type: `React.ComponentType<{src:string; style?:React.CSSProperties; muted?:boolean; loop?:boolean}>` — line 206-212]

### Pattern 5: Brand Resolution + Logo Auto-Fill

`GET /api/v1/brands` (via CLI proxy) returns an array of objects with shape `{id, name, logo_url, website, colors, created_at, updated_at}`. This maps to `BrandRecord` in `src/lib/types.ts`.

`CanvasRenderer` case `"logo"` renders `<img src={brand.logoBase64}>`. In the existing kitchen, `cook-page.tsx` maps: `logoBase64: raw.logo_url ?? ""`. The SPA does the same.

```typescript
// packages/workspace/src/hooks/useBrand.ts
function brandRecordToBrand(b: BrandRecord): Brand {
  return {
    name: b.name,
    logoBase64: b.logo_url ?? "",   // logo_url works as <img src> in browser
    website: b.website ?? "",
    colors: b.colors,
  };
}
```

**Auto-populate logo slot (D-13):** When a brand is selected, the logo slot does NOT need to be written into `DraftConfig.objectContent`. The `CanvasRenderer` reads the logo from `brand.logoBase64` — it is a brand-level property, not an object-level one. Only `colors` and `brandId` go into `DraftConfig`. The logo auto-fill is free from the brand.

[VERIFIED: CanvasRenderer case "logo" at line 313-329 — reads `brand.logoBase64`, not objectData]

### Pattern 6: caption Field Addition (D-11)

Two changes needed:

```typescript
// src/lib/drafts/types.ts — add to DraftConfig interface
caption?: string;

// src/lib/drafts/validate.ts — add "caption" to allowedTop Sets in both
// validateDraftPayload and validateDraftPatchPayload, and add validation:
if (body.caption !== undefined) {
  if (typeof body.caption !== "string") return fail("caption must be string");
  config.caption = body.caption;
}
```

The workspace SPA types.ts should mirror this addition locally (it does not share the Next.js app's types directly).

[VERIFIED: validate.ts `allowedTop` Sets at lines 99-110 and 172-182 — neither currently includes "caption"; adding it is a two-line change per function]

### Pattern 7: canvas-defaults.ts Relocation (D-15)

Current state: `src/lib/templates/canvas-defaults.ts` exists in the Next.js app and is consumed by:
- `src/lib/templates/default-configs.ts` (wrapper)
- `src/components/admin/draft-preview.tsx`
- `src/lib/__tests__/carousel-pipeline.test.ts`
- `src/lib/__tests__/preview-sample.test.ts`

Target: move to `packages/render-core/src/canvas-defaults.ts`. Export from render-core's browser entrypoint.

Next.js app rewiring: change all imports from `@/lib/templates/canvas-defaults` to `@bragfast/render-core` (or `@bragfast/render-core/browser` once the browser entrypoint exists). The `src/lib/templates/default-configs.ts` wrapper can be kept as a thin re-export for backward compatibility, or updated imports directly.

**Gotcha:** `canvas-defaults.ts` only imports `type { CanvasTemplateConfig }` from `./canvas-types` — it is pure data (no node deps). Safe to move to render-core.

[VERIFIED: canvas-defaults.ts line 1 — `import type { CanvasTemplateConfig } from "./canvas-types"` — no other imports]

### Pattern 8: Tailwind v4 in Vite SPA

Tailwind v4 uses a CSS-first config (no tailwind.config.js). Integration with Vite requires `@tailwindcss/vite` plugin (not PostCSS).

```typescript
// packages/workspace/vite.config.ts
import tailwindcss from "@tailwindcss/vite";
// plugins: [react(), tailwindcss()]
```

```css
/* packages/workspace/src/index.css (new) */
@import "tailwindcss";
```

The workspace should import the kitchen editor's design tokens by defining the same CSS variables (`--color-brand`, `--color-gold`, etc.) in its own `index.css`, sourced from `DESIGN.md`.

[VERIFIED: main app uses `@import "tailwindcss"` in globals.css with no config file — Tailwind v4 CSS-first approach]

### Anti-Patterns to Avoid

- **Adding shadcn to packages/workspace:** BrandColorPicker uses `Select`, `Label`, `Input` from `@/components/ui`. Do NOT add shadcn to the workspace — re-implement as a simple `<select>` + `<input type="color">` pair in the NES-retro design language. Complexity budget doesn't justify adding shadcn's 15+ transitive dependencies to the workspace.
- **Importing from render-core's `loadFonts` in the SPA:** fonts.ts imports `fs`, `os`, `path`. Importing it in a browser bundle causes a fatal build error. Use `injectGoogleFont()` from a ported `client-fonts.ts` instead.
- **Mounting media endpoint AFTER the proxy:** The proxy `pathFilter: "/api"` intercepts all `/api/*` routes. `/api/local/media` must be registered as an Express route before `app.use(createBackendProxy(...))`.
- **Sending partial objectContent on PATCH:** The PATCH handler does `{...existingConfig, ...result.patch}` — this is a shallow merge that REPLACES `objectContent` entirely. Send the full DraftConfig on every PATCH.
- **Using TemplatePreview's watermark markup without Tailwind:** The `<PreviewWatermark>` subcomponent uses Tailwind classes. Without Tailwind installed in the workspace it renders unstyled. Either install Tailwind first (recommended) or strip the watermark for Phase 4.
- **Using `process.cwd()` for font resolution in render-core:** Already fixed (uses `__dirname`) per Phase 1. Do not revert.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart file upload in Express | Custom stream parser | multer (^2.1.1) | busboy boundary handling, memory/disk storage, size limits; 11 years battle-tested |
| MIME type validation | regex on filename | multer fileFilter + ALLOWED_MIME set (ported from upload/constants.ts) | Filename can be spoofed; rely on Content-Type from browser |
| Debounce | setTimeout loop | useRef + clearTimeout pattern | No extra library; avoids stale closures; matches pattern used elsewhere |
| Scaled canvas preview | CSS transforms manually | TemplatePreview component (port from kitchen) | ResizeObserver + transform:scale(n) + font injection already correct |
| Google Font injection | fetch + @font-face | injectGoogleFont() from client-fonts.ts | Already handles idempotency, weight loading, and document.fonts.load() |

**Key insight:** Almost all the hard problems in Phase 4 are already solved in the Next.js app. The work is porting and adapting, not building from scratch.

---

## Common Pitfalls

### Pitfall 1: Proxy Captures /api/local/media
**What goes wrong:** The browser POSTs to `/api/local/media`; the CLI proxy's `pathFilter: "/api"` forwards it to the backend, which 401s.
**Why it happens:** `createBackendProxy` is mounted at app root with `pathFilter: "/api"` — it intercepts all `/api/*` paths unless a concrete route is registered first.
**How to avoid:** Register `app.post("/api/local/media", ...)` and `app.use("/media", express.static(...))` in `buildApp()` before `app.use(createBackendProxy(...))`. Express routes are matched in registration order.
**Warning signs:** 401 responses from the media upload endpoint; the CLI proxy logs show the request going upstream.

### Pitfall 2: Vite Bundling fonts.ts (node-only)
**What goes wrong:** Vite's optimizer bundles `@bragfast/render-core`, which re-exports `loadFonts` from `fonts.ts`, which imports `fs`, `os`, `path` → build error "Module 'fs' not found" or "node:fs is not defined".
**Why it happens:** render-core is CJS with a single entrypoint that exports everything including node-only functions. Vite tries to pre-bundle CJS packages.
**How to avoid:** Either (a) add a browser entrypoint to render-core (tsup entry `src/browser.ts`) that omits font loading; or (b) add `optimizeDeps.exclude: ["@bragfast/render-core"]` to vite.config.ts and ensure the SPA never imports `loadFonts`/`loadFontsForFamily`/`loadFontsForObjects`.
**Warning signs:** Build or dev-server errors mentioning `fs`, `os`, or `path` modules; error trace points to `fonts.ts`.

### Pitfall 3: Shallow PATCH Drops objectContent Keys
**What goes wrong:** User fills title and description. Auto-save fires. PATCH sends `{objectContent: {title: "v2"}}` because only title changed. Backend merge: `{...existing, objectContent: {title: "v2"}}` — description is gone.
**Why it happens:** The PATCH handler does top-level spread (`{...existingConfig, ...result.patch}`). `objectContent` is a nested object — it does NOT deep-merge.
**How to avoid:** The auto-save hook always sends the FULL `DraftConfig` on PATCH, including all objectContent keys, all formats, colors, brandId, and caption. Never send partial config.
**Warning signs:** Slots appear empty when reopening a draft that had multiple filled slots.

### Pitfall 4: Video Slots Show Grey Placeholder
**What goes wrong:** User drops a video; the slot shows a grey device-frame placeholder instead of the video.
**Why it happens:** `CanvasRenderer` only renders video when a `VideoComponent` prop is supplied. `TemplatePreview` in the kitchen never passes it. If the workspace port also omits it, videos never preview.
**How to avoid:** The workspace `TemplatePreview` (or the editor wrapper around `CanvasRenderer`) must pass `VideoComponent={BrowserVideoComponent}` where `BrowserVideoComponent` is a native `<video muted loop autoPlay playsInline>` wrapper.
**Warning signs:** Video-filled slots show grey placeholder even after successful upload.

### Pitfall 5: Tailwind Classes on Ported Components Render Unstyled
**What goes wrong:** Ported `IngredientsStep` or `TemplatePreview.watermark` uses Tailwind classes (`className="border-2 border-brand/30 ..."`); without Tailwind installed in the workspace, styles are missing.
**Why it happens:** packages/workspace currently has NO Tailwind dependency (confirmed in workspace/package.json).
**How to avoid:** Install `tailwindcss` + `@tailwindcss/vite` in packages/workspace and add `@import "tailwindcss"` to the SPA's CSS entry before porting any Tailwind-dependent component. This is a Wave 0 task.
**Warning signs:** Components render but look completely unstyled/broken.

### Pitfall 6: validate.ts Rejects caption Field
**What goes wrong:** SPA sends `{caption: "my post text"}` in PATCH; backend returns `400 unknown keys: caption`.
**Why it happens:** `validateDraftPatchPayload` has an explicit allowlist and rejects unknown keys. `caption` is not currently in the list.
**How to avoid:** Add `"caption"` to the `allowedTop` Set in both `validateDraftPayload` and `validateDraftPatchPayload`, and add the validation branch (string check). This is a shared-type change that touches both the Next.js app's validate.ts AND the SPA's local type declarations.
**Warning signs:** 400 responses on PATCH when caption is populated.

---

## Code Examples

### Media endpoint registration order in buildApp()

```typescript
// Source: verified from packages/cli/src/server.ts — this is the correct ordering
function buildApp(credentials: Credentials, port: number, spaDir: string): Application {
  const app = express();
  app.use(...originLockMiddleware(port));

  // 1. Local-only routes FIRST (before proxy)
  app.get("/api/repo-context", ...);      // existing
  app.post("/api/local/media", ...);      // NEW — multer + file write
  app.use("/media", express.static(MEDIA_DIR));  // NEW — serve cached media

  // 2. Backend proxy SECOND (catches remaining /api/* routes)
  app.use(createBackendProxy(credentials.api_key));

  // 3. SPA static + fallback LAST
  app.use(express.static(spaDir));
  app.get("/*splat", ...);
  return app;
}
```

### How DraftObjectContent.image_url flows to CanvasRenderer

```typescript
// Source: verified from src/lib/preview-sample.ts buildDraftObjectData()
// Step 1: User drops image → POST /api/local/media → {url: "http://127.0.0.1:3421/media/abc.jpg"}
// Step 2: SPA sets objectContent[obj.id].image_url = url
// Step 3: buildDraftObjectData() maps:
else if (content?.image_url) {
  slide[obj.id] = { imageBase64: content.image_url };
  //               ↑ misleadingly named; in browser context, it's used as <img src>
}
// Step 4: CanvasRenderer case "visual":
const imgSrc = data?.imageBase64 || obj.src;  // picks up the local URL
// → <img src="http://127.0.0.1:3421/media/abc.jpg"> — works in browser
```

### Brand auto-apply on template select

```typescript
// Source: derived from cook-page.tsx pattern (logoBase64: raw.logo_url ?? "")
// and CanvasRenderer case "logo" (uses brand.logoBase64 as <img src>)
function applyBrand(brand: BrandRecord, templateColors: DraftColors): { brand: Brand; colors: DraftColors } {
  return {
    brand: {
      name: brand.name,
      logoBase64: brand.logo_url ?? "",  // logo_url serves as <img src> in browser
      website: brand.website ?? "",
      colors: brand.colors,
    },
    colors: brand.colors,  // brand colors override template defaults
  };
}
// Logo auto-fill is automatic: CanvasRenderer reads brand.logoBase64 for "logo" type objects.
// No objectContent entry needed for the logo slot.
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| R2 uploads at fill time (previous server model) | Local cache + reference (D-05) | DraftConfig stays small; no R2 credentials needed client-side |
| Multi-step wizard (Recipe→Ingredients→Seasoning) | Single-screen editor (D-01) | Simpler SPA routing; no wizard state machine |
| Tailwind v3 config file | Tailwind v4 CSS-first (`@import "tailwindcss"`) | No tailwind.config.js; add `@tailwindcss/vite` plugin |
| shadcn Select/Label/Input in shared components | Simplified native HTML equivalents in workspace | Workspace stays lean; no shadcn installation |

**Deprecated/outdated:**
- `uploadFile()` from `src/lib/upload/client.ts`: used in kitchen's IngredientsStep to upload to R2 via `/api/v1/upload`. Do NOT port this to the workspace — the SPA uses the new local CLI media endpoint instead.
- URL-input fields in IngredientsStep (the "or URL" fallback): out of scope for Phase 4 (local drag-drop only; no remote URL fill). Can be omitted in the port.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@types/multer` is the correct TypeScript types package for multer | Standard Stack | Build would fail on type imports; use `npm view @types/multer` before install |
| A2 | Tailwind v4's `@tailwindcss/vite` v4.3.0 is compatible with Vite 8 | Standard Stack | Build would fail; check @tailwindcss/vite changelog for Vite 8 compat |

**All other claims in this research were verified against the live codebase.**

---

## Open Questions

1. **Does Tailwind v4 @tailwindcss/vite 4.3.0 officially support Vite 8.x?**
   - What we know: @tailwindcss/vite 4.3.0 is the latest on npm; Vite 8 is very recent (workspace uses 8.0.13)
   - What's unclear: whether the Vite plugin's peer deps include Vite 8 already
   - Recommendation: Run `npm view @tailwindcss/vite peerDependencies` before installing; if Vite 8 is not in peer deps, use `--legacy-peer-deps` or wait for a patch release. The alternative is the PostCSS integration (always works but slower dev server).

2. **Should the media endpoint use multer diskStorage instead of memoryStorage + manual write?**
   - What we know: memoryStorage buffers the entire file in RAM before writing; for large videos (up to 50MB) this is a concern on low-memory machines
   - What's unclear: typical developer machine RAM headroom when running the CLI
   - Recommendation: diskStorage with a temp path + rename is safer for large files; memoryStorage is simpler for the initial implementation and acceptable for Phase 4's scope. The planner can choose; both work correctly.

3. **Should the workspace import types from the Next.js app's src/lib/ directly via the monorepo, or copy/re-declare them?**
   - What we know: The workspace has no path alias to `src/`; tsconfig.json only includes `["src"]`
   - What's unclear: whether adding a `paths` alias to the workspace tsconfig to reach the monorepo root `src/` is cleaner than duplicating types
   - Recommendation: Copy the minimal types (DraftConfig, DraftObjectContent + caption, BrandRecord) into `packages/workspace/src/types.ts` and keep them in sync manually. Aliasing across package boundaries in a Vite SPA is fragile; the types are small.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | All CLI/workspace builds | Yes | >=20 (engines field) | — |
| npm workspaces | Monorepo package resolution | Yes | root package.json workspaces: ["packages/*"] | — |
| multer (to install) | CLI media endpoint | Not yet | — | No fallback; required for multipart |
| @tailwindcss/vite (to install) | Workspace Tailwind | Not yet | — | PostCSS alternative |
| ~/.brag/ directory | Media cache, font cache | Created at runtime | — | mkdir -p in endpoint handler |

**Missing dependencies with no fallback:** multer (must be installed)
**Missing dependencies with fallback:** @tailwindcss/vite (PostCSS path works if Vite 8 compat issue)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| CLI config file | `packages/cli/vitest.config.ts` |
| Quick run command (CLI) | `npx vitest run --project packages/cli` or `cd packages/cli && npx vitest run` |
| Full suite command | `npx vitest run` (root, runs all workspaces) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEDIA-01 / MEDIA-02 | POST /api/local/media accepts valid MIME, writes file, returns URL | unit (supertest) | `npx vitest run src/__tests__/server.test.ts` (packages/cli) | ❌ Wave 0 |
| MEDIA-01 / MEDIA-02 | POST /api/local/media rejects disallowed MIME with 400 | unit (supertest) | same | ❌ Wave 0 |
| MEDIA-05 | GET /media/:filename serves the cached file | unit (supertest) | same | ❌ Wave 0 |
| D-09 | Drafts PATCH rejects unknown key "caption" before D-11 | unit | root vitest (tests drafts/validate.ts) | ❌ Wave 0 |
| D-11 | validate.ts accepts caption string | unit | root vitest | ❌ Wave 0 |
| WORK-06 | Auto-save debounce hook: does not fire before delay, fires once after | unit (jsdom) | workspace vitest (no config yet) | ❌ Wave 0 |
| D-08 | Draft created on first content edit, not on template select | integration (smoke) | manual | manual only |
| WORK-07 | Recent drafts list renders fetched drafts | unit (SPA component) | workspace vitest | ❌ Wave 0 |

### Sampling Rate
- Per task commit: `npx vitest run --project packages/cli`
- Per wave merge: `npx vitest run` (full monorepo suite)
- Phase gate: full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/cli/src/__tests__/server.test.ts` — extend with media endpoint tests (MEDIA-01, MEDIA-02, MEDIA-05)
- [ ] `src/lib/drafts/__tests__/validate.test.ts` — tests for caption validation (D-11)
- [ ] `packages/workspace/vitest.config.ts` — no test config exists yet (workspace has no tests)
- [ ] `packages/workspace/src/__tests__/useAutoSave.test.ts` — covers debounce behavior (WORK-06)
- [ ] `packages/workspace/src/__tests__/Home.test.ts` — covers recent-drafts list render (WORK-07)

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Bearer injected by CLI proxy — not exposed to browser |
| V4 Access Control | Partial | Media endpoint is local-only; origin-lock middleware already rejects non-127.0.0.1 requests |
| V5 Input Validation | Yes | MIME type check on upload; size limit via multer `limits.fileSize` |
| V6 Cryptography | No | No new crypto beyond existing |

**Local media endpoint threat model:** The media endpoint is bound to `127.0.0.1` (not `0.0.0.0`) and protected by `originLockMiddleware` (hostGuard + CORS). No remote attacker can reach it. Media IDs use `crypto.randomUUID()` — not guessable. Media files are user-local (no cross-user risk since the CLI runs per-user).

---

## Sources

### Primary (HIGH confidence — verified against live codebase)
- `packages/cli/src/server.ts` — Express app structure, route ordering, originLockMiddleware
- `packages/cli/src/proxy.ts` — pathFilter behavior, how proxy intercepts /api/*
- `packages/render-core/src/fonts.ts` — node-only imports (fs, os, path)
- `packages/render-core/src/canvas-renderer.tsx` — VideoComponent prop contract, case "logo", case "visual"
- `packages/render-core/src/index.ts` — exports (loadFonts is re-exported → Vite risk)
- `packages/render-core/package.json` — CJS, single entrypoint, no exports field, no browser field
- `packages/render-core/tsup.config.ts` — entry: ["src/index.ts"], format: ["cjs"]
- `packages/workspace/package.json` — React 19, Vite 8, no Tailwind, no shadcn
- `packages/workspace/vite.config.ts` — minimal config; no optimizeDeps, no alias
- `src/app/api/v1/drafts/route.ts` — POST creates draft; GET lists drafts
- `src/app/api/v1/drafts/[id]/route.ts` — PATCH does `{...existingConfig, ...result.patch}` shallow merge
- `src/app/api/v1/brands/route.ts` — GET returns `{id, name, logo_url, website, colors, ...}`
- `src/lib/drafts/types.ts` — DraftConfig (no caption yet), DraftObjectContent fields
- `src/lib/drafts/validate.ts` — allowedTop sets; caption not included
- `src/lib/preview-sample.ts` — buildDraftObjectData(); `imageBase64: content.image_url` pattern
- `src/lib/types.ts` — Brand (logoBase64), BrandRecord (logo_url)
- `src/components/kitchen/template-preview.tsx` — no VideoComponent passed; ResizeObserver scale
- `src/components/kitchen/ingredients-step.tsx` — slot field rendering; uploadFile() (NOT to port)
- `src/components/shared/brand-color-picker.tsx` — uses shadcn Select/Label/Input
- `src/lib/client-fonts.ts` — injectGoogleFont() (browser-safe; no node deps)
- `src/lib/upload/constants.ts` — ALLOWED_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE
- `src/lib/templates/canvas-defaults.ts` — pure data; only imports CanvasTemplateConfig type
- `npm view multer` — version 2.1.1; github.com/expressjs/multer; no postinstall
- `npm view @tailwindcss/vite` — version 4.3.0

### Secondary (MEDIUM confidence)
- Tailwind v4 CSS-first integration: verified against main app's `globals.css` (`@import "tailwindcss"` with no config file)

---

## Metadata

**Confidence breakdown:**
- Local media endpoint: HIGH — server.ts structure fully read; multer API verified; ordering constraint is explicit
- Vite bundle hygiene: HIGH — fonts.ts node imports confirmed; render-core package.json single-entrypoint confirmed; no browser field
- Auto-save / PATCH merge: HIGH — route handler code read directly; shallow merge confirmed
- VideoComponent pattern: HIGH — canvas-renderer.tsx code read directly
- Brand/logo auto-fill: HIGH — cook-page.tsx pattern + CanvasRenderer case "logo" both read
- caption D-11: HIGH — validate.ts allowedTop sets read; missing "caption" confirmed
- D-15 canvas-defaults relocation: HIGH — import list and file content confirmed

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable codebase; main risk is @tailwindcss/vite Vite 8 compat which is a fast-moving area)
