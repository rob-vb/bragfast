# Remotion Video Generation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video generation to bragfast via Remotion Lambda, extending the `/cook` endpoint with `output: "video"`.

**Architecture:** Separate video template system (scene graph model) with 4 scene types (intro, feature, text, cta). Remotion compositions bundled and deployed to Lambda. Videos rendered async, stored in R2, same polling pattern as images.

**Tech Stack:** Remotion 4.x, @remotion/lambda, @remotion/transitions, @remotion/fonts, AWS Lambda, Convex, Cloudflare R2

**Spec:** `docs/superpowers/specs/2026-03-14-remotion-video-generation-design.md`

---

## Chunk 1: Types, Validation & Database

### Task 1: Video Types

**Files:**
- Create: `src/lib/video/types.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write tests for video types and credit calculation**

Create `src/lib/__tests__/video-types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateCredits } from "../types";
import type { VideoTemplateConfig, SceneContent, VideoFormatEntry } from "../video/types";

describe("VideoTemplateConfig", () => {
  it("should define a valid template config", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "feature", duration: 4, device: "browser" },
        { type: "cta", duration: 3 },
      ],
    };
    expect(config.scenes).toHaveLength(3);
    expect(config.fps).toBe(30);
  });
});

describe("SceneContent", () => {
  it("should accept valid intro scene content", () => {
    const scene: SceneContent = { title: "Hello World" };
    expect(scene.title).toBe("Hello World");
  });

  it("should accept valid feature scene content", () => {
    const scene: SceneContent = {
      title: "New Feature",
      description: "Check it out",
      image_url: "https://example.com/img.png",
      device: "browser",
    };
    expect(scene.image_url).toBeDefined();
  });
});

describe("calculateCredits", () => {
  it("should calculate image credits as sum of slides", () => {
    const credits = calculateCredits({
      output: "image",
      formats: [
        { name: "landscape", slides: [{ objects: [] }, { objects: [] }] },
        { name: "square", slides: [{ objects: [] }] },
      ],
    });
    expect(credits).toBe(3);
  });

  it("should calculate video credits as 5 per format", () => {
    const credits = calculateCredits({
      output: "video",
      formats: [
        { name: "landscape", scenes: [{ title: "A" }, { title: "B" }] },
        { name: "square", scenes: [{ title: "A" }] },
      ],
    });
    expect(credits).toBe(10);
  });

  it("should default to image credits when output is undefined", () => {
    const credits = calculateCredits({
      formats: [
        { name: "landscape", slides: [{ objects: [] }] },
      ],
    });
    expect(credits).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/video-types.test.ts`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Create video types**

Create `src/lib/video/types.ts`:

```typescript
export type TransitionType =
  | "fade"
  | "slide-from-left"
  | "slide-from-right"
  | "slide-from-top"
  | "slide-from-bottom"
  | "wipe"
  | "none";

export type SceneType = "intro" | "feature" | "text" | "cta";

export type SceneConfig = {
  type: SceneType;
  duration: number; // seconds (gross, before transition overlap)
  device?: "browser" | "mobile";
  transition?: TransitionType; // override transition INTO this scene
};

export type VideoTemplateConfig = {
  fps: number;
  transition: TransitionType;
  transition_duration: number; // seconds
  scenes: SceneConfig[];
};

export type SceneContent = {
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  device?: "browser" | "mobile";
  url?: string;
};

export type VideoFormatEntry = {
  name: "landscape" | "square" | "portrait";
  scenes: SceneContent[];
};

/** Calculate net video duration accounting for transition overlap */
export function calculateVideoDuration(config: VideoTemplateConfig): number {
  const grossDuration = config.scenes.reduce((sum, s) => sum + s.duration, 0);
  // Count transitions that actually overlap (skip "none" transitions)
  let overlapCount = 0;
  for (let i = 1; i < config.scenes.length; i++) {
    const transType = config.scenes[i].transition ?? config.transition;
    if (transType !== "none") overlapCount++;
  }
  return grossDuration - overlapCount * config.transition_duration;
}

export const VIDEO_DIMENSIONS = {
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
} as const;
```

- [ ] **Step 4: Update calculateCredits in types.ts to handle video**

In `src/lib/types.ts`, update `calculateCredits` to accept a discriminated union:

```typescript
// Add at bottom of types.ts, replacing existing calculateCredits

export type CookOutput = "image" | "video";

export type ImageFormatInput = FormatEntry; // existing type, alias for clarity

export type CookCreditsInput =
  | { output?: "image"; formats: FormatEntry[] }
  | { output: "video"; formats: { name: string; scenes: unknown[] }[] };

export function calculateCredits(input: CookCreditsInput): number {
  if (input.output === "video") {
    return input.formats.length * 5;
  }
  return (input as { formats: FormatEntry[] }).formats.reduce(
    (sum, f) => sum + f.slides.length,
    0
  );
}
```

Remove the old `calculateCredits` function that only accepts `FormatEntry[]`.

**Migration**: Update all existing callers to pass the object form:
- `src/app/api/v1/cook/route.ts:62`: `calculateCredits(body.formats)` → `calculateCredits({ output: "image", formats: body.formats })`
- `src/lib/pipeline/render.ts:27`: `calculateCredits(request.formats)` → `calculateCredits({ output: "image", formats: request.formats })`
- `src/lib/pipeline/render.ts:250` (refund): same pattern

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/video-types.test.ts`
Expected: PASS

- [ ] **Step 6: Run all existing tests to check for regressions**

Run: `npx vitest run`
Expected: All pass. If `calculateCredits` callers break, update them to pass `{ output: "image", formats }` instead of just `formats`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/video/types.ts src/lib/types.ts src/lib/__tests__/video-types.test.ts
git commit -m "feat: add video types and update calculateCredits for video support"
```

---

### Task 2: Video Duration Calculation Tests

**Files:**
- Test: `src/lib/__tests__/video-types.test.ts` (append)

- [ ] **Step 1: Add duration calculation tests**

Append to `src/lib/__tests__/video-types.test.ts`:

```typescript
import { calculateVideoDuration } from "../video/types";

describe("calculateVideoDuration", () => {
  it("should calculate net duration with transition overlap", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "feature", duration: 4 },
        { type: "feature", duration: 4 },
        { type: "cta", duration: 3 },
      ],
    };
    // 14s gross - (3 transitions * 0.5s) = 12.5s net
    expect(calculateVideoDuration(config)).toBe(12.5);
  });

  it("should handle single scene (no transitions)", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [{ type: "intro", duration: 5 }],
    };
    expect(calculateVideoDuration(config)).toBe(5);
  });

  it("should handle transition_duration of 0", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "none",
      transition_duration: 0,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "cta", duration: 3 },
      ],
    };
    expect(calculateVideoDuration(config)).toBe(6);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/__tests__/video-types.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/video-types.test.ts
