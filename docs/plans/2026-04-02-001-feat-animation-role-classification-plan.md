---
title: "feat: Intelligent animation role classification for video presets"
type: feat
status: active
date: 2026-04-02
origin: docs/brainstorms/2026-04-02-animation-role-classification-requirements.md
---

# feat: Intelligent Animation Role Classification

## Overview

Add role-based animation assignment to the video preset system. Currently all images get `showcase-rise` (3D tilt + rise) + Ken Burns pan. With this change, only the "hero" image gets the dramatic animation. Background images (marked explicitly) are static. Other images fade in gently.

## Problem Frame

Custom templates with multiple images produce broken-looking videos — overlapping 3D-tilting images fighting for attention. The showcase preset needs to distinguish between hero images, background images, and secondary images. (see origin: `docs/brainstorms/2026-04-02-animation-role-classification-requirements.md`)

## Requirements Trace

- R1. Each image classified as `background`, `hero`, or `non-hero`
- R2. Background = explicit `background: true` flag on template object
- R3. Hero = highest zIndex among non-background images (tiebreak: opacity, then id)
- R4. Non-hero = all other non-background images
- R5. Text/logo unchanged
- R6. Add `background?: boolean` to `TemplateObject` (images only)
- R7. Settable in editor and via API
- R8. Default false — backward compatible
- R9. Background: no animation, no kenBurns
- R10. Hero: `showcase-rise` + `kenBurns: true`
- R11. Non-hero: `fade-in` + `kenBurns: false`
- R12. Text/logo: `showcase-reveal`
- R13. Single non-background image = always hero
- R14. Zero non-background images = no-op
- R15. Existing templates identical behavior

## Scope Boundaries

- No new animation types — reuse `showcase-rise`, `fade-in`, `none`
- `background` flag for images only
- Only affects `showcase` preset
- No migration needed — new optional field, undefined = false

## Context & Research

### Relevant Code and Patterns

- `src/remotion/VideoCanvasComposition.tsx:243-253` — `resolvePreset(preset, objectType)`, pure function returning `{ entrance, exit, kenBurns }`
- `src/remotion/VideoCanvasComposition.tsx:128-150` — `SlideRenderer` object loop: sorts by zIndex, staggers by 150ms, resolves animations
- `src/remotion/VideoCanvasComposition.tsx:146-150` — Ken Burns gate: `obj.type === "image" && kenBurnsEnabled && entrance !== "showcase-rise"`
- `src/lib/templates/canvas-types.ts:76-113` — `TemplateObject` interface, add `background?: boolean` in image-only section
- `src/components/editor/image-properties.tsx:159-315` — Image property panel, toggle pattern from `text-properties.tsx:212-238`
- `src/components/editor/editor-context.tsx:91-101` — `UPDATE_PROPERTY` action with `allFormats: true`
- `src/lib/types.ts:34-48` — `ObjectModification` interface for API payloads
- `src/lib/validation.ts:14-60` — `validateFormats()` loop where object properties are validated
- `src/lib/__tests__/preset-resolution.test.ts` — existing `resolvePreset` tests (4 tests, pure function pattern)

### Institutional Learnings

- Legacy per-object animation fields (`entrance`, `exit`, `kenBurns`) were recently stripped from `TemplateObject` in `migrateConfig` — the system moved to preset-only. This feature adds role-based logic within the preset, not per-object overrides.

## Key Technical Decisions

- **Hero detection inline in VideoCanvasComposition:** Extract a small exported `findHeroImageId(objects)` function for testability. Called once per slide before the object loop.
- **`resolvePreset` signature change:** Add `isHero?: boolean` parameter for image objects. Text/logo callers don't pass it. This keeps the function simple — no new types needed.
- **Stagger slot consumption:** Background objects still consume stagger slots. This is correct — `entrance: "none"` returns `{}` so `entranceOpacity=1` and no transform, making background objects appear at frame 0 regardless of stagger delay. The stagger only affects `localFrame` which `"none"` doesn't use.
- **No migration needed:** `background` is optional, defaults to undefined/false. Existing configs are unaffected.

