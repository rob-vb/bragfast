---
title: "feat: Template editor background modes + right sidebar reorganization"
type: feat
status: completed
date: 2026-04-02
origin: docs/brainstorms/2026-04-02-editor-background-modes-requirements.md
---

# Template Editor: Background Modes + Right Sidebar Reorganization

## Overview

Reorganize the template editor so template-level settings (Colors, Video Preset) move to the right sidebar when no object is selected, and add a Background section with three modes: Color, Image, and Mesh Gradient. This eliminates the workaround of creating full-size image objects for rich backgrounds.

## Problem Frame

Right sidebar is wasted space when no object is selected. Template-level settings (Colors, Video Preset) are crammed into the left sidebar alongside format switching and objects. Users who want gradient or image backgrounds must hack it with image objects, causing layering and animation issues. (see origin: `docs/brainstorms/2026-04-02-editor-background-modes-requirements.md`)

## Requirements Trace

- R1-R3, R19. Sidebar reorganization — move Colors + Video Preset to right sidebar, add context header
- R4-R7. Background mode selector with Color as default (collapsed body)
- R8-R10. Image background mode — upload, preview, baked into template
- R11-R14. Mesh gradient mode — 3 colors, randomize positions, Satori-compatible
- R15-R16. State preservation across mode switches, atomic undo
- R17-R18. Render correctly in editor, Satori pipeline, and Remotion; backward compatible

## Scope Boundaries

- No API-level background override (fast-follow candidate)
- No draggable gradient position controls (randomize only)
- No grain/noise texture, per-format backgrounds, or iridescent effects

## Context & Research

### Relevant Code and Patterns

- **Reducer:** `src/components/editor/editor-context.tsx` — EditorAction union, NON_UNDOABLE_ACTIONS set, undoable reducer with past/future stacks, COMMIT_MOVE for atomic undo
- **Upload flow:** `src/components/editor/image-properties.tsx:117-134` — POST to `/api/v1/upload`, store URL via UPDATE_PROPERTY
- **Brand colors:** `src/components/editor/brand-color-section.tsx` — SET_COLORS spreads single key, SET_BRAND includes previewColors
- **Prefetch:** `src/lib/pipeline/shared.ts:89-124` — prefetchStaticImages walks objects for src, injectStaticImages fills slideDataMaps
- **Canvas renderer:** `src/lib/templates/canvas-renderer.tsx:30-62` — root div `background: colors.background`
- **Video renderer:** `src/remotion/VideoCanvasComposition.tsx:121-129` — AbsoluteFill `backgroundColor: colors.background`
- **Editor canvas:** `src/components/editor/editor-canvas.tsx:201` — `background: state.config.colors.background`
- **Template clone:** `convex/templates.ts:179-216` — copies full config, background will propagate automatically
- **Convex validator:** `convex/templates.ts:56-69` — `canvasConfigValidator` needs `background` field

### Institutional Learnings

- `docs/solutions/best-practices/role-based-animation-classification-2026-04-02.md` — explicit flags over heuristics for background images

## Key Technical Decisions

- **BackgroundConfig as discriminated union:** `{ mode: "color" } | { mode: "image"; imageUrl: string } | { mode: "mesh_gradient"; colors: [string,string,string]; positions: {x:number,y:number}[] }`. Optional field on CanvasTemplateConfig — undefined = color mode for backward compat.
- **Mesh gradient via layered radial-gradient():** 3 elliptical radial-gradient CSS layers at configurable positions, fading to transparent, over a solid base color. Satori-compatible.
- **Image background via `<img>` tag:** Satori doesn't support `background-image: url()`. Each renderer constructs its own absolutely-positioned `<img>` with objectFit: cover. resolveBackground returns data only (css + imageUrl), not JSX, since Satori needs base64 while Remotion/editor use URLs.
- **Single SET_BACKGROUND action:** One reducer action handles all mode switches. Preserves previous mode configs in a `backgroundStash` map within state so switching back restores previous settings. Each dispatch = one atomic undo step.
- **Extend prefetchStaticImages:** Add `config.background?.imageUrl` to the set of URLs fetched to base64 before Satori render.

## Open Questions

### Resolved During Planning

