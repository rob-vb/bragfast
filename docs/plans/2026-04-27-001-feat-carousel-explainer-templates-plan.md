---
title: "feat: Carousel Explainer Template Family"
type: feat
status: active
date: 2026-04-27
origin: ~/.claude/plans/i-want-to-ce-brainstorm-swift-sundae.md
---

# feat: Carousel Explainer Template Family

## Overview

Ship a family of 4 built-in templates (`carousel-cover`, `carousel-content-text`, `carousel-content-image`, `carousel-outro`) that compose into multi-slide explainer carousels in a single render. This is the first template family in brag.fast where slides within one render do not share a single layout.

To support the family, add three renderer/pipeline capabilities: per-slide `templateId` override, inline `*accent*` markup parser for titles, and per-text background/radius/padding for badges and CTA pills. Decorative blob shapes ship as JSX components matching the existing `BrowserFrame`/`MobileFrame` pattern.

---

## Problem Frame

Today's 5 built-in templates all assume a hero-product-shot composition (title + short subtitle + one visual frame). Explainer carousels — tutorial / step-by-step / listicle threads on LinkedIn, X, Instagram — need different layouts per slide position (cover → numbered content → outro CTA), an accent-colored keyword in the title, optional supporting imagery, and a persistent author signature on every slide.

Reference inspiration: aiCarousels — solid color backgrounds, rounded numbered badges, soft decorative blobs, sans-serif headings with one accent-colored keyword, pill CTA buttons, small author footer (avatar + name + title) on every slide.

---

## Requirements Trace

- R1. Ship 4 new built-in templates: `carousel-cover`, `carousel-content-text`, `carousel-content-image`, `carousel-outro` (see origin: Goals 1).
- R2. Support per-slide template selection within a single format render (see origin: Goals 2).
- R3. Support inline `*word*` accent-color markup in title text (see origin: Goals 3).
- R4. Persistent author signature footer (avatar + name + title), defaultable from brand at render time, overridable per slide; no brand schema change (see origin: Goals 4 + Required Capabilities §4 + brainstorm decision).
- R5. Match soft-modern aesthetic (rounded badges, soft blobs, pill CTAs); not the brag.fast NES-retro brand look (see origin: Goals 5).
- R6. Per-slide template override is backward compatible — existing releases without `slide.templateId` continue to render with format-level template (see origin: Required Capabilities §1).

---

## Scope Boundaries

- No edits to existing 5 templates' look or behavior.
- No carousel-specific UI/wizard. Selection happens through the existing template picker on each slide.
- No animation/motion tuning. Video pipeline reuses these templates as-is.
- No auto-generation of multi-slide content from a single prompt. Sous-Chef concern.
- No brand schema migration. Signature data lives in template-object overrides, with brand-driven defaults applied at render time only.
- No other markdown features in titles. Only `*…*` accent markup.

---

## Context & Research

### Relevant Code and Patterns

