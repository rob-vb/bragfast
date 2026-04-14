# Template Editor Design Spec (v2)

Figma-like canvas editor for creating image templates with absolute positioning. Replaces the block-based config model.

## Data Model

### TemplateObject

```typescript
type ObjectType = "title" | "description" | "image" | "logo" | "productName"

interface TemplateObject {
  id: string              // unique within template, e.g. "title_1"
  type: ObjectType
  name: string            // display name in layers list, editable

  // Position & size (absolute px, relative to format dimensions)
  x: number
  y: number
  width: number
  height: number
  opacity: number         // 0-1
  zIndex: number          // layer order (higher = on top)

  // Text-only (title, description, productName)
  fontFamily?: string
  fontSize?: number       // px
  fontWeight?: number     // 100-900
  letterSpacing?: number  // px
  lineHeight?: number     // unitless multiplier (e.g. 1.16)
  textAlign?: "left" | "center" | "right"
  verticalAlign?: "top" | "center" | "bottom"  // implemented via flexbox justifyContent on wrapper

  // Image-only (image, logo)
  device?: "browser" | "mobile" | "none"
  objectFit?: "cover" | "contain"

  // Editor-only (not used at render time)
  previewText?: string
}
```

### TemplateConfig

```typescript
type FormatKey = "landscape" | "square" | "portrait"

interface FormatLayout {
  objects: TemplateObject[]
}

interface TemplateConfig {
  colors: {
    background: string    // hex
    text: string          // hex
    primary: string       // hex
  }
  brandId?: string        // if set, colors come from brand at render time
  formats: Record<FormatKey, FormatLayout>
}
```

### Key rules

- Each format has independent object positions/sizes
- Same object types across all 3 formats (add/remove applies to all)
- Each object type can appear at most once per template (no duplicate titles, images, etc.)
- Objects share the same `id` across formats — adding "title" creates an object with id "title" in all 3 formats
- `previewText` is editor-only, persisted in template config but not passed to renderer. Commits on blur.
- `zIndex` determines layer order in both editor and render output
- **Color cascade** (highest priority wins): release-level `brand_id` > release-level inline `colors` > template `brandId` > template `colors` > fallback defaults
- **Property scope:** Position/size properties (x, y, width, height) are per-format. Style properties (fontFamily, fontSize, fontWeight, etc.) are cross-format — changing font in landscape changes it in all formats.

### Format dimensions

- Landscape: 1200 x 675
- Square: 1080 x 1080
- Portrait: 1080 x 1350

### Convex schema changes

Replace config shape in `templates` table:
- Remove: `background`, `spacing`, `blocks[]` (old block model)
- Add: `colors`, `brandId`, `formats` (new canvas model)

## Renderer

Replaces `config-renderer.tsx` with absolute-position renderer.

### Render flow

1. Load template config for requested format
2. Resolve colors: brand > template defaults
3. For each object (sorted by zIndex), map release data:
   - `title` → `slide.title`
   - `description` → `slide.description`
   - `image` → `slide.image_url` (with device frame if set)
   - `logo` → `brand.logo_url`
   - `productName` → `brand.name`
4. Output React elements with absolute positioning → Satori → PNG

### Satori JSX structure

```tsx
<div style={{ width, height, background, position: "relative" }}>
  {objects.sort(by zIndex).map(obj => (
    <div style={{
      position: "absolute",
      left: obj.x, top: obj.y,
      width: obj.width, height: obj.height,
      opacity: obj.opacity,
      // For text objects: flex column for verticalAlign
      display: "flex", flexDirection: "column",
      justifyContent: obj.verticalAlign === "center" ? "center"
                    : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start"
    }}>
      {/* text or image content based on obj.type */}
    </div>
  ))}
</div>
```

### Files removed

- `src/lib/templates/config-renderer.tsx`
- `src/lib/templates/config-types.ts`
- `src/lib/templates/default-configs.ts`

### Files kept

- `BrowserFrame.tsx`, `MobileFrame.tsx`, `DeviceFrame.tsx` — used for image objects with device frames