- **Cross-repo sharing:** VideoCanvasComposition lives in bragfast itself (`src/remotion/`). Helper can be a direct import — no cross-repo issue.
- **Convex schema:** Add `background: v.optional(v.any())` to `canvasConfigValidator`. The validator already doesn't include `animation_preset`, so loose validation for new fields is the established pattern.
- **Gradient positions:** Store as `{x: number, y: number}[]` (3 entries). Spread is constant. Randomize regenerates x/y within bounds.
- **Template duplication:** Config is copied as-is by clone mutation — background config propagates automatically.

### Deferred to Implementation

- Exact gradient opacity values and ellipse sizes need visual iteration
- Whether Satori's SVG-based radial-gradient blending perfectly matches browser rendering — verify during implementation and adjust if needed

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
BackgroundConfig (discriminated union on "mode"):
  "color"          → no extra data, uses colors.background
  "image"          → { imageUrl: string }
  "mesh_gradient"  → { colors: [string, string, string], positions: [{x,y}, {x,y}, {x,y}] }

CanvasTemplateConfig.background?: BackgroundConfig  (undefined = color mode)

resolveBackground(config, colors):
  color/undefined → { css: colors.background, imageUrl: undefined }
  mesh_gradient   → { css: "radial-gradient(...), radial-gradient(...), radial-gradient(...), base", imageUrl: undefined }
  image           → { css: undefined, imageUrl: config.background.imageUrl }
  Each renderer constructs its own <img> element from imageUrl (Satori needs base64, Remotion uses URL directly)

State preservation on mode switch:
  EditorState gains backgroundStash: Partial<Record<BackgroundMode, BackgroundConfig>>
  SET_BACKGROUND action: stash current config by mode, restore target mode from stash if exists
```

## Implementation Units

- [x] **Unit 1: Type system + mesh gradient helper**

**Goal:** Define BackgroundConfig type and create the mesh gradient CSS generator + background resolver

**Requirements:** R5, R6, R13, R14, R17

**Dependencies:** None

**Files:**
- Modify: `src/lib/templates/canvas-types.ts`
- Create: `src/lib/templates/mesh-gradient.ts`
- Modify: `convex/templates.ts` (add background to validator)
- Test: `src/lib/__tests__/mesh-gradient.test.ts`

**Approach:**
- Add `BackgroundMode` type and `BackgroundConfig` discriminated union to canvas-types. mesh-gradient.ts must be a pure browser-compatible module (no fs, no Node APIs) since Remotion imports it for browser bundling.
- Add optional `background?: BackgroundConfig` to `CanvasTemplateConfig`
- Create `generateMeshGradientCSS(colors, positions)` — returns layered radial-gradient CSS string
- Create `randomizeMeshPositions()` — returns 3 random `{x, y}` positions (x: 0-100, y: 0-100), ensuring reasonable spread
- Create `resolveBackground(config, colors)` — returns `{ css: string | undefined, imageUrl: string | undefined }` based on mode. Returns data only (no JSX) so consumers build their own elements. Each renderer (Satori, editor canvas, Remotion) constructs the `<img>` element itself since Satori needs base64 src while Remotion/editor use URL.
- Add `background: v.optional(v.any())` to `canvasConfigValidator`

**Patterns to follow:**
- `getObjectBorderRadius()` in canvas-types.ts — pure utility function pattern
- Existing type definitions in canvas-types.ts

**Test scenarios:**
- Happy path: `generateMeshGradientCSS` with 3 colors and 3 positions returns valid CSS string containing 3 radial-gradient layers and a base color
- Happy path: `resolveBackground` with undefined config returns `{ css: colors.background, imageUrl: undefined }`
- Happy path: `resolveBackground` with color mode returns `{ css: colors.background, imageUrl: undefined }`
- Happy path: `resolveBackground` with mesh_gradient mode returns `{ css: "radial-gradient...", imageUrl: undefined }`
- Happy path: `resolveBackground` with image mode returns `{ css: undefined, imageUrl: "..." }`
- Edge case: `randomizeMeshPositions` called multiple times produces different results
- Edge case: `generateMeshGradientCSS` with identical colors still produces valid gradient

**Verification:** Tests pass. Types compile with `npm run build`.

---

- [x] **Unit 2: Editor reducer — SET_BACKGROUND action + state stashing**

**Goal:** Add background mode switching to the editor reducer with state preservation and atomic undo

**Requirements:** R15, R16

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/editor/editor-context.tsx`
- Test: `src/lib/__tests__/editor-reducer.test.ts` (follows existing project test convention)