git commit -m "test: add video duration calculation tests"
```

---

### Task 3: Video Scene Validation

**Files:**
- Create: `src/lib/video/validation.ts`
- Test: `src/lib/__tests__/video-validation.test.ts`

- [ ] **Step 1: Write validation tests**

Create `src/lib/__tests__/video-validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateVideoScenes } from "../video/validation";
import type { SceneConfig, SceneContent } from "../video/types";

const templateScenes: SceneConfig[] = [
  { type: "intro", duration: 3 },
  { type: "feature", duration: 4, device: "browser" },
  { type: "cta", duration: 3 },
];

describe("validateVideoScenes", () => {
  it("should accept valid scenes matching template", () => {
    const scenes: SceneContent[] = [
      { title: "Welcome" },
      { title: "New Feature", image_url: "https://example.com/img.png" },
      { title: "Try it now" },
    ];
    expect(validateVideoScenes(scenes, templateScenes)).toBeNull();
  });

  it("should reject scene count mismatch", () => {
    const scenes: SceneContent[] = [{ title: "Welcome" }];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("Expected 3 scenes, got 1");
  });

  it("should reject missing title", () => {
    const scenes = [
      { title: "" },
      { title: "Feature", image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ] as SceneContent[];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("title");
  });

  it("should reject title over 100 chars", () => {
    const scenes: SceneContent[] = [
      { title: "A".repeat(101) },
      { title: "Feature", image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("title");
    expect(error).toContain("100");
  });

  it("should reject description over 300 chars", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature", description: "D".repeat(301), image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("description");
    expect(error).toContain("300");
  });

  it("should reject feature scene without image_url", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature without image" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("image_url");
    expect(error).toContain("scene 2");
  });

  it("should accept feature scene with image_url", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature", image_url: "https://example.com/shot.png" },
      { title: "CTA" },
    ];
    expect(validateVideoScenes(scenes, templateScenes)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/video-validation.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement validation**

Create `src/lib/video/validation.ts`:

```typescript
import type { SceneConfig, SceneContent } from "./types";

export function validateVideoScenes(
  scenes: SceneContent[],
  templateScenes: SceneConfig[]
): string | null {
  if (scenes.length !== templateScenes.length) {
    return `Expected ${templateScenes.length} scenes, got ${scenes.length}`;
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const config = templateScenes[i];
    const label = `scene ${i + 1}`;

    if (!scene.title || scene.title.trim().length === 0) {
      return `${label}: title is required`;
    }
    if (scene.title.length > 100) {
      return `${label}: title must be 100 characters or fewer`;
    }
    if (scene.description && scene.description.length > 300) {
      return `${label}: description must be 300 characters or fewer`;
    }
    if (config.type === "feature" && !scene.image_url) {
      return `${label}: image_url is required for feature scenes`;
    }
  }

  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/video-validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/video/validation.ts src/lib/__tests__/video-validation.test.ts
git commit -m "feat: add video scene validation with per-scene error detail"
```

---

### Task 4: Default Video Template Config

**Files:**
- Create: `src/lib/video/defaults.ts`

- [ ] **Step 1: Write test for default template lookup**

Append to `src/lib/__tests__/video-types.test.ts` or create `src/lib/__tests__/video-defaults.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getDefaultVideoTemplate, DEFAULT_VIDEO_TEMPLATES } from "../video/defaults";

describe("getDefaultVideoTemplate", () => {
  it("should return product-update template", () => {
    const tmpl = getDefaultVideoTemplate("product-update");
    expect(tmpl).toBeDefined();
    expect(tmpl!.fps).toBe(30);
    expect(tmpl!.scenes).toHaveLength(4);
    expect(tmpl!.scenes[0].type).toBe("intro");
    expect(tmpl!.scenes[3].type).toBe("cta");
  });

  it("should return null for unknown template", () => {
    expect(getDefaultVideoTemplate("nonexistent")).toBeNull();
  });

  it("should list all default template names", () => {
    expect(Object.keys(DEFAULT_VIDEO_TEMPLATES)).toContain("product-update");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/video-defaults.test.ts`
Expected: FAIL

- [ ] **Step 3: Create defaults**

Create `src/lib/video/defaults.ts`:

```typescript
import type { VideoTemplateConfig } from "./types";

export const DEFAULT_VIDEO_TEMPLATES: Record<string, VideoTemplateConfig> = {
  "product-update": {
    fps: 30,
    transition: "fade",
    transition_duration: 0.5,
    scenes: [
      { type: "intro", duration: 3 },
      { type: "feature", duration: 4, device: "browser" },
      { type: "feature", duration: 4, device: "browser", transition: "slide-from-left" },
      { type: "cta", duration: 3 },
    ],
  },
};

export function getDefaultVideoTemplate(
  name: string
): VideoTemplateConfig | null {
  return DEFAULT_VIDEO_TEMPLATES[name] ?? null;
}

export function isDefaultVideoTemplate(name: string): boolean {
  return name in DEFAULT_VIDEO_TEMPLATES;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/video-defaults.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/video/defaults.ts src/lib/__tests__/video-defaults.test.ts
git commit -m "feat: add default product-update video template config"
```

---

### Task 5: Convex Schema & Mutations

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/releases.ts`

- [ ] **Step 1: Add output and videos fields to releases table in `convex/schema.ts`**

Add to the releases table definition:
- `output`: `v.optional(v.union(v.literal("image"), v.literal("video")))` — defaults to image
- `videos`: `v.optional(v.object({ ... }))` — nullable, populated on video completion

Each format entry in `videos` is: `v.optional(v.object({ url: v.string(), duration: v.number(), dimensions: v.string() }))`

- [ ] **Step 2: Add videoTemplates table to `convex/schema.ts`**

```typescript
videoTemplates: defineTable({
  userId: v.string(),
  externalId: v.string(),
  name: v.string(),
  isDefault: v.boolean(),
  config: v.any(), // VideoTemplateConfig — validated at app layer
  previewUrl: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_externalId", ["externalId"]),
```

- [ ] **Step 3: Update `releases.create` mutation in `convex/releases.ts`**

Add `output` arg (optional, defaults to `"image"`):
```typescript
output: v.optional(v.union(v.literal("image"), v.literal("video"))),
```

Pass through to `ctx.db.insert("releases", { ..., output: args.output ?? "image" })`.

- [ ] **Step 4: Update `releases.markCompleted` mutation**

Add optional `videos` arg alongside existing `images`:
```typescript
// In args validator, add:
videos: v.optional(v.any()),
```

Update the handler to set whichever field is provided:
```typescript
const patch: Record<string, unknown> = {
  status: "completed",
  completed_at: Date.now(),
};
if (args.images) patch.images = args.images;
if (args.videos) patch.videos = args.videos;
await ctx.db.patch(release._id, patch);
```

- [ ] **Step 4b: Create `convex/videoTemplates.ts`**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videoTemplates")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});
```

- [ ] **Step 5: Run `npx convex dev` to verify schema deploys**

Run: `npx convex dev --once`
Expected: Schema accepted, no errors

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/releases.ts
git commit -m "feat: add video support to Convex schema (output field, videos, videoTemplates table)"
```

---

## Chunk 2: Remotion Project Setup

### Task 6: Install Remotion Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Remotion core packages**

```bash
npm i remotion @remotion/cli @remotion/transitions @remotion/fonts zod@3.22.3
```

- [ ] **Step 2: Install Remotion Lambda packages**

```bash
npm i @remotion/lambda @remotion/bundler
```

- [ ] **Step 3: Verify installation**

Run: `npx remotion --version`
Expected: Remotion version number printed

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Remotion dependencies"
```

---

### Task 7: Remotion Project Scaffolding

**Files:**
- Create: `src/remotion/index.ts`
- Create: `src/remotion/Root.tsx`
- Create: `src/remotion/fonts.ts`
- Create: `src/remotion/VideoComposition.tsx`

- [ ] **Step 1: Create Remotion entry point**

Create `src/remotion/index.ts`:
```typescript
export { RemotionRoot } from "./Root";
```

- [ ] **Step 2: Create font loading utility**

Create `src/remotion/fonts.ts`:
```typescript
import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

const fontCache = new Map<string, boolean>();

export async function loadBrandFont(family: string): Promise<string> {
  if (family === "Plus Jakarta Sans") {
    // Default font — load from static files
    if (!fontCache.has(family)) {
      await loadFont({
        family: "Plus Jakarta Sans",
        url: staticFile("fonts/PlusJakartaSans-Regular.ttf"),
        weight: "400",
      });
      await loadFont({
        family: "Plus Jakarta Sans",
        url: staticFile("fonts/PlusJakartaSans-Bold.ttf"),
        weight: "700",
      });
      fontCache.set(family, true);
    }
    return family;
  }

  // Google Fonts — fetch CSS to get actual .woff2 URLs, then load each
  if (!fontCache.has(family)) {
    const encodedFamily = encodeURIComponent(family);
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;700&display=swap`;
    const cssResponse = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }, // Google serves woff2 for modern UAs
    });
    const css = await cssResponse.text();

    // Parse @font-face blocks for woff2 URLs
    const urlMatches = css.matchAll(/src:\s*url\(([^)]+\.woff2[^)]*)\)/g);
    const weightMatches = css.matchAll(/font-weight:\s*(\d+)/g);
    const urls = Array.from(urlMatches).map((m) => m[1]);
    const weights = Array.from(weightMatches).map((m) => m[1]);

    await Promise.all(
      urls.map((url, i) =>
        loadFont({
          family,
          url,
          weight: (weights[i] ?? "400") as "400" | "700",
          format: "woff2",
        })
      )
    );
    fontCache.set(family, true);
  }
  return family;
}
```

- [ ] **Step 3: Create VideoComposition placeholder**

Create `src/remotion/VideoComposition.tsx`:
```typescript
import { AbsoluteFill } from "remotion";
import type { VideoTemplateConfig, SceneContent } from "../lib/video/types";

