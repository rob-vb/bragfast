---
title: Template Gallery + Carousel Consolidation
date: 2026-04-28
status: active
type: refactor
depth: standard
origin: docs/brainstorms/2026-04-28-template-gallery-carousel-consolidation-requirements.md
---

## Problem Frame

Three coordinated UX gaps surfaced after `feat/carousel-templates` shipped:

1. The 4 carousel-family templates (`carousel-cover`, `carousel-content-text`, `carousel-content-image`, `carousel-outro`) share visual language but are independently selectable per-slide. The family abstraction adds gallery clutter without payoff because every slide role can be expressed via optional content fields on a single flexible template.
2. `/admin/templates` shows ID + Clone only — no preview thumbnail. Users clone defaults to inspect via the editor canvas. Real friction.
3. The renderer supports text-object `backgroundColor` / `backgroundColorRole` / `paddingX` / `paddingY` / `borderRadius` (used for badge + CTA pill on carousel templates) but the template editor right sidebar does not surface these controls. CTA pills render correctly in previews and can be hand-edited in JSON, but the editor UI hides them.

## Goals

1. Replace 4 carousel-family templates with 1 `carousel-slide` that supports hook / content / outro roles via optional content fields.
2. Render preview thumbnails for every default and user template on `/admin/templates` (live `TemplatePreview` with stored `previewUrl` preferred when present).
3. Surface text-object `backgroundColor` + `backgroundColorRole` + `paddingX` + `paddingY` + `borderRadius` in the editor right sidebar so users can edit badge / CTA pill styling without hand-editing JSON.

## Scope Boundaries

**In scope:**
- Drop 3 carousel templates from `canvas-defaults.ts`, `seedDefaults` slug list, `TemplateName` union, and `api-reference.ts`.
- Rewrite `carousel-content-text` defaults as `carousel-slide` with extended object set (add `eyebrow`, `cta_text`) across landscape / square / portrait formats, all optional except `headline`.
- Extend `seedDefaults` cleanup logic to delete default rows whose slugs are no longer in the seed list (currently only deletes `tmpl_*` legacy rows).
- Render thumbnails on `/admin/templates` `TemplateCard` using existing `TemplatePreview` component (live render) with `previewUrl` (R2-hosted JPEG) preferred when present.
- Add a "Background" subsection to `TextProperties` editor panel for text objects: backgroundColor (transparent / brand-primary / custom hex), padding X/Y, borderRadius.

**Deferred — out of scope here, future work:**
- Kitchen per-slide template picker UI (U1 API override stays wired).
- User-authored template families (tag-based grouping, composite family entities).
- Background / radius controls for image / logo objects (text-only here per origin doc Q4 recommendation).
- Seamless / infinite-flow and interactive carousel design.
- Schema migration for prior renders referencing dropped slugs (none exist; verify via Convex query before merge).

## Requirements Trace

| Origin requirement | Implementation unit |
| --- | --- |
| 1 carousel-slide replaces 4 templates | U1, U2 |
| Templates page preview thumbnails | U3 |
| Editor surfaces background + radius for text | U4 |
| `seedDefaults` cleanup extends to slug removal | U5 |
| `defaultDisplayIds` map updated on Templates + Kitchen pages | U6 |
| `TemplateName` union + api-reference docs updated | U6 |
| Tests updated for new slug + optional-field rendering | U7 |

## Resolved Open Questions (from origin doc)

1. **`seedDefaults` cleanup behavior** — extend in U5. Current logic only deletes `tmpl_*` legacy rows; must also delete defaults whose slugs disappear from the seed list. Implement as: collect all `isDefault: true` rows, delete those whose `externalId` is not in the current `slugs` array (covers both legacy `tmpl_*` and orphaned slugs in one pass).
2. **`TemplatePreview` perf on Templates page** — use stored `previewUrl` when present (preferred, single `<img>` tag); fall back to live `TemplatePreview` only when `previewUrl` is absent. Defaults all have stored `previewUrl` populated by seed flow; user templates may not on first save. Acceptable tradeoff — live render runs ~6 default renders worst case on a fresh user account, well within Satori's per-render budget. No perf measurement required pre-merge.
3. **`carousel-slide` per-format layout** — reuse `carousel-content-text` positions as the base. Add `eyebrow` above `heading` (slot in at the top, push existing content down only minimally), and `cta_text` below the `body` zone before the signature. Keep `signature_*` positions identical. All new objects `skipEmpty: true` so an empty hook / content / outro variant collapses correctly.
4. **Editor controls scope** — text-only. Image/logo objects already expose `borderRadius` via existing visual properties; `backgroundColor` doesn't apply to image objects in current renderer. Revisit if image-background requests land.

