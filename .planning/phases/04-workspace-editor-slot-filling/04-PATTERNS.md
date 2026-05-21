# Phase 4: Workspace Editor + Slot Filling - Pattern Map

**Mapped:** 2026-05-21
**Source:** Inline pattern-mapper pass from `04-CONTEXT.md`, `04-RESEARCH.md`, and live codebase reads.

---

## Closest Analogs

| Target File / Area | Closest Existing Analog | Pattern To Reuse |
|--------------------|-------------------------|------------------|
| `packages/cli/src/server.ts` media route | Existing `/api/repo-context` route in `packages/cli/src/server.ts` | Register CLI-local routes before `createBackendProxy(credentials.api_key)` so `/api/local/media` is not proxied upstream. |
| `packages/workspace/src/api.ts` | `packages/workspace/src/api.ts`; `packages/cli/src/http.ts` | Named async fetch helpers using relative URLs and throwing on non-OK responses. |
| `packages/workspace/src/components/TemplatePreview.tsx` | `src/components/kitchen/template-preview.tsx` | ResizeObserver-driven scale wrapper, browser font injection, and `CanvasRenderer` object data input. |
| `packages/workspace/src/components/SlotPanel.tsx` | `src/components/kitchen/ingredients-step.tsx` | Derive fields from template objects; text writes `DraftObjectContent.text`; visual media writes `image_url` or `video_url`; omit R2 upload and URL input fallback. |
| `packages/workspace/src/components/BrandPicker.tsx` | `src/components/shared/brand-color-picker.tsx`; `src/components/kitchen/cook-page.tsx` | Brand dropdown + color swatches, but implemented with native controls and workspace styling rather than shadcn primitives. Map `logo_url` to `Brand.logoBase64`. |
| `packages/workspace/src/hooks/useAutoSave.ts` | `src/app/api/v1/drafts/[id]/route.ts` PATCH behavior | Debounce 800ms-1000ms; POST on first content edit; PATCH sends the full `DraftConfig`, never a partial nested `objectContent`. |
| `packages/render-core/src/browser.ts` | `packages/render-core/src/index.ts` | Browser-safe barrel that exports `CanvasRenderer`, `canvas-types`, and `canvas-defaults`, while omitting `fonts.ts`, image render, and video render exports. |
| `src/lib/drafts/validate.ts` | Existing allowlist + validation branches | Add `caption` to create and patch allowlists and validate `typeof caption === "string"`. |

---

## Required Read-First Paths By Plan

### Shared Contracts
- `packages/render-core/src/index.ts`
- `packages/render-core/src/canvas-renderer.tsx`
- `packages/render-core/src/canvas-types.ts`
- `packages/render-core/tsup.config.ts`
- `src/lib/templates/canvas-defaults.ts`
- `src/lib/drafts/types.ts`
- `src/lib/drafts/validate.ts`
- `src/lib/drafts/__tests__/validate.test.ts`

### CLI Media
- `packages/cli/src/server.ts`
- `packages/cli/src/__tests__/server.test.ts`
- `packages/cli/src/proxy.ts`
- `src/lib/upload/constants.ts`

### Workspace Editor
- `packages/workspace/src/App.tsx`
- `packages/workspace/src/api.ts`
- `packages/workspace/src/types.ts`
- `packages/workspace/vite.config.ts`
- `src/components/kitchen/template-preview.tsx`
- `src/components/kitchen/ingredients-step.tsx`
- `src/components/shared/brand-color-picker.tsx`
- `src/lib/client-fonts.ts`
- `src/lib/preview-sample.ts`
- `src/app/api/v1/drafts/route.ts`
- `src/app/api/v1/drafts/[id]/route.ts`
- `src/app/api/v1/brands/route.ts`

---

## Data Flow Contracts

1. Template select loads a local `CanvasTemplateConfig` from the moved built-ins, applies the first/default brand colors when present, and opens the editor without creating a draft.
2. First content edit means text, media, caption, brand/color override, or user-driven format/content mutation. That edit creates the draft with `POST /api/v1/drafts`.
3. Every later save uses `PATCH /api/v1/drafts/:id` with the full `DraftConfig`, including `objectContent`, `format`, `colors`, `brandId`, and `caption`.
4. Media files are posted to `POST /api/local/media`, written to `~/.brag/media`, and referenced by returned URL in `DraftObjectContent.image_url` or `DraftObjectContent.video_url`.
5. The preview converts `DraftObjectContent.image_url` to `ObjectDataMap[objectId].imageBase64`; the name is historical and can hold a local URL in browser context.
6. Video preview requires a `VideoComponent` prop to `CanvasRenderer`; without it video slots show placeholders.
7. Logo slot auto-fill comes from `Brand.logoBase64 = BrandRecord.logo_url ?? ""`; no objectContent write is required for logo slots.

---

## Landmines

- Do not add shadcn to `packages/workspace`.
- Do not import render-core's `fonts.ts`, `image.ts`, or `video.ts` into the Vite browser bundle.
- Do not mount `/api/local/media` after the `/api` proxy.
- Do not patch partial `objectContent`; backend merge is shallow.
- Do not use the legacy R2 upload helper in workspace slot fill.
- Do not create drafts on idle template browsing.
