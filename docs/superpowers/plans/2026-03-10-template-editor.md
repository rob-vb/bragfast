# Template Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create custom social image templates via a block-stacking editor and use them with the /release API.

**Architecture:** Template-as-Config — templates are JSON configs stored in Convex. A universal ConfigRenderer reads configs and produces Satori JSX. The editor manipulates configs with a CSS-approximated live preview. Default templates (classic/split/hero) are migrated to configs so all templates share one render path.

**Tech Stack:** Convex (DB/functions), Next.js 16 App Router (API + UI), Satori (JSX→SVG rendering), Tailwind CSS 4, existing pixel-arcade component system.

**Spec:** `docs/superpowers/specs/2026-03-10-template-editor-design.md`

---

## File Structure

### New files

```
convex/templates.ts                                    — Convex mutations/queries for templates
src/lib/templates/config-renderer.tsx                  — Universal config-based Satori renderer
src/lib/templates/default-configs.ts                   — Classic/split/hero as JSON configs
src/lib/templates/config-types.ts                      — TemplateConfig, Block type definitions
src/app/api/v1/templates/route.ts                      — GET (list) + POST (create)
src/app/api/v1/templates/[id]/route.ts                 — GET + PATCH + DELETE
src/app/api/v1/templates/[id]/clone/route.ts           — POST clone
src/app/api/v1/templates/[id]/preview/route.ts         — POST preview render
src/app/(dashboard)/dashboard/templates/page.tsx       — Template list page
src/app/(dashboard)/dashboard/templates/[id]/edit/page.tsx — Template editor page
src/components/dashboard/template-editor.tsx            — Editor client component (sidebar + canvas)
src/components/dashboard/template-preview.tsx           — CSS-approximated preview component
src/components/dashboard/template-card.tsx              — Template grid card
src/components/dashboard/block-properties.tsx           — Block property editor panel
```

### Modified files

```
convex/schema.ts                        — Add templates table
src/lib/types.ts                        — Add config types, update TemplateName
src/lib/pipeline/render.ts              — Resolve template configs from Convex
src/app/api/v1/release/route.ts         — Accept tmpl_ IDs in validation
src/lib/templates/registry.ts           — Remove after migration verified
src/components/dashboard/nav.tsx        — Add Templates tab
```

---

## Chunk 1: Data Layer

### Task 1: Add templates table to Convex schema

**Files:**
- Modify: `convex/schema.ts:4-70`

- [ ] **Step 1: Add templates table to schema**

In `convex/schema.ts`, add the templates table after the brands table (after line 33):

```typescript
templates: defineTable({
  userId: v.string(),
  externalId: v.string(),
  name: v.string(),
  isDefault: v.boolean(),
  config: v.object({
    background: v.string(),
    spacing: v.union(v.literal("compact"), v.literal("normal"), v.literal("spacious")),
    blocks: v.array(v.object({
      type: v.union(
        v.literal("title"),
        v.literal("description"),
        v.literal("image"),
        v.literal("logo"),
        v.literal("productName")
      ),
      alignment: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
      fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
      device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
      display: v.optional(v.union(v.literal("inline"), v.literal("fullBleed"))),
      split: v.optional(v.union(v.literal("left"), v.literal("right"))),
    })),
  }),
  previewUrl: v.optional(v.string()),
  created_at: v.string(),
  updated_at: v.string(),
}).index("by_userId", ["userId"])
  .index("by_externalId", ["externalId"]),
```

- [ ] **Step 2: Run Convex dev to verify schema compiles**

Run: `npx convex dev --once`
Expected: Schema synced successfully.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add templates table to Convex schema"
```

### Task 2: Create template config types

**Files:**
- Create: `src/lib/templates/config-types.ts`

- [ ] **Step 1: Create config type definitions**

```typescript
export type BlockType = "title" | "description" | "image" | "logo" | "productName";
export type Alignment = "left" | "center" | "right";
export type FontSize = "small" | "medium" | "large";
export type DeviceOption = "browser" | "mobile" | "none";
export type DisplayMode = "inline" | "fullBleed";
export type SplitSide = "left" | "right";
export type Spacing = "compact" | "normal" | "spacious";

export interface Block {
  type: BlockType;
  alignment: Alignment;
  fontSize?: FontSize;
  device?: DeviceOption;
  display?: DisplayMode;
  split?: SplitSide;
}

