# Template Library Refactor

## Overview

Replace the 3 generic templates (Classic, Split, Hero) with a library of 5 purpose-built templates. Each template has a baked-in image frame type with positions optimized for that frame. Removes the need for `device_type` API overrides. Breaking change — no deprecation period for old slugs.

## Templates

| Slug | Layout | Frame | Notes |
|---|---|---|---|
| `standard-browser` | text top, image below | browser | Bottom-bleed on square/portrait |
| `standard-mobile` | text top, phone below | mobile | Bottom-bleed on square/portrait |
| `split-browser` | text left, image right | browser | Right-bleed on portrait |
| `split-mobile` | text left, phone right | mobile | Narrower width, right-bleed on portrait |
| `hero` | fullbleed background, text overlay | none | No frame |

Each template has per-format positions (landscape, square, portrait) tuned for its specific frame type.

Default template when none specified: `standard-browser`.

## Renames

| Old | New | Scope |
|---|---|---|
| `device` | `imageFrame` | Template config (TemplateObject) |
| `DeviceOption` | `ImageFrame` | Type alias (1:1 rename, same values) |
| `device_type` | *(removed)* | API ObjectModification |
| `device_color` | `image_frame_color` | API ObjectModification |
| `deviceColor` | `imageFrameColor` | Internal ObjectDataMap + TemplateObject |
| `deviceType` | *(removed)* | Internal ObjectDataMap |

## API Changes

### ObjectModification (release request)

Before:
```json
{
  "id": "image",
  "image_url": "https://...",
  "device_type": "mobile",
  "device_color": "dark"
}
```

After:
```json
{
  "id": "image",
  "image_url": "https://...",
  "image_frame_color": "#1A1A1A"
}
```

- `device_type` removed — frame is baked into the template
- `device_color` replaced by `image_frame_color` (hex string)
- `image_frame_color` is optional — defaults to template config value

### Template slugs

API accepts: `"template": "split-browser"`, `"template": "standard-mobile"`, etc.

Old aliases (`classic`, `split`, `hero`, `classic_v2`, `split_v2`, `hero_v2`) are removed. This is a breaking change.

### TemplateName type (types.ts)

Update from `'classic' | 'split' | 'hero' | (string & {})` to `'standard-browser' | 'standard-mobile' | 'split-browser' | 'split-mobile' | 'hero' | (string & {})`.

### Release route validation (cook/route.ts)

Update hardcoded valid template names from `["classic", "split", "hero"]` to the 5 new slugs. Update default fallback from `"classic"` to `"standard-browser"`.

## Legacy Slide Format

The flat-field slide format (`title`, `description`, `image_url`, `device`) is removed. All slides must use the `objects` array format. Remove `DeviceType`, update `Slide` interface to drop the `device` field.

Remove the v1 `ConfigRenderer` code path and the `TemplateConfig` type — only v2 `CanvasTemplateConfig` is supported.

Clean up: remove `config-renderer.tsx`, `config-types.ts`, `DEFAULT_TEMPLATES` in `default-configs.ts`.

## Config Changes

### TemplateObject (canvas-types.ts)

- `device?: DeviceOption` → `imageFrame?: ImageFrame` where `ImageFrame = "browser" | "mobile" | "none"`
- Add `imageFrameColor?: string` (hex, e.g. `"#1A1A1A"`)
- Remove `DeviceOption` type alias, add `ImageFrame` (same values)

### CanvasRenderer (canvas-renderer.tsx)

- Read `obj.imageFrame` instead of `obj.device`
- Read `obj.imageFrameColor` for default color, overridable by `data.imageFrameColor`
- Pass color as hex string to BrowserFrame/MobileFrame `color` prop

### ObjectDataMap (canvas-renderer.tsx)

```typescript
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    fontFamily?: string;
    color?: string;
    imageFrameColor?: string;  // hex color for frame chrome
  };
}
```

### Pipeline (render.ts)

- Remove `device_type` mapping from slide objects → ObjectDataMap
- Map `image_frame_color` → `imageFrameColor`
- Remove legacy slide format handling (no more `legacySlides` array)
- Remove v1 ConfigRenderer import
- Update default template from `"classic"` to `"standard-browser"`

