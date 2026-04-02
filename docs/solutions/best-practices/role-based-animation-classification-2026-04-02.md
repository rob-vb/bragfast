---
title: Role-based animation classification for multi-image video templates
date: 2026-04-02
category: best-practices
module: video-rendering
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Custom templates have multiple image objects on a single slide
  - Video preset animations need to differentiate between hero, background, and secondary images
  - Ken Burns 3D tilt effect applied to all images causes visual chaos
tags:
  - remotion
  - video-presets
  - animation
  - hero-detection
  - template-objects
  - ken-burns
  - showcase-preset
---

# Role-based animation classification for multi-image video templates

## Context

The `showcase` video preset applies `showcase-rise` (3D tilt + rise) and Ken Burns pan to every image object on a slide. When a custom template has multiple images — a background texture, a hero screenshot, and perhaps a decorative element — all images tilt dramatically at once, creating overlapping, broken-looking animation.

The root cause: `resolvePreset()` dispatched animations by object **type** only (`image` / `text` / `logo`), treating every image identically regardless of its role on the slide.

## Guidance

Classify each image into one of three roles before resolving its animation:

1. **Background** — Explicitly marked via `background: true` on the template object. Static from frame 0, no animation, no Ken Burns.
2. **Hero** — The non-background image with the highest `zIndex`. Gets the dramatic `showcase-rise` entrance + Ken Burns 3D tilt. Exactly one per slide.
3. **Non-hero** — All remaining non-background images. Gets `fade-in` entrance with `kenBurns: false`.

Key implementation details:

- **Explicit flag over auto-detection**: Background status is user-set (`background: true`), not inferred from opacity, size, or position. Heuristic detection was explored and rejected — opacity, size, and zIndex all have legitimate non-background uses.
- **zIndex as the hero signal**: Among non-background images, the highest `zIndex` wins hero. Tiebreak: higher opacity, then alphabetical `id`.
- **Ken Burns must be explicitly disabled**: The existing `computeImageEffects` code path applies Ken Burns to any image where `kenBurns: true` AND `entrance !== "showcase-rise"`. Without explicitly setting `kenBurns: false` for non-hero images, `fade-in` images would still get the 3D tilt pan through this secondary code path.
- **Background objects skip `resolvePreset` entirely**: They get hardcoded `{ entrance: "none", exit: "none", kenBurns: false }` before the preset resolution step.

## Why This Matters

Without role classification, adding multiple images to a custom template makes videos unusable. The 3D tilt animation is designed for a single focal image — when applied to 2-3 images simultaneously, they overlap and fight for attention. This makes the entire custom template video feature broken for any template with backgrounds or multiple images.

The explicit `background` flag also gives template authors direct control, which is more reliable than any heuristic system.

## When to Apply

- When adding new animation presets beyond `showcase` — each preset should define its own role-to-animation mapping
- When modifying `resolvePreset()` or the `SlideRenderer` animation loop
- When adding new object types that might need role-based animation (e.g., shapes, decorative elements)
- When the Ken Burns code path (`computeImageEffects`) is modified — ensure the `kenBurns` flag is respected for all roles

## Examples

**Before** — all images get the same animation:

```typescript
// resolvePreset only checked object type
if (objectType === "image") return { entrance: "showcase-rise", exit: "none", kenBurns: true };
```

**After** — role-based classification:

```typescript
// Compute hero once before the render loop
const heroId = findHeroImageId(sortedObjects);

// Per-object: background → static, hero → 3D tilt, non-hero → fade
const isBg = obj.type === "image" && obj.background === true;
const isHero = obj.type === "image" ? obj.id === heroId : undefined;

const presetAnim = isBg
  ? { entrance: "none", exit: "none", kenBurns: false }
  : resolvePreset(config.animation_preset, obj.type, isHero);
```

**Hero detection** — pure function, exported for testing:

```typescript
export function findHeroImageId(objects: TemplateObject[]): string | null {
  const candidates = objects.filter((o) => o.type === "image" && !o.background);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.zIndex !== a.zIndex) return b.zIndex - a.zIndex;
    if ((b.opacity ?? 1) !== (a.opacity ?? 1)) return (b.opacity ?? 1) - (a.opacity ?? 1);
    return a.id.localeCompare(b.id);
  });
  return candidates[0].id;
}
```

## Related

- `docs/brainstorms/2026-04-02-animation-role-classification-requirements.md` — full requirements doc
- `docs/plans/2026-04-02-001-feat-animation-role-classification-plan.md` — implementation plan
- `src/remotion/VideoCanvasComposition.tsx` — `resolvePreset()`, `findHeroImageId()`, `SlideRenderer`
- `src/lib/templates/canvas-types.ts` — `TemplateObject.background` field