## Open Questions

### Resolved During Planning

- **Where does role detection live?** Exported `findHeroImageId()` in `VideoCanvasComposition.tsx`. Small enough to not warrant its own module — ~15 lines. Exported for testing.
- **How does the editor expose the toggle?** On/Off button toggle in `image-properties.tsx` using the same pattern as Text Fit in `text-properties.tsx:212-238`. Placed before Device Frame section.
- **Does stagger need adjustment?** No. Background objects with `entrance: "none"` appear immediately regardless of stagger delay.

### Deferred to Implementation

- Exact placement of toggle relative to other image controls — may need visual review in the editor

## Implementation Units

- [ ] **Unit 1: Schema + Validation**

**Goal:** Add `background` field to TemplateObject and API validation

**Requirements:** R6, R7, R8

**Dependencies:** None

**Files:**
- Modify: `src/lib/templates/canvas-types.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/validation.ts`

**Approach:**
- Add `background?: boolean` to `TemplateObject` interface after `imageFrameColor` in the image-only section
- Add `background?: boolean` to `ObjectModification` interface in types.ts
- Add validation in `validateFormats()`: if `mod.background !== undefined && typeof mod.background !== 'boolean'`, return error
- `migrateObject()` does not touch `background` — no conflict with legacy field stripping
- No migration needed — field is optional, missing = false

**Patterns to follow:**
- `imageFrame` field pattern in `TemplateObject` (optional, image-only)
- `image_frame` validation pattern in `validateFormats()` (type check in object loop)

**Test expectation:** none — pure type/schema addition with no behavioral logic

**Verification:**
- `npm run build` succeeds with no type errors
- Existing tests pass unchanged

---

- [ ] **Unit 2: Animation Role Logic**

**Goal:** Implement hero detection and role-based animation resolution

**Requirements:** R1, R2, R3, R4, R5, R9, R10, R11, R12, R13, R14, R15

**Dependencies:** Unit 1

**Files:**
- Modify: `src/remotion/VideoCanvasComposition.tsx`
- Modify: `src/lib/__tests__/preset-resolution.test.ts`
- Create: `src/lib/__tests__/find-hero.test.ts`