### Files also removed

- `LogoBar.tsx` — logo is now a positioned object
- `TextBlock.tsx` — replaced with simpler inline rendering in absolute renderer

### Font loading

The renderer must support multiple font families per image (each text object can use a different font).

1. Before rendering, scan all text objects to collect unique `(fontFamily, fontWeight)` pairs
2. Fetch each unique pair from Google Fonts API (extend `loadFontsForFamily` to accept specific weights)
3. Pass all loaded fonts to Satori's `fonts` array
4. Cache fetched font binaries in memory (LRU) to avoid re-fetching across renders
5. If a requested weight is unavailable for a family, fall back to nearest available weight (400 default)

### Default templates

Classic, split, hero rewritten as new `TemplateConfig` with pre-positioned objects per format. Same visual output, new data structure.

### Migration strategy

1. Add new config shape to Convex schema alongside old shape (union type)
2. Seed new default templates (classic_v2, split_v2, hero_v2) with new config format
3. Existing user templates with old block config continue to work via legacy renderer
4. New templates created through editor use new config format only
5. Once stable, migrate existing user templates via script (or let them re-create)
6. Remove legacy renderer and old schema shape

## Editor UI

### Architecture

Three-panel layout. Full viewport, no admin chrome. Professional look — shadcn components, no pixel/retro style.

### Page route

`/admin/templates/[id]/edit` — the editor page loads template by ID, skips admin layout.

### Component tree

```
src/app/(admin)/admin/templates/[id]/edit/page.tsx
  └─ TemplateEditor (orchestrator, state via context)
       ├─ EditorLeftSidebar
       │    ├─ SaveButton + BackButton
       │    ├─ TemplateNameInput
       │    ├─ FormatSwitcher (landscape/square/portrait with px dims)
       │    ├─ BrandColorSection
       │    │    ├─ BrandSelect dropdown (user's brands)
       │    │    └─ ColorPickers (bg/text/primary) — hidden when brand selected
       │    ├─ AddObjectButton (dropdown, type picker)
       │    └─ ObjectLayerList (draggable to reorder, click to select, X to delete)
       ├─ EditorCanvas
       │    ├─ CanvasViewport (scales canvas to fit)
       │    └─ CanvasObject (per object)
       │         ├─ TextObjectPreview (editable on double-click)
       │         ├─ ImageObjectPlaceholder (gray checkerboard)
       │         └─ SelectionHandles (8 handles: 4 corners + 4 edges)
       └─ EditorRightSidebar (shown when object selected)
            ├─ ObjectNameInput
            ├─ CommonProperties (W, H, X, Y, Opacity)
            ├─ TextProperties (font family, size, weight, letter spacing, line height, text align, vertical align)
            └─ ImageProperties (device frame, object fit)
```

Components stored in `src/components/editor/`.

### Left sidebar (~240px)

- **Save Template** button (primary)
- **Back** button (ghost, navigates to /admin/templates)
- **Template name** — text input
- **Format switcher** — 3 buttons: Landscape (1200x675), Square (1080x1080), Portrait (1080x1350). Active format highlighted.
- **Brand / Colors** — mutually exclusive:
  - Brand dropdown: list of user's brands. When selected, color pickers hidden, colors come from brand.
  - "No brand" option shows 3 color pickers (background, text, primary)
- **New Object** — dropdown button, shows available types (5 max, only types not already in template)
- **Objects list** — ordered by zIndex. Each row: drag handle, name, X delete button. Drag to reorder. Click to select. Deleting removes from all 3 formats.

### Center canvas

