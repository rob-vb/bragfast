# Remotion Video Generation — Design Spec

## Context

brag.fast generates branded images for product updates via an API-first pipeline (Satori + Sharp). Users want **video output** for the same use cases — product announcements, feature showcases, changelog videos — for social media distribution. This spec adds video generation using Remotion, rendered on AWS Lambda, stored in Cloudflare R2.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template relationship | Separate video templates | Video is a different medium — timeline, motion, transitions. Bolting animation onto static canvas configs creates leaky abstractions. |
| Template architecture | Scene graph model | Templates = sequence of typed scenes with transitions. Maps to Remotion's `TransitionSeries`. Simple enough for config-driven customization. |
| Rendering infra | Remotion Lambda | Serverless, pay-per-render, scales to zero. Chunked parallel rendering. No ffmpeg on our server. |
| Video formats | Match image formats | Landscape (1920x1080), Square (1080x1080), Portrait (1080x1920). Same aspect ratios, video-standard resolutions. |
| Customization | Config-driven only | Users customize via JSON config (colors, timing, transition style). No user-supplied Remotion code. |
| Motion style | Clean & professional | Subtle fades, smooth slides, gentle scale. Apple keynote aesthetic. |
| Audio | Silent | No audio. Users add in post-production. |
| API integration | Extend `/cook` endpoint | `output: "video"` field. Same polling pattern via `GET /cook/:id`. |
| Credit pricing | 5 credits per video per format | Flat rate regardless of scene count. Covers Lambda compute. |
| Codec | H.264 MP4 | Universal compatibility. Fixed quality, no codec options exposed to users. |

## Scene Types (Phase 1)

### `intro` — Title Scene
- Brand logo animates in (fade + scale), headline slides up
- **Required**: `title`
- **Optional**: `subtitle`

### `feature` — Screenshot Scene
- Device frame (browser/mobile) with screenshot, title + description overlay
- **Required**: `title`, `image_url`
- **Optional**: `description`, `device` (browser|mobile, defaults to template config)
- Animations: device frame slide-in, text stagger

### `text` — Text-Only Scene
- Full-screen text with emphasis
- **Required**: `title`
- **Optional**: `description`
- Animations: text fade + scale

### `cta` — Call-to-Action Scene
- Closing scene with brand, CTA text, optional URL
- **Required**: `title`
- **Optional**: `url`
- Animations: elements converge to center

### Validation Rules
- Scene count in request must match template scene count
- Scene content is validated per-type: `feature` requires `image_url`, all types require `title`
- `title` max 100 chars, `description` max 300 chars (text overflow in video is harder to handle than images)
- Invalid scene content returns 400 with per-scene error detail

## Video Template Config

```typescript
type VideoTemplateConfig = {
  fps: number;                    // 30
  transition: TransitionType;     // default transition between scenes
  transition_duration: number;    // seconds (default 0.5)
  scenes: SceneConfig[];
};

type SceneConfig = {
  type: "intro" | "feature" | "text" | "cta";
  duration: number;               // seconds (gross duration, before transition overlap)
  device?: "browser" | "mobile";  // for feature scenes
  transition?: TransitionType;    // override transition INTO this scene
};

// Names follow Remotion's direction convention
type TransitionType = "fade" | "slide-from-left" | "slide-from-right" | "slide-from-top" | "slide-from-bottom" | "wipe" | "none";
```

### Duration Calculation

Scene durations are **gross** — transitions overlap adjacent scenes, shortening total duration. This follows Remotion's `TransitionSeries` behavior.

```
Total = sum(scene.duration) - sum(transition_duration for each transition)
```

Example with default "product-update" template:
- Scenes: 3s + 4s + 4s + 3s = 14s gross
- Transitions: 3 transitions × 0.5s = 1.5s overlap
- **Net duration: 12.5s** (375 frames at 30fps)

`calculateMetadata` computes this automatically. The API response `duration` field reflects the net duration.

### Transition Mapping to Remotion

| Config value | Remotion call |
|-------------|---------------|
| `"fade"` | `fade()` |
| `"slide-from-left"` | `slide({ direction: "from-left" })` |
| `"slide-from-right"` | `slide({ direction: "from-right" })` |
| `"slide-from-top"` | `slide({ direction: "from-top" })` |
| `"slide-from-bottom"` | `slide({ direction: "from-bottom" })` |
| `"wipe"` | `wipe()` |
| `"none"` | No `<TransitionSeries.Transition>` between scenes |

