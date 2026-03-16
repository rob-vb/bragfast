# Per-Format Slides Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `ReleaseRequest` so slides live inside each format entry, enabling per-format slide counts, content, and anchoring.

**Architecture:** Move `slides` from top-level into `formats` array entries. `formats` becomes required `Array<{ name: FormatKey; slides: ... }>`. Render pipeline builds `slideDataMaps` per-format instead of once upfront.

**Tech Stack:** TypeScript, Next.js App Router, Satori, Vitest

**Spec:** `docs/superpowers/specs/2026-03-13-per-format-slides-design.md`

**Pre-flight:** `brand-form.tsx` has uncommitted changes on the working tree. Commit or stash before starting.

---

## Chunk 1: Types & Validation

### Task 1: Update ReleaseRequest type

**Files:**
- Modify: `src/lib/types.ts:42-60`

- [ ] **Step 1: Update the type definition**

```typescript
import type { FormatKey } from "./templates/canvas-types"

export interface FormatEntry {
  name: FormatKey
  slides: Array<{
    objects?: ObjectModification[]
  }>
}

export interface ReleaseRequest {
  brand_id?: string
  colors?: {
    background: string
    text: string
    primary: string
  }
  name?: string
  logo_url?: string
  font_family?: string
  template?: TemplateName
  formats: FormatEntry[]
  metadata?: string
  webhook_url?: string
}
```

Remove the old `slides` and `formats` fields. Export `FormatEntry` for use in route validation.

- [ ] **Step 2: Verify project compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in route.ts, render.ts, demo script, tests — this is correct, we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: restructure ReleaseRequest — slides move into format entries"
```

---

### Task 2: Add credit calculation helper

**Files:**
- Modify: `src/lib/types.ts` (append)

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/credits.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateCredits } from '../types'

describe('calculateCredits', () => {
  it('sums slides across all format entries', () => {
    expect(calculateCredits([
      { name: 'landscape', slides: [{}] },
      { name: 'square', slides: [{}, {}] },
    ])).toBe(3)
  })

  it('returns 0 for empty formats', () => {
    expect(calculateCredits([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/credits.test.ts`
Expected: FAIL — `calculateCredits` not found

- [ ] **Step 3: Implement**

Add to `src/lib/types.ts`:

```typescript
export function calculateCredits(formats: FormatEntry[]): number {
  return formats.reduce((sum, f) => sum + f.slides.length, 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/credits.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/__tests__/credits.test.ts
git commit -m "feat: add calculateCredits helper for per-format slide counts"
```

---

### Task 3: Rewrite route validation

**Files:**
- Modify: `src/app/api/v1/cook/route.ts:25-80`

- [ ] **Step 1: Write failing validation tests**

Create `src/lib/__tests__/format-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateFormats } from '../validation'

describe('validateFormats', () => {
  it('rejects missing formats', () => {
    expect(validateFormats(undefined)).toMatch(/formats/)
  })

  it('rejects empty formats array', () => {
    expect(validateFormats([])).toMatch(/at least 1/)
  })

  it('rejects invalid format name', () => {
    expect(validateFormats([{ name: 'banner', slides: [{}] }])).toMatch(/Invalid format/)
  })

  it('rejects duplicate format names', () => {
    expect(validateFormats([
      { name: 'landscape', slides: [{}] },
      { name: 'landscape', slides: [{}] },
    ])).toMatch(/uplicate/)
  })

  it('rejects format with no slides', () => {
    expect(validateFormats([{ name: 'landscape', slides: [] }])).toMatch(/at least 1 slide/)
  })

  it('rejects format with >5 slides', () => {
    expect(validateFormats([{ name: 'landscape', slides: [{},{},{},{},{},{}] }])).toMatch(/5 slides/)
  })

  it('rejects invalid anchor_x', () => {
    expect(validateFormats([{
      name: 'landscape',
      slides: [{ objects: [{ id: 'img', anchor_x: 'invalid' }] }],
    }])).toMatch(/anchor_x/)
  })

  it('rejects invalid anchor_y', () => {
    expect(validateFormats([{
      name: 'square',
      slides: [{ objects: [{ id: 'img', anchor_y: 'invalid' }] }],
    }])).toMatch(/anchor_y/)
  })

  it('rejects object without id', () => {
    expect(validateFormats([{
      name: 'landscape',
      slides: [{ objects: [{ text: 'hello' }] }],
    }])).toMatch(/id/)
  })

  it('passes valid formats', () => {
    expect(validateFormats([
      { name: 'landscape', slides: [{ objects: [{ id: 'title', text: 'hi' }] }] },
      { name: 'square', slides: [{}, { objects: [{ id: 'image', anchor_y: 'top' }] }] },
    ])).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/format-validation.test.ts`
