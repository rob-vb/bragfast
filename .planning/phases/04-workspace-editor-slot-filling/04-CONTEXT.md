# Phase 4: Workspace Editor + Slot Filling - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The local Vite SPA Workspace (shipped as a shell in Phase 3) becomes a real
editor. A developer opens the Workspace, picks one of the 5 built-in Templates,
fills text and media Slots, switches between landscape/square/portrait previews,
enters a social caption, and the Draft auto-saves — with the logo Slot
auto-populated from their brand. Recent Drafts can be reopened to resume editing.

**In scope:** template picker (5 built-ins), single-screen editor (live scaled
preview + slot panel), text slot fill (type/paste), media slot fill (drag-drop +
click-to-browse, clear/replace, in-slot preview), format switcher
(landscape/square/portrait), caption field, brand-driven colors + logo
auto-fill, draft auto-save, recent-drafts reopen, and the new local CLI media
endpoint + static media-serving route that local media fill depends on.

**Out of scope:** local image render (Phase 5), local video render (Phase 6 —
Phase 4 fills + previews a video slot but does NOT render video), schedule-time
R2 upload + posting (Phase 7), per-format template authoring / anchor-scale
auto-derive (built-ins ship 3 hand-authored formats), carousel/multi-slide, any
AI copy generation.

Requirements covered: WORK-01..08, MEDIA-01..05.
</domain>

<decisions>
## Implementation Decisions

### Editor layout & component reuse
- **D-01:** Single-screen editor — live scaled preview + slot panel
  side-by-side, both always visible. Drop the legacy multi-step wizard
  machinery (Recipe→Ingredients→Seasoning→Plating).
- **D-02:** Reuse the existing kitchen editor's design language and portable
  pieces: `TemplatePreview` (browser CanvasRenderer + ResizeObserver scale +
  font injection), `IngredientsStep` slot-field rendering logic (text inputs per
  text slot, drop zone per visual slot), and `BrandColorPicker`. Restructure
  into one screen rather than steps.
- **D-03:** Format switching via segmented tabs (Landscape | Square | Portrait)
  directly above the live canvas; one format shown at a time at scaled size.
  Switcher swaps which `config.formats[key]` layout renders (formats are
  hand-authored per built-in — no derivation needed this phase).
- **D-04:** Caption is a dedicated textarea in the slot panel, below the
  on-canvas text slots — visually distinct from rendered slots (caption is post
  copy, not drawn into the image).

### Local media handling
- **D-05:** Dragged/browsed media is stored via a **local CLI cache +
  reference** model: the SPA POSTs the file to a new local CLI endpoint; the CLI
  writes it to a local cache dir (e.g. `~/.brag/media/`) and returns an
  id/local URL; the Draft stores only that reference. Media persists across
  reopens on the same machine; render reads it locally; R2 upload stays deferred
  to schedule-time (Phase 7) — keeps the Convex draft `config` blob small. This
  introduces a new CLI capability: a media-upload endpoint AND a static route to
  serve cached media back to the SPA (`<img>`/`<video>` src).
- **D-06:** A filled video slot previews as an inline `<video>` muted, looping,
  autoplaying.
- **D-07:** Accepted media types: images PNG/JPG/WebP/SVG; video MP4/MOV/WebM.
  Reject other types with a clear inline error. Video slot **fill + preview** is
  in scope (MEDIA-02); video render is Phase 6.

### Auto-save & draft lifecycle
- **D-08:** A Draft record is created on the **first content edit** (text
  typed/pasted, media dropped, or caption entered) — not on idle template
  browsing. Selecting a template/brand/format alone does not yet create a draft;
  the first real content change triggers `POST /drafts`, then PATCH thereafter.
- **D-09:** Auto-save is **debounced** (~800ms–1s after the last change across
  text/media/format/caption/brand) and sends the **full config** on PATCH —
  because the drafts API PATCH shallow-merges `config` and would otherwise drop
  `objectContent`. Show a subtle "Saved" indicator.