**Approach:**
- Export `findHeroImageId(objects: TemplateObject[]): string | null` — filters to non-background images, returns id of highest zIndex (tiebreak: opacity desc, id asc). Returns null if no non-background images.
- Update `resolvePreset` to accept an additional `isHero?: boolean` parameter. When preset is "showcase":
  - `isHero === false` and objectType is "image" → `{ entrance: "fade-in", exit: "none", kenBurns: false }`
  - Otherwise (objectType is "image" and isHero is `true` or `undefined`) → `{ entrance: "showcase-rise", exit: "none", kenBurns: true }` — use `=== false` check so undefined falls through to existing behavior (backward compat for callers that don't pass isHero)
  - For background images: caller skips resolvePreset entirely, sets entrance/exit to "none" and kenBurns to false directly
- In `SlideRenderer`, before the map loop:
  - Compute `heroId = findHeroImageId(sortedObjects)`
  - In the loop: if `obj.background === true`, set entrance/exit to "none" and kenBurns to false
  - Otherwise pass `isHero: obj.id === heroId` to resolvePreset

**Patterns to follow:**
- Existing `resolvePreset` pure function pattern
- Existing stagger/entrance/exit computation flow in SlideRenderer

**Test scenarios:**
- Happy path: single image → hero → showcase-rise + kenBurns true
- Happy path: two images, different zIndex → highest gets showcase-rise, lower gets fade-in
- Happy path: image with `background: true` → entrance "none", kenBurns false
- Happy path: background + one non-bg image → non-bg is hero
- Happy path: text/logo → showcase-reveal unchanged
- Edge case: two images equal zIndex → higher opacity wins hero
- Edge case: two images equal zIndex + opacity → alphabetical id wins
- Edge case: zero images → findHeroImageId returns null
- Edge case: all images are background → no hero, findHeroImageId returns null
- Integration: non-hero image with fade-in does NOT get Ken Burns (kenBurns: false prevents computeImageEffects)
- Backward compat: existing 4 resolvePreset tests pass unchanged (isHero=undefined → existing showcase-rise behavior)

**Verification:**
- `npx vitest run src/lib/__tests__/preset-resolution.test.ts src/lib/__tests__/find-hero.test.ts` passes
- `npm run build` succeeds

---

- [ ] **Unit 3: Editor UI**

**Goal:** Add background toggle to image properties panel in template editor

**Requirements:** R7

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/editor/image-properties.tsx`

**Approach:**
- Add On/Off button toggle for `background` property, using the same pattern as Text Fit toggle in `text-properties.tsx:212-238`
- Use `update("background", value)` to apply across all formats (note: image-properties.tsx uses `update()` for allFormats:true, not `updateShared()` which is text-properties naming)
- Place before Device Frame section (line ~159) — background is a higher-level concern than frame style
- Gate behind `isImage` check (same pattern as Device Frame section at line 159) — ImageProperties renders for both image and logo types, but background only applies to images
- Label: "Background" with help text: "Background images appear immediately without animation"

**Patterns to follow:**
- Text Fit toggle in `text-properties.tsx:212-238` — On/Off button pair with `updateShared()`
- `image-properties.tsx` existing section structure (Label + control + help text)

**Test expectation:** none — UI toggle with no behavioral logic beyond dispatching UPDATE_PROPERTY

**Verification:**
- Editor renders without errors
- Toggling background On/Off updates the template config correctly
- Background toggle persists across format switches

---

- [ ] **Unit 4: End-to-End Verification**

**Goal:** Verify the full pipeline works: editor toggle → API → video render

**Requirements:** R15 (backward compat), all success criteria

**Dependencies:** Units 1-3

**Files:**
- No file changes — verification only

**Approach:**
- Run full test suite to confirm no regressions
- Build check for type safety
- Manual verification with Remotion studio if possible

**Test expectation:** none — verification unit, no new test files

**Verification:**
- `npx vitest run` — all tests pass
- `npm run build` — clean build
- Manual: built-in template renders identically to current behavior
- Manual: custom template with background image → background static, hero tilts, non-hero fades

## System-Wide Impact

- **Interaction graph:** Change is contained to: TemplateObject schema → editor UI → validation → VideoCanvasComposition render loop. No callbacks, webhooks, or middleware affected.
- **Error propagation:** Invalid `background` field in API payload returns 400 validation error (existing pattern). No new failure modes in render pipeline.
- **State lifecycle risks:** None — `background` is a static template property, not runtime state.
- **API surface parity:** The `background` field is available both in the template editor (persisted to Convex) and in API payloads (per-render override via ObjectModification).
- **Unchanged invariants:** Image rendering in `canvas-renderer.tsx` is unaffected — `background` only affects video animation, not static image generation. The Satori pipeline for image generation does not use animation presets.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Ken Burns still applied to non-hero via code path at line 148 | R11 explicitly sets `kenBurns: false`, and background objects skip resolvePreset entirely |
| Background objects consume stagger slots, delaying hero entrance | Minimal impact (150ms per slot). Can optimize later if needed by filtering backgrounds from stagger count |
| Editor toggle not obvious to users | Help text explains the behavior. Can add tooltip or documentation later |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-02-animation-role-classification-requirements.md](docs/brainstorms/2026-04-02-animation-role-classification-requirements.md)
- Related code: `src/remotion/VideoCanvasComposition.tsx` (resolvePreset, SlideRenderer, computeImageEffects)
- Related commit: `9ada3e6` — default to showcase preset when none is set
- Related commit: `42e783e` — replace per-object animations with video presets