**Approach:**
- Add `backgroundStash` to EditorState: `Partial<Record<BackgroundMode, BackgroundConfig>>`. Must remain inside EditorState (not a ref) so it participates in undo/redo snapshots. Stash enables non-linear mode switching (mesh→color→image→mesh restores mesh config) which sequential undo alone cannot provide.
- Add `SET_BACKGROUND` action: `{ type: "SET_BACKGROUND"; background: BackgroundConfig | undefined }`
  - Before applying: stash current `config.background` by its mode into `backgroundStash`
  - If switching to a mode that has a stashed config, restore it
  - If switching to mesh_gradient with no stash, prefill colors from `config.colors` and call `randomizeMeshPositions()`
  - If switching to color, set `config.background` to undefined
- Add `RANDOMIZE_MESH` action: `{ type: "RANDOMIZE_MESH" }` — regenerates positions only
- Both actions are undoable (NOT in NON_UNDOABLE_ACTIONS set) — each dispatch is one atomic undo step
- Add `SET_BACKGROUND_IMAGE` action for updating imageUrl after upload

**Patterns to follow:**
- SET_COLORS action pattern (lines 164-169) — spread config, mark dirty
- COMMIT_MOVE pattern for understanding atomic undo — but SET_BACKGROUND is simpler since it's a single dispatch

**Test scenarios:**
- Happy path: SET_BACKGROUND to mesh_gradient initializes with template colors and random positions
- Happy path: SET_BACKGROUND to image initializes with empty imageUrl
- Happy path: SET_BACKGROUND to color sets config.background to undefined
- Happy path: SET_BACKGROUND_IMAGE updates imageUrl within existing image config
- Happy path: RANDOMIZE_MESH updates positions while keeping colors
- State preservation: Switch to mesh, customize colors, switch to color, switch back to mesh → mesh colors restored
- State preservation: Upload image, switch to color, switch back to image → imageUrl preserved
- Undo: SET_BACKGROUND creates an undo entry (past stack grows by 1)
- Undo: RANDOMIZE_MESH creates an undo entry
- Undo: Undo after SET_BACKGROUND restores previous background config AND backgroundStash
- Edge case: SET_BACKGROUND to current mode is a no-op

**Verification:** Tests pass. Reducer handles all mode transitions correctly.

---

- [x] **Unit 3: Sidebar reorganization — move Colors + Video Preset to right sidebar**

**Goal:** Move template-level settings from left to right sidebar, add context headers

**Requirements:** R1, R2, R3, R19

**Dependencies:** None (can be done in parallel with Unit 1-2)

**Files:**
- Modify: `src/components/editor/editor-left-sidebar.tsx`
- Modify: `src/components/editor/editor-right-sidebar.tsx`

**Approach:**
- Left sidebar: Remove BrandColorSection import/usage, Video Preset section, and their separators. Keep Format + separator + Objects.
- Right sidebar: When `!selectedObject`, render:
  1. Header "Template" (text-sm font-semibold uppercase — slightly larger than section labels to establish hierarchy)
  2. BrandColorSection
  3. Separator
  4. (Placeholder for BackgroundSection — added in Unit 4)
  5. Video Preset dropdown (moved from left sidebar, same JSX)
- When `selectedObject`, render:
  1. Header "Object: {selectedObject.name}"
  2. Existing CommonProperties, TextProperties, ImageProperties

**Patterns to follow:**
- Existing label style: `text-xs font-medium text-zinc-500 uppercase` used throughout editor
- Existing right sidebar structure in `editor-right-sidebar.tsx`

**Test expectation:** None — pure UI reorganization with no behavioral logic. Verify visually.

**Verification:** Editor renders with Colors and Video Preset in right sidebar when no object selected. Left sidebar shows only Format + Objects. Headers visible.

---

- [x] **Unit 4: BackgroundSection component**

**Goal:** Create the background mode selector UI with Color, Image, and Mesh Gradient modes