Expected: FAIL — `validateFormats` not found

- [ ] **Step 3: Implement validateFormats**

Add to `src/lib/validation.ts`:

```typescript
import type { FormatEntry, ObjectModification } from './types'
import { FORMAT_DIMENSIONS } from './types'

const VALID_FORMATS = Object.keys(FORMAT_DIMENSIONS)
const VALID_ANCHOR_X = ['left', 'center', 'right']
const VALID_ANCHOR_Y = ['top', 'center', 'bottom']

export function validateFormats(formats: unknown): string | null {
  if (!formats || !Array.isArray(formats) || formats.length === 0) {
    return 'formats is required and must contain at least 1 entry'
  }

  const seen = new Set<string>()
  for (const entry of formats) {
    if (!entry.name || !VALID_FORMATS.includes(entry.name)) {
      return `Invalid format: ${entry.name}. Must be landscape, square, or portrait`
    }
    if (seen.has(entry.name)) {
      return `Duplicate format: ${entry.name}`
    }
    seen.add(entry.name)

    if (!entry.slides || !Array.isArray(entry.slides) || entry.slides.length === 0) {
      return `Format "${entry.name}" must have at least 1 slide`
    }
    if (entry.slides.length > 5) {
      return `Format "${entry.name}" allows maximum 5 slides`
    }

    for (const slide of entry.slides) {
      if (slide.objects) {
        if (!Array.isArray(slide.objects)) {
          return 'slides[].objects must be an array'
        }
        for (const mod of slide.objects) {
          if (!mod.id || typeof mod.id !== 'string') {
            return 'Each object requires a string id'
          }
          if (mod.anchor_x && !VALID_ANCHOR_X.includes(mod.anchor_x)) {
            return 'anchor_x must be "left", "center", or "right"'
          }
          if (mod.anchor_y && !VALID_ANCHOR_Y.includes(mod.anchor_y)) {
            return 'anchor_y must be "top", "center", or "bottom"'
          }
        }
      }
    }
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/format-validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/__tests__/format-validation.test.ts
git commit -m "feat: add validateFormats for per-format slide validation"
```

---

### Task 4: Update route handler

**Files:**
- Modify: `src/app/api/v1/cook/route.ts`

- [ ] **Step 1: Replace ALL old validation with new**

Delete lines 25-70 entirely (old slides validation at 25-51, template validation at 52-62, old formats validation at 63-70). Replace with:

```typescript
  // --- Format & slide validation (replaces old slides + formats validation) ---
  const formatError = validateFormats(body.formats);
  if (formatError) {
    return Response.json({ error: formatError }, { status: 400 });
  }

  // Template validation (unchanged)
  if (body.template) {
    const validDefaults = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"];
    const isDefault = validDefaults.includes(body.template);
    const isCustom = typeof body.template === "string" && body.template.startsWith("tmpl_");
    if (!isDefault && !isCustom) {
      return Response.json(
        { error: "Invalid template. Must be standard-browser, standard-mobile, split-browser, split-mobile, hero, or a template ID (tmpl_...)" },
        { status: 400 }
      );
    }
  }
```