export type VideoCompositionProps = {
  template: VideoTemplateConfig;
  scenes: SceneContent[];
  brand: {
    name: string;
    logoBase64?: string;
    colors: { background: string; text: string; primary: string };
    fontFamily: string;
  };
};

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  template,
  scenes,
  brand,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background }}>
      <div
        style={{
          color: brand.colors.text,
          fontSize: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {scenes[0]?.title ?? "Video Placeholder"}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Create Root.tsx with compositions for each format**

Create `src/remotion/Root.tsx`:
```typescript
import { Composition, CalculateMetadataFunction } from "remotion";
import { VideoComposition, VideoCompositionProps } from "./VideoComposition";
import { calculateVideoDuration, VIDEO_DIMENSIONS } from "../lib/video/types";

const calculateMetadata: CalculateMetadataFunction<VideoCompositionProps> = ({
  props,
}) => {
  const netDuration = calculateVideoDuration(props.template);
  return {
    durationInFrames: Math.ceil(netDuration * props.template.fps),
  };
};

const defaultProps: VideoCompositionProps = {
  template: {
    fps: 30,
    transition: "fade",
    transition_duration: 0.5,
    scenes: [
      { type: "intro", duration: 3 },
      { type: "feature", duration: 4, device: "browser" },
      { type: "cta", duration: 3 },
    ],
  },
  scenes: [
    { title: "Product Update" },
    { title: "New Feature", description: "Check it out", image_url: "https://placehold.co/1200x800" },
    { title: "Try it now" },
  ],
  brand: {
    name: "Acme Inc",
    colors: { background: "#0F0F0F", text: "#FFFFFF", primary: "#6366F1" },
    fontFamily: "Plus Jakarta Sans",
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(["landscape", "square", "portrait"] as const).map((format) => (
        <Composition
          key={format}
          id={format}
          component={VideoComposition}
          fps={30}
          width={VIDEO_DIMENSIONS[format].width}
          height={VIDEO_DIMENSIONS[format].height}
          durationInFrames={300} // placeholder, overridden by calculateMetadata
          defaultProps={defaultProps}
          calculateMetadata={calculateMetadata}
        />
      ))}
    </>
  );
};
```

- [ ] **Step 5: Verify Remotion Studio launches**

Run: `npx remotion studio src/remotion/index.ts`
Expected: Studio opens in browser showing 3 compositions (landscape, square, portrait) with placeholder content.

- [ ] **Step 6: Commit**

```bash
git add src/remotion/
git commit -m "feat: scaffold Remotion project with Root, VideoComposition placeholder, and font loading"
```

---

## Chunk 3: Scene Components

### Task 8: IntroScene Component

**Files:**
- Create: `src/remotion/scenes/IntroScene.tsx`

- [ ] **Step 1: Create IntroScene**

```typescript
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type IntroSceneProps = {
  title: string;
  subtitle?: string;
  logoBase64?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  title,
  subtitle,
  logoBase64,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 200 } });
  const logoOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 200 }, delay: Math.round(0.4 * fps) }),
    [0, 1],
    [40, 0]
  );
  const titleOpacity = interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [0.6 * fps, 1.1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 24,
      }}
    >
      {logoBase64 && (
        <Img
          src={logoBase64}
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        />
      )}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: colors.text,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 32,
            color: colors.text,
            opacity: subtitleOpacity,
            textAlign: "center",
            maxWidth: "70%",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify in Remotion Studio**

Update `VideoComposition.tsx` to render `<IntroScene>` for the first scene. Open Studio and visually confirm logo fade+scale and title slide-up animation.

- [ ] **Step 3: Commit**

```bash
git add src/remotion/scenes/IntroScene.tsx
git commit -m "feat: add IntroScene component with logo and title animations"
```

---

### Task 9: FeatureScene Component

**Files:**
- Create: `src/remotion/scenes/FeatureScene.tsx`
- Create: `src/remotion/components/BrowserFrame.tsx`
- Create: `src/remotion/components/MobileFrame.tsx`

- [ ] **Step 1: Create BrowserFrame for Remotion**

Adapt from `src/lib/templates/components/BrowserFrame.tsx` but using Remotion's `<Img>` component and frame-based animations.

Create `src/remotion/components/BrowserFrame.tsx`:

```typescript
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type BrowserFrameProps = {
  imageBase64: string;
  width: number;
  height: number;
  frameColor?: string;
};

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  imageBase64,
  width,
  height,
  frameColor = "#E8E8E8",
}) => {
  const titleBarHeight = 32;
  const radius = 12;
  const dotSize = 10;
  const dotGap = 6;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.20)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: titleBarHeight,
          backgroundColor: frameColor,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          gap: dotGap,
          flexShrink: 0,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
          <div
            key={color}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: color,
            }}
          />
        ))}
      </div>
      <Img
        src={imageBase64}
        style={{
          width: "100%",
          height: height - titleBarHeight,
          objectFit: "cover",
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Create MobileFrame for Remotion**

Create `src/remotion/components/MobileFrame.tsx`:

```typescript
import { Img } from "remotion";

type MobileFrameProps = {
  imageBase64: string;
  width: number;
  height: number;
  frameColor?: string;
};

export const MobileFrame: React.FC<MobileFrameProps> = ({
  imageBase64,
  width,
  height,
  frameColor = "#1A1A1A",
}) => {
  const bezel = width * 0.025;
  const cornerRadius = width * 0.12;
  const innerRadius = cornerRadius - bezel;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: cornerRadius,
        backgroundColor: frameColor,
        padding: bezel,
        boxShadow: "0 16px 56px rgba(0,0,0,0.30)",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <Img
        src={imageBase64}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: innerRadius,
          objectFit: "cover",
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: Create FeatureScene**

Create `src/remotion/scenes/FeatureScene.tsx`:

```typescript
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { MobileFrame } from "../components/MobileFrame";

type FeatureSceneProps = {
  title: string;
  description?: string;
  imageBase64: string;
  device: "browser" | "mobile";
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  title,
  description,
  imageBase64,
  device,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const frameWidth = width * 0.65;
  const frameHeight = height * 0.6;

  const deviceSpring = spring({ frame, fps, config: { damping: 200 } });
  const deviceY = interpolate(deviceSpring, [0, 1], [60, 0]);
  const deviceOpacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [0.3 * fps, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 200 }, delay: Math.round(0.3 * fps) }),
    [0, 1],
    [30, 0]
  );

  const descOpacity = interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const DeviceFrame = device === "mobile" ? MobileFrame : BrowserFrame;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 32,
        padding: 48,
      }}
    >
      <div style={{ opacity: deviceOpacity, transform: `translateY(${deviceY}px)` }}>
        <DeviceFrame
          imageBase64={imageBase64}
          width={frameWidth}
          height={frameHeight}
        />
      </div>
      <div style={{ textAlign: "center", maxWidth: "80%" }}>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: colors.text,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 24,
              color: colors.text,
              opacity: descOpacity,
              marginTop: 12,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Verify in Remotion Studio**