## Data Migration

### Convex

- Delete all old default templates (v1 classic/split/hero + v2 classic_v2/split_v2/hero_v2)
- Seed 5 new default templates with external IDs: `tmpl_standard_browser`, `tmpl_standard_mobile`, `tmpl_split_browser`, `tmpl_split_mobile`, `tmpl_hero`

Note: render path uses `getDefaultConfig()` with hyphenated slugs (e.g. `standard-browser`). Convex stores metadata for the dashboard with `tmpl_` prefixed underscore IDs (e.g. `tmpl_standard_browser`). The dashboard maps between these.

### User template migration (migrateConfig/migrateObject)

Extend migration to handle:
- `device` → `imageFrame` (rename)
- `deviceColor: "light"` → `imageFrameColor: "#E8E8E8"`
- `deviceColor: "dark"` → `imageFrameColor: "#1A1A1A"`

This ensures existing user-created custom templates continue to work.

### canvas-defaults.ts

Replace `CANVAS_DEFAULTS` with 5 new entries. Key position differences:

- **split-mobile landscape**: narrower image width (~300px) vs split-browser (~580px)
- **split-mobile square**: narrower image width (~420px) vs split-browser (~524px)
- **standard-mobile**: narrower image centered, vs standard-browser full-width

### default-configs.ts

- Remove `DEFAULT_TEMPLATES` (v1 configs)
- Remove `V2_ALIASES`
- `getDefaultConfig()` only looks up from new canvas defaults

## UI Changes

### Template Editor — Frame Color Picker

For image objects with `imageFrame` = "browser" or "mobile":
- Show color picker similar to text color
- Presets: light grey circle (`#E8E8E8`), dark circle (`#1A1A1A`), custom color picker
- Updates `imageFrameColor` on the image object

### BrowserFrame / MobileFrame Components

- `color` prop changes from `"light" | "dark"` to a hex string
- Use hex directly for frame chrome (titlebar bg, bezel color)
- Traffic-light dots (red/yellow/green) always stay colored — no adjustment needed
- Default: `#E8E8E8` for browser, `#1A1A1A` for mobile (when no color specified)

### Dashboard Templates Page

- `defaultDisplayIds` map updated to new template IDs

## Other File Updates

### api-reference.ts

- Update template parameter docs (new slugs, new default)
- Remove `device_type` from ObjectModification docs
- Rename `device_color` → `image_frame_color` with hex description
- Remove legacy slide format docs
- Update all example code

### page.tsx (homepage)

- Update curl example: `"template": "classic"` → `"template": "standard-browser"`

### demo page + generate script

- Update template list to new 5 slugs
- Remove `device_type` logic from generate script (frame is baked in)
- Each template generates its own set of demo images

## Files Changed

1. `src/lib/types.ts` — ObjectModification, Slide, TemplateName, remove DeviceType
2. `src/lib/templates/canvas-types.ts` — TemplateObject fields, ImageFrame type, migration
3. `src/lib/templates/canvas-defaults.ts` — 5 new template configs
4. `src/lib/templates/default-configs.ts` — remove v1, update lookup
5. `src/lib/templates/canvas-renderer.tsx` — new field names, ObjectDataMap, color handling
6. `src/lib/templates/components/BrowserFrame.tsx` — hex color prop
7. `src/lib/templates/components/MobileFrame.tsx` — hex color prop
8. `src/lib/pipeline/render.ts` — remove legacy path, ObjectDataMap, field mapping, default template
9. `src/app/api/v1/cook/route.ts` — update valid template names, default
10. `src/components/editor/*` — frame color picker UI
11. `src/lib/docs/api-reference.ts` — docs update
12. `src/app/page.tsx` — homepage example
13. `src/app/demo/page.tsx` — template list
14. `scripts/generate-demo-images.ts` — new slugs, remove device_type
15. `src/app/(dashboard)/dashboard/templates/page.tsx` — display IDs
16. `convex/templates.ts` (or seed script) — delete old, seed new

### Removed files

- `src/lib/templates/config-renderer.tsx` — v1 renderer no longer needed
- `src/lib/templates/config-types.ts` — v1 config types no longer needed
