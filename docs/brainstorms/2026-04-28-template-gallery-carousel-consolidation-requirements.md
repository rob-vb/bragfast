---
title: Template Gallery + Carousel Consolidation
date: 2026-04-28
status: ready-for-planning
origin: User-initiated `/ce-brainstorm` after shipping `feat/carousel-templates` (4-template family). Post-ship review surfaced UX problems in `/admin/templates` and `/admin/kitchen`, plus an attachment-gap on the family abstraction.
---

## Context

`feat/carousel-templates` shipped 4 carousel-family default templates (`carousel-cover`, `carousel-content-text`, `carousel-content-image`, `carousel-outro`) plus per-slide `templateId` override (U1), inline `*accent*` markup parser, and text-object `background`/`borderRadius` fields. Tests green, branch pushed.

Two UX problems surfaced on review:

1. `/admin/templates` shows ID + Clone button only — no preview thumbnail. User workaround today: clone a default template to inspect what it looks like via the editor canvas. Friction is real.
2. The 4 carousel templates feel like they belong together (shared visual language, all consumed in one carousel render) but each is independently selectable per-slide, so the user couldn't decide whether to group them, and what "group" would even mean.

During brainstorm, the user pivoted: **collapse the 4 carousel templates into 1 flexible `carousel-slide` template** that handles all slide roles (hook, content, outro) via optional content fields. This dissolves the family-grouping question, simplifies the gallery, and aligns with 2026 carousel design trends (hook slide, value-first structure, minimalist aesthetic).

## Goals

1. Replace 4 carousel-family templates with 1 `carousel-slide` template that supports hook / content / outro roles via optional content fields.
2. Show preview thumbnails on `/admin/templates` so users can recognize templates without cloning-to-inspect.
3. Surface the existing text-object `background` + `borderRadius` fields in the template editor so users can edit badge / CTA pill styling without hand-editing JSON.

## Non-goals

- Kitchen per-slide template picker UI. The U1 API override stays wired, but exposing per-slide template selection in Cook UI is future work.
- User-authored template families (tag-based grouping, composite family entities). Not needed once the family collapses to one template.
- Seamless / infinite-flow carousels (visuals continuing across slides) and interactive design ("swipe to see result"). Out of scope.
- Schema migration for prior renders that referenced the 3 dropped templates. None exist (the 3 are <24h old, never used in user renders). Verify before deletion.
- Auto-generating carousel content from a single prompt. Sous-Chef concern, separate.
- Editing the existing 5 non-carousel default templates' look or behavior.

## Users and Use Case

**Primary user:** brag.fast subscribers building multi-slide explainer / listicle / tutorial carousels for LinkedIn, X, or Instagram.

**Use case:**
1. User opens Cook page, picks `Carousel Slide` template once (existing single-template flow).
2. User adds N slides to the portrait format.
3. Per slide, user fills only the fields that apply for that slide role:
   - Hook (slide 1): big headline, optional eyebrow. Leave badge/body/CTA empty.
   - Content (slides 2-N-1): badge number + headline + body.
   - Outro (slide N): headline + CTA pill text. Leave badge/body empty.
4. Render produces N JPEGs sharing one template, varied content, consistent visual language.

**Secondary user touchpoint:** `/admin/templates` browsing. User scans previews to recognize templates by sight; copies ID for API use; clones a default to customize.

## Spec

### `carousel-slide` template (replaces 4)

Object set (all `skipEmpty: true` except `headline`):

| Object id        | Type   | Notes                                                         |
| ---------------- | ------ | ------------------------------------------------------------- |
| `eyebrow`        | text   | Small line above headline ("Learn how to..."). Optional.      |
| `badge`          | text   | Numbered badge. Uses text-object `background` + `borderRadius` for pill. Optional. |
| `headline`       | text   | Required. Supports `*accent*` markup. `colorRole: "text"`.     |
| `body`           | text   | Body paragraph. Optional.                                     |
| `cta_text`       | text   | CTA pill at bottom ("Follow for more"). Uses `background` + `borderRadius`. Optional. |
| `signature_avatar` | image | Brand-default. Optional.                                      |
| `signature_name`   | text  | Brand-default. Optional.                                      |
| `signature_title`  | text  | Brand-default. Optional.                                      |