- `src/lib/templates/canvas-types.ts` — `TemplateObject` interface; text-variant fields (`color`, `colorRole`, `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `verticalAlign`, `textFit`, `previewText`). Currently no `background`, `borderRadius`, `padding*`, or `accentMarkup`. `borderRadius`/`borderRadiusTL/TR/BR/BL` exist on visual variants.
- `src/lib/templates/canvas-defaults.ts` — 5 existing built-in templates as `Record<string, CanvasTemplateConfig>`.
- `src/lib/templates/canvas-renderer.tsx` — text rendering at the `lines.length > 1 ? lines.map(...) : text` branch (~lines 189-209). `autoFitFontSize` operates on the raw plain string at ~line 183. `skipEmpty` filters `visibleObjects` before render (~lines 47-54) — empty text objects render nothing at all.
- `src/lib/templates/components/BrowserFrame.tsx`, `MobileFrame.tsx` — JSX-only Satori-compatible visual components imported by the renderer. Decorative blobs follow this pattern.
- `src/lib/types.ts` lines 63-68 — `FormatEntry.slides[]`. Each slide has only `objects?: ObjectModification[]`. Template selection lives on `ReleaseRequest.template` (single string per request).
- `src/lib/pipeline/render.ts` — `resolveTemplate` is called once at ~line 84; the resolved `templateConfig` is reused for every format and slide in the nested loops (~lines 95-163). Per-slide template override hooks in inside the `for (let i = 0; i < slideDataMaps.length; i++)` loop (~line 137).
- `src/lib/pipeline/shared.ts` — `buildSlideDataMaps` (~lines 64-88) maps `ObjectModification[]` to `ObjectDataMap`. This is the right spot to backfill brand-driven defaults for signature objects.
- `convex/schema.ts` lines 21-36 — `brands` table fields: `userId`, `externalId`, `name`, `logo_url`, `website`, `font_family`, `colors`, `created_at`, `updated_at`. No `tagline` field. Signature title cannot default from brand without schema migration — out of scope per origin.
- `src/lib/__tests__/canvas-renderer-background.test.ts` — only existing canvas-renderer unit test. Test pattern to follow.

### Institutional Learnings

- Satori is flexbox-only (no Grid). Inline-flex spans render fine for accent markup.
- `objectPosition` is supported in Satori (avoid switching to `backgroundImage`) — relevant for `side_image` in `carousel-content-image`.
- Plus Jakarta Sans is loaded by default via `src/lib/fonts.ts`. Brand `font_family` overrides per-render.
- `skipEmpty: true` already filters empty text objects from the render set — the cleanest mechanism for optional fields like `signature_title`, `eyebrow`, `swipe_cta`, `cta_button`.

---

## Key Technical Decisions

- **Text background fill via wrapper div, not visual underlay.** Adding optional `background`, `borderRadius`, `paddingX`, `paddingY` to text `TemplateObject` keeps badges and CTA pills as a single object. The alternative — a visual object beneath each text — doubles object count and complicates positioning math.
- **Accent markup via per-line tokenization.** Parser tokenizes each line on `*…*` boundaries, producing `[{text, accent}, …]` segments. `autoFitFontSize` keeps measuring the markup-stripped plain string so its char-width heuristic stays valid. Accent rendering happens only when the text object has `accentMarkup: true` to avoid surprising existing templates.
- **Decorative blobs as JSX components.** Mirrors the `BrowserFrame`/`MobileFrame` pattern — no `fetchImageAsBase64` round-trip, no `public/` asset wrangling, brand-color tinting via inline SVG `fill`. Selected via a new optional `shape` field on visual `TemplateObject` mapping to a built-in component.
- **Signature title source: per-slide override only.** Brand has no `tagline` field; adding one is out of scope per origin. Users enter title once on the cover slide and copy down, or use existing template defaults. Avatar and name still default from brand.
- **Per-slide template override resolves to format-level fallback.** A new optional `templateId?: string` on `FormatEntry.slides[]` entries. Render loop resolves per-slide if set, else uses the format-level `templateConfig`. Memoize within a format to avoid repeated `resolveTemplate` calls when many slides share the same `templateId`.

---

## Open Questions

### Resolved During Planning

- **Text background fill approach** — Resolved: extend text `TemplateObject` with optional `background`, `borderRadius`, `paddingX`, `paddingY` (Option A from origin).
- **Signature title source** — Resolved: per-slide override only. Brand has no `tagline` field; no schema migration in scope.
- **Decorative blob asset format** — Resolved: JSX components in `src/lib/templates/components/` selected by a new `shape` field on visual `TemplateObject`.
- **textFit + accent markup interaction** — Resolved: feed markup-stripped string to `autoFitFontSize`; render spans only in the JSX output.
- **Migration** — Resolved: fully additive. Existing releases unaffected.

### Deferred to Implementation

- Exact pixel coordinates per format (1200×675 / 1080×1080 / 1080×1350) for each of the 4 templates' objects. Specified in U6 once the renderer extensions are in place to validate visually.
- Whether `paddingX`/`paddingY` covers all use cases or whether a single `padding` field would be cleaner. Decide once badges and CTAs are rendering.
- Memoization shape for per-slide `resolveTemplate` (Map keyed by `templateId` per render vs. per format). Trivial to retrofit; choose during U3.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Render request (5-slide portrait carousel)
       │
       ▼
ReleaseRequest.template = "carousel-cover" (format-level fallback)
ReleaseRequest.formats[0].slides:
  [
    { /* slide 1 */ objects: [...] },                                 // uses fallback
    { templateId: "carousel-content-text",  objects: [...] },
    { templateId: "carousel-content-image", objects: [...] },
    { templateId: "carousel-content-text",  objects: [...] },
    { templateId: "carousel-outro",         objects: [...] },
  ]
       │
       ▼
render.ts loop:
  for each slide i:
    perSlideConfig = slide.templateId
      ? memoizedResolve(slide.templateId)
      : formatLevelTemplateConfig
    perSlideConfig.objects = pre-fetch images, build ObjectDataMap
    [signature defaults from brand fill in here in shared.ts]
    CanvasRenderer(perSlideConfig, objectDataMap)
       │
       ▼
canvas-renderer.tsx renderObject(text):
  if obj.accentMarkup:
    plainText  = stripAccentMarkers(text)               // for autoFitFontSize
    segments   = parseAccentSegments(text)              // for JSX
    renderLineWithSpans(segments, accentColor)
  else:
    existing single-color path (unchanged)

  if obj.background || obj.borderRadius || obj.paddingX/Y:
    wrap text content in <div style={bg + radius + padding}>
       │
       ▼
Satori → SVG → Sharp → JPEG → R2
```

---

## Implementation Units

- U1. **Extend `TemplateObject` with text-background and accent-markup fields**

**Goal:** Add the type-system foundation needed by the renderer extensions and the template configs. Pure type/interface change with no behavioral effect on existing renders.

**Requirements:** R3, R5

**Dependencies:** None

**Files:**
- Modify: `src/lib/templates/canvas-types.ts`
- Test: `src/lib/__tests__/canvas-types-text-extensions.test.ts`

**Approach:**
- Add optional fields to `TemplateObject`:
  - `background?: string` — hex / `colorRole` resolution handled at render time
  - `backgroundColorRole?: ColorRole` — parallel to `colorRole` for foreground
  - `borderRadius?: number` (visual variant already has this; extend to text or move to shared)
  - `paddingX?: number`, `paddingY?: number`
  - `accentMarkup?: boolean`
  - `accentColorRole?: ColorRole` — defaults to `"primary"` when `accentMarkup` is true
  - `shape?: CarouselShape` (new union: `"blob1" | "blob2" | "circle" | "wave"`) on visual variant — used in U4
- Update `migrateObject` only if a stripping rule needs to know the new fields; the existing function strips known legacy fields and lets unknowns pass, so new optionals require no migration guard.
- Export `CarouselShape` type for U4.

**Patterns to follow:**
- `borderRadius`/`borderRadiusTL/TR/BR/BL` declarations on visual variant — same pattern, hoist to shared section.

**Test scenarios:**
- Happy path: a text `TemplateObject` with `background`, `borderRadius`, `paddingX`, `paddingY`, `accentMarkup`, `accentColorRole` set type-checks and round-trips through `migrateObject` unchanged.
- Happy path: a visual `TemplateObject` with `shape: "blob1"` type-checks and round-trips.
- Edge case: `migrateObject` on a legacy text object (none of the new fields) leaves the object byte-identical.

**Verification:**
- `npx tsc --noEmit` passes.
- Unit tests pass.

---

- U2. **Renderer extensions: accent-markup parsing + text background fill**

**Goal:** Make the renderer honor the new text-object fields. Adds `*accent*` markup parsing/rendering and wraps text in a styled container when `background`/`borderRadius`/`padding*` are set.

**Requirements:** R3, R5

**Dependencies:** U1

**Files:**
- Modify: `src/lib/templates/canvas-renderer.tsx`
- Test: `src/lib/__tests__/canvas-renderer-text-extensions.test.ts`

**Approach:**
- Add pure helpers in renderer module (or co-located util):
  - `stripAccentMarkers(input: string): string` — removes `*` pairs, leaves text inside intact.
  - `parseAccentSegments(input: string): Array<{ text: string; accent: boolean }>` — tokenizes a single line on balanced `*…*` boundaries. Unbalanced markers render as plain text.
- In the text-render branch, when `obj.accentMarkup === true`:
  - Pass `stripAccentMarkers(text)` to `autoFitFontSize` so the binary search keeps measuring the same character set the user sees.
  - Render each line as a flex-row of segments. Plain segments render as raw strings; accent segments render inside a span with color from `colors[obj.accentColorRole ?? "primary"]`.
  - Whitespace at segment boundaries is preserved; joined input matches the original markup-stripped text.
- When any of `obj.background`, `obj.backgroundColorRole`, `obj.borderRadius`, `obj.paddingX`, `obj.paddingY` are present on a text object:
  - Wrap the existing flex-column inner div in a parent div with the resolved `background`, `borderRadius`, and padding.
  - Resolve `backgroundColorRole` against the same `colors` map used for `colorRole`.
  - Outer wrapper inherits the absolute positioning previously on the inner; the inner content centers via the existing flex.
- Do not change behavior for objects without the new fields.

**Patterns to follow:**
- Existing `colorRole` resolution path for foreground.
- `BrowserFrame`/`MobileFrame` render structure for nested element layering.

**Test scenarios:**
- Happy path: `*accent*` parser returns `[{text, accent: false}, {text, accent: true}, ...]` for `"Unlock Your *Entrepreneurial* Potential"`.
- Happy path: text with `accentMarkup: true` and a `*word*` produces JSX containing two distinct color spans (assert via rendered VDOM, not pixel output).
- Edge case: empty string input → empty segment array; renderer produces no extra spans.
- Edge case: no `*` markers with `accentMarkup: true` → renders as a single plain segment, output equivalent to non-markup path.
- Edge case: adjacent markers `*foo**bar*` → two accent segments.
- Edge case: unbalanced trailing `*` → renders the literal `*` as plain text; no crash.
- Happy path: text with `background`, `borderRadius: 999`, `paddingX: 24`, `paddingY: 12` produces a wrapper div with those styles around the existing flex column.
- Edge case: `background` set without `borderRadius`/`padding` still wraps; missing fields default to 0/none, do not error.
- Integration: `autoFitFontSize` receives the markup-stripped string when `accentMarkup` is true (assert via spying or a test-only seam).

**Verification:**
- All existing tests pass — no regression in objects without the new fields.
- New tests pass.
- A manual render with `OUTPUT_LOCAL=true` of a single test slide using accent markup produces a JPEG with the accent word visibly tinted (eyeball check during U6).

---

- U3. **Per-slide `templateId` override on `FormatEntry.slides[]`**

**Goal:** Allow each slide in a format to specify its own template, falling back to the request-level template when absent. Required for the carousel family to mix layouts within one render.

**Requirements:** R2, R6

**Dependencies:** None (independent of U1/U2)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/pipeline/render.ts`
- Test: `src/lib/__tests__/per-slide-template-override.test.ts`

**Approach:**
- Extend `FormatEntry.slides[]` element shape:
  ```ts
  slides: Array<{
    objects?: ObjectModification[]
    templateId?: string
  }>
  ```
- In `render.ts`, inside the `for (let i = 0; i < slideDataMaps.length; i++)` loop:
  - If `slide.templateId` is set, resolve the template via `resolveTemplate(slide.templateId, userId, convex)`.
  - Memoize per request: a `Map<string, CanvasTemplateConfig>` keyed by templateId, populated lazily, shared across formats. Avoid repeated round-trips for users who pick the same content template across many slides.
  - If `slide.templateId` is unset, reuse `templateConfig` (the format-level/request-level resolution from line ~84).
- Verify per-slide config is the one passed to `migrateConfig`, brand resolution, image pre-fetch, and `CanvasRenderer` for that slide.
- Existing behavior preserved: requests without per-slide `templateId` use a single resolution exactly as today.

**Patterns to follow:**
- Existing `resolveTemplate` call site for the format-level path.
- `migrateConfig` invocation pattern.

**Test scenarios:**
- Happy path: a 3-slide format where slide 0 has no `templateId`, slide 1 has `templateId: "carousel-content-text"`, slide 2 has `templateId: "carousel-outro"` resolves three configs (one fallback, two overrides).
- Happy path: two slides sharing the same `templateId` cause `resolveTemplate` to be called once due to memoization.
- Happy path: a request with no `templateId` on any slide is byte-identical in behavior to the current pipeline (regression).
- Error path: an invalid `templateId` propagates the same error `resolveTemplate` produces today; the per-slide override does not swallow it.
- Edge case: empty `slides` array still renders zero slides for the format.

**Verification:**
- New unit tests pass.
- Existing pipeline tests pass unchanged.
- Verify backward compatibility with one of the existing release fixtures: render produces identical structure.

---

- U4. **Decorative blob shape components and renderer hookup**

**Goal:** Provide soft-modern decorative shapes (blobs, circles, wave) as JSX components selectable from template configs. Tinted via brand primary color.

**Requirements:** R5

**Dependencies:** U1 (introduces the `shape` field on visual variant)

**Files:**
- Create: `src/lib/templates/components/CarouselShapes.tsx`
- Modify: `src/lib/templates/canvas-renderer.tsx`
- Test: `src/lib/__tests__/carousel-shapes.test.ts`

**Approach:**
- `CarouselShapes.tsx` exports a small set of named SVG-only React components:
  - `Blob1`, `Blob2` — soft amorphous shapes
  - `Circle` — simple disc
  - `Wave` — gentle horizontal wave
- Each component accepts `{ width, height, fill, opacity }` props. Uses pure `<svg><path/></svg>` markup that Satori supports.
- Renderer change: in the visual-render branch, when `obj.shape` is set, render the matching component instead of an `<img>`. Position via the existing absolute-positioning wrapper. Resolve `fill` from `obj.colorRole` (default `"primary"`) and `opacity` from `obj.opacity`.
- Existing visual objects (with `src` or `visualFrame`) keep their current rendering path.

**Patterns to follow:**
- `src/lib/templates/components/BrowserFrame.tsx`, `MobileFrame.tsx` — props shape, single-component-per-file convention.

**Test scenarios:**
- Happy path: each exported shape component renders a non-empty SVG with the supplied `fill` and `opacity` styles.
- Happy path: a visual `TemplateObject` with `shape: "blob1"` renders the `Blob1` component sized to the object's `width`/`height`.
- Edge case: an unknown `shape` value falls back to no render and emits a console warning (or silently skips — pick during impl). No crash.
- Edge case: `shape` plus `src` set simultaneously prefers `shape`; documented in renderer comment.

**Verification:**
- Unit tests pass.
- Manual render of a single slide with `shape: "blob1"` produces a recognizable blob shape in the output JPEG.

---

- U5. **Define the 4 carousel templates in `canvas-defaults.ts`**

**Goal:** Author the actual `CanvasTemplateConfig` entries for `carousel-cover`, `carousel-content-text`, `carousel-content-image`, `carousel-outro` across all three formats (landscape 1200×675, square 1080×1080, portrait 1080×1350).

**Requirements:** R1, R5

**Dependencies:** U1, U2, U4 (templates use the new text fields and `shape` objects)

**Files:**
- Modify: `src/lib/templates/canvas-defaults.ts`
- Test: `src/lib/__tests__/carousel-templates-config.test.ts`

**Approach:**
- Add four new entries to the `Record<string, CanvasTemplateConfig>` export. Each carries `version: 2`, `formats: { landscape, square, portrait }`, and per-format `objects: TemplateObject[]`.
- Shared object IDs across the family (consistent so per-slide overrides target predictable IDs):
  - `bg_blob_1`, `bg_blob_2` — visual, `shape` field, `colorRole: "primary"`, low opacity (~0.15–0.3), absolute corners
  - `signature_avatar` — image, small circle, bottom-left, `skipEmpty: true`
  - `signature_name` — text, `skipEmpty: true`
  - `signature_title` — text, `skipEmpty: true`
- Per-template objects:
  - `carousel-cover`: `eyebrow` (text, small), `title` (text, large, `accentMarkup: true`, `colorRole: "text"`), `subhead` (text), `swipe_cta` (text with `background`, `borderRadius: 999`, `paddingX/Y`, `skipEmpty: true`).
  - `carousel-content-text`: `badge` (text with `background: colorRole "primary"` via wrapper, `borderRadius: 12`, `paddingX/Y`), `heading` (text with `accentMarkup: true`), `body` (text, no markup, ~50–60% canvas height).
  - `carousel-content-image`: `badge`, `heading` (`accentMarkup: true`), `body` (narrower column), `side_image` (visual, ~50% width, with `borderRadius`, `objectFit: "cover"`).
  - `carousel-outro`: `eyebrow`, `title` (`accentMarkup: true`), `cta_paragraph`, `cta_button` (text pill with `background`, `borderRadius: 999`).
- Per-format coordinates: portrait gets the most generous body zone; landscape splits horizontally for cover/outro; square is a balanced compromise. Exact pixel coordinates determined visually during this unit using `OUTPUT_LOCAL=true`.
- Default `colors`: `background` light cream, `text` dark slate, `primary` electric blue. Brand colors override when present.

**Patterns to follow:**
- Existing `standard-browser`, `hero` configs — same `version: 2` schema, same per-format `objects` array convention.
- `previewText` on text objects — populate with realistic example copy from the brainstorm reference screenshots.

**Test scenarios:**
- Happy path: each of the 4 templates parses through `migrateConfig` without modification (already v2).
- Happy path: every template defines all three formats (`landscape`, `square`, `portrait`).
- Happy path: shared object IDs (`signature_avatar`, `signature_name`, `signature_title`, `bg_blob_1`, `bg_blob_2`) are present in all 4 templates.
- Happy path: `accentMarkup: true` is set on cover `title`, content-text `heading`, content-image `heading`, outro `title`.
- Edge case: badge and pill objects have non-zero `paddingX` and `paddingY` and a non-zero `borderRadius`.
- Test expectation: visual fidelity against reference screenshots — covered manually during implementation, not as automated assertion.

**Verification:**
- Config tests pass.
- A 5-slide manual render mixing all 4 templates produces output matching the reference soft-modern aesthetic.

---

- U6. **Signature default propagation from brand**

**Goal:** When a template includes `signature_avatar` or `signature_name` and the slide does not override them, fill them from the user's brand (`logo_url`, `name`) at render time. `signature_title` has no brand source — left empty unless overridden.

**Requirements:** R4

**Dependencies:** U5 (signature objects need to exist in templates first)

**Files:**
- Modify: `src/lib/pipeline/shared.ts` (specifically `buildSlideDataMaps` or a sibling helper)
- Test: `src/lib/__tests__/carousel-signature-defaults.test.ts`

**Approach:**
- After `buildSlideDataMaps` produces the per-slide `ObjectDataMap`, iterate the resolved template's objects and apply brand-default fallback for known signature object IDs:
  - `signature_avatar` ← `brand.logo_url` when slide map has no entry.
  - `signature_name` ← `brand.name` when slide map has no entry.
  - `signature_title` ← left absent. `skipEmpty: true` on the template object hides it cleanly.
- Implementation choice: extract a small `applySignatureDefaults(map, brand, templateObjects)` helper. Only acts on objects with the literal IDs above; non-carousel templates are unaffected.
- Brand-driven defaults apply per slide, so a 5-slide carousel renders the same signature on every slide without the user re-entering it.

**Patterns to follow:**
- Existing brand resolution path in `src/lib/pipeline/shared.ts` (`resolveBrand`).
- `skipEmpty` filtering in `canvas-renderer.tsx` to confirm hidden-when-empty behavior.

**Test scenarios:**
- Happy path: a slide with no signature overrides on a carousel template gets `signature_avatar = brand.logo_url` and `signature_name = brand.name` in its data map.
- Happy path: a slide with explicit `signature_name` override keeps the override (no brand backfill).
- Happy path: `signature_title` left empty by both slide and brand → `skipEmpty: true` causes the renderer to omit it; render produces no empty box.
- Edge case: brand without a `logo_url` → `signature_avatar` left empty; renderer skips the image object.
- Edge case: a non-carousel template (e.g., `standard-browser`) is rendered with the same helper running — no `signature_*` IDs present, so no behavior change.
- Integration: a full pipeline render of a 3-slide carousel where every slide's signature data resolves identically to the brand.

**Verification:**
- Unit tests pass.
- Manual render of a 3-slide carousel with a brand that has `logo_url` and `name` shows the same footer on every slide without per-slide overrides.

---

- U7. **End-to-end carousel render fixture test**

**Goal:** Lock in the integrated behavior with a single high-signal test that exercises per-slide template override, accent markup, badge backgrounds, and signature defaults together.

**Requirements:** R1, R2, R3, R4, R6

**Dependencies:** U2, U3, U4, U5, U6

**Files:**
- Test: `src/lib/__tests__/carousel-render-e2e.test.ts`

**Approach:**
- Build a fixture `ReleaseRequest` for a 5-slide portrait carousel:
  - Slide 0: no `templateId` override (uses request-level `template: "carousel-cover"`); title with `*accent*` markup; no signature override.
  - Slide 1: `templateId: "carousel-content-text"`; numbered badge, heading with markup; signature inherits from brand.
  - Slide 2: `templateId: "carousel-content-image"`; side image; heading with markup.
  - Slide 3: `templateId: "carousel-content-text"`; second numbered slide.
  - Slide 4: `templateId: "carousel-outro"`; CTA button.
- Run the render pipeline with `OUTPUT_LOCAL=true` (or a test seam that intercepts before R2 upload) and assert:
  - Five output entries are produced for the format.
  - Each output's resolved template id matches expectations.
  - Signature data on every slide equals brand defaults except where slide overrides differ.
  - Accent-markup objects produce span structure (introspect the renderer call args, not the JPEG).
- Avoid pixel-level assertions; this test asserts wiring, not aesthetic fidelity.

**Patterns to follow:**
- `src/lib/__tests__/cook-api.test.ts` for end-to-end pipeline test scaffolding.
- `src/lib/__tests__/canvas-renderer-background.test.ts` for renderer-level introspection patterns.

**Test scenarios:**
- Covers F1 carousel render: a 5-slide portrait carousel with mixed `templateId` overrides resolves the right template per slide.
- Covers AE1 accent markup: a title with `*Entrepreneurial*` produces accent-flagged segments at the renderer call boundary.
- Covers AE2 signature defaults: every slide's `signature_avatar` and `signature_name` equal brand fields when no override is present.
- Covers AE3 backward compatibility: a separate fixture with no per-slide `templateId` produces the same template config on every slide (single resolution).
- Edge case: a request with `slides: []` produces zero outputs without erroring.

**Verification:**
- `npx vitest run src/lib/__tests__/carousel-render-e2e.test.ts` passes.
- Full test suite green.
- Manual confirmation: a single dev-server render of the same fixture produces 5 visually consistent JPEGs.

---

## System-Wide Impact

- **Interaction graph:** Render pipeline (`render.ts`) gains a per-slide template resolution step. Editor / UI for slide composition will eventually need to expose per-slide template selection — out of scope here but flagged.
- **Error propagation:** `resolveTemplate` errors for invalid per-slide `templateId` should bubble up unchanged. No new swallowing.
- **State lifecycle risks:** None — fully additive. Existing renders are byte-identical when no `templateId` is set.
- **API surface parity:** `ReleaseRequest` schema (request validation in `src/lib/__tests__/release-validation.test.ts` and equivalent server-side validators) needs to accept the new optional `slide.templateId`. Confirm the API route's input validator (`src/app/api/v1/cook/image/route.ts` and `cook/video/route.ts`) accepts the extra field. If validators use a strict shape, extend them in U3.
- **Integration coverage:** U7's e2e test covers the rendered-pipeline integration. UI-side wiring (editor pickers, drafts surface) is intentionally deferred.
- **Unchanged invariants:** Existing 5 templates, single-template renders, brand schema, credits calculation, video pipeline, GitHub webhook flow all unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `autoFitFontSize` heuristic over/underfits when accent spans introduce inline-flex layout differences | Always feed markup-stripped plain text to the measurer; render spans only at JSX time. Visual check during U5. |
| Wrapper-div approach for text background creates positioning regressions for non-carousel templates that opt into the new fields later | Default behavior unchanged when no new fields are set. Tests in U2 assert this. |
| Per-slide `templateId` schema change reaches the API request validator and is rejected | U3 explicitly extends request validation. e2e test in U7 catches this. |
| Asset request validators (cook/image, cook/video routes) reject unknown fields | Audit during U3; add allowance if validators are strict. |
| Decorative blob aesthetic doesn't match reference well enough to ship | Iterate during U5 with `OUTPUT_LOCAL=true`. Ship best version; future work can refine. |

---

## Documentation / Operational Notes

- Update `src/lib/templates/canvas-types.ts` JSDoc comments on the new fields so editor surface (admin templates page) future work has clear field semantics.
- No changelog/docs page for templates currently exists; if one is added later, list the carousel family there.
- No rollout flag needed — additive feature.

---

## Sources & References

- **Origin document:** `~/.claude/plans/i-want-to-ce-brainstorm-swift-sundae.md` (brainstorm requirements)
- Related code:
  - `src/lib/templates/canvas-types.ts`
  - `src/lib/templates/canvas-defaults.ts`
  - `src/lib/templates/canvas-renderer.tsx`
  - `src/lib/templates/components/BrowserFrame.tsx`, `MobileFrame.tsx`
  - `src/lib/pipeline/render.ts`, `src/lib/pipeline/shared.ts`
  - `src/lib/types.ts`
  - `convex/schema.ts`
- Reference inspiration: aiCarousels — soft-modern carousel aesthetic, supplied by user as visual examples in the brainstorm.
