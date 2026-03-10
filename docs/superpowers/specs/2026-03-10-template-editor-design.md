# Template Editor Design Spec

## Overview

Template-as-Config system that lets users create custom social image templates through a block-stacking editor. Templates are JSON configs describing ordered element blocks. A universal renderer converts configs to Satori JSX at render time.

## Data Model

### Template (Convex schema)

```
templates:
  userId        string (indexed)       — owner; "system" for defaults
  externalId    string (indexed)       — "tmpl_abc123"
  name          string                 — "My Launch Template"
  isDefault     boolean                — true for classic/split/hero presets
  config: {
    background  string                 — "brand" | hex color
    spacing     "compact" | "normal" | "spacious"
    blocks: [
      {
        type        "title" | "description" | "image" | "logo" | "productName"
        alignment   "left" | "center" | "right"
        fontSize    "small" | "medium" | "large"       — text blocks only
        device      "browser" | "mobile" | "none"      — image block only; "none" = raw image, no frame
        display     "inline" | "fullBleed"              — image block only
        split       null | "left" | "right"             — enables side-by-side pairing
      }
    ]
  }
  previewUrl    string (optional)      — cached preview image
  created_at    string
  updated_at    string
```

### Block behavior

- Block order in array = render order top-to-bottom
- Consecutive `split: "left"` + `split: "right"` blocks render side-by-side (50/50)
- `display: "fullBleed"` makes image fill entire canvas as background with primary color overlay; other blocks render on top
- `background: "brand"` resolves to `brand.colors.background` at render time
- Brand colors/logo/name resolved at render time, not baked into template

### Split pairing rules

- A `split: "left"` must be immediately followed by a `split: "right"` to form a pair
- Orphaned split blocks (left without right, or right without left) render as full-width blocks — the split value is ignored
- Multiple split pairs per template are allowed
- In portrait format, split pairs collapse to vertical stack (left on top, right below)

### Block validation rules

- Minimum 1 block per template
- Maximum 8 blocks per template
- Each block type can appear at most once (no duplicate titles, images, etc.)
- `fontSize` only applies to `title`, `description`, `productName` blocks
- `device` and `display` only apply to `image` blocks

### Convex functions

```
templates.create          — mutation: create new template
templates.update          — mutation: update template config
templates.remove          — mutation: delete template (rejects defaults)
templates.getByExternalId — query: single template by externalId
templates.listByUser      — query: user's custom templates
templates.listDefaults    — query: all templates where isDefault=true
templates.clone           — mutation: copy template config to new template under user
```

## API

### New endpoints

```
GET    /v1/templates              — list user's templates + defaults
POST   /v1/templates              — create custom template
GET    /v1/templates/:id          — get single template
PATCH  /v1/templates/:id          — update template config
DELETE /v1/templates/:id          — delete custom template (not defaults)
POST   /v1/templates/:id/clone    — clone a default or existing template
POST   /v1/templates/:id/preview  — generate real Satori preview
```

### Changes to /v1/release

```
// template field now also accepts template IDs
template?: 'classic' | 'split' | 'hero' | string   — "tmpl_abc123"
```

**Template resolution path in render pipeline:**
1. If `template` is `"classic"`, `"split"`, or `"hero"` → look up default template config by name from Convex (`templates.listDefaults`)
2. If `template` starts with `"tmpl_"` → look up by externalId from Convex (`templates.getByExternalId`), verify it belongs to the user or is a default
3. Otherwise → return 400 "Invalid template"
4. Pass resolved config to `ConfigRenderer` instead of selecting a hardcoded component

**Validation update:** Release route validation changes from whitelist check to: accept legacy names OR valid `tmpl_` prefix. Types updated from union literal to `string` with runtime validation.

### Auth

Same as brands: session cookies for dashboard, Bearer token for API.

### Credits

No credit cost for template CRUD or preview. Credits only spent on `/release`.

## Universal Config Renderer

### Interface

```
ConfigRenderer({ config, slide, brand, width, height, transparent })
```

### Rendering logic

1. Iterate `config.blocks` top-to-bottom
2. Per block, render appropriate component:
   - `title` → TextBlock with `slide.title` (placeholder: "Title here")
   - `description` → TextBlock with `slide.description` (placeholder: lorem ipsum)
   - `image` → DeviceFrame with `slide.imageBase64` (placeholder: gray box). When `device: "none"`, render raw `<img>` without frame wrapper
   - `logo` → Logo image from `brand.logoBase64` (placeholder: generic icon)
   - `productName` → Text from `brand.name` (placeholder: "Product")