- **D-10:** Reopen flow: the Workspace home/landing lists recent Drafts
  (thumbnail + name + edited time) via `GET /drafts`; clicking loads a Draft
  into the editor. This replaces the current repo-context stub as the home view.
- **D-11:** Add an explicit `caption?: string` field to `DraftConfig` (and
  `validate.ts`). No Convex schema change needed (`config` is a JSON string).

### Template picker & logo auto-fill
- **D-12:** Template picker is a thumbnail grid of the 5 built-ins (live
  `TemplatePreview` thumbnails) on the Workspace home, alongside the recent-
  drafts list ("Start new" → grid). Clicking a template opens the editor.
- **D-13:** On template select: pull the user's brand → apply brand colors to
  the canvas AND auto-populate the logo slot from `brand.logo_url` (WORK-08).
  User can still override colors via `BrandColorPicker`. If no brand: fall back
  to the template's own authored colors, leave logo empty, no error.
- **D-14:** Brand resolution: auto-pick the first/default brand on select; show
  a brand switcher in the editor (reuse `BrandColorPicker`'s brand dropdown) to
  change it. Zero brands → template colors + empty logo, silently.
- **D-15:** Move `canvas-defaults.ts` (the 5 built-ins) into
  `packages/render-core` so both the Next.js app and the SPA import one shared
  source of truth — no network round-trip for built-ins, no drift.

### Claude's Discretion
- Exact local cache dir path/layout and media id scheme.
- Debounce timing, "Saved" indicator styling.
- Precise definition of "first content edit" trigger boundary.
- Slot labeling/ordering within the panel (derive from `TemplateObject.name`).
- Picker thumbnail sizing/grid layout.
- Empty/error/overflow states for text slots (not explicitly discussed).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reposition decisions (constraints)
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction
- `docs/adr/0002-local-render-thin-backend.md` — no Lambda, thin backend, R2 upload only at schedule-time (the constraint behind D-05)
- `docs/adr/0003-byo-ai-no-server-copy-gen.md` — no server-side AI / copy gen (no AI-assisted slot fill)
- `CONTEXT.md` (repo root) — single-context domain glossary

### Prior phase context (dependency)
- `.planning/phases/03-cli-local-server-workspace-shell/03-CONTEXT.md` — SPA = Vite, CLI proxy injects Bearer, origin-locking
- `.planning/phases/01-render-core-extraction/01-CONTEXT.md` — render-core package boundary

### Template / slot / preview model
- `packages/render-core/src/canvas-types.ts` — `CanvasTemplateConfig`, `TemplateObject` (types: `text | visual | logo`), `FORMAT_DIMENSIONS`, `migrateConfig()`
- `packages/render-core/src/canvas-renderer.tsx` — `CanvasRenderer` (pure browser-renderable JSX), `ObjectDataMap` shape
- `src/lib/templates/canvas-defaults.ts` — the 5 built-ins to relocate into render-core (D-15)
- `src/components/kitchen/template-preview.tsx` — browser scaled-preview component to reuse (D-02)
- `src/lib/preview-sample.ts` — `buildDraftObjectData()` bridges stored draft content → `ObjectDataMap`
- `src/lib/client-fonts.ts` — `injectGoogleFont()` used by preview

### Slot-fill UI to port
- `src/components/kitchen/ingredients-step.tsx` — text/media slot field rendering (uses `ObjectModification`)
- `src/components/kitchen/template-picker-dialog.tsx` — picker pattern (D-12)
- `src/components/shared/brand-color-picker.tsx` — brand dropdown + color picker (D-02, D-14)

### Drafts + brands data
- `src/lib/drafts/types.ts` — `DraftConfig`, `DraftObjectContent` (add `caption` per D-11)
- `src/lib/drafts/validate.ts` — config validation (extend for caption)
- `src/app/api/v1/drafts/` — POST/GET/PATCH/GET[id]/DELETE (PATCH shallow-merges — see D-09)
- `src/lib/types.ts` — `Brand`, `BrandRecord`, `ObjectModification`
- `src/app/api/v1/brands/route.ts` — `GET /api/v1/brands`
- `convex/schema.ts` — `brands` (logo_url, colors), `drafts` (config as JSON string)

### CLI integration points (new endpoints land here)
- `packages/cli/src/server.ts` — Express server to extend with media endpoint + static media route
- `packages/cli/src/proxy.ts` — authenticated proxy to backend for /drafts, /brands, /templates
- `packages/workspace/src/` — SPA (App.tsx stub, api.ts, types.ts) to build the editor in
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CanvasRenderer` (render-core): pure JSX, no Satori dependency — renders in the
  browser today. Core of the live preview.
- `TemplatePreview` (kitchen): already does scaled browser preview with
  ResizeObserver + Google Font injection + optional watermark; accepts
  `ObjectDataMap`. Port nearly as-is.
- `IngredientsStep` (kitchen): slot-field rendering (text input/textarea per text
  slot, drag-drop zone per visual slot, clear/replace). Reuse field logic.
- `BrandColorPicker` (shared): fetches `/api/v1/brands`, brand dropdown + color
  picker. Reuse for D-14.
- `buildDraftObjectData()` (`src/lib/preview-sample.ts`): converts stored draft
  `objectContent` → `ObjectDataMap` for the renderer.

### Established Patterns
- Object model uses `type: "text" | "visual" | "logo"` (note: "visual", not
  "image") with absolute x/y/width/height/zIndex per object.
- Each built-in template hand-authors all 3 formats (`formats.{landscape,
  square,portrait}.objects`) — no shared coordinate transform. Format switch =
  pick the format's object list.
- Draft persistence: entire `DraftConfig` serialized to one `config` JSON string
  in Convex; PATCH does a shallow merge of `config` (drives D-09 full-config save).
- All Workspace→backend calls flow through the CLI proxy, which injects the
  Bearer credential server-side (Phase 2/3).

### Integration Points
- New CLI media endpoint (POST file → local cache dir) + static route to serve
  cached media → SPA `<img>`/`<video>` src. New for this phase (D-05).
- `canvas-defaults.ts` relocates into render-core; the Next.js app's existing
  imports must be repointed to the shared source (D-15).
- Adding `caption` to `DraftConfig` + `validate.ts` touches the shared draft
  types used by both the legacy app and the SPA.
- Render-core font loader (`packages/render-core/src/fonts.ts`) imports
  `fs/path/os` (node-only) — the Vite SPA build must NOT bundle it; preview uses
  browser font injection instead.
</code_context>

<specifics>
## Specific Ideas

- "Can't we somewhat use the current kitchen editor design?" — yes: carry over
  the kitchen editor's visual design + portable components, just collapse the
  multi-step flow into one screen (D-02).
- Media cache dir suggested as `~/.brag/media/` (consistent with Phase 2's
  `~/.brag/credentials.json`).
- Video preview should feel showcase-like (muted autoplay loop), matching how
  videos are treated elsewhere in the product.
</specifics>

<deferred>
## Deferred Ideas

- Per-format / per-slide template authoring + anchor-scale auto-derive — future
  authoring milestone (PROJECT.md "author one format, auto-derive" decision is
  Pending; built-ins ship pre-authored formats so Phase 4 doesn't need it).
- Carousel / multi-slide creations — deferred this milestone (PROJECT.md).
- AI-assisted slot fill / copy generation — out of scope, BYO-AI (ADR-0003).
- R2 upload of media — happens at schedule-time (Phase 7), not during editing.

None of the above were requested as scope creep; noted for orientation.
</deferred>

---

*Phase: 4-workspace-editor-slot-filling*
*Context gathered: 2026-05-21*
