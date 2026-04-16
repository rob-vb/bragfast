# Visual Frame Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `image_frame`/`imageFrame` (+ `*_color` variants) to `visual_frame`/`visualFrame` across the entire app — API, internal types, Convex schema, editor UI, docs, tests. Rename UI label "Image objects" → "Visual objects". Also correct stale `videoTemplates` reference in CLAUDE.md.

**Architecture:** Mechanical rename across ~14 files. Single `migrateConfig()` function in `canvas-types.ts` translates legacy `imageFrame`/`imageFrameColor` keys on stored Convex templates at read time — no DB backfill required. Hard API break (feature branch not yet shipped).

**Tech Stack:** TypeScript, Next.js, Convex, Vitest.

---

## File Structure

**Types / schema**
- `src/lib/templates/canvas-types.ts` — `VisualFrame` type, `TemplateObject.visualFrame`/`visualFrameColor`, `migrateConfig()` legacy mapping.
- `src/lib/types.ts` — public API `ObjectModification.visual_frame`/`visual_frame_color`.
- `convex/templates.ts` — validator fields `visualFrame`/`visualFrameColor`.

**Pipeline / validation**
- `src/lib/pipeline/shared.ts` — API→internal mapping.
- `src/lib/validation.ts` — `VALID_VISUAL_FRAMES`, validator + error text.

**Rendering**
- `src/lib/templates/canvas-renderer.tsx` — `ObjectDataMap`, read paths.
- `src/lib/templates/canvas-defaults.ts` — 5 built-in templates.

**Editor UI**
- `src/components/editor/visual-properties.tsx` — local vars + `update()` property names + color preset dispatches.
- `src/components/editor/canvas-object.tsx` — render reads.
- `src/components/editor/editor-context.tsx` — default object init.

**API / docs**
- `src/app/api/v1/templates/[id]/route.ts` — response payload.
- `src/lib/docs/api-reference.ts` — param rows + example JSON.
- `src/components/docs/param-table.tsx` — `GROUP_LABELS.image` → `"Visual objects"`.

**Tests**
- `src/lib/__tests__/cook-api.test.ts` — fixtures + error assertion.

**Project metadata**
- `CLAUDE.md` — remove `videoTemplates` from 11-tables list (now 10 tables).

---

## Task 1: Rename core types + migration

**Files:**
- Modify: `src/lib/templates/canvas-types.ts`

- [ ] **Step 1: Read current file**

Read `src/lib/templates/canvas-types.ts` to confirm exact line contents around the `ImageFrame` type export, `migrateConfig()` body, and `TemplateObject` field declarations (reported around lines 54–62 and 118–119 from the earlier grep).

- [ ] **Step 2: Rename the `ImageFrame` type to `VisualFrame`**

Find:
```ts
export type ImageFrame = ...
```
Replace `ImageFrame` → `VisualFrame` at the type declaration and every in-file reference. Keep the union unchanged (`"browser" | "mobile" | "none"`).

- [ ] **Step 3: Rename `TemplateObject` fields**

In the `TemplateObject` interface:
```ts
imageFrame?: ImageFrame;
imageFrameColor?: string;
```
Replace with:
```ts
visualFrame?: VisualFrame;
visualFrameColor?: string;
```

- [ ] **Step 4: Extend `migrateConfig()` to migrate stored `imageFrame*` keys**

Inside the `migrateConfig()` per-object loop, replace the existing `device` / `deviceColor` blocks so the chain lands on the new names, and add legacy `imageFrame` handling:

```ts
// Migrate device → visualFrame (legacy enum)
if ("device" in raw && !("visualFrame" in raw) && !("imageFrame" in raw)) {
  migrated.visualFrame = raw.device as VisualFrame;
}

// Migrate deviceColor → visualFrameColor (legacy enum → hex)
if ("deviceColor" in raw && !("visualFrameColor" in raw) && !("imageFrameColor" in raw)) {
  const dc = raw.deviceColor;
  migrated.visualFrameColor = dc === "dark" ? "#1A1A1A" : "#E8E8E8";
}

// Migrate imageFrame → visualFrame (previous rename)
if ("imageFrame" in raw && !("visualFrame" in raw)) {
  migrated.visualFrame = raw.imageFrame as VisualFrame;
}

// Migrate imageFrameColor → visualFrameColor (previous rename)
if ("imageFrameColor" in raw && !("visualFrameColor" in raw)) {
  migrated.visualFrameColor = raw.imageFrameColor as string;
}
```

Delete any leftover assignments of `migrated.imageFrame` / `migrated.imageFrameColor`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: errors in other files that still reference the old names — those are fixed in later tasks. File itself should compile cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/lib/templates/canvas-types.ts
git commit -m "refactor(types): rename ImageFrame → VisualFrame and migrate stored imageFrame keys"
```

---

## Task 2: Update validation + API input types

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/pipeline/shared.ts`

- [ ] **Step 1: Update `validation.ts`**

