---
title: Semantic color roles for text objects
date: 2026-04-13
category: best-practices
module: templates
problem_type: bug_fix
component: canvas-templates
severity: medium
applies_when:
  - A text object should track a brand/template color (primary, text, background)
  - Built-in template defaults define "themed" text (e.g., title in primary color)
tags:
  - templates
  - canvas-renderer
  - brand-colors
  - text-color
---

# Semantic color roles for text objects

## Problem

Built-in templates hardcoded `color: "#F8AF3C"` on title objects — the same hex
as the default `colors.primary`. This *looked* like the title used the primary
color, but it was a literal hex. When a brand (or template) changed its primary
color, the title stayed orange because `obj.color` won over anything semantic.

Repro: pick the `standard-browser` template, switch to Manual colors, set
primary to a different hex → title still renders at the old hardcoded hex.

## Root cause

`TemplateObject.color` stores a concrete hex. The editor's "Primary" swatch
copied the current primary's hex into `color` at click time — a value, not a
reference. The renderer had no semantic link from a text object to
`colors.primary`.

## Fix

Added `colorRole?: "primary" | "text" | "background"` to `TemplateObject` and a
`resolveTextColor(obj, colors)` helper. Resolution precedence in renderers:

```
1. per-slide data.color override (from API)
2. obj.colorRole           → look up colors[role]
3. obj.color               → literal hex
4. colors.text             → fallback
```

In the editor (`text-properties.tsx`), clicking the Text or Primary swatch
sets `colorRole` and clears `color`; the custom picker / hex input set `color`
and clear `colorRole`. Selected-swatch indication is driven off `colorRole`,
not off hex equality, so brand color changes don't desync the UI.

Built-in templates (`canvas-defaults.ts`) now use `colorRole: "primary"` on
titles (and on the changelog `version` text) instead of the hardcoded hex.

## What to avoid

- Don't set `obj.color = colors.primary` in editor handlers — you lose the
  link to the role the moment the brand changes.
- Don't special-case sentinel strings (`color: "primary"`) — use the typed
  `colorRole` field instead.
- Keep the renderer and editor preview (`canvas-object.tsx`) in sync; both
  must go through `resolveTextColor`.

## Files

- `src/lib/templates/canvas-types.ts` — `ColorRole`, `resolveTextColor`, field on `TemplateObject`
- `src/lib/templates/canvas-renderer.tsx` — renderer uses helper
- `src/components/editor/canvas-object.tsx` — editor preview uses helper
- `src/components/editor/text-properties.tsx` — swatches set role, picker sets hex
- `src/lib/templates/canvas-defaults.ts` — `colorRole: "primary"` on titles
