---
date: 2026-04-02
topic: animation-role-classification
---

# Intelligent Animation Role Classification

## Problem Frame

When a custom template has multiple images, every image gets the `showcase-rise` animation (dramatic 3D tilt + rise). This causes overlapping tilting images that look broken. The system needs to detect each image's role on the slide and assign an appropriate animation — only the "hero" image should get the dramatic entrance. Background images should appear immediately without animation.

## Requirements

**Role Classification**
- R1. Each image object on a slide is classified as one of: `background`, `hero`, or `non-hero`
- R2. A **background** image is any image with `background: true` set on the template object. Appears immediately, no animation
- R3. The **hero** is the non-background image with the highest `zIndex`. Exactly 1 hero per slide. Tiebreak among equal max zIndex: higher `opacity` wins, then alphabetical `id`
- R4. All other non-background images are `non-hero`
- R5. Text and logo objects keep their current animation behavior unchanged

**Schema Change**
- R6. Add optional `background?: boolean` field to `TemplateObject` interface (images only)
- R7. The `background` flag is settable in the template editor and via API payload
- R8. Default: `false` (or undefined) — backward compatible, no existing templates affected

**Animation Mapping**
- R9. Background image: no animation, no kenBurns — static, immediately visible at full position
- R10. Hero image: `showcase-rise` entrance + `kenBurns: true` — current behavior, unchanged
- R11. Non-hero images: `fade-in` entrance + `kenBurns: false` — no 3D tilt, no Ken Burns pan
- R12. Text/logo: `showcase-reveal` entrance — unchanged

**Backward Compatibility**
- R13. When a slide has exactly 1 non-background image, it is always classified as `hero`
- R14. When a slide has zero non-background images, hero classification is a no-op
- R15. Existing templates without `background` field behave identically to current — all images are non-background by default

## Success Criteria
- Built-in template videos render identically to current behavior
- Multi-image custom templates: only the top-layer non-background image does the 3D tilt
- Background images (marked `background: true`) appear immediately without animation or Ken Burns
- Non-hero images fade in gently without competing with the hero

## Scope Boundaries
- No new animation types — reuse existing `showcase-rise`, `fade-in`, `none`
- `background` flag applies to images only, not text/logo objects
- Only affects the `showcase` preset; other future presets can define their own role mappings

## Key Decisions
- **Explicit `background` flag over auto-detection**: user marks which images are backgrounds — no fragile heuristics based on opacity, size, or zIndex
- **zIndex is the hero signal**: highest zIndex among non-background images = hero
- **kenBurns explicitly disabled for non-hero and background**: prevents the existing `computeImageEffects` code path from applying 3D tilt via Ken Burns
- **Two-step classification**: first filter out backgrounds (explicit flag), then pick hero by zIndex from the rest

## Outstanding Questions

### Deferred to Planning
- [Affects R6][Technical] Where should the role detection live — inline in VideoCanvasComposition or extracted to a utility?
- [Affects R7][Technical] How does the template editor expose the `background` toggle? Checkbox in object properties panel?
- [Affects R10][Needs research] Does the stagger delay (150ms per zIndex) need adjustment when background objects are static?

## Next Steps

-> `/ce:plan` for structured implementation planning