Replace the constant name and validator field:
```ts
const VALID_VISUAL_FRAMES = ["browser", "mobile", "none"] as const;
```

Replace the existing check block (previously at ~line 45):
```ts
if (mod.visual_frame && !VALID_VISUAL_FRAMES.includes(mod.visual_frame)) {
  return 'visual_frame must be "browser", "mobile", or "none"'
}
```

Also rename any other local references to `VALID_IMAGE_FRAMES` in this file.

- [ ] **Step 2: Update `src/lib/types.ts`**

Replace fields in `ObjectModification`:
```ts
image_frame?: 'browser' | 'mobile' | 'none'
image_frame_color?: string
```
with:
```ts
visual_frame?: 'browser' | 'mobile' | 'none'
visual_frame_color?: string
```

- [ ] **Step 3: Update `src/lib/pipeline/shared.ts`**

Replace the two mapping lines (previously ~lines 79–80):
```ts
if (mod.visual_frame) entry.visualFrame = mod.visual_frame;
if (mod.visual_frame_color) entry.visualFrameColor = mod.visual_frame_color;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors introduced by these three files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/types.ts src/lib/pipeline/shared.ts
git commit -m "refactor(api): rename image_frame(_color) → visual_frame(_color)"
```

---

## Task 3: Update canvas renderer

**Files:**
- Modify: `src/lib/templates/canvas-renderer.tsx`

- [ ] **Step 1: Rename `ObjectDataMap` fields**

Near the top of the file, replace:
```ts
imageFrame?: string;
imageFrameColor?: string;
```
with:
```ts
visualFrame?: string;
visualFrameColor?: string;
```

- [ ] **Step 2: Rename read paths**

Find the two lines (previously ~230–231):
```ts
const frame = data?.visualFrame || obj.visualFrame || "none";
const frameColor = data?.visualFrameColor || obj.visualFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
```

Verify no other `imageFrame` / `imageFrameColor` references remain (`grep imageFrame src/lib/templates/canvas-renderer.tsx` — expect no matches).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors introduced by this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/templates/canvas-renderer.tsx
git commit -m "refactor(renderer): use visualFrame fields"
```

---

## Task 4: Update built-in template defaults

**Files:**
- Modify: `src/lib/templates/canvas-defaults.ts`

- [ ] **Step 1: Replace every object literal key**

In all 5 built-in templates (standard-browser, standard-mobile, split-browser, split-mobile, hero), replace within every object literal:
- `imageFrame:` → `visualFrame:`
- `imageFrameColor:` → `visualFrameColor:`

Values unchanged (`"browser"` / `"mobile"` / `"none"` / hex strings).

- [ ] **Step 2: Verify zero leftover**

Run: `grep -n "imageFrame" src/lib/templates/canvas-defaults.ts`
Expected: no matches.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/templates/canvas-defaults.ts
git commit -m "refactor(defaults): rename imageFrame keys to visualFrame in built-in templates"
```

---

## Task 5: Update editor UI

**Files:**
- Modify: `src/components/editor/visual-properties.tsx`
- Modify: `src/components/editor/canvas-object.tsx`
- Modify: `src/components/editor/editor-context.tsx`

- [ ] **Step 1: `visual-properties.tsx` — local vars**

Replace (previously ~lines 95–97):
```ts
const visualFrame = selectedObject.visualFrame || "none";
const hasDeviceFrame = visualFrame !== "none";
const visualFrameColor = selectedObject.visualFrameColor || (visualFrame === "mobile" ? "#1A1A1A" : "#E8E8E8");
```

- [ ] **Step 2: `visual-properties.tsx` — dispatches + JSX**

Replace every `update("imageFrame", ...)` with `update("visualFrame", ...)` and every `update("imageFrameColor", ...)` with `update("visualFrameColor", ...)`. Update Select `value={visualFrame}`, `value={visualFrameColor}` and input change handlers.

Run: `grep -n "imageFrame" src/components/editor/visual-properties.tsx`
Expected: no matches.

- [ ] **Step 3: `canvas-object.tsx`**

Replace (previously ~lines 351–415):
```ts
const visualFrame = obj.visualFrame || "none";
```
```ts
const frameColor = obj.visualFrameColor || (visualFrame === "mobile" ? "#1A1A1A" : "#E8E8E8");
```
And every conditional branch `if (imageFrame === ...)` → `if (visualFrame === ...)`. Update the trailing comment `// imageFrame === "none"` → `// visualFrame === "none"`.

Run: `grep -n "imageFrame" src/components/editor/canvas-object.tsx`
Expected: no matches.

- [ ] **Step 4: `editor-context.tsx`**

Replace (previously ~line 366):
```ts
return { ...base, x: 48, y: 96, width: canvasW - 96, height: canvasH * 0.5, visualFrame: "none" as const, objectFit: "cover" as const };
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors in these files.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/visual-properties.tsx src/components/editor/canvas-object.tsx src/components/editor/editor-context.tsx
git commit -m "refactor(editor): rename imageFrame UI fields to visualFrame"
```