Preview FeatureScene with both browser and mobile frames. Confirm device frame slides in, text staggers.

- [ ] **Step 5: Commit**

```bash
git add src/remotion/scenes/FeatureScene.tsx src/remotion/components/BrowserFrame.tsx src/remotion/components/MobileFrame.tsx
git commit -m "feat: add FeatureScene with BrowserFrame and MobileFrame components"
```

---

### Task 10: TextScene and CtaScene Components

**Files:**
- Create: `src/remotion/scenes/TextScene.tsx`
- Create: `src/remotion/scenes/CtaScene.tsx`

- [ ] **Step 1: Create TextScene**

Create `src/remotion/scenes/TextScene.tsx`:

```typescript
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type TextSceneProps = {
  title: string;
  description?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const TextScene: React.FC<TextSceneProps> = ({
  title,
  description,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [0.9, 1]
  );
  const titleOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const descOpacity = interpolate(frame, [0.4 * fps, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        padding: 64,
        gap: 24,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: colors.text,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          maxWidth: "90%",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 32,
            color: colors.text,
            opacity: descOpacity,
            textAlign: "center",
            maxWidth: "75%",
          }}
        >
          {description}
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Create CtaScene**

Create `src/remotion/scenes/CtaScene.tsx`:

```typescript
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type CtaSceneProps = {
  title: string;
  url?: string;
  logoBase64?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const CtaScene: React.FC<CtaSceneProps> = ({
  title,
  url,
  logoBase64,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({ frame, fps, config: { damping: 200 } });
  const elementY = interpolate(enterSpring, [0, 1], [50, 0]);
  const elementOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtle pulse on CTA after it's fully visible
  const pulseFrame = Math.max(0, frame - Math.round(1.2 * fps));
  const pulse = pulseFrame > 0
    ? 1 + 0.02 * Math.sin((pulseFrame / fps) * Math.PI * 2)
    : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 32,
      }}
    >
      {logoBase64 && (
        <Img
          src={logoBase64}
          style={{
            width: 80,
            height: 80,
            objectFit: "contain",
            opacity: elementOpacity,
            transform: `translateY(${elementY}px)`,
          }}
        />
      )}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: colors.text,
          textAlign: "center",
          opacity: elementOpacity,
          transform: `translateY(${elementY}px) scale(${pulse})`,
          maxWidth: "80%",
        }}
      >
        {title}
      </div>
      {url && (
        <div
          style={{
            fontSize: 24,
            color: colors.primary,
            opacity: elementOpacity,
            transform: `translateY(${elementY}px)`,
          }}
        >
          {url}
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Verify both in Remotion Studio**

Preview TextScene and CtaScene. Confirm text fade + scale and CTA pulse.

- [ ] **Step 4: Commit**

```bash
git add src/remotion/scenes/TextScene.tsx src/remotion/scenes/CtaScene.tsx
git commit -m "feat: add TextScene and CtaScene components"
```

---

### Task 11: Wire VideoComposition with TransitionSeries

**Files:**
- Modify: `src/remotion/VideoComposition.tsx`

- [ ] **Step 1: Replace placeholder with full TransitionSeries assembly**

Rewrite `src/remotion/VideoComposition.tsx`:

```typescript
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { VideoTemplateConfig, SceneContent, TransitionType } from "../lib/video/types";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { TextScene } from "./scenes/TextScene";
import { CtaScene } from "./scenes/CtaScene";

export type VideoCompositionProps = {
  template: VideoTemplateConfig;
  scenes: SceneContent[];
  brand: {
    name: string;
    logoBase64?: string;
    colors: { background: string; text: string; primary: string };
    fontFamily: string;
  };
  /** Map of image_url → base64 data URI, pre-fetched by pipeline */
  imageMap: Record<string, string>;
};

function getPresentation(type: TransitionType) {
  switch (type) {
    case "fade": return fade();
    case "slide-from-left": return slide({ direction: "from-left" });
    case "slide-from-right": return slide({ direction: "from-right" });
    case "slide-from-top": return slide({ direction: "from-top" });
    case "slide-from-bottom": return slide({ direction: "from-bottom" });
    case "wipe": return wipe();
    case "none": return null;
  }
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  template,
  scenes,
  brand,
  imageMap,
}) => {
  const { fps } = useVideoConfig();
  const transitionFrames = Math.round(template.transition_duration * fps);

  const elements: React.ReactNode[] = [];

  template.scenes.forEach((sceneConfig, i) => {
    const content = scenes[i];
    const durationInFrames = Math.round(sceneConfig.duration * fps);

    // Add transition before this scene (except first)
    if (i > 0) {
      const transType = sceneConfig.transition ?? template.transition;
      const presentation = getPresentation(transType);
      if (presentation) {
        elements.push(
          <TransitionSeries.Transition
            key={`t-${i}`}
            presentation={presentation}
            timing={linearTiming({ durationInFrames: transitionFrames })}
          />
        );
      }
    }

    // Render scene
    let sceneElement: React.ReactNode;
    const sharedProps = {
      colors: brand.colors,
      fontFamily: brand.fontFamily,
    };

    switch (sceneConfig.type) {
      case "intro":
        sceneElement = (
          <IntroScene
            title={content.title}
            subtitle={content.subtitle}
            logoBase64={brand.logoBase64}
            {...sharedProps}
          />
        );
        break;
      case "feature": {
        const imageUrl = content.image_url ?? "";
        sceneElement = (
          <FeatureScene
            title={content.title}
            description={content.description}
            imageBase64={imageMap[imageUrl] ?? imageUrl}
            device={content.device ?? sceneConfig.device ?? "browser"}
            {...sharedProps}
          />
        );
        break;
      }
      case "text":
        sceneElement = (
          <TextScene
            title={content.title}
            description={content.description}
            {...sharedProps}
          />
        );
        break;
      case "cta":
        sceneElement = (
          <CtaScene
            title={content.title}
            url={content.url}
            logoBase64={brand.logoBase64}
            {...sharedProps}
          />
        );
        break;
    }

    elements.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={durationInFrames}>
        {sceneElement}
      </TransitionSeries.Sequence>
    );
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{elements}</TransitionSeries>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Update Root.tsx defaultProps to include imageMap**

Add `imageMap: {}` to the default props in `Root.tsx`.

- [ ] **Step 3: Verify full composition in Remotion Studio**

Run: `npx remotion studio src/remotion/index.ts`
Expected: Full video plays with intro → feature → feature → CTA with fade transitions.

- [ ] **Step 4: Commit**

```bash
git add src/remotion/VideoComposition.tsx src/remotion/Root.tsx
git commit -m "feat: wire VideoComposition with TransitionSeries and all scene types"
```

---

## Chunk 4: Lambda Client & Video Pipeline

### Task 12: Lambda Client

**Files:**
- Create: `src/lib/video/lambda.ts`

- [ ] **Step 1: Create Lambda client wrapper**

Create `src/lib/video/lambda.ts`:

```typescript
import {
  renderMediaOnLambda,
  getRenderProgress,
  deploySite,
  deployFunction,
  getOrCreateBucket,
  RenderProgress,
} from "@remotion/lambda";
import { bundle } from "@remotion/bundler";
import path from "path";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME;
const SERVE_URL = process.env.REMOTION_SERVE_URL;

type RenderVideoParams = {
  compositionId: string; // "landscape" | "square" | "portrait"
  inputProps: Record<string, unknown>;
};

export async function renderVideo({
  compositionId,
  inputProps,
}: RenderVideoParams): Promise<string> {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error("REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL must be set");
  }

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: compositionId,
    inputProps,
    codec: "h264",
    timeoutInMilliseconds: 240000,
  });

  // Poll until complete
  let progress: RenderProgress;
  do {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    progress = await getRenderProgress({
      renderId,
      bucketName,
      region: REGION,
      functionName: FUNCTION_NAME,
    });

    if (progress.fatalErrorEncountered) {
      throw new Error(
        `Remotion render failed: ${progress.errors?.[0]?.message ?? "Unknown error"}`
      );
    }
  } while (!progress.done);

  if (!progress.outputFile) {
    throw new Error("Render completed but no output file URL");
  }

  return progress.outputFile; // S3 URL of the rendered MP4
}

