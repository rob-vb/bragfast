# Template Library Refactor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3 generic templates with 5 purpose-built templates, each with baked-in image frame and optimized positions. Remove `device_type` override, rename `device_color` → `image_frame_color` (hex).

**Architecture:** Delete v1 config renderer and legacy types. Rename device fields to image_frame across types, renderer, pipeline, API, editor, and docs. Replace CANVAS_DEFAULTS with 5 new templates. Update Convex seed.

**Tech Stack:** Next.js 16, TypeScript, Satori, Convex, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-template-library-refactor.md`

---

## Chunk 1: Types, Config, and Renderer Core

### Task 1: Rename types in canvas-types.ts

**Files:**
- Modify: `src/lib/templates/canvas-types.ts`

- [ ] **Step 1: Rename DeviceOption → ImageFrame**

Replace line 48:
```ts
// Old
export type DeviceOption = "browser" | "mobile" | "none";
// New
export type ImageFrame = "browser" | "mobile" | "none";
```

- [ ] **Step 2: Update TemplateObject — rename device fields, add imageFrameColor**

In the `TemplateObject` interface (lines 52-87), replace the image-only section:
```ts
// Old
  device?: DeviceOption;
  deviceColor?: 'light' | 'dark';
// New
  imageFrame?: ImageFrame;
  imageFrameColor?: string;
```

- [ ] **Step 3: Extend migrateObject to handle renames**

Update `migrateObject` (line 25) to also migrate old field names:
```ts
function migrateObject(obj: TemplateObject): TemplateObject {
  const type = obj.type as string;
  const migrated = (type === "title" || type === "description")
    ? { ...obj, type: "text" as ObjectType }
    : { ...obj };

  // Migrate device → imageFrame
  const raw = migrated as Record<string, unknown>;
  if ("device" in raw && !("imageFrame" in raw)) {
    migrated.imageFrame = raw.device as ImageFrame;
    delete raw.device;
  }
  // Migrate deviceColor → imageFrameColor (enum to hex)
  if ("deviceColor" in raw && !("imageFrameColor" in raw)) {
    const dc = raw.deviceColor as string;
    migrated.imageFrameColor = dc === "dark" ? "#1A1A1A" : "#E8E8E8";
    delete raw.deviceColor;
  }

  return migrated;
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: errors in files that still reference `DeviceOption` / `device` / `deviceColor` — that's expected, we'll fix them in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/templates/canvas-types.ts
git commit -m "refactor: rename DeviceOption → ImageFrame, device → imageFrame, add imageFrameColor"
```

---

### Task 2: Update ObjectDataMap and CanvasRenderer

**Files:**
- Modify: `src/lib/templates/canvas-renderer.tsx`

- [ ] **Step 1: Update ObjectDataMap interface**

Replace lines 9-19:
```ts
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    fontFamily?: string;
    color?: string;
    imageFrameColor?: string;
  };
}
```

- [ ] **Step 2: Update renderObject image handling**

In `renderObject` (around line 176), replace the device resolution:
```ts
// Old
const device = data?.deviceType || obj.device || "none";
const deviceColor = data?.deviceColor || obj.deviceColor || (device === "mobile" ? "dark" : "light");
// New
const frame = obj.imageFrame || "none";
const frameColor = data?.imageFrameColor || obj.imageFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
```

Update the conditionals below to use `frame` instead of `device`, and pass `frameColor` as the `color` prop to `BrowserFrame` and `MobileFrame`:
```ts
if (frame === "none") { ... }
if (frame === "mobile") {
  return (
    <MobileFrame
      imageBase64={imgSrc}
      primaryColor={colors.primary}
      width={obj.width}
      maxHeight={obj.height}
      color={frameColor}
    />
  );
}
return (
  <BrowserFrame
    imageBase64={imgSrc}
    primaryColor={colors.primary}
    width={obj.width}
    maxHeight={obj.height}
    color={frameColor}
  />
);
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/lib/templates/canvas-renderer.tsx
git commit -m "refactor: update ObjectDataMap and renderer to use imageFrame/imageFrameColor"
```

---

### Task 3: Update BrowserFrame and MobileFrame to accept hex color

**Files:**
- Modify: `src/lib/templates/components/BrowserFrame.tsx`
- Modify: `src/lib/templates/components/MobileFrame.tsx`

- [ ] **Step 1: Update BrowserFrame color prop**

Change the `color` prop type from `'light' | 'dark'` to `string`. Use it directly for the titlebar background. Default to `#E8E8E8`:

```ts
interface BrowserFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
}

export function BrowserFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = '#E8E8E8' }: BrowserFrameProps) {
  const dotSize = 10
  const titleBarHeight = 32
  const imageHeight = maxHeight ? maxHeight - titleBarHeight : undefined

  // Use color directly for chrome, derive border from it
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: `${width}px`,
      borderRadius: flush ? '12px 12px 0 0' : '12px',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
      borderBottom: flush ? 'none' : '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: titleBarHeight,
        backgroundColor: color,
        padding: '0 14px',
        gap: 7,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#27C93F' }} />
      </div>
      <img
        src={imageBase64}
        width={width}
        style={{
          display: 'flex',
          width: `${width}px`,
          height: imageHeight ? `${imageHeight}px` : undefined,
          objectFit: 'cover',
          objectPosition: 'top',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update MobileFrame color prop**

Change the `color` prop type from `'light' | 'dark'` to `string`. Use it directly for the bezel background. Default to `#1A1A1A`:

```ts
interface MobileFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
}

export function MobileFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = '#1A1A1A' }: MobileFrameProps) {
```

Replace `const isDark = color === 'dark'` and `backgroundColor: isDark ? '#1A1A1A' : '#E8E8E8'` with just `backgroundColor: color`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/lib/templates/components/BrowserFrame.tsx src/lib/templates/components/MobileFrame.tsx
git commit -m "refactor: BrowserFrame/MobileFrame accept hex color string"
```

---

### Task 4: Update types.ts — remove DeviceType, legacy Slide fields, update ObjectModification and TemplateName

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Remove DeviceType, update Slide, update ObjectModification, update TemplateName**

Remove `DeviceType` (line 27). Remove `device` from `Slide`. Update `ObjectModification`:
```ts
export interface ObjectModification {
  id: string
  // Text objects
  text?: string
  font_family?: string
  color?: string
  // Image objects
  image_url?: string
  image_frame_color?: string
}
```

Remove legacy flat fields from `ReleaseRequest.slides` — the slide type becomes `Array<{ objects: ObjectModification[] }>`. Remove `title`, `description`, `image_url`, `device`, `align` from the slide interface (lines 63-67).

Update `TemplateName` (line 96):
```ts
export type TemplateName = 'standard-browser' | 'standard-mobile' | 'split-browser' | 'split-mobile' | 'hero' | (string & {})
```

Also remove `TemplateProps` if it only existed for the v1 ConfigRenderer. Check if it's used elsewhere first.

Check `src/lib/templates/components/DeviceFrame.tsx` — if it only routes to Browser/MobileFrame based on old `device` prop, delete it.

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: remove DeviceType, update ObjectModification and TemplateName"
```

---

### Task 5: Delete v1 config renderer and types

**Files:**
- Delete: `src/lib/templates/config-renderer.tsx`
- Delete: `src/lib/templates/config-types.ts`
- Modify: `src/lib/templates/default-configs.ts`

- [ ] **Step 1: Delete v1 files**

```bash
rm src/lib/templates/config-renderer.tsx src/lib/templates/config-types.ts
```

- [ ] **Step 2: Rewrite default-configs.ts**

Remove `DEFAULT_TEMPLATES`, `V2_ALIASES`, and the `TemplateConfig` import. Simplify to:
```ts
import type { CanvasTemplateConfig } from "./canvas-types";
import { getCanvasDefaultConfig } from "./canvas-defaults";

export function getDefaultConfig(name: string): CanvasTemplateConfig | null {
  return getCanvasDefaultConfig(name);
}
```

- [ ] **Step 3: Commit**

```bash
git rm src/lib/templates/config-renderer.tsx src/lib/templates/config-types.ts
git add src/lib/templates/default-configs.ts
git commit -m "refactor: delete v1 config renderer and types, simplify default-configs"
```

---