**Requirements:** R4, R5, R7, R8, R9, R10, R11, R12

**Dependencies:** Unit 1 (types), Unit 2 (reducer actions). Unit 3 is not a hard dependency — BackgroundSection is a standalone component; integration into right sidebar can happen when both Unit 3 and Unit 4 are done.

**Files:**
- Create: `src/components/editor/background-section.tsx`
- Modify: `src/components/editor/editor-right-sidebar.tsx` (add BackgroundSection between Colors and Video Preset)

**Approach:**
- Label "BACKGROUND" + Select dropdown (Color / Image / Mesh Gradient)
- **Color mode:** Dropdown only, no body (collapsed)
- **Image mode:** Reuse upload pattern from image-properties.tsx — file input, handleFileUpload posting to `/api/v1/upload`, preview thumbnail, Replace/Remove buttons. Dispatch SET_BACKGROUND_IMAGE on upload success. Show loading spinner during upload, toast.error on failure, disable Replace while uploading. When no image is set, show upload area with instructional text matching existing image-properties empty state.
- **Mesh Gradient mode:** 3 color pickers (Color 1/2/3) using same input+swatch pattern as BrandColorSection. "Randomize" button dispatching RANDOMIZE_MESH.
- Mode switch dispatches SET_BACKGROUND with appropriate config

**Patterns to follow:**
- `src/components/editor/brand-color-section.tsx` — color picker layout (input type="color" + hex Input)
- `src/components/editor/image-properties.tsx:331-402` — upload UI with preview, Replace, Remove
- Select component usage from editor-left-sidebar.tsx Video Preset

**Test expectation:** None — UI component with no complex logic beyond dispatching. Upload flow is tested via integration. Verify visually.

**Verification:** All three modes render correctly. Upload works. Color pickers update gradient. Randomize produces visible changes on canvas.

---

- [x] **Unit 5: Canvas renderer + editor canvas background rendering**

**Goal:** Update Satori renderer and editor canvas to use resolveBackground for all three modes

**Requirements:** R6, R17, R18

**Dependencies:** Unit 1 (resolveBackground helper)

**Files:**
- Modify: `src/lib/templates/canvas-renderer.tsx`
- Modify: `src/components/editor/editor-canvas.tsx`
- Test: `src/lib/__tests__/canvas-renderer-background.test.ts`

**Approach:**
- **canvas-renderer.tsx:** Import resolveBackground. Replace `background: colors.background` (line 39) with resolved CSS. If imageUrl is returned (image mode), render an `<img>` element as first child before sortedObjects map, with absolute positioning and objectFit: cover. Note: in the Satori pipeline, the imageUrl will already be base64 (swapped by Unit 6).
- **editor-canvas.tsx:** Call resolveBackground with `(state.config, state.config.colors)` — NOT with a brand object, since SET_BRAND already copies brand colors into config.colors as previewColors. For image mode, render `<img>` inside the canvas div before CanvasObject children. For mesh gradient, apply CSS background directly. Editor canvas applies CSS directly (no Satori), so gradient color changes are instant with no performance concern.

**Patterns to follow:**
- Existing root div structure in canvas-renderer.tsx
- Image rendering pattern in canvas-renderer.tsx renderObject (for the `<img>` tag approach)

**Test scenarios:**
- Happy path: CanvasRenderer with no background config renders solid color (backward compat)
- Happy path: CanvasRenderer with mesh_gradient config renders CSS gradient as background
- Happy path: CanvasRenderer with image config renders img element as first child
- Edge case: CanvasRenderer with `{ mode: "color" }` explicit config renders same as undefined
- Edge case: Same background config renders correctly across landscape, square, and portrait formats (R6)

**Verification:** Editor canvas preview shows correct background for all three modes. Satori render via `npm run build` compiles without errors.

---

- [x] **Unit 6: Render pipeline — prefetch background images**

**Goal:** Extend the render pipeline to fetch background images to base64 for Satori

**Requirements:** R17 (Satori pipeline)

**Dependencies:** Unit 1 (types), Unit 5 (renderer uses resolved background)

**Files:**
- Modify: `src/lib/pipeline/shared.ts`
- Modify: `src/lib/pipeline/render.ts`
- Test: `src/lib/__tests__/pipeline-background.test.ts`