- Canvas div at actual format dimensions, scaled to fit via CSS transform
- Neutral gray (#f5f5f5 or similar) background outside canvas
- Objects rendered as absolutely-positioned divs
- **Click** to select object
- **Drag** to move (pointer events)
- **Resize handles** — 8 handles (corners + edge midpoints) on selected object, blue selection border
- **Double-click text** — editable preview text (not saved to release, just for sizing preview)
- **Image objects** — gray placeholder with subtle pattern
- **Logo objects** — generic logo placeholder icon

### Right sidebar (~280px)

Shown only when an object is selected. Empty state: "Select an object to edit its properties."

**All objects:**
- Name (text input)
- W, H (number inputs, side by side)
- X, Y (number inputs, side by side)
- Opacity (slider, 0-1)

**Text objects (title, description, productName):**
- Font family — grouped select: Serif (26 fonts), Sans Serif (31 fonts), Novelty (10 fonts)
- Font size — number input (px)
- Font weight — select (100-900)
- Letter spacing — number input (px)
- Line height — number input (unitless)
- Text align — segmented control (left/center/right)
- Vertical align — segmented control (top/center/bottom)

**Image objects:**
- Device frame — select (browser/mobile/none)
- Object fit — select (cover/contain)

**Logo objects:**
- Object fit — select (cover/contain)

### Font list

**Serif:** Abril Fatface, Alegreya, Arvo, BioRhyme, Corben, Cormorant, Courier Prime, Coustard, DM Serif Display, Eczar, Frank Ruhl Libre, Gravitas One, IBM Plex Serif, Jomolhari, Libre Baskerville, Lora, Merriweather, Neuton, Noto Serif, Old Standard TT, PT Serif, Playfair Display, Prata, Source Serif Pro, Spectral, Vollkorn

**Sans Serif:** Alegreya Sans, Anton, Archivo, Archivo Narrow, Cabin, Catamaran, Chivo, Fira Sans, IBM Plex Sans, Karla, Lato, Libre Franklin, Montserrat, Muli, Noto Sans, Nunito, Open Sans, Oswald, Oxygen, PT Sans, Pontano Sans, Poppins, Puritan, Raleway, Roboto, Source Sans Pro, Space Mono, Titillium Web, Ubuntu, Varela, Work Sans

**Novelty:** Caveat, Courgette, Delius, Kalam, Merienda, Patrick Hand, Permanent Marker, Press Start 2P, Satisfy, VT323

### State management

`useReducer` with action history for undo/redo.

**Actions:**
- `SELECT_OBJECT` — set active object
- `MOVE_OBJECT` — update x, y
- `RESIZE_OBJECT` — update x, y, width, height
- `UPDATE_PROPERTY` — update any object property
- `ADD_OBJECT` — add to all 3 formats with default positions
- `REMOVE_OBJECT` — remove from all 3 formats
- `REORDER_OBJECTS` — update zIndex values
- `SWITCH_FORMAT` — change active format (no undo)
- `SET_COLORS` — update template colors
- `SET_BRAND` — set/clear brandId
- `SET_NAME` — update template name

**Undo/redo:**
- Cmd+Z / Cmd+Shift+Z
- Stack of past states, capped at 50
- `SWITCH_FORMAT` is not undoable (navigation, not data change)

### Interactions

- **Click canvas object** or **click layer in list** → select
- **Drag object** → move (updates x, y)
- **Drag resize handle** → resize (updates x, y, w, h depending on handle)
- **Double-click text** → inline edit preview text
- **Click empty canvas** → deselect
- **Keyboard:** Cmd+Z undo, Cmd+Shift+Z redo, Delete/Backspace remove selected object, Escape deselect, Arrow keys nudge position by 1px

### shadcn components used

Input, Button, Select, Label, Separator, ScrollArea, DropdownMenu, Tooltip, Slider

## Scope

### In scope
- Canvas editor with absolute positioning
- 3 independent format layouts
- Drag/resize objects on canvas
- Undo/redo
- Brand or manual colors (mutually exclusive)
- 5 object types: title, description, image, logo, productName
- 67 Google Fonts (3 categories)
- Save to Convex, load from Convex
- Migrate default templates to new format
- Replace old block-based renderer

### Out of scope
- Multi-select
- Copy/paste objects
- Snap-to-grid / alignment guides
- Rotation
- Shadow, border, color per object
- Public template gallery
- Per-object color override (uses template/brand colors)