/** One-time setup: bundle and deploy Remotion project to Lambda */
export async function deployRemotionToLambda() {
  const entryPoint = path.resolve(
    process.cwd(),
    "src/remotion/index.ts"
  );

  const bundleResult = await bundle({
    entryPoint,
    onProgress: (p) => console.log(`Bundling: ${Math.round(p * 100)}%`),
  });

  const { bucketName } = await getOrCreateBucket({ region: REGION });

  const { serveUrl } = await deploySite({
    bucketName,
    entryPoint: bundleResult,
    region: REGION,
    siteName: "bragfast-video",
  });

  const { functionName } = await deployFunction({
    region: REGION,
    memorySizeInMb: 2048,
    timeoutInSeconds: 240,
    createCloudWatchLogGroup: true,
  });

  console.log("Deployed to Lambda:");
  console.log(`  REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`  REMOTION_FUNCTION_NAME=${functionName}`);

  return { serveUrl, functionName };
}
```

- [ ] **Step 2: Add env vars to `.env.example`**

```
REMOTION_AWS_REGION=us-east-1
REMOTION_FUNCTION_NAME=
REMOTION_SERVE_URL=
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/video/lambda.ts
git commit -m "feat: add Remotion Lambda client (render, poll, deploy)"
```

---

### Task 13: Video Render Pipeline

**Files:**
- Create: `src/lib/pipeline/render-video.ts`

- [ ] **Step 1: Create video render pipeline**

Create `src/lib/pipeline/render-video.ts`:

```typescript
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { renderVideo } from "../video/lambda";
import { getDefaultVideoTemplate } from "../video/defaults";
import { fetchImageAsBase64 } from "../images";
import { calculateVideoDuration, VIDEO_DIMENSIONS } from "../video/types";
import { uploadImage } from "../storage/r2";
import type { SceneContent, VideoFormatEntry, VideoTemplateConfig } from "../video/types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type VideoRenderRequest = {
  brand_id?: string;
  colors?: { background: string; text: string; primary: string };
  name?: string;
  logo_url?: string;
  font_family?: string;
  template?: string;
  formats: VideoFormatEntry[];
  webhook_url?: string;
  metadata?: string;
};

export function createVideoRelease(
  userId: string,
  request: VideoRenderRequest,
  creditsUsed: number
) {
  const cookId = `cook_${crypto.randomUUID().slice(0, 10)}`;
  return {
    cookId,
    result: {
      cook_id: cookId,
      output: "video" as const,
      status: "pending" as const,
      videos: null,
      credits_used: creditsUsed,
      credits_remaining: 0, // filled in by route handler
      created_at: new Date().toISOString(),
    },
  };
}

export async function renderVideoAsync(
  cookId: string,
  userId: string,
  request: VideoRenderRequest
) {
  try {
    // 1. Resolve brand
    const brand = await resolveBrand(request);

    // 2. Resolve video template
    const template = await resolveVideoTemplate(request.template, userId);

    // 3. Prefetch all images from scenes
    const imageMap = await prefetchSceneImages(request.formats);

    // 4. Render each format
    const videos: Record<string, { url: string; duration: number; dimensions: string }> = {};

    for (const format of request.formats) {
      const dims = VIDEO_DIMENSIONS[format.name];
      const inputProps = {
        template,
        scenes: format.scenes,
        brand: {
          name: brand.name,
          logoBase64: brand.logoBase64 ?? "",
          colors: brand.colors,
          fontFamily: brand.fontFamily ?? "Plus Jakarta Sans",
        },
        imageMap,
      };

      // Render on Lambda
      const mp4Url = await renderVideo({
        compositionId: format.name,
        inputProps,
      });

      // Download from Lambda S3 and upload to R2
      const mp4Response = await fetch(mp4Url);
      const mp4Buffer = Buffer.from(await mp4Response.arrayBuffer());
      const filename = `${format.name}.mp4`;
      const r2Url = await uploadImage(mp4Buffer, `releases/${cookId}/${filename}`, "video/mp4");

      const duration = calculateVideoDuration(template);
      videos[format.name] = {
        url: r2Url,
        duration,
        dimensions: `${dims.width}x${dims.height}`,
      };
    }

    // 5. Mark completed
    await convex.mutation(api.releases.markCompleted, {
      externalId: cookId,
      videos,
    });

    // 6. Webhook
    if (request.webhook_url) {
      const result = await convex.query(api.releases.getByExternalId, { externalId: cookId });
      fetch(request.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }).catch(console.error);
    }
  } catch (error) {
    console.error(`Video render failed for ${cookId}:`, error);
    await convex.mutation(api.releases.markFailed, { externalId: cookId });
    // Refund credits inside pipeline (matching image pipeline pattern in render.ts)
    await convex.mutation(api.userProfiles.refund, {
      userId,
      amount: request.formats.length * 5,
    });
    // Don't re-throw — failure is handled here (matches image pipeline pattern)
  }
}

async function resolveBrand(request: VideoRenderRequest) {
  if (request.brand_id) {
    const brand = await convex.query(api.brands.getByExternalId, {
      externalId: request.brand_id,
    });
    if (!brand) throw new Error(`Brand not found: ${request.brand_id}`);
    let logoBase64 = "";
    if (brand.logo_url) {
      logoBase64 = await fetchImageAsBase64(brand.logo_url);
    }
    return {
      name: brand.name,
      logoBase64,
      colors: brand.colors,
      fontFamily: brand.font_family ?? "Plus Jakarta Sans",
    };
  }

  let logoBase64 = "";
  if (request.logo_url) {
    logoBase64 = await fetchImageAsBase64(request.logo_url);
  }
  return {
    name: request.name ?? "Brand",
    logoBase64,
    colors: request.colors ?? { background: "#0F0F0F", text: "#FFFFFF", primary: "#6366F1" },
    fontFamily: request.font_family ?? "Plus Jakarta Sans",
  };
}

async function resolveVideoTemplate(
  templateName: string | undefined,
  userId: string
): Promise<VideoTemplateConfig> {
  const name = templateName ?? "product-update";

  // Check defaults first
  const defaultTmpl = getDefaultVideoTemplate(name);
  if (defaultTmpl) return defaultTmpl;

  // Check custom templates (vtmpl_*)
  if (name.startsWith("vtmpl_")) {
    const custom = await convex.query(api.videoTemplates.getByExternalId, {
      externalId: name,
    });
    if (!custom) throw new Error(`Video template not found: ${name}`);
    return custom.config as VideoTemplateConfig;
  }

  throw new Error(`Unknown video template: ${name}`);
}

async function prefetchSceneImages(
  formats: VideoFormatEntry[]
): Promise<Record<string, string>> {
  const urls = new Set<string>();
  for (const format of formats) {
    for (const scene of format.scenes) {
      if (scene.image_url) urls.add(scene.image_url);
    }
  }

  const imageMap: Record<string, string> = {};
  await Promise.all(
    Array.from(urls).map(async (url) => {
      imageMap[url] = await fetchImageAsBase64(url);
    })
  );
  return imageMap;
}

```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/render-video.ts
git commit -m "feat: add video render pipeline (resolve, Lambda render, R2 upload)"
```

---

## Chunk 5: API Route Integration

### Task 14: Extend POST /api/v1/cook for Video

**Files:**
- Modify: `src/app/api/v1/cook/route.ts`
- Modify: `src/lib/validation.ts`

- [ ] **Step 1: Add video format validation to `src/lib/validation.ts`**

Add a new function:

```typescript
import { validateVideoScenes } from "./video/validation";
import { getDefaultVideoTemplate, isDefaultVideoTemplate } from "./video/defaults";

export function validateVideoFormats(
  formats: { name: string; scenes: unknown[] }[]
): string | null {
  if (!Array.isArray(formats) || formats.length === 0) {
    return "formats must be a non-empty array";
  }
  const validNames = ["landscape", "square", "portrait"];
  const seen = new Set<string>();
  for (const format of formats) {
    if (!validNames.includes(format.name)) {
      return `Invalid format name: ${format.name}`;
    }
    if (seen.has(format.name)) {
      return `Duplicate format: ${format.name}`;
    }
    seen.add(format.name);
    if (!Array.isArray(format.scenes) || format.scenes.length === 0) {
      return `${format.name}: scenes must be a non-empty array`;
    }
  }
  return null;
}

export function validateVideoTemplate(template: string | undefined): string | null {
  if (!template) return null; // defaults to "product-update"
  if (isDefaultVideoTemplate(template)) return null;
  if (template.startsWith("vtmpl_")) return null;
  return `Invalid video template. Must be a default name (e.g. "product-update") or a template ID (vtmpl_...)`;
}
```

- [ ] **Step 2: Update `src/app/api/v1/cook/route.ts`**

Add video branch to the POST handler. After parsing `body`:

```typescript
const isVideo = body.output === "video";

if (isVideo) {
  // Video-specific validation
  const videoFormatError = validateVideoFormats(body.formats);
  if (videoFormatError) {
    return Response.json({ error: videoFormatError }, { status: 400 });
  }

  const videoTemplateError = validateVideoTemplate(body.template);
  if (videoTemplateError) {
    return Response.json({ error: videoTemplateError }, { status: 400 });
  }

  // Validate scenes against template
  const template = getDefaultVideoTemplate(body.template ?? "product-update");
  if (template) {
    for (const format of body.formats) {
      const sceneError = validateVideoScenes(format.scenes, template.scenes);
      if (sceneError) {
        return Response.json({ error: `${format.name}: ${sceneError}` }, { status: 400 });
      }
    }
  }

  // Credit reservation (5 per format)
  const creditsUsed = calculateCredits({ output: "video", formats: body.formats });
  // ... reserve credits (same pattern as images) ...

  // Create release and spawn async render
  const { cookId, result } = createVideoRelease(auth.userId, body, creditsUsed);
  await fetchMutation(api.releases.create, {
    userId: auth.userId,
    externalId: cookId,
    template: body.template ?? "product-update",
    credits_used: creditsUsed,
    output: "video",
    metadata: body.metadata,
    webhook_url: body.webhook_url,
  });

  result.credits_remaining = remaining;

  // Fire-and-forget — renderVideoAsync handles its own failure (markFailed + refund)
  after(() => {
    renderVideoAsync(cookId, auth.userId, body).catch(console.error);
  });

  return Response.json(result, { status: 202 });
}

// ... existing image handling below (unchanged) ...
```

- [ ] **Step 3: Update `ReleaseResult` type in `src/lib/types.ts`**

Add `output` and `videos` fields:
```typescript
export type ReleaseResult = {
  cook_id: string;
  output: "image" | "video";
  status: "pending" | "completed" | "failed";
  images: Record<string, { slides: string[]; dimensions: string }> | null;
  videos?: Record<string, { url: string; duration: number; dimensions: string }> | null;
  credits_used: number;
  credits_remaining: number;
  created_at: string;
  completed_at?: string;
  metadata?: string;
  webhook_url?: string;
};
```

- [ ] **Step 4: Update `getRelease` in `src/lib/pipeline/render.ts`**

The function that constructs `ReleaseResult` from the Convex record must include `output` and `videos`:
```typescript
// Add to the result object construction:
output: release.output ?? "image",
videos: release.videos ?? null,
```

- [ ] **Step 5: Update GET handler for video responses**

In `src/app/api/v1/cook/[id]/route.ts`, the `getRelease()` call now returns `output` and `videos` fields automatically.

- [ ] **Step 3b: Add tests for video format validation**

Create `src/lib/__tests__/video-format-validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateVideoFormats, validateVideoTemplate } from "../validation";

describe("validateVideoFormats", () => {
  it("should accept valid video formats", () => {
    const formats = [{ name: "landscape", scenes: [{ title: "A" }] }];
    expect(validateVideoFormats(formats)).toBeNull();
  });

  it("should reject empty formats", () => {
    expect(validateVideoFormats([])).toContain("non-empty");
  });

  it("should reject invalid format name", () => {
    const formats = [{ name: "widescreen", scenes: [{ title: "A" }] }];
    expect(validateVideoFormats(formats)).toContain("widescreen");
  });

  it("should reject duplicate formats", () => {
    const formats = [
      { name: "landscape", scenes: [{ title: "A" }] },
      { name: "landscape", scenes: [{ title: "B" }] },
    ];
    expect(validateVideoFormats(formats)).toContain("Duplicate");
  });

  it("should reject empty scenes", () => {
    const formats = [{ name: "landscape", scenes: [] }];
    expect(validateVideoFormats(formats)).toContain("non-empty");
  });
});

describe("validateVideoTemplate", () => {
  it("should accept default template names", () => {
    expect(validateVideoTemplate("product-update")).toBeNull();
  });

  it("should accept vtmpl_ prefixed IDs", () => {
    expect(validateVideoTemplate("vtmpl_abc123")).toBeNull();
  });

  it("should accept undefined (defaults to product-update)", () => {
    expect(validateVideoTemplate(undefined)).toBeNull();
  });

  it("should reject unknown template names", () => {
    expect(validateVideoTemplate("nonexistent")).toContain("Invalid");
  });
});
```

Run: `npx vitest run src/lib/__tests__/video-format-validation.test.ts`
Expected: PASS

- [ ] **Step 4: Test manually with curl**

```bash
curl -X POST http://localhost:3000/api/v1/cook \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "output": "video",
    "template": "product-update",
    "colors": { "background": "#0F0F0F", "text": "#FFFFFF", "primary": "#6366F1" },
    "formats": [{
      "name": "landscape",
      "scenes": [
        { "title": "Hello World" },
        { "title": "Feature 1", "image_url": "https://placehold.co/1200x800" },
        { "title": "Feature 2", "image_url": "https://placehold.co/1200x800" },
        { "title": "Try it now" }
      ]
    }]
  }'