Add imports at top of file:

```typescript
import { validateFormats } from "@/lib/validation";
import { calculateCredits } from "@/lib/types";
```

Replace credit calculation (old line 79-80):

```typescript
  const creditsNeeded = calculateCredits(body.formats);
```

Update catch block refund (old line 120):

```typescript
  amount: calculateCredits(body.formats),
```

**Important:** The old code required `objects` on every slide (line 32-34). This is intentionally removed — `validateFormats` makes `objects` optional per the spec.

- [ ] **Step 2: Verify route compiles**

Run: `npx tsc --noEmit 2>&1 | grep route.ts`
Expected: No errors from route.ts

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/cook/route.ts
git commit -m "refactor: update release route for per-format slides validation"
```

---

## Chunk 2: Render Pipeline

### Task 5: Restructure render pipeline

**Files:**
- Modify: `src/lib/pipeline/render.ts:21-268`

- [ ] **Step 1: Update createRelease (lines 21-48)**

Replace credit calculation:

```typescript
const creditsUsed = calculateCredits(request.formats);
```

Remove: `const formats = request.formats || ["landscape", "square", "portrait"];`

Import `calculateCredits` from `../types`.

- [ ] **Step 2: Restructure renderReleaseAsync (lines 100-268)**

The key change: move `slideDataMaps` construction inside the format loop.

Replace lines 125-230 with:

```typescript
    templateConfig = migrateConfig(templateConfig);

    const images: Record<string, { slides: string[]; dimensions: string }> = {};

    // Collect all static image src URLs across all formats (fetch once)
    const staticSrcs = new Set<string>();
    for (const fKey of Object.keys(templateConfig.formats) as FormatKey[]) {
      for (const obj of templateConfig.formats[fKey].objects) {
        if (obj.type === "image" && obj.src) staticSrcs.add(obj.src);
      }
    }
    const srcMap: Record<string, string> = {};
    if (staticSrcs.size > 0) {
      const srcEntries = await Promise.all(
        [...staticSrcs].map(async (src) => [src, await fetchImageAsBase64(src)] as const)
      );
      Object.assign(srcMap, Object.fromEntries(srcEntries));
    }

    for (const formatEntry of request.formats) {
      const format = formatEntry.name;
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];

      // Build slideDataMaps for THIS format's slides
      const slideDataMaps: ObjectDataMap[] = await Promise.all(
        formatEntry.slides.map(async (s) => {
          if (s.objects) {
            const dataMap: ObjectDataMap = {};
            for (const mod of s.objects) {
              const entry: ObjectDataMap[string] = {};
              if (mod.text) entry.text = mod.text;
              if (mod.image_url) entry.imageBase64 = await fetchImageAsBase64(mod.image_url);
              if (mod.font_family) entry.fontFamily = mod.font_family;
              if (mod.color) entry.color = mod.color;
              if (mod.image_frame_color) entry.imageFrameColor = mod.image_frame_color;
              if (mod.anchor_x) entry.anchorX = mod.anchor_x;
              if (mod.anchor_y) entry.anchorY = mod.anchor_y;
              dataMap[mod.id] = entry;
            }
            return dataMap;
          }
          return {};
        })
      );

      // Inject static images for this format
      for (const obj of templateConfig.formats[format as FormatKey].objects) {
        if (obj.type === "image" && obj.src && srcMap[obj.src]) {
          for (const dataMap of slideDataMaps) {
            if (!dataMap[obj.id]?.imageBase64) {
              dataMap[obj.id] = { ...dataMap[obj.id], imageBase64: srcMap[obj.src] };
            }
          }
        }
      }

      // Font loading
      let fonts = await loadFontsForObjects(templateConfig.formats[format as FormatKey].objects);
      if (brand.font_family) {
        const brandFonts = await loadFontsForFamily(brand.font_family);
        fonts = [...fonts, ...brandFonts];
      }
      const overrideFamilies = new Set<string>();
      for (const dataMap of slideDataMaps) {
        for (const entry of Object.values(dataMap)) {
          if (entry.fontFamily) overrideFamilies.add(entry.fontFamily);
        }
      }
      for (const family of overrideFamilies) {
        const overrideFonts = await loadFontsForFamily(family);
        fonts = [...fonts, ...overrideFonts];
      }

      // Render slides
      for (let i = 0; i < slideDataMaps.length; i++) {
        const jsx = CanvasRenderer({
          config: templateConfig,
          format: format as FormatKey,
          objectData: slideDataMaps[i],
          brand,
        });
        const svg = await satori(jsx, { width, height, fonts });
        const jpg = await sharp(Buffer.from(svg))
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 85 })
          .toBuffer();
        const filename = `${format}-${i + 1}.jpg`;
        let url: string;
        if (OUTPUT_LOCAL) {
          const dir = path.join(process.cwd(), ".output", releaseId);
          await mkdir(dir, { recursive: true });
          const filePath = path.join(dir, filename);
          await writeFile(filePath, jpg);
          url = `file://${filePath}`;
        } else {
          url = await uploadImage(jpg, `releases/${releaseId}/${filename}`);
        }
        slideUrls.push(url);
      }

      images[format] = {
        slides: slideUrls,
        dimensions: `${width}x${height}`,
      };
    }