## Decisions

- **Template slug for the survivor:** `carousel-slide` (not `carousel`, not `carousel-content`). Matches origin doc and signals intent (one slide of a carousel).
- **Backwards-compat for the 3 dropped slugs:** none. They shipped <24h ago on a branch not yet merged to main; verify zero `releases` reference them via Convex query (Verification step 4); no migration needed.
- **`headline` rename:** keep current `heading` field id from `carousel-content-text` (not rename to `headline` as origin doc spec table uses both). Ship under existing id to keep the migration tight; rename is cosmetic and risks per-format object lookup bugs.
- **Editor background control UX:** mirror existing color swatch pattern in `text-properties.tsx` — three options (transparent / brand-primary role / custom hex). Pinning to `backgroundColorRole: "primary"` tracks brand changes; transparent clears both `backgroundColor` and `backgroundColorRole`.
- **Thumbnail aspect ratio:** match the format's native aspect (portrait 4:5 for default) inside a fixed-height box; use `transform: scale()` from `TemplatePreview`. Cards stay uniform via fixed thumbnail height.

## Patterns To Follow

- `src/components/kitchen/template-preview.tsx` — live render via `transform: scale()`, memo'd, accepts `config` + `brand` + `format`. Reuse directly in `TemplateCard`.
- `src/components/editor/text-properties.tsx:24-42` — `dispatch({ type: "UPDATE_PROPERTY", objectId, property, value, allFormats: true })` pattern with `setColorRole` / `setColorHex` helpers. Mirror this for `setBackgroundRole` / `setBackgroundHex`.
- `src/lib/templates/canvas-types.ts:125-150` — actual field names on text `TemplateObject`: `backgroundColor`, `backgroundColorRole`, `paddingX`, `paddingY`, `borderRadius`, `borderRadiusTL/TR/BR/BL`. Origin doc shorthand "background" maps to `backgroundColor`.
- `src/lib/templates/canvas-defaults.ts` `carousel-content-text` (lines 216–254) — base config to copy/rewrite as `carousel-slide`.
- `convex/templates.ts:267-278` — existing cleanup loop to extend.

## Implementation Units

### U1: Drop 3 carousel templates from `canvas-defaults.ts`

**Goal:** Remove `carousel-cover`, `carousel-content-image`, `carousel-outro` entries from `CANVAS_DEFAULTS`. Keep `carousel-content-text` for U2 to rewrite.

**Files:**
- Modify: `src/lib/templates/canvas-defaults.ts`

**Approach:** Delete the three entries (lines ~174–215, ~255–296, and the carousel-outro block immediately after). Verify `getCanvasDefaultConfig()` and any consumers don't have hardcoded references.

**Verification:**
- `npm run build` — TypeScript still compiles.
- `grep -rn "carousel-cover\|carousel-content-image\|carousel-outro" src/ convex/` returns only the call sites U6 will clean up, no residual references in `canvas-defaults.ts`.

### U2: Rewrite `carousel-content-text` as `carousel-slide` with extended object set

**Goal:** Rename the slug and extend the object set to support hook (eyebrow + headline only), content (badge + headline + body), and outro (headline + cta_text) roles via optional fields.

**Files:**
- Modify: `src/lib/templates/canvas-defaults.ts`

**Approach:**
1. Rename key `"carousel-content-text"` → `"carousel-slide"`. Update `name: "Carousel Content (Text)"` → `name: "Carousel Slide"`.
2. For each format (landscape / square / portrait), prepend an `eyebrow` text object above the existing badge/heading row and append a `cta_text` text object below the `body` zone (before the signature row).
3. Mark every object except `heading` with `skipEmpty: true`. (`heading` is required.)
4. `cta_text` config: `backgroundColorRole: "primary"`, `borderRadius: 999`, `paddingX: 24-30` per format, `paddingY: 12-16`, `color: "#FFFFFF"`, `textAlign: "center"`, `verticalAlign: "center"`, sized as a pill (~auto width, fixed height).
5. `eyebrow` config: small line above heading, `colorRole: "primary"`, `fontSize: 24-28` per format.
6. Reuse existing badge / heading / body / signature_* positions from `carousel-content-text` unchanged.

**Patterns:** `src/lib/templates/canvas-defaults.ts:174-215` (carousel-cover swipe_cta pill config), `src/lib/templates/canvas-defaults.ts:216-254` (carousel-content-text as base).

