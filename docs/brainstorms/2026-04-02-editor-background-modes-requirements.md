---
date: 2026-04-02
topic: editor-background-modes
---

# Template Editor: Right Sidebar Reorganization + Background Modes

## Problem Frame

The template editor's right sidebar is empty when no object is selected ("Select an object to edit its properties"). Meanwhile, template-level settings (Colors, Video Preset) are crammed into the left sidebar alongside format switching and object management. Users who want rich backgrounds (gradients, images) must create a full-size image object as a workaround, which is clunky and creates animation/layering issues.

Moving template-level settings to the right sidebar and adding background mode options makes the editor more logical and unlocks richer slide backgrounds natively.

## Requirements

**Sidebar Reorganization**
- R1. Move Colors section (BrandColorSection) from left sidebar to right sidebar, shown when no object is selected
- R2. Move Video Preset dropdown (`animation_preset` field) from left sidebar to right sidebar, shown when no object is selected
- R3. Left sidebar retains only: Format switcher and Objects section (add + layer list)
- R19. Right sidebar shows a header: "Template" when no object selected, "Object: [name]" when object selected, to distinguish editing contexts

**Background Mode Selector**
- R4. Add a Background section to the right sidebar (visible when no object selected), between Colors and Video Preset
- R5. Background section has a dropdown with three modes: Color (default), Image, Mesh Gradient
- R6. Background config is global — same across all formats (landscape, square, portrait). For image mode, image renders as `cover` in each format's aspect ratio.

**Color Mode**
- R7. Default mode. Uses the background color from the Colors section. In Color mode, the Background section collapses to just the mode dropdown with no body.

**Image Mode**
- R8. Shows a file upload field (reuse existing upload pattern from image-properties static image). Upload via `/api/v1/upload`.
- R9. Shows preview thumbnail when image is set, with Replace and Remove buttons
- R10. Background image is stored in the template config (set via editor only — the cook API cannot override it, but will render whatever background config the template has).

**Mesh Gradient Mode**
- R11. Shows 3 color pickers, prefilled from the template's current colors (background, text, primary) on first activation. After that, gradient colors are independent of the Colors section — changing template colors does not retroactively update the gradient.
- R12. A "Randomize" button regenerates the gradient positions while keeping the 3 colors. Same colors, different arrangement each click.
- R13. Gradient is generated from 3 radial-gradient layers at different positions, which is Satori-compatible (no SVG filters or CSS blur needed)
- R14. Gradient config stores both the 3 colors and the position data, so the exact gradient is reproducible across renders

**State Behavior**
- R15. Switching between background modes preserves previous settings — e.g., switching from Mesh Gradient to Color and back restores the gradient config. Image mode initializes with no image; switching away and back preserves the previously uploaded image URL.
- R16. Background changes are undoable (integrated with existing undo/redo system). Mode switch is a single atomic undo step (including color init + position gen). Each Randomize click is a single undo step.

**Rendering**
- R17. All three background modes must render correctly in: editor canvas preview, Satori image pipeline, and Remotion video composition
- R18. Existing templates without a background config field render identically to today (backward compatible — renderer defaults to color mode when `background` is absent; no migration or `migrateConfig()` backfill needed)

## Success Criteria
- Template-level settings appear in the right sidebar when no object is selected; left sidebar is cleaner
- Users can create visually rich backgrounds (gradients, images) without creating workaround image objects
- Users can upload a background image that renders as cover across all formats in both image and video output
- Mesh gradient randomize button produces noticeably different layouts each click
- Existing templates and API calls work identically without any migration

## Scope Boundaries
- No API-level background override (cook request cannot set background image or gradient — editor-only). Candidate for fast-follow.
- No draggable gradient position controls (randomize button only)
- No grain/noise texture overlay (potential future enhancement)
- No per-format background settings
- No iridescent/holographic backgrounds (would require WebGL/Canvas, out of scope)

## Key Decisions
- **Global not per-format**: Background is one setting shared across all formats, matching how colors work today. Simpler UX.
- **Randomize positions, not drag**: Mesh gradient positions are randomized via button rather than user-draggable. Keeps UX simple while providing variety.
- **Editor-only image backgrounds**: No API surface expansion for background images. Templates bake the background in.
- **Preserve state on mode switch**: Switching between modes remembers previous config so users can compare without losing work.
- **One-time color init for gradients**: Mesh gradient colors are seeded from template colors on first activation, then fully independent. No ongoing sync.
- **Atomic undo for mode switches**: Mode switch + initialization is one undo step. Each Randomize click is one undo step.
- **Template duplication**: Duplicating a template copies the full background config including image URLs. Built-in defaults ship with no background config (implicit color mode).

## Dependencies / Assumptions
- Satori supports layered `radial-gradient()` in the `background` CSS shorthand (verified — it does)
- Satori does NOT support `background-image: url()` — image mode needs an `<img>` tag with absolute positioning
- Existing `/api/v1/upload` endpoint is reused for background image uploads
- `fetchImageAsBase64()` in the render pipeline handles background image conversion for Satori

## Outstanding Questions

### Deferred to Planning
- [Affects R13][Needs research] What specific gradient positions and opacity values produce the best-looking mesh gradients? Needs visual iteration during implementation.
- [Affects R14][Technical] Exact shape of the position data to store — could be `{x: number, y: number}[]` per blob, or `{x: number, y: number, spread: number}[]` if spread varies.
- [Affects R17][Technical] How to share the `resolveBackgroundStyle` helper between bragfast and bragfast-video-presets repos (duplicate, shared package, or relative import).
- [Affects R8/R17][Technical] `prefetchStaticImages()` only walks template objects — needs a new code path to also resolve `config.background.imageUrl` to base64 for Satori rendering.
- [Affects R13][Technical] Satori renders to SVG internally — verify layered radial-gradient blending matches browser rendering. Spike during implementation.

## Next Steps
-> `/ce:plan` for structured implementation planning