```

- [ ] **Step 3: Update refund logic (lines 246-248)**

Replace:

```typescript
    const formats = request.formats || ["landscape", "square", "portrait"];
    const amount = request.slides.length * formats.length;
```

With:

```typescript
    const amount = calculateCredits(request.formats);
```

- [ ] **Step 4: Verify pipeline compiles**

Run: `npx tsc --noEmit 2>&1 | grep render.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/render.ts
git commit -m "refactor: render pipeline builds slideDataMaps per-format"
```

---

## Chunk 3: Tests & Demo Script

### Task 6: Update existing tests

**Files:**
- Modify: `src/lib/__tests__/release-validation.test.ts`

- [ ] **Step 1: Update test payloads to new format**

The existing color validation tests pass `slides: []` at top level. Update them to use the new shape:

```typescript
// Old: { brand_id: 'brand_xxx', slides: [] }
// New: { brand_id: 'brand_xxx', formats: [{ name: 'landscape', slides: [{}] }] }
```

Update all 4 test cases to use `formats` instead of `slides`.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/release-validation.test.ts
git commit -m "test: update release validation tests for per-format slides"
```

---

### Task 7: Update demo script

**Files:**
- Modify: `scripts/generate-demo-images.ts:85-113`

- [ ] **Step 1: Update buildPayload**

Replace the return statement:

```typescript
function buildPayload(template: string, font: string, format: typeof FORMATS[number]) {
  const content = CONTENT[template];
  const imageUrl = content.localImage
    ? `${BASE}/demo/${content.image}`
    : `https://images.unsplash.com/${content.image}`;

  const imageObj: Record<string, string> = { id: "image", image_url: imageUrl };
  const anchors = content.imageAnchors?.[format];
  if (anchors?.anchor_x) imageObj.anchor_x = anchors.anchor_x;
  if (anchors?.anchor_y) imageObj.anchor_y = anchors.anchor_y;

  return {
    template,
    font_family: font,
    colors: getColors(template),
    name: "Acme Inc",
    ...(content.brandId && { brand_id: content.brandId }),
    formats: [{
      name: format,
      slides: [
        {
          objects: [
            { id: "title", text: content.title },
            { id: "description", text: content.description },
            imageObj,
          ],
        },
      ],
    }],
  };
}
```

- [ ] **Step 2: Verify script compiles**

Run: `npx tsc --noEmit scripts/generate-demo-images.ts 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-demo-images.ts
git commit -m "refactor: update demo script for per-format slides payload"
```

---

## Chunk 4: Documentation & Landing Page

### Task 8: Update API reference docs

**Files:**
- Modify: `src/lib/docs/api-reference.ts`

- [ ] **Step 1: Update parameter documentation**

Find the `slides` parameter entry (~line 239) and the `formats` parameter entry (~line 322). Replace both with a single `formats` parameter:

```typescript
{
  name: "formats",
  type: "array",
  required: true,
  description: "Array of format entries. Each entry specifies a format name and its slides. Total credits = sum of slides across all entries.",
  children: [
    {
      name: "name",
      type: "string",
      required: true,
      description: 'Format name: "landscape" (1200×675), "square" (1080×1080), or "portrait" (1080×1920).',
    },
    {
      name: "slides",
      type: "array",
      required: true,
      description: "1–5 slides for this format. Each slide becomes one image.",
      children: [
        {
          name: "objects",
          type: "array",
          required: false,
          description: "Object overrides for this slide. Omit for template defaults.",
          // keep existing children for objects (id, text, image_url, anchor_x, anchor_y, etc.)
        },
      ],
    },
  ],
},
```

Remove the old top-level `slides` parameter entry.

- [ ] **Step 2: Update all example payloads**

Update the three code examples (curl, JavaScript, Python at ~lines 343-406) and the async flow examples (~lines 41-84) to use the new format:

```json
{
  "brand_id": "brd_abc123",
  "template": "standard-browser",
  "formats": [
    {
      "name": "landscape",
      "slides": [{ "objects": [{ "id": "title", "text": "Shipped v2.0" }] }]
    },
    {
      "name": "square",
      "slides": [{ "objects": [{ "id": "title", "text": "Shipped v2.0" }] }]
    }
  ]
}
```

- [ ] **Step 3: Update credits description**

Find the credits section (~line 123). Update:

```typescript
description: "Every image costs 1 credit. Total per release = sum of slides across all format entries (e.g. 1 landscape slide + 2 square slides = 3 credits). Credits are reserved upfront and refunded automatically if the render fails. Plans: Trial — 30 credits free (no card), Starter ($29/mo) — 1,000, Pro ($79/mo) — 5,000, Scale ($159/mo) — 25,000.",
```

- [ ] **Step 4: Update releases section description**

Find the releases description (~line 159). Update to reflect per-format slides.

- [ ] **Step 5: Commit**

```bash
git add src/lib/docs/api-reference.ts
git commit -m "docs: update API reference for per-format slides"
```

---

### Task 9: Update landing page example

**Files:**
- Modify: `src/app/page.tsx:137-152`

- [ ] **Step 1: Update curl snippet**

Replace the curl example payload:

```
curl -X POST https://brag.fast/api/v1/cook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer bf_key" \\
  -d '{
    "template": "standard-browser",
    "formats": [{
      "name": "landscape",
      "slides": [{
        "objects": [
          { "id": "title",
            "text": "Dark mode is here" },
          { "id": "image",
            "image_url": "https://..." }
        ]
      }]
    }]
  }'
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "docs: update landing page curl example for per-format slides"
```

---

### Task 10: Update demo page example

**Files:**
- Modify: `src/app/demo/page.tsx:89-103`

- [ ] **Step 1: Update curlSnippet**

Replace the payload in the curlSnippet template literal:

```
curl -X POST https://brag.fast/api/v1/cook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "template": "${template}",
    "font_family": "${FONT_FAMILY_MAP[font]}",
    "formats": [{
      "name": "landscape",
      "slides": [{
        "objects": [
          { "id": "title", "text": "..." },
          { "id": "description", "text": "..." },
          { "id": "image", "image_url": "..." }
        ]
      }]
    }]
  }'
```

- [ ] **Step 2: Commit**

```bash
git add src/app/demo/page.tsx
git commit -m "docs: update demo page curl example for per-format slides"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev` — confirm no startup errors, hit `/api/v1/cook` endpoint mentally or via curl to check validation works.