**Test scenarios:**
- Hook role render (eyebrow + headline only, all others empty): renders without orphan blocks; signature still appears if brand provides it; no badge pill, no body, no CTA pill.
- Content role render (badge + headline + body, no eyebrow / cta): renders identically to current `carousel-content-text` output for matching content.
- Outro role render (headline + cta_text only): CTA pill renders with brand-primary background and 999 radius; no badge pill, no body, no eyebrow.
- All-fields-populated render: every object renders in correct z-order; no overlap with signature row.
- Per-format parity: portrait, square, landscape all produce expected layouts when same content data is passed.

**Verification:**
- `npx vitest run src/lib/__tests__/carousel-pipeline.test.ts` passes (after U7 updates).
- Optional: render a 5-slide release locally (`OUTPUT_LOCAL=true npm run dev`) with mixed roles, eyeball output.

### U3: Render preview thumbnails on `TemplateCard`

**Goal:** Add a thumbnail block above the name row in `TemplateCard`. Prefer stored `previewUrl`; fall back to live `TemplatePreview`.

**Files:**
- Modify: `src/components/admin/template-card.tsx`
- Modify: `src/app/(admin)/admin/templates/template-list-client.tsx` (pass `config` + `brand` props through to cards if not already)

**Approach:**
1. Extend `TemplateCardProps` with optional `config?: CanvasTemplateConfig` and `brand?: Brand`. Both required for fallback live render.
2. At the top of the card body, render a fixed-height thumbnail container (e.g., `h-40` / 160px). Inside:
   - If `previewUrl` is present: render `<img src={previewUrl} alt={name} class="..." />`.
   - Else if `config` + `brand` are present: render `<TemplatePreview config={config} brand={brand} format="portrait" />` scaled to fit.
   - Else: render a placeholder skeleton.
3. Confirm `template-list-client.tsx` (and `kitchen-client.tsx` if it uses `TemplateCard`) passes `config` + brand context. The Templates page already has `config` available from the Convex query — thread it through `mapTemplate`.
4. For the brand fallback: defaults render with brag.fast sample brand colors from the `config.colors`; user templates render with the user's primary brand if available, else `config.colors`. Defer fetching primary brand for user templates if not already wired — the `config.colors` fallback is acceptable for thumbnails.