3. Consecutive split-left + split-right blocks wrapped in horizontal flex (50/50)
4. Spacing between blocks from `config.spacing`
5. Background resolved from config

### Auto-adapt for formats

- Font sizes scale by aspect ratio (smaller landscape, larger portrait)
- Split pairs collapse to vertical stack in portrait
- Image block height proportional to available space after text

## Default Template Configs

### Classic

```json
{
  "background": "brand",
  "spacing": "normal",
  "blocks": [
    { "type": "logo", "alignment": "left" },
    { "type": "image", "alignment": "center", "device": "browser", "display": "inline" },
    { "type": "title", "alignment": "left", "fontSize": "large" },
    { "type": "description", "alignment": "left", "fontSize": "medium" }
  ]
}
```

### Split

```json
{
  "background": "brand",
  "spacing": "normal",
  "blocks": [
    { "type": "logo", "alignment": "left" },
    { "type": "title", "alignment": "left", "fontSize": "large", "split": "left" },
    { "type": "image", "alignment": "center", "device": "browser", "display": "inline", "split": "right" },
    { "type": "description", "alignment": "left", "fontSize": "medium" }
  ]
}
```

### Hero

```json
{
  "background": "brand",
  "spacing": "normal",
  "blocks": [
    { "type": "image", "alignment": "center", "device": "none", "display": "fullBleed" },
    { "type": "title", "alignment": "left", "fontSize": "large" },
    { "type": "description", "alignment": "left", "fontSize": "medium" }
  ]
}
```

### Migration strategy

Keep original template components as reference. Once config renderer produces pixel-identical output for all 3 defaults across all 3 formats, delete old components and registry. Verify with visual diff tests.

## Template Editor UI

### Routes

- `/dashboard/templates` — template list page
- `/dashboard/templates/[id]/edit` — editor page

### List Page

- Grid of template cards with preview thumbnail + name
- "Default Templates" section: classic, split, hero with "Clone" button
- "My Templates" section with "Create Blank" button
- Custom templates have edit/delete actions

### Editor Layout

```
┌─────────────────────────────────────────────────┐
│  ← Back to Templates    "My Template"    [Save] │
├────────────┬────────────────────────────────────┤
│            │                                     │
│ Template   │                                     │
│ Name [___] │                                     │
│            │        CSS Preview                  │
│ Background │      (landscape ratio)              │
│ [brand ▾]  │                                     │
│ Spacing ○○ │    ┌─────────────────────┐          │
│            │    │ [logo]  Product     │          │
│ ── Blocks ─│    │ ┌─────────────────┐ │          │
│            │    │ │  ░░ image ░░░░  │ │          │
│ ☰ logo   ✕│    │ └─────────────────┘ │          │
│ ☰ image  ✕│    │ Title here          │          │
│ ☰ title  ✕│    │ Lorem ipsum dolor…  │          │
│ ☰ descr  ✕│    └─────────────────────┘          │
│            │                                     │
│ [+ Add]    │    [landscape] [square] [portrait]  │
│            │    ────────────────────────────────  │
│ ─ Selected─│    Preview brand: [My Brand ▾]      │
│ Block Props│    [Preview Real Output]             │
│ align: ○○○ │                                     │
│ size:  ○○○ │                                     │
└────────────┴────────────────────────────────────┘
```

### Left sidebar

- Template name input
- Background selector: dropdown with "Brand" (uses brand kit color) or hex color picker
- Spacing selector (compact/normal/spacious)
- Blocks list: drag handle (☰) to reorder, ✕ to remove
- Click block to select → shows properties panel below
- Properties contextual per block type (alignment, fontSize, device, display, split)
- "+ Add Block" dropdown (only shows types not already in template)

### Center canvas

- CSS-approximated preview at selected aspect ratio
- Ratio switcher tabs (landscape/square/portrait) — view-only, shows auto-adapt
- Preview brand selector: dropdown of user's brand kits (determines colors/logo/name used in preview)
- "Preview Real Output" button → `/templates/:id/preview` endpoint
- Placeholder content: gray box for image, "Title here", "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", generic logo icon

### Preview URL lifecycle

- `previewUrl` generated on template save (server-side Satori render of landscape format with placeholder content)
- Regenerated on every save that changes the config
- Stored in R2, old preview deleted on regeneration
- Used as thumbnail on the templates list page

### Styling

Pixel-arcade aesthetic using existing PixelCard, PixelButton, PixelTable components.

## Scope Boundaries

- Private templates only (no public gallery)
- No drag-and-drop / free positioning
- 5 block types only: title, description, image, logo, productName
- No per-format manual editing (single design, auto-adapts)
- No credit cost for template operations