Layout: portrait-first (1080×1350), per-format variants for landscape (1200×675) and square (1080×1080) using the existing `formats` map.

Aesthetic: soft-modern, minimalist. Solid background, sans-serif, generous whitespace. No decorative blobs (already removed from the family in the prior commit).

The 3 dropped templates (`carousel-cover`, `carousel-content-image`, `carousel-outro`) are deleted from `canvas-defaults.ts` and from the `seedDefaults` slug list. The `seedDefaults` cleanup logic in `convex/templates.ts` already handles removing stale default rows.

### Templates page previews

`/admin/templates` `TemplateCard` renders a thumbnail above the name + ID + actions:
- Default templates → live `TemplatePreview` render using brag.fast sample brand (matches Kitchen behavior).
- User templates → live `TemplatePreview` render using user's primary brand, fallback to brag.fast sample brand on new accounts.
- Stored `previewUrl` (R2-hosted JPEG) is preferred when present to avoid rerendering on every page load. Live render is fallback for templates without stored previews.
- ID + Copy button stays visible. Power-user shortcut preserved.

### Editor exposes `background` + `borderRadius`

Template editor's right sidebar (per-object property panel) gains controls for text objects:
- `background` — color picker. Empty = transparent (current behavior).
- `borderRadius` — number input, 0–999. Empty = 0 (square corners).

These wire into the existing `TemplateObject` fields shipped with the carousel work. No type changes.

## Required New Capabilities

None. All shipping work is removal, consolidation, and surfacing existing fields:
- Drop 3 default templates and update seed slugs.
- Rewrite `carousel-content-text` defaults as `carousel-slide` with extended object set; rename `externalId` and config-defaults key.
- `TemplateCard` renders thumbnail (component already exists at `src/components/kitchen/template-preview.tsx` — reuse).
- Editor right sidebar adds two property controls.

## Visual Aid — Information Architecture

```
/admin/templates
├── Default Templates (6)
│   ├── Standard Browser    [thumb] [id] [Clone]
│   ├── Standard Mobile     [thumb] [id] [Clone]
│   ├── Split Browser       [thumb] [id] [Clone]
│   ├── Split Mobile        [thumb] [id] [Clone]
│   ├── Hero                [thumb] [id] [Clone]
│   └── Carousel Slide      [thumb] [id] [Clone]
└── My Templates
    └── …user clones…       [thumb] [id] [Edit] [Clone] [Delete]

Cook flow (unchanged)
└── pick "Carousel Slide" once → add N slides → fill per-slide content
    ├── slide 1: headline only          → renders as hook
    ├── slide 2: badge + headline + body → renders as content
    ├── slide 3: badge + headline + body → renders as content
    └── slide 4: headline + CTA          → renders as outro
```

## Success Criteria

1. `/admin/templates` shows preview thumbnails for every default and user template. Clone-to-inspect workaround disappears.
2. A user can build a complete N-slide carousel using only `carousel-slide` by varying per-slide content. Hook, content, and outro slides all render correctly with optional fields hidden when empty.
3. Template editor lets a user change a badge's background color and corner radius, and a CTA pill's background color and corner radius, without hand-editing JSON.
4. `seedDefaults` against a clean Convex deployment produces exactly 6 default templates (5 unchanged + `carousel-slide`); the 3 prior carousel templates are removed.
5. No regressions to the 5 unchanged default templates or to existing user renders.

## Critical Files To Touch