```

Expected: 202 with cook_id. Poll GET endpoint until completed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/cook/route.ts src/app/api/v1/cook/\\[id\\]/route.ts src/lib/validation.ts
git commit -m "feat: extend /cook endpoint to support video output"
```

---

### Task 15: Lambda Deployment & E2E Test

- [ ] **Step 0: Create `src/remotion/remotion.config.ts`**

```typescript
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/remotion/index.ts");
```

- [ ] **Step 1: Create deployment script and deploy Remotion to Lambda**

Create `scripts/deploy-remotion.ts`:

```typescript
import { deployRemotionToLambda } from "../src/lib/video/lambda";

async function main() {
  console.log("Deploying Remotion to Lambda...");
  const { serveUrl, functionName } = await deployRemotionToLambda();
  console.log("\nAdd these to your .env:");
  console.log(`REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`REMOTION_FUNCTION_NAME=${functionName}`);
}

main().catch(console.error);
```

Add to package.json scripts:
```json
"remotion:deploy": "tsx scripts/deploy-remotion.ts",
"remotion:studio": "remotion studio src/remotion/index.ts"
```

Save the output `REMOTION_SERVE_URL` and `REMOTION_FUNCTION_NAME` to `.env`.

- [ ] **Step 2: E2E test — render a video**

POST to `/cook` with `output: "video"`, poll until completed, verify:
- MP4 file exists at the returned URL
- Duration matches expected (12.5s for product-update template)
- Video plays correctly

- [ ] **Step 3: Test all 3 formats**

Render landscape, square, and portrait. Verify dimensions in output metadata.

- [ ] **Step 4: Test error handling**

- Send invalid scene count → expect 400
- Send feature scene without image_url → expect 400
- Send unknown template → expect 400

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Remotion video generation integration"
```