### Task 6: Update render pipeline — remove legacy paths, rename fields

**Files:**
- Modify: `src/lib/pipeline/render.ts`

- [ ] **Step 1: Remove v1 imports and legacy slide handling**

Remove imports: `ConfigRenderer`, `TemplateConfig`, `config-renderer`.
Remove `isCanvasConfig` function. Remove `legacySlides` construction (lines 195-205). Remove the v1 ConfigRenderer JSX branch in the render loop.

- [ ] **Step 2: Update default template and field mapping**

Change default template from `"classic"` to `"standard-browser"` (lines 38 and 113).

Update slide data mapping to remove `device_type`/`device_color` and add `image_frame_color`:
```ts
if (mod.image_url) entry.imageBase64 = await fetchImageAsBase64(mod.image_url);
if (mod.font_family) entry.fontFamily = mod.font_family;
if (mod.color) entry.color = mod.color;
if (mod.image_frame_color) entry.imageFrameColor = mod.image_frame_color;
```

Remove the two lines that mapped `device_type` → `deviceType` and `device_color` → `deviceColor`.

- [ ] **Step 3: Simplify — always use CanvasRenderer**

Since we removed v1, the render loop always uses `CanvasRenderer`. Remove the `isCanvas` conditional. Always call `migrateConfig`. Always use `loadFontsForObjects`.

Update `let templateConfig: TemplateConfig | CanvasTemplateConfig` to `let templateConfig: CanvasTemplateConfig`. Update the Convex template config cast from `as TemplateConfig | CanvasTemplateConfig` to `as CanvasTemplateConfig`.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/render.ts
git commit -m "refactor: remove v1 renderer path, update field names in pipeline"
```

---

### Task 7: Update release route validation

**Files:**
- Modify: `src/app/api/v1/release/route.ts`

- [ ] **Step 1: Update valid template names**

Replace `["classic", "split", "hero"]` (around line 47) with:
```ts
const validDefaults = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"];
```

Also update the error message (around line 52) to list the new valid template names instead of the old ones.

Also remove the legacy `!slide.objects && !slide.title` fallback check if present in the validation logic — slides must use the `objects` array.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/release/route.ts
git commit -m "refactor: update valid default template names in release route"
```

---

## Chunk 2: New Template Configs and Convex Seed

### Task 8: Replace CANVAS_DEFAULTS with 5 new templates

**Files:**
- Modify: `src/lib/templates/canvas-defaults.ts`

- [ ] **Step 1: Replace CANVAS_DEFAULTS**

Replace the entire file. Use `imageFrame` and `imageFrameColor` on image objects. Key differences from old configs:

**standard-browser**: same positions as old `classic_v2`, `imageFrame: "browser"`, `imageFrameColor: "#E8E8E8"`. Bottom-bleed on all formats (extend height past canvas bottom by 150px).

**standard-mobile**: same layout as standard-browser but `imageFrame: "mobile"`, `imageFrameColor: "#1A1A1A"`, narrower image width (e.g. landscape: 600px centered instead of 1072px full-width). Bottom-bleed.

**split-browser**: same positions as old `split_v2`, `imageFrame: "browser"`, `imageFrameColor: "#E8E8E8"`. Right-bleed on portrait (width extends 100px past canvas).

**split-mobile**: same layout as split-browser but `imageFrame: "mobile"`, `imageFrameColor: "#1A1A1A"`, narrower image:
- landscape: x=770, width=300, height=547
- square: x=590, width=420, height=890
- portrait: x=578, width=602, height=1752 (right-bleed)

**hero**: same as old `hero_v2`, `imageFrame: "none"`. No frame.

Keys: `"standard-browser"`, `"standard-mobile"`, `"split-browser"`, `"split-mobile"`, `"hero"`.