Default template example ("product-update"):
```json
{
  "fps": 30,
  "transition": "fade",
  "transition_duration": 0.5,
  "scenes": [
    { "type": "intro", "duration": 3 },
    { "type": "feature", "duration": 4, "device": "browser" },
    { "type": "feature", "duration": 4, "device": "browser", "transition": "slide-from-left" },
    { "type": "cta", "duration": 3 }
  ]
}
```

## Type System Changes

The request/response types use a discriminated union on `output`:

```typescript
// Request types
type CookRequest = ImageCookRequest | VideoCookRequest;

type ImageCookRequest = {
  output?: "image";               // default
  brand_id?: string;
  template?: string;              // "standard-browser" | "tmpl_..."
  formats: ImageFormatEntry[];
  // ... existing fields (colors, name, logo_url, etc.)
};

type VideoCookRequest = {
  output: "video";
  brand_id?: string;
  template?: string;              // "product-update" | "vtmpl_..."
  formats: VideoFormatEntry[];
  // ... shared fields
};

type ImageFormatEntry = {
  name: "landscape" | "square" | "portrait";
  slides: SlideEntry[];
};

type VideoFormatEntry = {
  name: "landscape" | "square" | "portrait";
  scenes: SceneContent[];
};

type SceneContent = {
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  device?: "browser" | "mobile";
  url?: string;
};

// Credit calculation
function calculateCredits(request: CookRequest): number {
  if (request.output === "video") {
    return request.formats.length * 5;  // 5 credits per format, flat
  }
  // existing: sum of slides across formats
  return request.formats.reduce((sum, f) => sum + f.slides.length, 0);
}

// Response types
type CookResult = {
  cook_id: string;
  output: "image" | "video";
  status: "pending" | "completed" | "failed";
  images?: Record<string, { slides: string[]; dimensions: string }>;
  videos?: Record<string, { url: string; duration: number; dimensions: string }>;
  credits_used: number;
  credits_remaining: number;
  // ... existing fields
};
```

## API Changes

### POST /api/v1/cook — Request

New field: `output: "image" | "video"` (defaults to `"image"`)

When `output: "video"`:
- `template` accepts video template names (`"product-update"`) or custom IDs (`"vtmpl_..."`)
- `formats[].scenes` replaces `formats[].slides`
- Template validation checks against video template defaults + `vtmpl_` prefix

```json
{
  "brand_id": "brand_abc123",
  "template": "product-update",
  "output": "video",
  "formats": [
    {
      "name": "landscape",
      "scenes": [
        { "title": "Introducing Dark Mode" },
        { "title": "Sleek new look", "description": "Easy on the eyes", "image_url": "https://..." },
        { "title": "Better focus", "description": "Less glare", "image_url": "https://..." },
        { "title": "Try it today", "url": "https://example.com" }
      ]
    }
  ]
}
```

### GET /api/v1/cook/:id — Response

```json
{
  "cook_id": "cook_xyz789",
  "output": "video",
  "status": "completed",
  "videos": {
    "landscape": {
      "url": "https://r2.../landscape.mp4",
      "duration": 12.5,
      "dimensions": "1920x1080"
    }
  },
  "credits_used": 5
}
```

### Webhook Payload

Webhook sends the same `CookResult` shape. Video releases include `videos` field, image releases include `images`. Consumers should check `output` field to determine which field to read.

## Rendering Pipeline

```
POST /api/v1/cook (output: "video")
  → validate (output type, template, scene content per-type, scene count)
  → reserve credits (formats.length * 5)
  → return 202 with cook_id
  → async: resolve brand (logo → base64), resolve video template config
  → prefetch all scene image_urls → base64
  → for each format:
      → build Remotion inputProps (scenes + brand + base64 images, serializable JSON)
      → renderMediaOnLambda({ composition: format, inputProps, codec: "h264" })
      → poll getRenderProgress() in loop (1s interval)
      → on complete: download MP4 from Lambda S3 → upload to R2
      → clean up Lambda S3 artifacts
  → patch release: status → "completed", populate videos field
  → fire webhook if provided
  → on error: mark "failed", refund credits, fire webhook
```