- `src/lib/templates/canvas-defaults.ts` — drop 3 carousel templates; rewrite `carousel-content-text` as `carousel-slide` with extended object set across landscape/square/portrait formats.
- `convex/templates.ts` — update `seedDefaults` slug list; rely on existing cleanup logic to remove orphaned defaults.
- `src/components/admin/template-card.tsx` — render thumbnail using `TemplatePreview` (live) or `previewUrl` (stored).
- `src/app/(admin)/admin/templates/page.tsx` + `kitchen/page.tsx` — update `defaultDisplayIds` map (drop 3, add `carousel-slide`).
- `src/components/editor/editor-right-sidebar.tsx` (and child property panel) — surface `background` + `borderRadius` controls for text objects.
- `src/lib/types.ts` — update `TemplateName` union (drop 3 carousel slugs, add `carousel-slide`).
- `src/lib/docs/api-reference.ts` — update `template` param description and slug list.

## Dependencies / Assumptions

- The 3 dropped carousel templates have not been used in any persisted user render (verify with a Convex query against `releases` before merge). Brainstorm assumes none — they were seeded <24h ago and the `feat/carousel-templates` branch hasn't merged to main.
- `seedDefaults` cleanup logic correctly removes default rows whose slugs disappear from the seed list. Verify existing cleanup branch in `convex/templates.ts` covers this case (it currently only deletes legacy `tmpl_*` rows; may need extension).
- Live `TemplatePreview` renders are cheap enough to run on every Templates page load for the default + user-template count expected per user. Verify in plan; fall back to stored `previewUrl` if perf is a concern.
- Per-slide `templateId` override (U1) stays as an unsurfaced API capability for future families. No revert.

## Verification Plan

1. **Unit:**
   - Existing carousel renderer / accent-markup tests still pass after slug rename.
   - New tests for `carousel-slide` rendering with each field combination empty/filled (hook role, content role, outro role).
2. **Pipeline:**
   - Render a 5-slide portrait release using `carousel-slide` with varied per-slide content. Verify hook slide hides badge+body, content slides show all, outro slide hides badge+body but shows CTA.
3. **End-to-end:**
   - `npm run dev`, run `seedDefaults` against dev Convex, verify exactly 6 default templates appear on `/admin/templates` with thumbnails.
   - Open the editor for a cloned `carousel-slide`, change badge background color to red, save, render, confirm change visible.
   - Compare visual output against the user's reference 2026 carousel trends image.
4. **Regression:**
   - Render with each of the 5 unchanged default templates → confirm pixel-equivalent to current behavior.
   - Verify no user release in production references the 3 dropped slugs (Convex query).

## Decisions Captured

| Decision                                | Choice                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| Carousel family shape                   | Collapse to 1 template (`carousel-slide`); roles via optional fields  |
| Templates page preview                  | Live `TemplatePreview` render; stored `previewUrl` preferred when present |
| Editor `background` + `borderRadius`    | Add to right-sidebar property panel for text objects                   |
| Per-slide `templateId` override (U1)    | Keep wired in API; defer Kitchen UI                                   |
| User-authored families                  | Defer indefinitely. Reconsider when 2nd family use case lands          |
| Audience priority                       | First-time paying subscriber is the bar; power-user shortcuts layered |
| 2026 trends adoption                    | Hook + value-first + minimalist baked in. Seamless flow + interactive deferred |

## Open Questions for `/ce-plan`

1. **`seedDefaults` cleanup behavior** — confirm that existing cleanup deletes default rows for slugs no longer in the seed list, not just legacy `tmpl_*`. Extend if needed.
2. **`TemplatePreview` perf on Templates page** — measure render cost when default count is 6 and user-template count grows. If noticeable, prefer stored `previewUrl` and only render live on cache miss.
3. **`carousel-slide` per-format layout** — `feat/carousel-templates` shipped 3 format variants for `carousel-content-text`. Reuse those positions, or rebalance for the extended object set (eyebrow + CTA additions)?
4. **Editor controls scope** — does this scope expose `background` + `borderRadius` for text objects only, or also for image/logo objects? Recommendation: text-only for now (matches the carousel use cases); revisit if image-object backgrounds are requested.