Use the `textObj` helper, update it to not include any device fields.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/templates/canvas-defaults.ts
git commit -m "feat: replace CANVAS_DEFAULTS with 5 new purpose-built templates"
```

---

### Task 9: Update Convex templates — seed new defaults

**Files:**
- Modify: `convex/templates.ts`

- [ ] **Step 1: Update templateObjectValidator**

Add `imageFrame` and `imageFrameColor` fields, remove `device` and `deviceColor`:
```ts
imageFrame: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
imageFrameColor: v.optional(v.string()),
```

- [ ] **Step 2: Rewrite seedDefaults**

Delete all old seeds (v1 and v2). Seed 5 new templates with external IDs `tmpl_standard_browser`, `tmpl_standard_mobile`, `tmpl_split_browser`, `tmpl_split_mobile`, `tmpl_hero`. Import configs from `canvas-defaults.ts`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add convex/templates.ts
git commit -m "feat: update Convex template seed with 5 new defaults"
```

---

### Task 10: Update dashboard templates page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/templates/page.tsx`

- [ ] **Step 1: Update defaultDisplayIds**

```ts
const defaultDisplayIds: Record<string, string> = {
  tmpl_standard_browser: "standard-browser",
  tmpl_standard_mobile: "standard-mobile",
  tmpl_split_browser: "split-browser",
  tmpl_split_mobile: "split-mobile",
  tmpl_hero: "hero",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/templates/page.tsx
git commit -m "refactor: update dashboard template display IDs"
```

---

## Chunk 3: Editor UI and Frame Color Picker

### Task 11: Update image-properties.tsx — rename fields, add color picker

**Files:**
- Modify: `src/components/editor/image-properties.tsx`

- [ ] **Step 1: Rename device → imageFrame, deviceColor → imageFrameColor**

Update all references:
- `selectedObject.device` → `selectedObject.imageFrame`
- `selectedObject.deviceColor` → `selectedObject.imageFrameColor`
- Property names in `UPDATE_PROPERTY` dispatches: `"device"` → `"imageFrame"`, `"deviceColor"` → `"imageFrameColor"`

- [ ] **Step 2: Replace light/dark toggle with color picker**

Replace the light/dark button pair (lines 174-199) with:
- Light preset circle (`#E8E8E8`)
- Dark preset circle (`#1A1A1A`)
- Custom color input (hex)

Use the same pattern as the text color picker in the editor. The value is now a hex string stored as `imageFrameColor`.

When selecting a preset, dispatch `UPDATE_PROPERTY` with `property: "imageFrameColor"`, `value: "#E8E8E8"` or `"#1A1A1A"`, `allFormats: true`.

When device frame changes (none → browser), set default `imageFrameColor` based on frame type.

- [ ] **Step 3: Run type check and verify in browser**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/image-properties.tsx
git commit -m "feat: rename device fields, add hex color picker for frame color"
```

---

### Task 12: Update remaining editor files

**Files:**
- Modify: `src/components/editor/canvas-object.tsx` (if it references `device`/`deviceColor`)
- Modify: `src/components/editor/editor-context.tsx` (if it references device fields)

- [ ] **Step 1: Search and replace device references in editor**

Search all editor files for `device`, `deviceColor`, `DeviceOption` references. Update to `imageFrame`, `imageFrameColor`, `ImageFrame`.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/
git commit -m "refactor: update all editor files to use imageFrame/imageFrameColor"
```

---

## Chunk 4: Demo, Docs, Homepage

### Task 13: Update generate-demo-images.ts

**Files:**
- Modify: `scripts/generate-demo-images.ts`

- [ ] **Step 1: Rewrite script for new template library**

Templates become the 5 new slugs. Each template already has its frame baked in, so no more `device_type` override needed. The script now generates images for each template × font × format combination.

```ts
const TEMPLATES = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"] as const;
const FONTS = ["Inter", "Raleway", "Saira"] as const;
const FORMATS = ["landscape", "square", "portrait"] as const;

// Content varies by template purpose
const CONTENT: Record<string, { title: string; description: string; image: string }> = {
  "standard-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: "photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
  },
  "standard-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: "photo-1512941937669-90a1b58e7e9c?w=600&h=1200&fit=crop",
  },
  "split-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: "photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
  },
  "split-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: "photo-1512941937669-90a1b58e7e9c?w=600&h=1200&fit=crop",
  },
  hero: {
    title: "Squashed 12 bugs",
    description: "Stability and performance improvements across the board",
    image: "photo-1461749280684-dccba630e2f6?w=1200&h=800&fit=crop",
  },
};
```

