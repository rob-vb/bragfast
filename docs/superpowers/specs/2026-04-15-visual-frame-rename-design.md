# Visual Frame Rename — Design

**Date:** 2026-04-15
**Goal:** Rename `image_frame`/`imageFrame` → `visual_frame`/`visualFrame` and `image_frame_color`/`imageFrameColor` → `visual_frame_color`/`visualFrameColor` across API, internal code, schema, UI labels, and user-facing docs. Rationale: object type is already `"visual"`; field names diverged from that terminology.

**Scope:** Hard break — no API aliases. Feature branch not yet shipped.

## Renames

| Before | After | Surface |
|--------|-------|---------|
| `image_frame` | `visual_frame` | API request (`ObjectModification`), API response, docs |
| `image_frame_color` | `visual_frame_color` | API request, API response, docs |
| `imageFrame` | `visualFrame` | `TemplateObject`, `ObjectDataMap`, editor state, Convex schema |
| `imageFrameColor` | `visualFrameColor` | `TemplateObject`, `ObjectDataMap`, editor state, Convex schema |
| `ImageFrame` (type) | `VisualFrame` (type) | `canvas-types.ts` |
| `VALID_IMAGE_FRAMES` | `VALID_VISUAL_FRAMES` | `validation.ts` |
| `"Image objects"` (UI label) | `"Visual objects"` | `param-table.tsx` group label |

## Files

**Types + migration**
- `src/lib/templates/canvas-types.ts` — rename type, fields; extend `migrateConfig()` to map `imageFrame`/`imageFrameColor` → `visualFrame`/`visualFrameColor` (preserves existing Convex-stored templates; legacy `device`/`deviceColor` migration retained and retargeted).
- `src/lib/types.ts` — `ObjectModification` API field names.

**Renderer + defaults**
- `src/lib/templates/canvas-renderer.tsx` — `ObjectDataMap` type, read paths.
- `src/lib/templates/canvas-defaults.ts` — all 5 built-in template objects (~15 occurrences).

**Pipeline + validation**
- `src/lib/pipeline/shared.ts` — API→internal mapping.
- `src/lib/validation.ts` — validator + error message + constant name.

**API + docs**
- `src/app/api/v1/templates/[id]/route.ts` — response payload field names.
- `src/lib/docs/api-reference.ts` — param names, example JSON.
- `src/components/docs/param-table.tsx` — `GROUP_LABELS.image` → `"Visual objects"`.

**Editor UI**
- `src/components/editor/visual-properties.tsx` — state reads + `update()` property names.
- `src/components/editor/canvas-object.tsx` — render reads.
- `src/components/editor/editor-context.tsx` — default object init.

**Schema**
- `convex/templates.ts` — validator field names.

**Tests**
- `src/lib/__tests__/cook-api.test.ts` — update fixtures + error assertion string.

## Data migration

Existing Convex-stored templates (`tmpl_*`) written with `imageFrame`/`imageFrameColor`. `migrateConfig()` runs at read time, so no backfill required. New writes store `visualFrame`/`visualFrameColor`.

Convex schema validators use `v.optional` on both old and new during transition is *not* needed — Convex tolerates extra fields on read via `migrateConfig()`, and new writes conform to renamed schema. If stored templates contain old keys, `migrateConfig` rewrites them before consumption.

Risk: if any code path reads Convex raw without `migrateConfig`, old keys survive. Audit reads — current path is `GET /api/v1/templates/[id]` → Convex query → `migrateConfig()` in `canvas-renderer.tsx` / `shared.ts`. Verify during implementation.

## API break

Clients sending `image_frame` / `image_frame_color` will have those keys silently dropped (validator only inspects known keys) — frames render with template defaults instead of client intent. Acceptable per branch status. Documentation update makes new names discoverable.

Documentation update (`api-reference.ts`) ensures correct field names surface to devs.

## Out of scope

- Historical docs in `docs/superpowers/plans/`, `docs/superpowers/specs/` pre-dating this rename, `docs/plans/`, `docs/brainstorms/` — preserve as-is (historical record).
- CLAUDE.md `videoTemplates` claim — stale, will be corrected in this PR (remove from 11-tables list).
- Video-native template cleanup (`video-text-only`, `video-full-bleed`, `/api/v1/video-templates`, `videoTemplates` table) — already absent from repo; nothing to remove.

## Verification

- `npm run lint`
- `npx vitest run`
- `npm run build` (Convex codegen + Next.js)
- Manual: open editor, select visual object, change frame + color → persist → reload → values retained.