---

## Task 6: Update Convex schema

**Files:**
- Modify: `convex/templates.ts`

- [ ] **Step 1: Rename validator fields**

Replace (previously ~lines 46–47):
```ts
visualFrame: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
visualFrameColor: v.optional(v.string()),
```

- [ ] **Step 2: Run Convex codegen**

Run: `npx convex codegen`
Expected: succeeds, `convex/_generated/` files updated.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/templates.ts convex/_generated
git commit -m "refactor(convex): rename imageFrame schema fields to visualFrame"
```

---

## Task 7: Update API route + docs + UI label

**Files:**
- Modify: `src/app/api/v1/templates/[id]/route.ts`
- Modify: `src/lib/docs/api-reference.ts`
- Modify: `src/components/docs/param-table.tsx`

- [ ] **Step 1: API route response payload**

Replace (previously ~lines 69–70):
```ts
visual_frame: (o.visualFrame as string) ?? "none",
visual_frame_color: (o.visualFrameColor as string) ?? null,
```

- [ ] **Step 2: API reference docs**

In `src/lib/docs/api-reference.ts`, replace the two param rows (previously ~lines 328 and 336):
```ts
name: "visual_frame",
```
```ts
name: "visual_frame_color",
```

In the example JSON (previously ~line 1147):
```ts
{ "id": "image", "type": "visual", "image_url": null, "video_url": null, "visual_frame": "browser", "visual_frame_color": "#E8E8E8", "anchor_x": "center", "anchor_y": "top" },
```

Descriptions for these params: if they reference "image frame" or similar, reword to "visual frame" (browser chrome / mobile bezel / none).

Run: `grep -n "image_frame" src/lib/docs/api-reference.ts`
Expected: no matches.

- [ ] **Step 3: Param-table group label**

In `src/components/docs/param-table.tsx`, replace (previously ~line 58):
```ts
const GROUP_LABELS: Record<string, string> = {
  text: "Text objects",
  image: "Visual objects",
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/templates/[id]/route.ts src/lib/docs/api-reference.ts src/components/docs/param-table.tsx
git commit -m "refactor(docs/api): rename image_frame(_color) → visual_frame(_color); UI label Visual objects"
```

---

## Task 8: Update cook-api tests

**Files:**
- Modify: `src/lib/__tests__/cook-api.test.ts`

- [ ] **Step 1: Update invalid-frame test**

Replace (previously ~lines 223–234):
```ts
test("invalid visual_frame → 400", async () => {
  ...
  slides: [slide([{ id: "img1", visual_frame: "tablet" }])],
  ...
  expect(data.error).toContain("visual_frame");
});
```

Keep the rest of the test structure identical; only the field name and the error-substring assertion change.

- [ ] **Step 2: Update fixture around line 387**

Replace:
```ts
visual_frame: "browser",
```

- [ ] **Step 3: Run test file**

Run: `npx vitest run src/lib/__tests__/cook-api.test.ts`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/cook-api.test.ts
git commit -m "test(cook-api): use visual_frame field names"
```

---

## Task 9: Fix stale CLAUDE.md reference

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove `videoTemplates` from schema line**

Find the line (previously line 57):
```
| `convex/schema.ts` | 11 tables: userProfiles, brands, templates, videoTemplates, apiKeys, releases, rateLimits, githubInstallations, githubRepoConfigs, githubSkippedReleases |
```

Replace with:
```
| `convex/schema.ts` | 10 tables: userProfiles, brands, templates, apiKeys, releases, rateLimits, githubInstallations, githubRepoConfigs, githubSkippedReleases |
```

(That is 9 names listed — verify count against actual `convex/schema.ts`; adjust the number in the description to match the real table count if different.)

- [ ] **Step 2: Verify count**

Run: `grep -c "^  [a-zA-Z].*defineTable" convex/schema.ts` (or scan the file) and ensure the "N tables" number in CLAUDE.md matches.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct stale videoTemplates reference in CLAUDE.md"
```

---

## Task 10: Full verification

- [ ] **Step 1: No stragglers**

Run: `grep -rn "image_frame\|imageFrame" src convex --include="*.ts" --include="*.tsx"`
Expected: no matches (docs/ historical files excluded).

If any appear, fix them and amend them into the nearest prior commit's logical group (or a new small commit).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: pass.

- [ ] **Step 3: Tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: Convex codegen + Next.js build both succeed.

- [ ] **Step 5: Manual editor smoke test**

Run: `npm run dev`
1. Open editor, load a template with a visual object.
2. Confirm "Visual frame" control reads current value, change to `mobile`, confirm canvas updates.
3. Change frame color (preset + custom hex).
4. Save template, reload page — values persist.
5. Open `/docs` API reference, confirm param group heading reads "Visual objects" and fields are `visual_frame` / `visual_frame_color`.

- [ ] **Step 6: Final commit (only if any fixes made in Step 1)**

```bash
git commit -m "refactor: final cleanup of imageFrame stragglers"
```