Payload builder: no `device_type` field, just `{ id: "title", text }, { id: "description", text }, { id: "image", image_url }`.

Output filenames: `<template>-<font>-<format>.jpg` (no more `<type>` segment since each template IS the type).

- [ ] **Step 2: Commit**

```bash
git add scripts/generate-demo-images.ts
git commit -m "feat: rewrite demo image script for 5-template library"
```

---

### Task 14: Update demo page

**Files:**
- Modify: `src/app/demo/page.tsx`

- [ ] **Step 1: Update TEMPLATES list and remove UPDATE_TYPES**

```ts
const TEMPLATES = [
  { value: "standard-browser", label: "Standard Browser" },
  { value: "standard-mobile", label: "Standard Mobile" },
  { value: "split-browser", label: "Split Browser" },
  { value: "split-mobile", label: "Split Mobile" },
  { value: "hero", label: "Hero" },
];
```

Remove the `UPDATE_TYPES` selector and `SLIDE_OBJECTS` — each template is now self-explanatory. Update `imagePath` to match new filename format: `<template>-<font>-<format>.jpg`.

Remove the "Type of update" `<Select>` from the controls section.

Update curl snippet to use new template slug and remove `device_type` from the objects array.

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/page.tsx
git commit -m "feat: update demo page for new template library"
```

---

### Task 15: Update API docs

**Files:**
- Modify: `src/lib/docs/api-reference.ts`

- [ ] **Step 1: Update template parameter docs**

Change valid values from `"classic" | "split" | "hero"` to `"standard-browser" | "standard-mobile" | "split-browser" | "split-mobile" | "hero"`. Update default from `"classic"` to `"standard-browser"`.

- [ ] **Step 2: Update ObjectModification docs**

Remove `device_type` field. Replace `device_color` with `image_frame_color` (type: string, hex color, optional).

- [ ] **Step 3: Remove legacy slide format docs**

Remove documentation for flat `title`/`description`/`image_url`/`device` fields on slides. Only document the `objects` array format.

- [ ] **Step 4: Update all example code**

Replace `"template": "classic"` with `"template": "standard-browser"` (or appropriate slug). Remove `device_type` from example objects.

- [ ] **Step 5: Commit**

```bash
git add src/lib/docs/api-reference.ts
git commit -m "docs: update API reference for template library refactor"
```

---

### Task 16: Update homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update curl example**

Change `"template": "classic"` to `"template": "standard-browser"` in the code snippet (around line 150).

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "docs: update homepage curl example with new template slug"
```

---

## Chunk 5: Generate Demo Images and Final Verification

### Task 17: Generate demo images

- [ ] **Step 1: Start dev server if not running**

Run: `npm run dev`

- [ ] **Step 2: Run generate script**

Run: `npx tsx scripts/generate-demo-images.ts`
Expected: 45 images (5 templates × 3 fonts × 3 formats), 0 errors.

- [ ] **Step 3: Verify key images look correct**

Check: `public/demo/split-mobile-inter-portrait.jpg` — phone should be narrow, bleeding off right edge.
Check: `public/demo/split-browser-inter-landscape.jpg` — wide browser frame.
Check: `public/demo/standard-mobile-inter-square.jpg` — phone centered, bleeding off bottom.
Check: `public/demo/hero-inter-landscape.jpg` — fullbleed image with text overlay.

- [ ] **Step 4: Commit demo images**

```bash
git add public/demo/
git commit -m "feat: regenerate demo images for 5-template library"
```

---

### Task 18: Full verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: all pass (update any tests that reference old template names)

- [ ] **Step 3: Manual smoke test**

1. Open demo page — verify all 5 templates render correctly
2. Open template editor — verify frame color picker works
3. Create a release via API with `"template": "split-mobile"` — verify output

- [ ] **Step 4: Delete old demo images**

Remove any leftover `public/demo/` images with old naming pattern (`classic-*`, `split-website-*`, etc.).

```bash
rm public/demo/classic-* public/demo/split-website-* public/demo/split-mobile-* public/demo/split-bugs-* public/demo/hero-website-* public/demo/hero-mobile-* public/demo/hero-bugs-*
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: clean up old demo images"
```