**Approach:**
- In `prefetchStaticImages()`: Before the format loop, check `config.background?.mode === "image"` and add `config.background.imageUrl` to the staticSrcs set. This is a template-level URL, not per-format, so add it once outside the loop.
- Return the background image base64 separately from the srcMap (e.g., as a second return value or a named field).
- In `render.ts`: After prefetch, pass the background base64 to CanvasRenderer as a separate `backgroundImageBase64` prop. Do NOT mutate `config.background.imageUrl` — the config object is shared across all format renders and should not be mutated (following existing pipeline convention where static images go through ObjectDataMap, not config mutation).
- CanvasRenderer uses `backgroundImageBase64` (if provided) instead of `config.background.imageUrl` for the `<img>` src.

**Patterns to follow:**
- Existing prefetchStaticImages + injectStaticImages pattern in shared.ts

**Test scenarios:**
- Happy path: Template with image background — prefetch includes the background imageUrl in fetch set
- Happy path: Rendered output includes background image (integration — POST to cook endpoint)
- Edge case: Template with no background field — prefetch works identically to before
- Edge case: Background image URL that fails to fetch — error handling consistent with existing image fetch failures

**Verification:** `POST /api/v1/cook` with a template that has an image background produces correct JPEG output with the image visible.

---

- [x] **Unit 7: Video composition — background rendering**

**Goal:** Update Remotion video renderer to support all three background modes

**Requirements:** R17, R18 (Remotion composition)

**Dependencies:** Unit 1 (resolveBackground helper)

**Files:**
- Modify: `src/remotion/VideoCanvasComposition.tsx`

**Approach:**
- Import resolveBackground. In SlideRenderer, replace `backgroundColor: colors.background` (line ~127) with resolved CSS on the container div.
- For image mode, render standard `<img>` tag (Remotion renders in browser context, so URL-based src works directly — no base64 needed). Position absolutely as first child.
- For mesh gradient, apply the CSS background string to the container.

**Patterns to follow:**
- Existing SlideRenderer background handling at lines 121-129
- AbsoluteFill usage pattern in the composition

**Test scenarios:**
- Happy path: Video with mesh gradient background renders gradient visible in Remotion studio
- Happy path: Video with image background renders image as cover
- Happy path: Video with no background config renders solid color (backward compat)
- Edge case: Background image in video does not receive entrance/exit animations (static, immediately visible)

**Verification:** `npm run remotion:studio` shows correct backgrounds for all three modes.

## System-Wide Impact

- **Interaction graph:** Background config flows through: editor reducer → config saved to Convex → loaded by cook API → passed to CanvasRenderer (Satori) / VideoCanvasComposition (Remotion). Template clone copies config as-is.
- **Error propagation:** Background image upload failure shows toast (same as existing upload pattern). Background image fetch failure in pipeline should fail the render (same as existing static image failures).
- **State lifecycle risks:** backgroundStash is in-memory editor state only, not persisted. If the user saves while in color mode, the stashed mesh/image configs are lost. This is acceptable — the saved config is the source of truth.
- **API surface parity:** Cook API renders whatever background the template has. No new API fields needed.
- **Unchanged invariants:** Brand color override still works (brand.colors ?? config.colors for the Colors section). The existing `TemplateObject.background` boolean flag for animation suppression is unrelated and unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Satori radial-gradient blending differs from browser CSS | Verify during Unit 1 implementation. Adjust opacity/spread values if needed. Both editor preview and final render use different engines — accept minor visual differences. |
| Large background images slow Satori render | Existing upload endpoint has 5MB limit. Background images go through same fetchImageAsBase64 path. Monitor render times. |
| Right sidebar becomes dense with Colors + Background + Video Preset | ScrollArea already wraps sidebar content. BrandColorSection collapses when brand is selected. Color mode has no body. Acceptable density. |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-02-editor-background-modes-requirements.md](docs/brainstorms/2026-04-02-editor-background-modes-requirements.md)
- Related code: `src/components/editor/editor-context.tsx`, `src/lib/templates/canvas-renderer.tsx`, `src/remotion/VideoCanvasComposition.tsx`
- Related learning: `docs/solutions/best-practices/role-based-animation-classification-2026-04-02.md`