### Error Handling
- Lambda cold start timeout: set `timeoutInMilliseconds: 240000` (4 min)
- Lambda memory: 2048MB
- If Lambda render fails: mark release as "failed", refund credits
- If R2 upload fails after Lambda success: retry once, then fail
- Specific error codes for video failures (distinct from image pipeline errors)

## Database Changes (Convex)

### releases table — new fields
- `output`: `"image" | "video"` (default `"image"`)
- `videos`: `{ [format]: { url, duration, dimensions } } | null`

### videoTemplates table (new)
- `userId`, `externalId` (vtmpl_...), `name`, `isDefault`, `config` (VideoTemplateConfig)
- `previewUrl?`, `created_at`, `updated_at`
- Indexes: `by_userId`, `by_externalId`

### Convex mutations to update
- `releases.markCompleted` — accept either `images` or `videos` based on output type
- `releases.create` — accept `output` field

## Project Structure

```
src/
  lib/
    pipeline/
      render.ts          ← existing image pipeline
      render-video.ts    ← NEW: video pipeline (resolve, render, store)
    video/
      lambda.ts          ← Lambda client (deploy, render, poll)
      types.ts           ← VideoTemplateConfig, SceneConfig, CookRequest union, etc.
      defaults.ts        ← default video template configs
      validation.ts      ← validateVideoScenes, validateVideoTemplate
  remotion/              ← Remotion project root (separate entry point)
    remotion.config.ts   ← Remotion bundler config
    Root.tsx             ← composition definitions (one per format)
    index.ts             ← Remotion entry
    scenes/
      IntroScene.tsx
      FeatureScene.tsx
      TextScene.tsx
      CtaScene.tsx
    components/
      BrowserFrame.tsx   ← adapted from image system
      MobileFrame.tsx
      AnimatedText.tsx
    VideoComposition.tsx ← main composition (assembles scenes via TransitionSeries)
    fonts.ts             ← dynamic font loading via @remotion/fonts
```

### Remotion as Co-located Package

Remotion lives in `src/remotion/` with its own `remotion.config.ts` and entry point. It is **not** a separate workspace/package — it shares the same `node_modules` and TypeScript config. The Remotion bundler (`bundle()` from `@remotion/bundler`) bundles this directory separately from Next.js's build. The resulting bundle is deployed to Lambda via `deploySite()`.

## Video Dimensions

| Format | Dimensions | Aspect Ratio |
|--------|-----------|--------------|
| landscape | 1920x1080 | 16:9 |
| square | 1080x1080 | 1:1 |
| portrait | 1080x1920 | 9:16 |

## Remotion Technical Notes

- All animations via `useCurrentFrame()` + `interpolate()` / `spring()` — **no CSS animations or Tailwind animation classes** (won't render correctly)
- Spring config for clean motion: `{ damping: 200 }` (smooth, no bounce)
- Transitions via `@remotion/transitions` TransitionSeries
- Images via `<Img>` component from `remotion` (not native `<img>`)
- Images passed as base64 data URIs in inputProps (same as image pipeline)
- Compositions use `calculateMetadata` for dynamic duration based on scene count + transition overlap
- Bundle deployed to Lambda via `deploySite()`, function via `deployFunction()`
- **Font loading**: Brand fonts loaded dynamically at render time via `@remotion/fonts` + Google Fonts CSS URL (not `@remotion/google-fonts` static imports, since font family is a runtime string from brand config). `loadFont({ family, url: googleFontsCssUrl })` with `waitUntilDone()`.

## Verification Plan

1. **Unit tests**: Video template config validation, scene count matching, credit calculation, duration math (transition overlap)
2. **Remotion Studio**: Preview compositions locally with test data before deploying (`npx remotion studio`)
3. **Lambda integration**: Deploy bundle + function to staging AWS account, render test video
4. **E2E**: POST /cook with `output: "video"` → poll → verify MP4 in R2 → check webhook payload includes `videos` field
5. **Format matrix**: Render all 3 formats (landscape, square, portrait) with each scene type
6. **Font test**: Render with non-default brand font to verify dynamic font loading works on Lambda