**Patterns:** `src/components/kitchen/template-preview.tsx` (live preview component, already memo'd). `src/app/(admin)/admin/templates/page.tsx:34-44` (existing `mapTemplate` function — extend to include `config`).

**Test scenarios:**
- Card with `previewUrl` set: `<img>` rendered, no `TemplatePreview` mounted.
- Card with no `previewUrl` but `config` set: `TemplatePreview` rendered.
- Card with neither: placeholder appears, no console errors.
- Long template names + thumbnails don't break card layout.

**Verification:**
- `npm run dev` → visit `/admin/templates`. Confirm 6 default cards show thumbnails; clone one, confirm user card also shows thumbnail.
- `npm run lint` passes.

### U4: Surface `backgroundColor` + padding + `borderRadius` in editor `TextProperties`

**Goal:** Add a "Background" subsection to the right sidebar text-object property panel with controls for backgroundColor (transparent / brand-primary / custom hex), padding X, padding Y, borderRadius.

**Files:**
- Modify: `src/components/editor/text-properties.tsx`

**Approach:**
1. Below the existing Color section, add a new "Background" labelled section.
2. Three swatches mirroring the existing Color pattern: transparent (clears both `backgroundColor` and `backgroundColorRole`), brand-primary (sets `backgroundColorRole: "primary"`, clears `backgroundColor`), custom hex (color picker, sets `backgroundColor` literal, clears `backgroundColorRole`).
3. Two number inputs: Padding X (`paddingX`, 0–100), Padding Y (`paddingY`, 0–100). Use `updateShared("paddingX", n)` / `updateShared("paddingY", n)`.
4. One number input: Corner Radius (`borderRadius`, 0–999). Use `updateShared("borderRadius", n)`. Per-corner controls deferred; if user needs them they can hand-edit JSON for now.
5. Wire helper functions `setBackgroundRole(role)` / `setBackgroundHex(hex)` / `setBackgroundTransparent()` mirroring existing `setColorRole` / `setColorHex` at lines 33-42.

**Patterns:** `src/components/editor/text-properties.tsx:24-42` (dispatch + role/hex helpers), `src/components/editor/text-properties.tsx:48-90` (Color section UI as the visual template for the new Background section).

**Test scenarios:**
- Select a text object on `carousel-slide`'s badge: Background section shows brand-primary swatch active, paddingX/Y/borderRadius reflecting current config.
- Click transparent: both `backgroundColor` and `backgroundColorRole` cleared from the object.
- Type custom hex `#FF0000`: `backgroundColor: "#FF0000"`, `backgroundColorRole: undefined`. Pill renders red on next preview tick.
- Change borderRadius from 16 to 0: pill renders square corners.
- Select a non-text object (image): Background section does not render (component already early-returns when `isText` is false at line 22).

**Verification:**
- `npm run dev` → open editor on a cloned `carousel-slide`, change badge background to red, save, render → red badge.
- `npm run lint` passes.

### U5: Extend `seedDefaults` cleanup to delete orphaned slug rows

**Goal:** Replace the `tmpl_*`-only cleanup with a generalized "delete defaults whose slug is not in current seed list".

**Files:**
- Modify: `convex/templates.ts`

**Approach:** Replace lines 267-278:

```ts
// Old (only legacy tmpl_* cleanup):
for (const tmpl of allDefaults) {
  if (tmpl.externalId.startsWith("tmpl_")) { ... }
}

// New (any slug not in current seed list):
const slugSet = new Set(slugs);
for (const tmpl of allDefaults) {
  if (!slugSet.has(tmpl.externalId)) {
    await ctx.db.delete(tmpl._id);
    deleted++;
  }
}
```

This handles both old `tmpl_*` rows and the 3 dropped carousel slugs in one pass.

**Test scenarios:**
- Seed against a deployment containing `carousel-cover` / `carousel-content-image` / `carousel-outro` rows: those 3 rows are deleted; `carousel-slide` is inserted; final default count is 6.
- Seed against a fresh deployment: 6 defaults inserted, 0 deleted.
- Seed twice in a row: second run reports `inserted: 0, updated: 6, deleted: 0`.

**Verification:**
- After U1+U2+U6 land: `npx convex run templates:seedDefaults` against dev → output includes `deleted: 3` first run, `deleted: 0` second run.
- `/admin/templates` shows exactly 6 default cards.

### U6: Update slug references across UI and types

**Goal:** Update `defaultDisplayIds` maps, `TemplateName` union, and api-reference doc to drop the 3 slugs and add `carousel-slide`.

**Files:**
- Modify: `src/app/(admin)/admin/templates/page.tsx` (defaultDisplayIds map at lines 7-17)
- Modify: `src/app/(admin)/admin/kitchen/page.tsx` (defaultDisplayIds map at lines 8-18)
- Modify: `src/lib/types.ts` (TemplateName union at line 108)
- Modify: `src/lib/docs/api-reference.ts` (template param description and slug list)

**Approach:** Mechanical find/replace. In each `defaultDisplayIds` map, drop the 4 carousel-* keys and add `"carousel-slide": "carousel-slide"`. In `TemplateName`, drop the 4 carousel-* string literals and add `'carousel-slide'`. In api-reference.ts, update the slug list and any per-template descriptions.

**Test scenarios:**
- TypeScript compiles after the union change.
- `/admin/templates` and `/admin/kitchen` lists 6 defaults in this order: standard-browser, standard-mobile, split-browser, split-mobile, hero, carousel-slide.
- API route `POST /api/v1/cook/image` with `template: "carousel-slide"` resolves the new template.
- API route with `template: "carousel-cover"` (or other dropped slug) returns a clear 4xx — no accidental fallback to a removed default.

**Verification:**
- `npm run build` — passes.
- `grep -rn "carousel-cover\|carousel-content-image\|carousel-outro\|carousel-content-text" src/ convex/ docs/` returns only intentional references in test fixtures and docs (cleaned up in U7).

### U7: Update tests for slug rename and new optional-field scenarios

**Goal:** Update `src/lib/__tests__/carousel-pipeline.test.ts` (and any other test referencing dropped slugs) for the new shape; add coverage for hook / content / outro role rendering.

**Files:**
- Modify: `src/lib/__tests__/carousel-pipeline.test.ts`
- Possibly modify: any other test grep'ing for the dropped slugs

**Approach:**
1. Rename `carousel-content-text` references to `carousel-slide` throughout.
2. Drop test cases asserting on `carousel-cover` / `carousel-content-image` / `carousel-outro`.
3. Add three new test cases:
   - Hook slide: only `headline` + `eyebrow` provided → asserts badge/body/cta_text/signature objects are skipped (skipEmpty path) or render their default-empty state.
   - Content slide: badge + headline + body provided → matches prior `carousel-content-text` behavior.
   - Outro slide: headline + cta_text provided → CTA pill present with `backgroundColorRole: "primary"`.

**Patterns:** Existing test fixtures in `src/lib/__tests__/carousel-pipeline.test.ts`.

**Test scenarios** (own coverage of test file):
- All three role scenarios assert render output via the existing pipeline harness.
- `*accent*` markup test on `headline` still passes (already covered).
- Per-slide `templateId` override (U1) test still passes (uses `carousel-slide` instead of `carousel-content-text`).

**Verification:**
- `npx vitest run src/lib/__tests__/carousel-pipeline.test.ts` — green.
- `npx vitest run` — full suite green.

## Dependencies / Sequencing

- U1 + U2 are tightly coupled (both edit `canvas-defaults.ts`); do them together as a single commit.
- U3 + U4 are independent of U1/U2 and of each other — can run in parallel after the canvas-defaults changes land.
- U5 + U6 depend on U1+U2 (the slug list is the source of truth).
- U7 depends on U1+U2+U6.

Recommended order: U1+U2 → U6 → U5 → U3 → U4 → U7. U3 and U4 are safe to parallelize once the canvas-defaults change is committed.

## Risk

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| User render in production references one of the 3 dropped slugs | Low (24h-old, branch unmerged) | Convex query against `releases` table before merge; if any hits, write a one-shot rewrite script before deleting |
| Live `TemplatePreview` perf regression on Templates page | Low | Stored `previewUrl` is the default path; live render only on cache miss |
| Editor Background section reads stale config when switching objects | Low | Existing `useEffect` pattern at line 20 syncs hex input on object change; mirror for background hex state |
| `seedDefaults` over-deletes if a future contributor adds a default outside the seed list | Low (no current path to do this) | Cleanup is gated by `isDefault: true`; user templates unaffected |

## Verification Plan

1. **Unit:** `npx vitest run src/lib/__tests__/carousel-pipeline.test.ts` after U7 → green.
2. **Build:** `npm run build` green after each unit lands.
3. **Pipeline:** Render a 5-slide portrait release using `carousel-slide` with varied per-slide content (hook → 3× content → outro). Confirm correct role-specific rendering.
4. **Convex query:** Before merge, run a Convex query to confirm zero `releases` reference `carousel-cover` / `carousel-content-image` / `carousel-outro` slugs:
   ```ts
   await ctx.db.query("releases").filter(q => q.or(
     q.eq(q.field("template"), "carousel-cover"),
     q.eq(q.field("template"), "carousel-content-image"),
     q.eq(q.field("template"), "carousel-outro"),
   )).collect();
   ```
   Expected: `[]`. If non-empty, escalate before deletion.
5. **End-to-end:** `npm run dev`, run `npx convex run templates:seedDefaults`, verify exactly 6 defaults on `/admin/templates` with thumbnails. Open editor on a cloned `carousel-slide`, change badge background to red via the new sidebar control, save, render, confirm output.
6. **Regression:** Render once with each of the 5 unchanged default templates → pixel-equivalent to current behavior.

## Critical Files To Touch

- `src/lib/templates/canvas-defaults.ts` (U1, U2)
- `convex/templates.ts` (U5)
- `src/components/admin/template-card.tsx` (U3)
- `src/app/(admin)/admin/templates/template-list-client.tsx` (U3 — thread config through)
- `src/app/(admin)/admin/templates/page.tsx` (U3, U6)
- `src/app/(admin)/admin/kitchen/page.tsx` (U6)
- `src/components/editor/text-properties.tsx` (U4)
- `src/lib/types.ts` (U6)
- `src/lib/docs/api-reference.ts` (U6)
- `src/lib/__tests__/carousel-pipeline.test.ts` (U7)

## Deferred to Implementation

- **Brand fallback strategy for user-template thumbnails** (U3) — if `useQuery` for user's primary brand isn't already wired in `template-list-client.tsx`, decide between fetching it vs falling back to `config.colors`. Default to `config.colors` if the wiring would expand scope.
- **`previewUrl` regeneration on `carousel-slide` migration** — existing `previewUrl` JPEGs for `carousel-content-text` reflect the old layout. After U2 ships, the seed mutation patches `config` but not `previewUrl`. Decide whether to clear `previewUrl` on slug rename so live render takes over until the next render generates a fresh JPEG. Lean: clear `previewUrl` for the renamed slug in `seedDefaults` patch step.
- **Per-corner radius UI** — origin doc Q4 narrowed to text-only; per-corner deferred unless user surfaces the need during implementation.
