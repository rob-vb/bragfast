# Per-Format Slides API Restructure

## Problem

Current API has a flat `slides` array and a flat `formats` string array. Every slide renders identically across all formats. Users cannot:
- Use different anchoring per format
- Have different slide counts per format (e.g. 3-slide Instagram carousel for square, 1 hero for landscape)
- Customize content per format at all

## Decision

Restructure `ReleaseRequest` so slides live inside each format entry. Hard break on the existing endpoint — no backward compatibility.

## New `ReleaseRequest` Shape

```typescript
interface ReleaseRequest {
  brand_id?: string
  colors?: { background: string; text: string; primary: string }
  name?: string
  logo_url?: string
  font_family?: string
  template?: TemplateName
  formats: Array<{
    name: 'landscape' | 'square' | 'portrait'
    slides: Array<{
      objects?: ObjectModification[]
    }>
  }>
  metadata?: string
  webhook_url?: string
}
```

### Changes from current

- `slides` removed from top level
- `formats` changes from `string[]` to `Array<{ name, slides }>`
- `ObjectModification` unchanged — `anchor_x`/`anchor_y` stay per-object, now implicitly per-format since slides are per-format

### Example payload

```json
{
  "brand_id": "brand_abc123",
  "template": "standard-browser",
  "formats": [
    {
      "name": "landscape",
      "slides": [
        {
          "objects": [
            { "id": "title", "text": "Ship faster" },
            { "id": "image", "image_url": "https://example.com/hero.png", "anchor_y": "top" }
          ]
        }
      ]
    },
    {
      "name": "square",
      "slides": [
        {
          "objects": [
            { "id": "title", "text": "Feature 1" },
            { "id": "image", "image_url": "https://example.com/feat1.png" }
          ]
        },
        {
          "objects": [
            { "id": "title", "text": "Feature 2" },
            { "id": "image", "image_url": "https://example.com/feat2.png" }
          ]
        }
      ]
    }
  ]
}
```

## Validation Rules

- `formats` is required, must have at least one entry
- `name` must be one of `landscape`, `square`, `portrait`
- Duplicate format names rejected
- Each format entry must have at least one slide
- `objects` within a slide is optional (template defaults apply)

## Render Pipeline Change

Current: double loop — outer `formats`, inner `slides`, with a single pre-built `slideDataMaps` array.

New: iterate `formats` array, each entry brings its own slides. Build `slideDataMaps` per format entry instead of once upfront.

## Response Shape

Unchanged:

```json
{
  "images": {
    "landscape": { "slides": ["url1"], "dimensions": "1200x675" },
    "square": { "slides": ["url1", "url2"], "dimensions": "1080x1080" }
  }
}
```

## What Stays the Same

- `ObjectModification` interface
- Brand system
- Template system
- Response shape
- Asset serving

## Breaking Changes

- Top-level `slides` field removed
- `formats` type changes from `string[]` to `Array<{ name, slides }>`
- All existing API consumers must update payloads
- Demo script (`scripts/generate-demo-images.ts`) needs rewrite
- Tests need updating
- Dashboard docs page needs updated examples
- Landing page example elements need updated payloads

## Future-Proofing

Array-based `formats` allows custom dimensions in the future:

```json
{
  "formats": [
    { "name": "landscape", "slides": [...] },
    { "width": 728, "height": 90, "slides": [...] }
  ]
}
```

`name` would become optional when `width`/`height` are provided. This is additive — no schema break needed.