export interface TemplateConfig {
  background: string; // "brand" | hex color
  spacing: Spacing;
  blocks: Block[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/config-types.ts
git commit -m "feat: add template config type definitions"
```

### Task 3: Create default template configs

**Files:**
- Create: `src/lib/templates/default-configs.ts`

- [ ] **Step 1: Define the 3 default configs**

```typescript
import type { TemplateConfig } from "./config-types";

export const DEFAULT_TEMPLATES: Record<string, { name: string; config: TemplateConfig }> = {
  classic: {
    name: "Classic",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "logo", alignment: "left" },
        { type: "image", alignment: "center", device: "browser", display: "inline" },
        { type: "title", alignment: "left", fontSize: "large" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
  split: {
    name: "Split",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "logo", alignment: "left" },
        { type: "title", alignment: "left", fontSize: "large", split: "left" },
        { type: "image", alignment: "center", device: "browser", display: "inline", split: "right" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
  hero: {
    name: "Hero",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "image", alignment: "center", device: "none", display: "fullBleed" },
        { type: "title", alignment: "left", fontSize: "large" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
};

/** Resolve a legacy template name to its config */
export function getDefaultConfig(name: string): TemplateConfig | null {
  return DEFAULT_TEMPLATES[name]?.config ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/default-configs.ts
git commit -m "feat: define default template configs (classic, split, hero)"
```

### Task 4: Create Convex template functions

**Files:**
- Create: `convex/templates.ts`

Follow the exact pattern from `convex/brands.ts` for mutation/query structure.

- [ ] **Step 1: Write all Convex functions**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    name: v.string(),
    config: v.object({
      background: v.string(),
      spacing: v.union(v.literal("compact"), v.literal("normal"), v.literal("spacious")),
      blocks: v.array(v.object({
        type: v.union(
          v.literal("title"),
          v.literal("description"),
          v.literal("image"),
          v.literal("logo"),
          v.literal("productName")
        ),
        alignment: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
        fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
        device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
        display: v.optional(v.union(v.literal("inline"), v.literal("fullBleed"))),
        split: v.optional(v.union(v.literal("left"), v.literal("right"))),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("templates", {
      userId: args.userId,
      externalId: args.externalId,
      name: args.name,
      isDefault: false,
      config: args.config,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    config: v.optional(v.object({
      background: v.string(),
      spacing: v.union(v.literal("compact"), v.literal("normal"), v.literal("spacious")),
      blocks: v.array(v.object({
        type: v.union(
          v.literal("title"),
          v.literal("description"),
          v.literal("image"),
          v.literal("logo"),
          v.literal("productName")
        ),
        alignment: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
        fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
        device: v.optional(v.union(v.literal("browser"), v.literal("mobile"), v.literal("none"))),
        display: v.optional(v.union(v.literal("inline"), v.literal("fullBleed"))),
        split: v.optional(v.union(v.literal("left"), v.literal("right"))),
      })),
    })),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (template.userId !== args.userId) throw new Error("Not authorized");
    if (template.isDefault) throw new Error("Cannot modify default templates");

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.config !== undefined) updates.config = args.config;
    if (args.previewUrl !== undefined) updates.previewUrl = args.previewUrl;

    await ctx.db.patch(template._id, updates);
  },
});

export const remove = mutation({
  args: {
    externalId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    if (!template) throw new Error("Template not found");
    if (template.userId !== args.userId) throw new Error("Not authorized");
    if (template.isDefault) throw new Error("Cannot delete default templates");
    await ctx.db.delete(template._id);
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("templates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("templates")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listDefaults = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();
  },
});
```

- [ ] **Step 2: Run Convex dev to verify functions compile**

Run: `npx convex dev --once`
Expected: Functions synced successfully.

- [ ] **Step 3: Commit**

```bash
git add convex/templates.ts
git commit -m "feat: add Convex template mutations and queries"
```

### Task 5: Seed default templates

We need a way to seed the 3 default templates into Convex on first deploy. Add a seed mutation.

**Files:**
- Modify: `convex/templates.ts`

- [ ] **Step 1: Add seed mutation to convex/templates.ts**

Append to the file:

```typescript
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if defaults already exist
    const existing = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();
    if (existing.length > 0) return { seeded: false, message: "Defaults already exist" };

    const now = new Date().toISOString();
    const defaults = [
      {
        name: "Classic",
        externalId: "tmpl_classic",
        config: {
          background: "brand" as const,
          spacing: "normal" as const,
          blocks: [
            { type: "logo" as const, alignment: "left" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
          ],
        },
      },
      {
        name: "Split",
        externalId: "tmpl_split",
        config: {
          background: "brand" as const,
          spacing: "normal" as const,
          blocks: [
            { type: "logo" as const, alignment: "left" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const, split: "left" as const },
            { type: "image" as const, alignment: "center" as const, device: "browser" as const, display: "inline" as const, split: "right" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
          ],
        },
      },
      {
        name: "Hero",
        externalId: "tmpl_hero",
        config: {
          background: "brand" as const,
          spacing: "normal" as const,
          blocks: [
            { type: "image" as const, alignment: "center" as const, device: "none" as const, display: "fullBleed" as const },
            { type: "title" as const, alignment: "left" as const, fontSize: "large" as const },
            { type: "description" as const, alignment: "left" as const, fontSize: "medium" as const },
          ],
        },
      },
    ];

    for (const tmpl of defaults) {
      await ctx.db.insert("templates", {
        userId: "system",
        externalId: tmpl.externalId,
        name: tmpl.name,
        isDefault: true,
        config: tmpl.config,
        created_at: now,
        updated_at: now,
      });
    }

    return { seeded: true, message: `Seeded ${defaults.length} default templates` };
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once`

- [ ] **Step 3: Commit**

```bash
git add convex/templates.ts
git commit -m "feat: add seed mutation for default templates"
```

---

## Chunk 2: Universal Config Renderer

### Task 6: Build the ConfigRenderer component

This is the core rendering component that replaces the 3 separate template files. It reads a TemplateConfig and produces Satori-compatible JSX using existing shared components (TextBlock, LogoBar, DeviceFrame).

**Files:**
- Create: `src/lib/templates/config-renderer.tsx`

**Reference files to understand before implementing:**
- `src/lib/templates/classic.tsx` — rendering patterns, TemplateProps usage
- `src/lib/templates/split.tsx` — split layout pattern
- `src/lib/templates/hero.tsx` — fullBleed pattern
- `src/lib/templates/components/TextBlock.tsx` — text rendering
- `src/lib/templates/components/LogoBar.tsx` — logo rendering
- `src/lib/templates/components/DeviceFrame.tsx` — device frame rendering
- `src/lib/types.ts:76-82` — TemplateProps interface

- [ ] **Step 1: Create the ConfigRenderer**

The renderer must:
1. Accept `TemplateProps` + `TemplateConfig`
2. Iterate blocks top-to-bottom
3. Handle split pairs (consecutive left+right → horizontal flex)
4. Handle fullBleed image (absolute positioned background + overlay)
5. Scale font sizes by aspect ratio (match existing template behavior)
6. Use existing TextBlock, LogoBar, DeviceFrame, BrowserFrame, MobileFrame components

Study the 3 existing templates to match their exact rendering behavior. The ConfigRenderer must produce pixel-identical output for the default configs.

Key patterns from existing templates:
- `classic.tsx`: Uses `LogoBar` at top, then image in `DeviceFrame`, then `TextBlock` below
- `split.tsx`: In landscape, uses flexDirection row for side-by-side. In portrait/square, stacks vertically
- `hero.tsx`: Image is `position: absolute`, fills canvas. Primary color overlay at 75% opacity. Text at bottom with `position: absolute`
- All templates use `width` and `height` to determine aspect-dependent sizing
- Font size scaling: landscape uses smaller text, portrait uses larger

```typescript
import type { TemplateConfig, Block } from "./config-types";
import type { TemplateProps } from "../types";
import { TextBlock } from "./components/TextBlock";
import { LogoBar } from "./components/LogoBar";
import { DeviceFrame } from "./components/DeviceFrame";

interface ConfigRendererProps extends TemplateProps {
  config: TemplateConfig;
}

export function ConfigRenderer({ config, slide, brand, width, height, transparent }: ConfigRendererProps) {
  const isLandscape = width > height;
  const isPortrait = height > width * 1.1;
  const bgColor = config.background === "brand" ? brand.colors.background : config.background;

  const spacingMap = { compact: 12, normal: 20, spacious: 32 };
  const gap = spacingMap[config.spacing];

  // Find fullBleed image block (renders as background)
  const fullBleedBlock = config.blocks.find(
    (b) => b.type === "image" && b.display === "fullBleed"
  );
  const foregroundBlocks = config.blocks.filter((b) => b !== fullBleedBlock);

  // Group blocks into rows, pairing consecutive split-left + split-right
  const rows: (Block | [Block, Block])[] = [];
  let i = 0;
  while (i < foregroundBlocks.length) {
    const block = foregroundBlocks[i];
    const next = foregroundBlocks[i + 1];
    if (block.split === "left" && next?.split === "right" && !isPortrait) {
      rows.push([block, next]);
      i += 2;
    } else {
      rows.push({ ...block, split: undefined }); // orphaned split renders full-width
      i++;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: transparent ? "transparent" : bgColor,
        padding: gap,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* FullBleed background image */}
      {fullBleedBlock && slide.imageBase64 && (
        <div style={{ position: "absolute", top: 0, left: 0, width, height, display: "flex" }}>
          <img
            src={slide.imageBase64}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: brand.colors.primary,
              opacity: 0.75,
            }}
          />
        </div>
      )}

      {/* Foreground content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap,
          position: "relative",
          zIndex: 1,
          justifyContent: fullBleedBlock ? "flex-end" : "flex-start",
        }}
      >
        {rows.map((row, idx) => {
          if (Array.isArray(row)) {
            // Split pair — side by side
            return (
              <div key={idx} style={{ display: "flex", flex: 1, gap }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
                  {renderBlock(row[0], { slide, brand, width: width / 2, height, isLandscape, isPortrait, fullBleedBlock: !!fullBleedBlock })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
                  {renderBlock(row[1], { slide, brand, width: width / 2, height, isLandscape, isPortrait, fullBleedBlock: !!fullBleedBlock })}
                </div>
              </div>
            );
          }
          return (
            <div key={idx} style={{ display: "flex" }}>
              {renderBlock(row, { slide, brand, width, height, isLandscape, isPortrait, fullBleedBlock: !!fullBleedBlock })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RenderContext {
  slide: TemplateProps["slide"];
  brand: TemplateProps["brand"];
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  fullBleedBlock: boolean;
}

function renderBlock(block: Block, ctx: RenderContext) {
  const textColor = ctx.fullBleedBlock ? ctx.brand.colors.background : ctx.brand.colors.text;

  // Font size scaling by aspect ratio (matches existing template behavior)
  const sizeForRatio = (size?: string) => {
    if (!size) return "medium";
    if (ctx.isLandscape) {
      return size === "large" ? "medium" : "small";
    }
    return size;
  };

  switch (block.type) {
    case "title":
      return (
        <TextBlock
          title={ctx.slide.title}
          textColor={textColor}
          size={sizeForRatio(block.fontSize) as "small" | "medium" | "large"}
          align={block.alignment}
        />
      );
    case "description":
      return (
        <TextBlock
          description={ctx.slide.description}
          textColor={textColor}
          size={sizeForRatio(block.fontSize) as "small" | "medium" | "large"}
          align={block.alignment}
        />
      );
    case "image":
      if (!ctx.slide.imageBase64) return null;
      if (block.device === "none") {
        return (
          <img
            src={ctx.slide.imageBase64}
            style={{
              width: "100%",
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
        );
      }
      return (
        <DeviceFrame
          imageBase64={ctx.slide.imageBase64}
          device={block.device === "mobile" ? "mobile" : "browser"}
          width={ctx.width}
          height={ctx.height}
        />
      );
    case "logo":
      return <LogoBar brand={ctx.brand} align={block.alignment} />;
    case "productName":
      return (
        <div
          style={{
            display: "flex",
            fontSize: ctx.isLandscape ? 18 : 24,
            fontWeight: 700,
            color: textColor,
            justifyContent: block.alignment === "center" ? "center" : block.alignment === "right" ? "flex-end" : "flex-start",
          }}
        >
          {ctx.brand.name}
        </div>
      );
    default:
      return null;
  }
}
```

**Important:** This is a starting point. The implementer MUST visually compare output against the existing templates for all 3 formats and adjust sizing, spacing, and positioning until pixel-identical.

- [ ] **Step 2: Commit**

```bash
git add src/lib/templates/config-renderer.tsx
git commit -m "feat: add universal ConfigRenderer for template configs"
```

### Task 7: Wire ConfigRenderer into render pipeline

**Files:**
- Modify: `src/lib/pipeline/render.ts:1-10,103`
- Modify: `src/lib/types.ts:84`

- [ ] **Step 1: Update types to accept config-based templates**

In `src/lib/types.ts`, update the `TemplateName` type (line 84) to also allow string template IDs:

```typescript
// Before:
export type TemplateName = 'classic' | 'split' | 'hero';

// After:
export type TemplateName = 'classic' | 'split' | 'hero' | string;
```

- [ ] **Step 2: Update render pipeline to resolve template configs**

In `src/lib/pipeline/render.ts`:

Add imports at top:
```typescript
import { ConfigRenderer } from "../templates/config-renderer";
import { getDefaultConfig } from "../templates/default-configs";
import type { TemplateConfig } from "../templates/config-types";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
```

Replace the template resolution at line ~103 (`const template = templates[templateName]`) with:

```typescript
// Resolve template config
let templateConfig: TemplateConfig;
const defaultConfig = getDefaultConfig(templateName);
if (defaultConfig) {
  templateConfig = defaultConfig;
} else if (templateName.startsWith("tmpl_")) {
  const tmpl = await fetchQuery(api.templates.getByExternalId, { externalId: templateName });
  if (!tmpl) throw new Error(`Template not found: ${templateName}`);
  templateConfig = tmpl.config as TemplateConfig;
} else {
  throw new Error(`Invalid template: ${templateName}`);
}
```

Replace the template invocation (lines ~128-134) that calls `template({ slide, brand, width, height, transparent })` with:

```typescript
const jsx = ConfigRenderer({
  config: templateConfig,
  slide,
  brand,
  width,
  height,
  transparent,
});
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/pipeline/render.ts
git commit -m "feat: wire ConfigRenderer into render pipeline"
```

### Task 8: Visual parity verification

**Files:** None (testing only)

- [ ] **Step 1: Test each default template renders correctly**

Use the existing API to generate images with each template and compare against previous output. Make a test release for each:

```bash
# Test classic
curl -X POST http://localhost:3000/api/v1/release \
  -H "Authorization: Bearer <test_key>" \
  -H "Content-Type: application/json" \
  -d '{"template":"classic","brand_id":"<test_brand>","slides":[{"title":"Test Title","description":"Test description","image_url":"https://placehold.co/800x600"}],"formats":["landscape"]}'

# Repeat for split and hero
```

Compare output images against images generated before the ConfigRenderer change. Fix any visual discrepancies in `config-renderer.tsx`.

- [ ] **Step 2: Once parity confirmed, remove old template files**

Delete:
- `src/lib/templates/classic.tsx`
- `src/lib/templates/split.tsx`
- `src/lib/templates/hero.tsx`
- `src/lib/templates/registry.ts`

Remove the old registry import from `src/lib/pipeline/render.ts`.

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy template components, ConfigRenderer is sole renderer"
```

---

## Chunk 3: Template API Endpoints

### Task 9: Template list and create endpoints

**Files:**
- Create: `src/app/api/v1/templates/route.ts`

Follow the exact pattern from `src/app/api/v1/brands/route.ts` for auth, rate limiting, and response format.

- [ ] **Step 1: Create the route file**

**Auth pattern:** Use `authenticate` (not `validateApiKey`) — supports both session cookies (dashboard) and Bearer tokens (API). Return variable is `auth` with property `auth.userId`. Rate limit pattern: `const rateLimitResponse = await checkRateLimit(auth.userId); if (rateLimitResponse) return rateLimitResponse;`. Convex import: use `@convex/_generated/api` alias (not relative paths).

```typescript
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import crypto from "crypto";

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  const [userTemplates, defaults] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: auth.userId }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

  const templates = [...defaults, ...userTemplates].map((t) => ({
    id: t.externalId,
    name: t.name,
    is_default: t.isDefault,
    config: t.config,
    preview_url: t.previewUrl ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  return Response.json({ templates });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.name || typeof body.name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.config || !body.config.blocks || !Array.isArray(body.config.blocks)) {
    return Response.json({ error: "config with blocks array is required" }, { status: 400 });
  }
  if (body.config.blocks.length < 1 || body.config.blocks.length > 8) {
    return Response.json({ error: "Template must have 1-8 blocks" }, { status: 400 });
  }

  // Validate no duplicate block types
  const types = body.config.blocks.map((b: { type: string }) => b.type);
  if (new Set(types).size !== types.length) {
    return Response.json({ error: "Duplicate block types not allowed" }, { status: 400 });
  }

  const externalId = `tmpl_${crypto.randomBytes(12).toString("hex")}`;

  await fetchMutation(api.templates.create, {
    userId: auth.userId,
    externalId,
    name: body.name,
    config: {
      background: body.config.background ?? "brand",
      spacing: body.config.spacing ?? "normal",
      blocks: body.config.blocks,
    },
  });

  return Response.json({
    id: externalId,
    name: body.name,
    is_default: false,
    config: body.config,
    created_at: new Date().toISOString(),
  }, { status: 201 });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/templates/route.ts
git commit -m "feat: add GET/POST /v1/templates endpoints"
```

### Task 10: Template CRUD by ID

**Files:**
- Create: `src/app/api/v1/templates/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Same auth/rate-limit pattern as Task 9: `authenticate` + `auth.userId` + `@convex/_generated/api` alias.

```typescript
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await fetchQuery(api.templates.getByExternalId, { externalId: id });
  if (!template) return Response.json({ error: "Template not found" }, { status: 404 });

  // Users can view defaults and their own templates
  if (!template.isDefault && template.userId !== auth.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    id: template.externalId,
    name: template.name,
    is_default: template.isDefault,
    config: template.config,
    preview_url: template.previewUrl ?? null,
    created_at: template.created_at,
    updated_at: template.updated_at,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  const body = await request.json();

  // Validate block constraints if config provided
  if (body.config?.blocks) {
    if (body.config.blocks.length < 1 || body.config.blocks.length > 8) {
      return Response.json({ error: "Template must have 1-8 blocks" }, { status: 400 });
    }
    const types = body.config.blocks.map((b: { type: string }) => b.type);
    if (new Set(types).size !== types.length) {
      return Response.json({ error: "Duplicate block types not allowed" }, { status: 400 });
    }
  }

  try {
    await fetchMutation(api.templates.update, {
      externalId: id,
      userId: auth.userId,
      name: body.name,
      config: body.config,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return Response.json({ error: "Template not found" }, { status: 404 });
    if (msg.includes("Not authorized")) return Response.json({ error: "Not authorized" }, { status: 403 });
    if (msg.includes("default")) return Response.json({ error: "Cannot modify default templates" }, { status: 403 });
    throw e;
  }

  const updated = await fetchQuery(api.templates.getByExternalId, { externalId: id });
  return Response.json({
    id: updated!.externalId,
    name: updated!.name,
    config: updated!.config,
    updated_at: updated!.updated_at,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await fetchMutation(api.templates.remove, {
      externalId: id,
      userId: auth.userId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return Response.json({ error: "Template not found" }, { status: 404 });
    if (msg.includes("Not authorized")) return Response.json({ error: "Not authorized" }, { status: 403 });
    if (msg.includes("default")) return Response.json({ error: "Cannot delete default templates" }, { status: 403 });
    throw e;
  }

  return new Response(null, { status: 204 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/templates/[id]/route.ts
git commit -m "feat: add GET/PATCH/DELETE /v1/templates/:id endpoints"
```

### Task 11: Clone and preview endpoints

**Files:**
- Create: `src/app/api/v1/templates/[id]/clone/route.ts`
- Create: `src/app/api/v1/templates/[id]/preview/route.ts`

- [ ] **Step 1: Create clone endpoint**

Same auth pattern as Tasks 9-10.

```typescript
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  const source = await fetchQuery(api.templates.getByExternalId, { externalId: id });
  if (!source) return Response.json({ error: "Template not found" }, { status: 404 });

  // Can clone defaults or own templates
  if (!source.isDefault && source.userId !== auth.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const newId = `tmpl_${crypto.randomBytes(12).toString("hex")}`;

  // Destructure config to ensure clean shape for mutation
  const { background, spacing, blocks } = source.config;
  await fetchMutation(api.templates.create, {
    userId: auth.userId,
    externalId: newId,
    name: body.name ?? `${source.name} (Copy)`,
    config: { background, spacing, blocks },
  });

  return Response.json({
    id: newId,
    name: body.name ?? `${source.name} (Copy)`,
    is_default: false,
    config: source.config,
    created_at: new Date().toISOString(),
  }, { status: 201 });
}
```

- [ ] **Step 2: Create preview endpoint**

This endpoint renders the template config with placeholder content using Satori and returns a PNG.

**Note:** Check `src/lib/fonts.ts` for the actual font loading export name and signature. The render pipeline (`src/lib/pipeline/render.ts`) shows the correct usage pattern. Adapt the import accordingly.

```typescript
import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConfigRenderer } from "@/lib/templates/config-renderer";
import { loadFonts } from "@/lib/fonts";
import satori from "satori";
import sharp from "sharp";
import type { TemplateConfig } from "@/lib/templates/config-types";
import type { Brand, Slide } from "@/lib/types";
import { FORMAT_DIMENSIONS } from "@/lib/types";

const PLACEHOLDER_BRAND: Brand = {
  name: "Product",
  logoBase64: "",
  website: "example.com",
  colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
};

const PLACEHOLDER_SLIDE: Slide = {
  title: "Title here",
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  device: "browser",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await fetchQuery(api.templates.getByExternalId, { externalId: id });
  if (!template) return Response.json({ error: "Template not found" }, { status: 404 });
  if (!template.isDefault && template.userId !== auth.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const format = body.format ?? "landscape";
  const dims = FORMAT_DIMENSIONS[format as keyof typeof FORMAT_DIMENSIONS] ?? FORMAT_DIMENSIONS.landscape;

  const config = template.config as TemplateConfig;
  const fonts = await loadFonts();

  const jsx = ConfigRenderer({
    config,
    slide: PLACEHOLDER_SLIDE,
    brand: PLACEHOLDER_BRAND,
    width: dims.width,
    height: dims.height,
  });

  const svg = await satori(jsx, {
    width: dims.width,
    height: dims.height,
    fonts,
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache",
    },
  });
}
```

**Note:** The `loadFonts` import and `satori`/`sharp` usage should match the existing pattern in `src/lib/pipeline/render.ts`. Adjust imports to match the actual function signatures in the codebase.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/templates/[id]/clone/route.ts src/app/api/v1/templates/[id]/preview/route.ts
git commit -m "feat: add clone and preview template endpoints"
```

### Task 12: Update release route to accept template IDs

**Files:**
- Modify: `src/app/api/v1/release/route.ts:42`

- [ ] **Step 1: Update template validation**

Replace the template validation at line ~42:

```typescript
// Before:
if (body.template && !["classic", "split", "hero"].includes(body.template)) {
  return Response.json(
    { error: "Invalid template. Must be one of: classic, split, hero" },
    { status: 400 }
  );
}

// After:
if (body.template) {
  const validDefaults = ["classic", "split", "hero"];
  const isDefault = validDefaults.includes(body.template);
  const isCustom = typeof body.template === "string" && body.template.startsWith("tmpl_");
  if (!isDefault && !isCustom) {
    return Response.json(
      { error: "Invalid template. Must be classic, split, hero, or a template ID (tmpl_...)" },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/release/route.ts
git commit -m "feat: accept custom template IDs in /v1/release"
```

---

## Chunk 4: Template Editor UI

### Task 13: Add Templates tab to dashboard nav

**Files:**
- Modify: `src/components/dashboard/nav.tsx:7-12`

- [ ] **Step 1: Add templates to the tabs array**

In `src/components/dashboard/nav.tsx`, add a Templates entry to the tabs array (around line 7-12). The existing tabs use plain labels with no icons:

```typescript
{ label: "Templates", href: "/dashboard/templates" },
```

Place it after the Brands entry in the tab order.

- [ ] **Step 2: Verify the nav renders**

Run: `npm run dev` and check the dashboard nav shows the Templates tab.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/nav.tsx
git commit -m "feat: add Templates tab to dashboard navigation"
```

### Task 14: Template list page

**Files:**
- Create: `src/app/(dashboard)/dashboard/templates/page.tsx`
- Create: `src/components/dashboard/template-card.tsx`

Follow the pattern from `src/app/(dashboard)/dashboard/brands/page.tsx` for server-side data fetching and layout.

- [ ] **Step 1: Create the template card component**

```typescript
"use client";

import { PixelCard } from "./pixel-card";
import { PixelButton } from "./pixel-button";
import { PixelBadge } from "./pixel-badge";
import { Pencil, Trash2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
  id: string;
  name: string;
  isDefault: boolean;
  previewUrl?: string | null;
  onClone: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateCard({ id, name, isDefault, previewUrl, onClone, onDelete }: TemplateCardProps) {
  const router = useRouter();

  return (
    <PixelCard className="flex flex-col gap-3">
      {/* Preview thumbnail */}
      <div className="aspect-video bg-gray-800 rounded overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-xs">No preview</span>
        )}
      </div>

      {/* Name + badge */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm truncate">{name}</span>
        {isDefault && <PixelBadge variant="info">Default</PixelBadge>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isDefault ? (
          <PixelButton size="sm" onClick={() => onClone(id)} className="flex-1">
            <Copy className="w-3 h-3 mr-1" /> Clone
          </PixelButton>
        ) : (
          <>
            <PixelButton size="sm" onClick={() => router.push(`/dashboard/templates/${id}/edit`)} className="flex-1">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </PixelButton>
            <PixelButton size="sm" variant="danger" onClick={() => onDelete?.(id)}>
              <Trash2 className="w-3 h-3" />
            </PixelButton>
          </>
        )}
      </div>
    </PixelCard>
  );
}
```

- [ ] **Step 2: Create the templates list page**

```typescript
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { TemplateListClient } from "./template-list-client";

export default async function TemplatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Note: getSessionUser() returns user._id (not user.id) — match the brands page pattern
  const [userTemplates, defaults] = await Promise.all([
    fetchQuery(api.templates.listByUser, { userId: user._id }),
    fetchQuery(api.templates.listDefaults, {}),
  ]);

  return (
    <TemplateListClient
      defaults={defaults.map((t) => ({
        id: t.externalId,
        name: t.name,
        isDefault: true,
        previewUrl: t.previewUrl ?? null,
      }))}
      userTemplates={userTemplates.map((t) => ({
        id: t.externalId,
        name: t.name,
        isDefault: false,
        previewUrl: t.previewUrl ?? null,
      }))}
    />
  );
}
```

Also create a client component wrapper at `src/app/(dashboard)/dashboard/templates/template-list-client.tsx` that handles clone/delete actions via fetch calls to the API, and renders the grid using `TemplateCard`. Follow the interactive patterns in the brands page.

- [ ] **Step 3: Verify the page renders**

Run: `npm run dev`, navigate to `/dashboard/templates`.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/templates/ src/components/dashboard/template-card.tsx
git commit -m "feat: add template list page with default and custom template grid"
```

### Task 15: Template editor — CSS preview component

**Files:**
- Create: `src/components/dashboard/template-preview.tsx`

This component renders a CSS-approximated preview of a template config. It does NOT use Satori — it's a pure React/CSS component that visually approximates the Satori output for instant feedback.

- [ ] **Step 1: Create the preview component**

The preview should:
- Accept a `TemplateConfig` and a `format` (landscape/square/portrait)
- Render blocks top-to-bottom matching ConfigRenderer layout logic
- Handle split pairs as flexbox side-by-side
- Handle fullBleed image as absolute-positioned background with overlay
- Show placeholder content: gray box for image, "Title here", lorem ipsum, logo icon
- Scale the entire preview to fit the editor canvas area while maintaining aspect ratio
- Use the FORMAT_DIMENSIONS to determine the aspect ratio

```typescript
"use client";

import type { TemplateConfig, Block } from "@/lib/templates/config-types";
import { FORMAT_DIMENSIONS } from "@/lib/types";

interface TemplatePreviewProps {
  config: TemplateConfig;
  format: "landscape" | "square" | "portrait";
  brandColors?: { background: string; text: string; primary: string };
}

const DEFAULT_COLORS = { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" };

export function TemplatePreview({ config, format, brandColors }: TemplatePreviewProps) {
  const colors = brandColors ?? DEFAULT_COLORS;
  const dims = FORMAT_DIMENSIONS[format];
  const bgColor = config.background === "brand" ? colors.background : config.background;
  const isPortrait = dims.height > dims.width * 1.1;

  const spacingMap = { compact: 12, normal: 20, spacious: 32 };
  const gap = spacingMap[config.spacing];

  const fullBleedBlock = config.blocks.find((b) => b.type === "image" && b.display === "fullBleed");
  const foregroundBlocks = config.blocks.filter((b) => b !== fullBleedBlock);

  // Group into rows (same logic as ConfigRenderer)
  const rows: (Block | [Block, Block])[] = [];
  let i = 0;
  while (i < foregroundBlocks.length) {
    const block = foregroundBlocks[i];
    const next = foregroundBlocks[i + 1];
    if (block.split === "left" && next?.split === "right" && !isPortrait) {
      rows.push([block, next]);
      i += 2;
    } else {
      rows.push({ ...block, split: undefined });
      i++;
    }
  }

  const textColor = fullBleedBlock ? colors.background : colors.text;

  return (
    <div
      className="relative overflow-hidden rounded shadow-lg"
      style={{
        aspectRatio: `${dims.width} / ${dims.height}`,
        backgroundColor: bgColor,
        maxWidth: "100%",
        width: "100%",
      }}
    >
      {/* FullBleed background */}
      {fullBleedBlock && (
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gray-600" />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: colors.primary, opacity: 0.75 }}
          />
        </div>
      )}

      {/* Foreground */}
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: `${gap * 0.02}em`,
          gap: `${gap * 0.02}em`,
          justifyContent: fullBleedBlock ? "flex-end" : "flex-start",
        }}
      >
        {rows.map((row, idx) => {
          if (Array.isArray(row)) {
            return (
              <div key={idx} className="flex flex-1" style={{ gap: `${gap * 0.02}em` }}>
                <div className="flex-1 flex flex-col justify-center">
                  <PreviewBlock block={row[0]} textColor={textColor} primaryColor={colors.primary} />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <PreviewBlock block={row[1]} textColor={textColor} primaryColor={colors.primary} />
                </div>
              </div>
            );
          }
          return (
            <div key={idx}>
              <PreviewBlock block={row} textColor={textColor} primaryColor={colors.primary} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewBlock({ block, textColor, primaryColor }: { block: Block; textColor: string; primaryColor: string }) {
  const alignClass = block.alignment === "center" ? "text-center" : block.alignment === "right" ? "text-right" : "text-left";
  const sizeMap = { small: "text-[0.5em]", medium: "text-[0.7em]", large: "text-[0.9em]" };
  const sizeClass = sizeMap[block.fontSize ?? "medium"];

  switch (block.type) {
    case "title":
      return (
        <p className={`font-bold ${sizeClass} ${alignClass}`} style={{ color: textColor }}>
          Title here
        </p>
      );
    case "description":
      return (
        <p className={`${sizeClass} ${alignClass} opacity-80`} style={{ color: textColor }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      );
    case "image":
      return (
        <div className="bg-gray-600 rounded aspect-video w-full flex items-center justify-center">
          <span className="text-gray-400 text-[0.4em]">Screenshot</span>
        </div>
      );
    case "logo":
      return (
        <div className="flex items-center gap-[0.3em]" style={{ justifyContent: block.alignment === "center" ? "center" : block.alignment === "right" ? "flex-end" : "flex-start" }}>
          <div className="w-[1.2em] h-[1.2em] rounded bg-gray-500" />
          <span className="text-[0.5em] font-bold" style={{ color: textColor }}>Product</span>
        </div>
      );
    case "productName":
      return (
        <p className={`font-bold ${sizeClass} ${alignClass}`} style={{ color: textColor }}>
          Product
        </p>
      );
    default:
      return null;
  }
}
```

**Note:** The `em`-based sizing ensures the preview scales correctly when the container is resized. The implementer should test this at different container sizes and adjust the scale factors.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/template-preview.tsx
git commit -m "feat: add CSS-approximated template preview component"
```

### Task 16: Block properties panel

**Files:**
- Create: `src/components/dashboard/block-properties.tsx`

- [ ] **Step 1: Create the properties panel**

Shows contextual properties for the selected block. Different fields shown per block type.

```typescript
"use client";

import type { Block, BlockType, Alignment, FontSize, DeviceOption, DisplayMode, SplitSide } from "@/lib/templates/config-types";

interface BlockPropertiesProps {
  block: Block;
  onChange: (updated: Block) => void;
}

export function BlockProperties({ block, onChange }: BlockPropertiesProps) {
  const isTextBlock = ["title", "description", "productName"].includes(block.type);
  const isImageBlock = block.type === "image";

  return (
    <div className="flex flex-col gap-3 text-sm">
      <h4 className="font-bold uppercase text-xs opacity-60">
        {block.type} properties
      </h4>

      {/* Alignment — all blocks */}
      <fieldset>
        <legend className="text-xs opacity-60 mb-1">Alignment</legend>
        <div className="flex gap-1">
          {(["left", "center", "right"] as Alignment[]).map((a) => (
            <button
              key={a}
              onClick={() => onChange({ ...block, alignment: a })}
              className={`px-2 py-1 rounded text-xs ${block.alignment === a ? "bg-white text-black" : "bg-gray-700"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Font size — text blocks only */}
      {isTextBlock && (
        <fieldset>
          <legend className="text-xs opacity-60 mb-1">Font Size</legend>
          <div className="flex gap-1">
            {(["small", "medium", "large"] as FontSize[]).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ ...block, fontSize: s })}
                className={`px-2 py-1 rounded text-xs ${block.fontSize === s ? "bg-white text-black" : "bg-gray-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Device — image blocks only */}
      {isImageBlock && (
        <>
          <fieldset>
            <legend className="text-xs opacity-60 mb-1">Device Frame</legend>
            <div className="flex gap-1">
              {(["browser", "mobile", "none"] as DeviceOption[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onChange({ ...block, device: d })}
                  className={`px-2 py-1 rounded text-xs ${block.device === d ? "bg-white text-black" : "bg-gray-700"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs opacity-60 mb-1">Display</legend>
            <div className="flex gap-1">
              {(["inline", "fullBleed"] as DisplayMode[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onChange({ ...block, display: d })}
                  className={`px-2 py-1 rounded text-xs ${block.display === d ? "bg-white text-black" : "bg-gray-700"}`}
                >
                  {d === "fullBleed" ? "Full Bleed" : "Inline"}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {/* Split — all blocks */}
      <fieldset>
        <legend className="text-xs opacity-60 mb-1">Split</legend>
        <div className="flex gap-1">
          {([undefined, "left", "right"] as (SplitSide | undefined)[]).map((s) => (
            <button
              key={s ?? "none"}
              onClick={() => onChange({ ...block, split: s })}
              className={`px-2 py-1 rounded text-xs ${block.split === s ? "bg-white text-black" : "bg-gray-700"}`}
            >
              {s ?? "none"}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/block-properties.tsx
git commit -m "feat: add block properties editor panel"
```

### Task 17: Template editor main component

**Files:**
- Create: `src/components/dashboard/template-editor.tsx`

This is the main editor component combining sidebar (block list, properties) and canvas (preview). It manages the template config state and handles save/preview actions.

- [ ] **Step 1: Create the editor component**

The editor must:
- Accept initial template data (id, name, config) as props
- Manage config state with useState
- Left sidebar: name input, background selector (brand/hex), spacing selector, draggable block list, block properties panel
- Center: TemplatePreview component with format switcher tabs
- Save button → PATCH /v1/templates/:id
- "Preview Real Output" button → POST /v1/templates/:id/preview (downloads PNG)
- Brand selector for preview (fetches user's brands)

For drag-and-drop reordering, use a simple move-up/move-down button approach initially (avoids needing a DnD library). Can upgrade to `@dnd-kit` later.

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TemplateConfig, Block, BlockType, Spacing } from "@/lib/templates/config-types";
import { TemplatePreview } from "./template-preview";
import { BlockProperties } from "./block-properties";
import { PixelButton } from "./pixel-button";
import { PixelCard } from "./pixel-card";
import { ArrowLeft, Plus, X, ChevronUp, ChevronDown, Save, Eye } from "lucide-react";

interface TemplateEditorProps {
  templateId: string;
  initialName: string;
  initialConfig: TemplateConfig;
  brands: Array<{ id: string; name: string; colors: { background: string; text: string; primary: string } }>;
}

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: "title", label: "Title" },
  { type: "description", label: "Description" },
  { type: "image", label: "Image" },
  { type: "logo", label: "Logo" },
  { type: "productName", label: "Product Name" },
];

const DEFAULT_BLOCK: Record<BlockType, Partial<Block>> = {
  title: { alignment: "left", fontSize: "large" },
  description: { alignment: "left", fontSize: "medium" },
  image: { alignment: "center", device: "browser", display: "inline" },
  logo: { alignment: "left" },
  productName: { alignment: "left", fontSize: "medium" },
};

export function TemplateEditor({ templateId, initialName, initialConfig, brands }: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<TemplateConfig>(initialConfig);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [format, setFormat] = useState<"landscape" | "square" | "portrait">("landscape");
  const [previewBrandIndex, setPreviewBrandIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const selectedBlock = selectedBlockIndex !== null ? config.blocks[selectedBlockIndex] : null;
  const usedTypes = new Set(config.blocks.map((b) => b.type));
  const availableTypes = BLOCK_TYPES.filter((bt) => !usedTypes.has(bt.type));
  const previewBrand = brands[previewBrandIndex]?.colors;

  function updateBlocks(blocks: Block[]) {
    setConfig((prev) => ({ ...prev, blocks }));
  }

  function addBlock(type: BlockType) {
    if (config.blocks.length >= 8) return;
    const newBlock: Block = { type, alignment: "left", ...DEFAULT_BLOCK[type] } as Block;
    updateBlocks([...config.blocks, newBlock]);
  }

  function removeBlock(index: number) {
    const blocks = config.blocks.filter((_, i) => i !== index);
    updateBlocks(blocks);
    if (selectedBlockIndex === index) setSelectedBlockIndex(null);
    else if (selectedBlockIndex !== null && selectedBlockIndex > index) {
      setSelectedBlockIndex(selectedBlockIndex - 1);
    }
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= config.blocks.length) return;
    const blocks = [...config.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updateBlocks(blocks);
    setSelectedBlockIndex(target);
  }

  function updateBlock(index: number, updated: Block) {
    const blocks = [...config.blocks];
    blocks[index] = updated;
    updateBlocks(blocks);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/v1/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button onClick={() => router.push("/dashboard/templates")} className="flex items-center gap-1 text-sm opacity-60 hover:opacity-100">
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </button>
        <PixelButton onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </PixelButton>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r border-gray-700 p-4 overflow-y-auto flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold uppercase opacity-60">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            />
          </div>

          {/* Background */}
          <div>
            <label className="text-xs font-bold uppercase opacity-60">Background</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setConfig((prev) => ({ ...prev, background: "brand" }))}
                className={`px-2 py-1 rounded text-xs ${config.background === "brand" ? "bg-white text-black" : "bg-gray-700"}`}
              >
                Brand
              </button>
              <input
                type="color"
                value={config.background === "brand" ? "#000000" : config.background}
                onChange={(e) => setConfig((prev) => ({ ...prev, background: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Spacing */}
          <div>
            <label className="text-xs font-bold uppercase opacity-60">Spacing</label>
            <div className="flex gap-1 mt-1">
              {(["compact", "normal", "spacious"] as Spacing[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setConfig((prev) => ({ ...prev, spacing: s }))}
                  className={`px-2 py-1 rounded text-xs ${config.spacing === s ? "bg-white text-black" : "bg-gray-700"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Blocks */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase opacity-60">Blocks</label>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              {config.blocks.map((block, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedBlockIndex(idx)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer ${
                    selectedBlockIndex === idx ? "bg-gray-600" : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, "up"); }} disabled={idx === 0}>
                      <ChevronUp className="w-3 h-3 opacity-40 hover:opacity-100" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, "down"); }} disabled={idx === config.blocks.length - 1}>
                      <ChevronDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                    </button>
                  </div>
                  <span className="flex-1">{block.type}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}>
                    <X className="w-3 h-3 opacity-40 hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
            {availableTypes.length > 0 && config.blocks.length < 8 && (
              <div className="mt-2">
                <select
                  onChange={(e) => { if (e.target.value) addBlock(e.target.value as BlockType); e.target.value = ""; }}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add Block</option>
                  {availableTypes.map((bt) => (
                    <option key={bt.type} value={bt.type}>{bt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selected block properties */}
          {selectedBlock && (
            <div className="border-t border-gray-700 pt-3">
              <BlockProperties
                block={selectedBlock}
                onChange={(updated) => updateBlock(selectedBlockIndex!, updated)}
              />
            </div>
          )}
        </div>

        {/* Center canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 overflow-auto">
          <div className="w-full max-w-lg">
            <TemplatePreview config={config} format={format} brandColors={previewBrand} />
          </div>

          {/* Format switcher */}
          <div className="flex gap-2">
            {(["landscape", "square", "portrait"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1 rounded text-xs ${format === f ? "bg-white text-black" : "bg-gray-700"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Preview brand selector */}
          {brands.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">Preview brand:</span>
              <select
                value={previewBrandIndex}
                onChange={(e) => setPreviewBrandIndex(Number(e.target.value))}
                className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs"
              >
                {brands.map((b, i) => (
                  <option key={b.id} value={i}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Preview real output */}
          <PixelButton onClick={handlePreview} disabled={previewing} variant="secondary">
            <Eye className="w-4 h-4 mr-1" /> {previewing ? "Rendering..." : "Preview Real Output"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
```

**Note:** The save handler uses fetch to the API. For dashboard routes, the implementer needs to verify whether these routes use session auth (cookies) or API key auth. If session auth, remove the Authorization header — cookies are sent automatically. Check the brands page pattern for reference.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/template-editor.tsx
git commit -m "feat: add main template editor component with sidebar and canvas"
```

### Task 18: Template editor page (route)

**Files:**
- Create: `src/app/(dashboard)/dashboard/templates/[id]/edit/page.tsx`

- [ ] **Step 1: Create the editor page**

```typescript
import { getSessionUser } from "@/lib/auth/get-session-user";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../../convex/_generated/api";
import { TemplateEditor } from "@/components/dashboard/template-editor";
import type { TemplateConfig } from "@/lib/templates/config-types";

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const template = await fetchQuery(api.templates.getByExternalId, { externalId: id });

  if (!template || (template.userId !== user._id && !template.isDefault)) {
    redirect("/dashboard/templates");
  }

  // Can't edit defaults directly — they should clone first
  if (template.isDefault) {
    redirect("/dashboard/templates");
  }

  // Fetch user's brands for preview selector
  const brands = await fetchQuery(api.brands.listByUser, { userId: user._id });

  return (
    <TemplateEditor
      templateId={template.externalId}
      initialName={template.name}
      initialConfig={template.config as TemplateConfig}
      brands={brands.map((b) => ({
        id: b.externalId,
        name: b.name,
        colors: b.colors,
      }))}
    />
  );
}
```

- [ ] **Step 2: Verify the editor page loads**

Run: `npm run dev`, create a template via clone, navigate to edit page.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/templates/[id]/edit/page.tsx
git commit -m "feat: add template editor page route"
```

### Task 19: End-to-end verification

- [ ] **Step 1: Seed default templates**

Run the seed mutation via Convex dashboard or a one-off script.

- [ ] **Step 2: Test full flow**

1. Navigate to `/dashboard/templates` — should see 3 default templates
2. Clone "Classic" — should create a copy under "My Templates"
3. Click "Edit" on the clone — should open editor
4. Change name, reorder blocks, change properties
5. Click "Save" — should persist changes
6. Switch format tabs — preview should update aspect ratio
7. Click "Preview Real Output" — should open rendered PNG in new tab
8. Navigate to `/dashboard/templates` — should see updated name
9. Delete the template — should remove it
10. Test via API: `POST /v1/release` with `template: "tmpl_..."` — should render with custom config

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end template editor fixes"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Data Layer | 1-5 | Convex schema, types, default configs, CRUD functions, seed |
| 2: Config Renderer | 6-8 | Universal renderer, pipeline integration, visual parity, legacy cleanup |
| 3: API Endpoints | 9-12 | Full CRUD REST API, clone, preview, release route update |
| 4: Editor UI | 13-19 | Nav link, list page, editor with preview, end-to-end verification |

## Deferred (Follow-up)

- **previewUrl R2 lifecycle**: Generate preview PNG on save, upload to R2, store URL in `previewUrl` field, delete old preview on regeneration. Currently the preview endpoint returns PNG directly but doesn't persist it. Template list cards will show "No preview" until this is implemented.
- **Upgrade block reordering to @dnd-kit**: Current plan uses move-up/move-down buttons. Can be upgraded to drag-and-drop later.
