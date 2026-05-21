# Phase 6: Local Video Render — Research

**Researched:** 2026-05-21
**Domain:** Remotion local headless video render; CLI async-job wiring; Workspace output toggle + frame-progress panel
**Confidence:** HIGH — all key findings verified directly against source files in this repo and `@remotion/renderer` type declarations

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single format video (active editor format). Images stay all-3. Untouched.
- **D-02:** Active editor format at click time (`config.format`). Fall back to `"landscape"` if absent.
- **D-03:** Image|video output toggle persists to `DraftConfig.output` (`"image" | "video"`).
- **D-04:** One Render button follows `DraftConfig.output`. Image path unchanged.
- **D-05:** Reuse Phase 5 async-job + poll + flush-save-then-render flow verbatim.
- **D-06:** First-run blocking gate with % progress bar driven by `onBrowserDownload`. Auto-proceeds. Terminal mirrors.
- **D-07:** Fixed 8s @ 30fps. Clip loops if shorter, trims if longer.
- **D-08:** Muted output. `renderVideo()` already sets `muted: true`.
- **D-09:** `showcase` entrance for video visuals. NO fade-in branch on `hasVideo`/`videoUrl`.
- **D-10:** `renderVideo()` must be extended with `onProgress` (frames completed / total). This is the one render-core API change.
- **ADR-0002:** Local render ONLY. No Lambda, no server render.

### Claude's Discretion
- CLI video render/status endpoint paths and request/response shapes (mirror Phase 5).
- Resolver: `compositionId`, `inputProps`, `remotionEntryPoint`, brand resolution for video.
- Remotion entry point / composition the local renderer drives.
- `onProgress` signature and poll status update shape.
- Output filename within `./brag-output/<id>/`.
- Loop-vs-trim implementation detail for fitting clip to 8s.
- Inline panel styling for video progress bar, frame counter, Chrome-download gate.

### Deferred Ideas (OUT OF SCOPE)
- All-3-format video.
- User-chosen duration / preset UI.
- Audio in output.
- Schedule-time R2 upload + posting (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RND-02 | User can render the creation to video locally (Remotion headless Chrome, no Lambda) | `renderVideo()` in render-core already exists end-to-end; Phase 6 is the caller/wiring. The `remotionEntryPoint` is `src/remotion/index.ts` (confirmed). |
| RND-04 | On first video render, user sees clear messaging about the one-time renderer (Chrome) download | `OnBrowserDownload` callback type confirmed; already wired in `renderVideo()`; needs forwarding to poll status payload for Workspace gate. |
</phase_requirements>

---

## Summary

Phase 6 is a wiring phase, not an engine phase. `renderVideo()` in `packages/render-core/src/video.ts` already runs the full pipeline — `ensureBrowser → bundle → selectComposition → renderMedia → Buffer`. The only render-core change required (D-10) is passing `onProgress` through to `renderMedia`; the callback type is already defined in `@remotion/renderer`.

The entry-point question (Q1) has a clear answer: **reuse `src/remotion/index.ts` directly**. The Lambda `OUTPUT_LOCAL` path in `src/lib/pipeline/render-video.ts` already does this (`remotionEntryPoint: path.join(process.cwd(), "src/remotion/index.ts")`). The `Root.tsx` registers three `<Composition>` elements keyed `"landscape"`, `"square"`, and `"portrait"` — exactly the `compositionId` values the CLI resolver needs. No new composition or `registerRoot()` is required.

The Workspace side needs four additions to `Editor.tsx` and `RenderPanel.tsx`: (1) the output toggle writing `DraftConfig.output`, (2) the Render button branching on `output`, (3) a new `useVideoRender` hook (or extended `useRender`) handling video-specific poll fields, and (4) the Chrome-download gate + frame-progress row + `<video>` preview states in `RenderPanel`. The CLI needs a new `POST /api/local/render/video` endpoint with a matching `resolveAndRenderVideo` resolver that mirrors `resolveAndRender` but calls `renderVideo` for one format and streams `onProgress` into the in-memory job.

**Primary recommendation:** Add `onProgress?: (progress: { renderedFrames: number; totalFrames: number }) => void` to `LocalVideoRenderRequest`; the CLI passes a closure that writes frame counts to the in-memory job object and the terminal. The poll status response carries `{ framesRendered, totalFrames }` alongside the phase field.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Output toggle state (`DraftConfig.output`) | Frontend (Workspace SPA) | CLI (persisted via Draft PATCH) | Toggle value is editor UI state; persisted to the draft for flush-save-then-render |
| Video render execution | CLI (Node.js) | render-core | Remotion requires Node; browser cannot run headless Chrome |
| `onProgress` forwarding | CLI | render-core | CLI owns the in-memory job; render-core exposes the hook |
| Chrome download gate display | Frontend (Workspace SPA) | CLI (progress via poll) | Workspace shows the UX; CLI relays `onBrowserDownload` % through poll payload |
| Frame progress display | Frontend (Workspace SPA) | CLI (progress via poll) | Same polling loop as Phase 5; extra fields in status response |
| MP4 file write | CLI | — | CLI writes render-core `Buffer` to `brag-output/<id>/<format>.mp4` |
| Video preview serving | CLI (`/output` static route) | — | Reuses existing Phase 5 `express.static(outputDir)` mount |

---

## Standard Stack

No new external packages are required. All dependencies already exist in the monorepo.

### Core (already installed)

| Library | Source | Purpose | Notes |
|---------|--------|---------|-------|
| `@remotion/renderer` | `node_modules/@remotion/renderer` | `renderMedia`, `ensureBrowser`, `selectComposition` | Already used in `render-core/src/video.ts` |
| `@remotion/bundler` | monorepo | `bundle()` | Already used in `render-core/src/video.ts` |
| `remotion` | `src/remotion/` | `VideoCanvasComposition`, `Root`, `registerRoot` | Entry point is `src/remotion/index.ts` |

### No new packages needed

The Phase 5 image render path uses multer, express, open, get-port — all already installed. Video adds no new dependencies.

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Workspace SPA                       CLI Express Server              render-core
─────────────────────────────────   ─────────────────────────────   ──────────────────────────
[OutputToggle]                      POST /api/local/render/video ──> resolveAndRenderVideo()
  writes DraftConfig.output              |                               |
[Render button (video)]                  | 202 {id, status:"pending"}   | fetchDraft + resolveTemplate
  → flush() saves draft                  |                               | + resolveBrand
  → POST /api/local/render/video    videoRenderJobs Map                 |
  → setJobId, phase="rendering"          |                               | renderVideo(req)
                                         |                                   ├─ ensureBrowser
[poll /api/local/render/video/:id/status] |                                  |    onBrowserDownload → writes job.downloadPct
  ← {phase, framesRendered,              |                                  ├─ bundle(entryPoint)
      totalFrames, downloadPct}          |                                  ├─ selectComposition
                                         |                                  └─ renderMedia(onProgress)
[RenderPanel states]:                    |                                       └─ writes job.framesRendered
  chrome-download: progress bar          |
  rendering: spinner + frame counter     |  write Buffer → brag-output/<id>/<format>.mp4
  done: <video> preview + actions        |  job.phase = "done", url = /output/<id>/<format>.mp4
```

### Recommended Project Structure (changes only)

```
packages/
├── render-core/
│   └── src/
│       ├── types.ts            ← add onProgress field to LocalVideoRenderRequest
│       └── video.ts            ← forward onProgress to renderMedia call
└── cli/
│   └── src/
│       ├── server.ts           ← add POST /api/local/render/video + status + (shared reveal)
│       └── video-render-resolver.ts  ← new file: resolveAndRenderVideo
└── workspace/
    └── src/
        ├── types.ts            ← add VideoRenderState, VideoRenderPhase, VideoRenderStatusResponse
        ├── api.ts              ← add triggerVideoRender, pollVideoRenderStatus
        ├── pages/Editor.tsx    ← add OutputToggle + video render path
        ├── hooks/
        │   └── useVideoRender.ts  ← new: mirrors useRender but single-format + chrome-download + frame progress
        └── components/
            └── RenderPanel.tsx ← extend: output prop, video states, chrome-download gate, <video> preview
```

---

## Q1: Composition Entry Point — RESOLVED

**Answer: Reuse `src/remotion/index.ts` directly. No new composition or `registerRoot()` needed.**

Evidence:
1. `src/remotion/index.ts` calls `registerRoot(RemotionRoot)`. [VERIFIED: file read]
2. `RemotionRoot` in `src/remotion/Root.tsx` registers `<Composition id="landscape">`, `<Composition id="square">`, `<Composition id="portrait">` — the three format IDs the CLI resolver needs as `compositionId`. [VERIFIED: file read]
3. The legacy `OUTPUT_LOCAL` path in `src/lib/pipeline/render-video.ts` already uses this exact path: `remotionEntryPoint: path.join(process.cwd(), "src/remotion/index.ts")`. [VERIFIED: file read]
4. `bundle({ entryPoint: req.remotionEntryPoint })` in `renderVideo()` bundles that file, and `selectComposition({ id: req.compositionId })` resolves the right composition. [VERIFIED: file read]

**The planner should set:**
```typescript
remotionEntryPoint: path.resolve(process.cwd(), "src/remotion/index.ts")
// compositionId: "landscape" | "square" | "portrait"  (from DraftConfig.format)
```

**Why not a render-core-owned composition?** The `VideoCanvasComposition` + `RemotionRoot` live in `src/remotion/` (the Next.js app layer). Moving them to render-core would require lifting React dependencies into render-core's `components/` bundle (which currently holds Satori-compatible components, not Remotion compositions). There is no Phase 1 requirement to do this, and `render-core/src/components/` (`BrowserFrame`, `MobileFrame`, `LogoBar`, `TextBlock`) are Remotion-compatible but are visual sub-components, not compositions with `registerRoot`. The entry-point abstraction via `LocalVideoRenderRequest.remotionEntryPoint` exists precisely to avoid baking the path into render-core.

**Landmine:** `process.cwd()` in the CLI is the directory where the user invoked `npx bragfast`. The `src/remotion/index.ts` path must resolve relative to the **package root of the `bragfast` Next.js app**, not the user's working directory. The Lambda path uses `path.join(process.cwd(), "src/remotion/index.ts")` because it runs from the Next.js app root. The CLI runs from the user's arbitrary working directory. The resolver must use `__dirname` / `import.meta.url` relative to the CLI bundle, or an explicit constant pointing to the package root. Check how `getSpaDir` handles this in `server.ts` (it uses `fileURLToPath(new URL(".", import.meta.url))`). The video resolver must use the same pattern.

Correct pattern:
```typescript
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dir = fileURLToPath(new URL(".", import.meta.url));
// The CLI is packages/cli/dist/server.js; src/remotion is at ../../src/remotion from packages/cli
const REMOTION_ENTRY = path.resolve(__dir, "../../src/remotion/index.ts");
```

This requires verifying the relative path from the compiled CLI bundle to `src/remotion/index.ts` at build time.

---

## Q2: render-core `onProgress` Extension (D-10)

### `@remotion/renderer` `renderMedia` `onProgress` signature

From `node_modules/@remotion/renderer/dist/render-media.d.ts` (VERIFIED):

```typescript
export type RenderMediaProgress = {
  renderedFrames: number;    // frames captured so far
  encodedFrames: number;     // frames encoded into the output so far
  encodedDoneIn: number | null;
  renderedDoneIn: number | null;
  renderEstimatedTime: number;
  progress: number;          // 0.0–1.0 fraction
  stitchStage: 'encoding' | 'muxing';
};
export type RenderMediaOnProgress = (progress: RenderMediaProgress) => void;
```

`onProgress` on `renderMedia` is **optional** (`onProgress?: RenderMediaOnProgress`). It fires per-frame during the rendering phase and per-chunk during the encoding/stitching phase.

### Recommended `LocalVideoRenderRequest` extension

Add one optional field to `LocalVideoRenderRequest` in `packages/render-core/src/types.ts`:

```typescript
export interface LocalVideoRenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  remotionEntryPoint: string;
  onBrowserDownload?: OnBrowserDownload;
  onProgress?: (progress: { renderedFrames: number; totalFrames: number }) => void;
}
```

**Why a simplified type rather than forwarding `RenderMediaOnProgress` directly?**
- `RenderMediaProgress` exposes internal fields (`stitchStage`, `encodedFrames`, `encodedDoneIn`) that are implementation details of Remotion. The Workspace only needs frames rendered / total.
- The CLI can compute `totalFrames` from `composition.durationInFrames` (returned by `selectComposition`) before calling `renderMedia`. Pass `composition.durationInFrames` into a closure that captures it.
- Keeps render-core's public API clean of Remotion-internal types.

### `renderVideo()` change (D-10)

In `packages/render-core/src/video.ts`:

```typescript
// After selectComposition, composition.durationInFrames is known
const composition = await selectComposition({ ... });

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  crf: 28,
  x264Preset: "slow",
  encodingMaxRate: "5M",
  encodingBufferSize: "10M",
  muted: true,
  outputLocation: tmpFile,
  inputProps: req.inputProps,
  // D-10 addition:
  onProgress: req.onProgress
    ? (p) => req.onProgress!({ renderedFrames: p.renderedFrames, totalFrames: composition.durationInFrames })
    : undefined,
});
```

### CLI poll status payload with frame progress

The video render job in the CLI in-memory map needs a progress field:

```typescript
export interface VideoRenderJob {
  jobId: string;
  draftId: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;       // 0–100, from onBrowserDownload
  url?: string;              // set when done, e.g. /output/<id>/landscape.mp4
  error?: string;
}
```

Status endpoint response (`GET /api/local/render/video/:id/status`):

```typescript
{
  id: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url?: string;
  error?: string;
}
```

The Workspace polls at 1000ms (same as Phase 5) and maps this onto a new `VideoRenderState` in `types.ts`.

---

## Q3: `onBrowserDownload` First-Run Gate (D-06)

### Callback signature (VERIFIED from `@remotion/renderer`)

```typescript
export type DownloadBrowserProgressFn = (progress: {
  alreadyAvailable: boolean;
  percent: number;          // 0.0–1.0
  downloadedBytes: number;
  totalSizeInBytes: number;
}) => void;

export type OnBrowserDownload = (options: {
  chromeMode: ChromeMode;   // "headless-shell" | "chrome" | "chrome-headless-shell"
}) => {
  onProgress: DownloadBrowserProgressFn;
  version: string | null;   // null = use default version
};
```

`ensureBrowser({ onBrowserDownload: req.onBrowserDownload })` is already called in `video.ts`. [VERIFIED: file read]

### First-run detection

When Chrome is **already cached**, `onProgress` fires once with `{ alreadyAvailable: true, percent: 1, ... }`. The gate should fire only when `alreadyAvailable === false`. The CLI constructs the `onBrowserDownload` callback; when it receives the first call with `alreadyAvailable: false`, it sets `job.phase = "chrome-download"` on the in-memory job so the Workspace switches to the gate UI. When the first call has `alreadyAvailable: true`, the job goes directly to `"rendering"` phase.

### CLI implementation pattern

```typescript
const onBrowserDownload: OnBrowserDownload = () => ({
  version: null,
  onProgress: ({ alreadyAvailable, percent }) => {
    if (alreadyAvailable) return;          // already cached — skip gate
    const pct = Math.round(percent * 100);
    job.phase = "chrome-download";
    job.downloadPct = pct;
    stdout.write(`  [brag] Chrome download: ${pct}%\n`);
  },
});
```

After `ensureBrowser` resolves, set `job.phase = "rendering"` before calling `renderMedia`.

---

## Q4: CLI Video Render Endpoint + Resolver

### Endpoint shape (mirrors Phase 5)

```
POST /api/local/render/video
  Body: { draftId: string; format?: "landscape" | "square" | "portrait" }
  Response 202: { id: string; status: "pending" }

GET /api/local/render/video/:id/status
  Response 200: VideoRenderJob (see Q2)
```

The `/api/local/reveal` endpoint is **shared** between image and video (both write to `brag-output/<id>/`). No changes needed there.

### In-memory job map

Add a separate `videoRenderJobs = new Map<string, VideoRenderJob>()` in `server.ts`, analogous to `renderJobs`. Keyed by `draftId` (same pattern as Phase 5 `jobId = draftId`).

### Resolver: `resolveAndRenderVideo`

New file: `packages/cli/src/video-render-resolver.ts`

The resolver follows the exact same steps as `resolveAndRender` in `render-resolver.ts`:

1. **Fetch draft** from backend via `fetchJson<DraftResponse>` (reuse same helper).
2. **Resolve template** via `resolveTemplate()` (reuse).
3. **Resolve brand** via `resolveBrand()` (reuse).
4. **Build `ObjectDataMap`** via `buildObjectDataForCLI()` for the **single active format**.
   - Video slot: `content.video_url` → the Workspace stores it as `/media/<filename>` (a `/media/`-relative URL). For video, pass the URL as-is to `inputProps.slides[0].<objId>.videoUrl` — Remotion's `OffthreadVideo` can fetch it from the CLI's `/media` static route.
   - **Do NOT attempt to convert video to base64** — videos can be 50–500 MB; the `/media` URL is served locally at `http://127.0.0.1:<port>/media/<filename>`. Pass the full local URL.
5. **Build `inputProps`** matching `VideoCanvasCompositionProps`:
   ```typescript
   const inputProps: VideoCanvasCompositionProps = {
     config: templateConfig,
     format: activeFormat,           // "landscape" | "square" | "portrait"
     slides: [objectDataMap],
     brand: resolvedBrand,
     slideDuration: 8,               // D-07 fixed; DraftVideo.duration deferred
     slideDurations: undefined,
   };
   ```
6. **Set `compositionId`** = `activeFormat` (e.g. `"landscape"`).
7. **Set `remotionEntryPoint`** = resolved path to `src/remotion/index.ts` from CLI bundle dir.
8. **Call `renderVideo(req)`** with `onBrowserDownload` and `onProgress` closures that update the in-memory `VideoRenderJob`.
9. **Write buffer** to `brag-output/<draftId>/<format>.mp4`.
10. **Set `job.url`** = `/output/<draftId>/<format>.mp4`.

### Video URL resolution: local `/media` URL

The `OffthreadVideo` component in the composition fetches the video URL at render time in headless Chrome. Chrome can reach `http://127.0.0.1:<port>/media/<filename>` (the existing Phase 4 static route) because Remotion spins up a local dev server for the bundle — however, the Remotion bundle server is a separate HTTP server on a different port from the CLI Express server. `OffthreadVideo` uses the headless browser's fetch, which can reach any localhost port.

**Landmine:** The CLI server port is dynamic (default 3421, falls back). The Remotion bundle server is a separate process. `OffthreadVideo` resolves the `videoUrl` from `inputProps` inside headless Chrome using the Remotion bundle server's context. If `videoUrl` is a `http://127.0.0.1:<port>/media/...` URL pointing at the CLI server, Chrome must be able to reach that port. Since both run on localhost, this should work — but the port must be threaded into `inputProps.slides[0].<objId>.videoUrl` with the actual bound CLI port (not hardcoded). The CLI already knows its port at startup; pass it to the resolver.

Pattern: in `resolveAndRenderVideo`, convert `/media/<filename>` → `http://127.0.0.1:${port}/media/<filename>` before building `ObjectDataMap`. This is the same transform the CLI already uses for the media upload response (see `localMediaUploadRoute` returning `http://127.0.0.1:${port}/media/${filename}`).

---

## Q5: Editor Wiring

### `DraftConfig.output` already exists

`packages/workspace/src/types.ts` already declares `output: DraftOutput` on `DraftConfig` and `DraftOutput = "image" | "video"`. [VERIFIED: file read]

The field exists. The wizard seeds it (Phase 4 foundation). The toggle just writes to it.

### Changes to `Editor.tsx`

Current `Editor.tsx` has no `output` branch. Required additions:
1. Read `config.output` (default to `"image"` if absent).
2. Render `<OutputToggle>` between `<SlotPanel>` and `<RenderPanel>` (per 06-UI-SPEC.md layout).
3. Pass `output` to `<RenderPanel>` as a prop.
4. When `output === "video"`, call `videoRender.trigger()` instead of `render.trigger()`.
5. Pass `videoRender` state into `<RenderPanel>` for video-path rendering.
6. The canvas preview area: when `output === "video"` and video render is done, show `<video>` element instead of `<img>`.

### `useVideoRender` hook

A new hook (not an extension of `useRender`) is cleaner because:
- The state shape differs: single format, `chrome-download` phase, `framesRendered`/`totalFrames`.
- The poll response shape differs: `VideoRenderStatusResponse` vs `RenderStatusResponse`.
- Avoiding branching inside `useRender` keeps image render path stable.

```typescript
// packages/workspace/src/hooks/useVideoRender.ts
export type VideoRenderPhase =
  | "idle"
  | "flushing"
  | "chrome-download"
  | "rendering"
  | "done"
  | "failed";

export interface UseVideoRenderResult {
  renderPhase: VideoRenderPhase;
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url: string | null;
  jobId: string | null;
  error: string | null;
  trigger: () => Promise<void>;
}
```

Poll interval: same 1000ms as Phase 5.

Terminal state: `phase === "done"` or `phase === "failed"`.

### `RenderPanel` extension

`RenderPanel` receives an `output: DraftOutput` prop. When `output === "video"`, it renders video-specific states instead of the 3-format rows. The new states follow the 06-UI-SPEC.md contract exactly.

Key additions:
- `renderPhase === "chrome-download"`: hide Render button; show progress bar with `downloadPct`.
- `renderPhase === "rendering"` (video): hide Render button; show spinner + `framesRendered / totalFrames`.
- `renderPhase === "done"` (video): show `<video muted controls aria-label="Rendered video preview">` with `src={url}`.
- Download action: `<a href={url} download={\`${format}.mp4\`}>Download video</a>`.

The existing image-path states (`format rows`, `<img>` preview) remain unchanged when `output === "image"`.

### New `api.ts` functions

```typescript
export async function triggerVideoRender(
  draftId: string,
  format: FormatKey,
): Promise<{ id: string; status: "pending" }>;

export async function pollVideoRenderStatus(
  id: string,
): Promise<VideoRenderStatusResponse>;
```

Where:
```typescript
export interface VideoRenderStatusResponse {
  id: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url?: string;
  error?: string;
}
```

---

## Q6: Loop-vs-Trim for Fixed 8s Duration (D-07)

### Remotion behavior with `OffthreadVideo`

`OffthreadVideo` does **not** loop by default. It plays the clip once and freezes on the last frame when the composition continues. It has no `loop` prop. [ASSUMED — based on Remotion documentation knowledge; verify if behavior is unexpected]

### Fixed 8s = fixed `durationInFrames` in the composition

`RemotionRoot` in `src/remotion/Root.tsx` sets `durationInFrames={Math.ceil(8 * FPS)}` (= 240 frames) and uses `calculateMetadata` to allow dynamic durations from `inputProps`. For Phase 6, always pass `slideDuration: 8` and `slideDurations: undefined`. The composition calculates `durationInFrames = Math.ceil(8 * 30) = 240`. [VERIFIED: Root.tsx read]

### Loop behavior: wrap `OffthreadVideo` in `<Loop>`

For clips shorter than 8s (e.g. a 3s clip): Remotion's `<Loop>` component repeats a sub-tree. The composition currently passes `OffthreadVideo` via `renderObject()` in `canvas-renderer.tsx`. To support looping:

Option A (preferred, no composition change): Pass `endAt={clipDurationInFrames}` to `OffthreadVideo` for trim, and wrap the entire Sequence in `<Loop durationInFrames={clipDurationInFrames}>` for loop. This requires knowing `clipDurationInFrames` at composition time (i.e., passing it in `inputProps`).

Option B (no input props change): Remotion's default freeze behavior at end of clip means a short clip will show the last frame for the remaining time — effectively a "pause" not a loop. This may be visually acceptable for the MVP (the composition still renders to 8s). If loop is required, Option A is the way.

**Recommendation for MVP:** Phase 6 D-07 says "loops if shorter." Implement by:
1. In the CLI resolver, probe the video duration (see `probeMp4DurationSeconds` in `src/lib/video/probe.ts` — already exists).
2. If `clipDuration < 8s`: set `slideDurations` in `inputProps` to `[clipDuration]` and wrap in `<Loop>` — OR, more simply, set `endAt` on `OffthreadVideo` in `inputProps` and let the composition loop by repeating the 8s Sequence with multiple `<Series.Sequence>` elements (complex). Alternatively: **pass `videoDurationInFrames` in `inputProps`** and have the composition use `<Loop durationInFrames={videoDurationInFrames}>` wrapping `OffthreadVideo` when the data has a `videoUrl`. This is a minimal change to the composition.
3. If `clipDuration > 8s`: `OffthreadVideo` with `endAt={Math.ceil(8 * 30)}` trims at frame 240.

**Landmine:** `probeMp4DurationSeconds` in `src/lib/video/probe.ts` is in the legacy Next.js app, not in `packages/cli`. The CLI video resolver needs this utility. Either (a) copy/re-implement a minimal probe in `packages/cli/src/video-probe.ts`, or (b) add a `probe` export to `packages/render-core`. The current source at `src/lib/video/probe.ts` uses `ffprobe`. Check whether the CLI already has ffprobe available (Remotion installs ffmpeg/ffprobe as part of `@remotion/renderer`).

**If probe adds complexity for MVP:** For the MVP, an acceptable simplification is to NOT probe duration and instead:
- Always set `slideDuration: 8` (full composition = 8s).
- The clip trims naturally at frame 240 if longer.
- If shorter, it freezes on the last frame (not a loop, but visually passable).
- Document loop as deferred. This avoids the probe dependency.

---

## Q7: `showcase` Entrance for Video — Confirmed No Change Needed (D-09)

The composition in `src/remotion/VideoCanvasComposition.tsx` resolves the animation preset via `resolvePreset()`. [VERIFIED: file read]

Key finding: `resolvePreset()` does NOT branch on whether the object data contains `videoUrl` vs `imageBase64`. It branches on `objectType` (`"visual"`, `"text"`, `"logo"`) and `isHero`. When `animation_preset` is `"showcase"` (the default), a visual hero object gets `entrance: "showcase-rise"` with `kenBurns: true`. This is the same logic for both image and video visuals.

There is NO existing `hasVideo`/`videoUrl` branch that forces `fade-in`. The D-09 feedback (reverting a fade-in override) means: **do not add** such a branch. The composition already behaves correctly.

**The only thing to verify at implementation time:** `OffthreadVideo` inside `renderObject` receives the `videoUrl` from `ObjectDataMap`. `canvas-renderer.tsx` passes `{ VideoComponent: OffthreadVideo }` when rendering in Remotion context. This path is already tested (Lambda path uses it). Phase 6 does not change the composition.

---

## Q8: Chromium Download in CI / Verification

**Download time:** ~170 MB Chromium download on first run. In CI (GitHub Actions), `ensureBrowser` downloads to `~/.cache/chromium` (Linux). Time: 30–90 seconds on a standard CI runner.

**Cache across CI runs:** Cache `~/.cache/chromium` (or `~/.cache/puppeteer`) between CI runs to avoid re-downloading. Standard pattern: GitHub Actions `actions/cache` on `~/.cache/chromium`.

**STATE.md note:** "Phase 6: Remotion Chrome path isolation on macOS vs Linux — verify in CI before Phase 6 ships." [VERIFIED: STATE.md] The Chrome download path differs between macOS (`~/Library/Caches/ms-playwright` or similar) and Linux. `ensureBrowser` handles this internally but the CI cache key must be OS-specific.

**Memory:** Remotion renders frames in headless Chrome sequentially. A 240-frame 1200×675 render at crf 28 is ~200–400 MB peak RAM. Within normal CI runner limits (7–16 GB). No special flags needed.

**Verification test strategy:** For unit tests, skip Chrome download by mocking `renderVideo`. For integration/smoke verification, the "render to a real mp4" test must allow extra timeout (120–180 seconds if Chrome not cached).

**Landmine:** `@remotion/renderer` uses `ensureBrowser` which by default downloads `headless-shell` (a separate lightweight Chrome binary). If the test environment already has Chrome installed, `alreadyAvailable: true` fires and the gate is skipped — correct behavior. Verify `onBrowserDownload` test with `alreadyAvailable: false` by passing a custom `chromiumPath` or mocking.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MP4 encode | Custom ffmpeg wrapper | `renderMedia` (Remotion) | Complex codec options, muxing, frame sync |
| Chrome download + management | Custom Puppeteer setup | `ensureBrowser` (Remotion) | Version pinning, platform detection, path management |
| Video duration probe | Parse mp4 binary | `probeMp4DurationSeconds` (already in codebase at `src/lib/video/probe.ts`) or ffprobe via `@remotion/renderer` bundled ffprobe | Mp4 container parsing is not trivial |
| Frame-progress SSE | Server-Sent Events | Poll + in-memory job (Phase 5 pattern) | SSE adds complexity; 1s polling is sufficient for UX |

---

## Common Pitfalls

### Pitfall 1: `remotionEntryPoint` resolves to user's cwd, not package root
**What goes wrong:** `path.join(process.cwd(), "src/remotion/index.ts")` throws "file not found" because the user runs `npx bragfast` from their project directory, not the bragfast source.
**Why it happens:** Lambda path uses this because it runs inside Next.js server. CLI runs anywhere.
**How to avoid:** Use `fileURLToPath(new URL(".", import.meta.url))` to get the CLI bundle directory, then resolve `../` to the monorepo root. Confirm the relative path at build time with a test.
**Warning signs:** `bundle()` throws `ENOENT` for entry point.

### Pitfall 2: Video URL passed to composition is unreachable by headless Chrome
**What goes wrong:** `/media/<filename>` relative URL is not resolvable inside headless Chrome (no base URL context); or the CLI Express port is not threaded through to `inputProps`.
**Why it happens:** The Remotion bundle server runs on a different port; Remotion does not automatically forward URL resolution to the CLI server.
**How to avoid:** Always convert `/media/<filename>` → `http://127.0.0.1:<port>/media/<filename>` before putting it in `inputProps`. Thread `port` from `server.ts` into `resolveAndRenderVideo`.
**Warning signs:** Blank/grey visual slot in rendered video; `OffthreadVideo` fetch error in Remotion logs.

### Pitfall 3: `onBrowserDownload` fires once with `alreadyAvailable: true` and the Workspace never leaves `chrome-download` phase
**What goes wrong:** Job is set to `chrome-download` phase before `ensureBrowser` is called; if Chrome is cached, `alreadyAvailable: true` fires immediately but the poll sees `chrome-download` for one tick.
**Why it happens:** Race between setting job phase and the callback firing.
**How to avoid:** Do NOT set `job.phase = "chrome-download"` eagerly. Only set it when `alreadyAvailable === false` fires. When Chrome is cached, the job goes from `"pending"` directly to `"rendering"` without ever entering `"chrome-download"`.
**Warning signs:** Workspace briefly flashes Chrome download gate on every render.

### Pitfall 4: `VideoCanvasCompositionProps.inputProps` type mismatch
**What goes wrong:** `inputProps` passed to `selectComposition` / `renderMedia` must be JSON-serializable. `VideoCanvasCompositionProps` contains `CanvasTemplateConfig` which has functions (`calculateMetadata`). If non-serializable values sneak in, Remotion throws a serialization error.
**Why it happens:** `CanvasTemplateConfig` is defined in `render-core/src/canvas-types.ts`. Check that all fields are plain data. [ASSUMED — likely fine based on how Lambda path uses it, but verify]
**How to avoid:** Log `JSON.stringify(inputProps)` in the resolver and confirm no `[object Object]` with undefined fields before calling `renderVideo`.
**Warning signs:** Remotion throws `SerializeError` or `Cannot serialize props` at `selectComposition` time.

### Pitfall 5: Video preview `<video>` served via `/output` missing `Content-Type: video/mp4`
**What goes wrong:** Browser refuses to play video from `express.static()` if MIME type is `application/octet-stream`.
**Why it happens:** `express.static` uses `mime` package; `.mp4` should be detected correctly, but on some environments the MIME database is incomplete.
**How to avoid:** Verify the `/output` static route serves `.mp4` with `video/mp4` content type. Add explicit `mime-types` config to `express.static` if needed.
**Warning signs:** `<video>` element shows "No video with supported format and MIME type found."

### Pitfall 6: `bundle()` called per render — extremely slow
**What goes wrong:** Each `POST /api/local/render/video` triggers `bundle({ entryPoint })` which runs webpack and takes 10–30 seconds.
**Why it happens:** Current `renderVideo()` calls `bundle` on every invocation.
**How to avoid:** The bundled `serveUrl` can be cached across renders. After the first bundle succeeds, cache the `bundleLocation` in the CLI process memory and skip rebundling for subsequent renders (as long as the entry point hasn't changed). This is a known Remotion optimization pattern.
**Impact if not addressed:** First render is slow but functional. Cache is a deferred optimization.

---

## Code Examples

### render-core `video.ts` with `onProgress` wired (D-10)

```typescript
// Source: packages/render-core/src/video.ts (proposed change)
export async function renderVideo(req: LocalVideoRenderRequest): Promise<VideoRenderResult> {
  const { bundle } = await import("@remotion/bundler");
  const { ensureBrowser, renderMedia, selectComposition } = await import("@remotion/renderer");

  await ensureBrowser({ onBrowserDownload: req.onBrowserDownload });

  const bundleLocation = await bundle({ entryPoint: req.remotionEntryPoint });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: req.compositionId,
    inputProps: req.inputProps,
  });

  const tmpFile = path.join(os.tmpdir(), `render-core-${crypto.randomUUID()}.mp4`);
  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      crf: 28,
      x264Preset: "slow",
      encodingMaxRate: "5M",
      encodingBufferSize: "10M",
      muted: true,
      outputLocation: tmpFile,
      inputProps: req.inputProps,
      onProgress: req.onProgress
        ? (p) => req.onProgress!({
            renderedFrames: p.renderedFrames,
            totalFrames: composition.durationInFrames,
          })
        : undefined,
    });
    const buffer = await fs.readFile(tmpFile);
    return { buffer, compositionId: req.compositionId };
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}
```

### CLI `video-render-resolver.ts` skeleton

```typescript
// packages/cli/src/video-render-resolver.ts (new file)
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promises as fs } from "node:fs";
import { renderVideo } from "@bragfast/render-core";
import type { LocalVideoRenderRequest, VideoRenderResult } from "@bragfast/render-core";
import type { OnBrowserDownload } from "@remotion/renderer";

const __dir = fileURLToPath(new URL(".", import.meta.url));
// Adjust this relative path based on where the CLI bundle sits in relation to src/remotion/
const REMOTION_ENTRY = path.resolve(__dir, "../../src/remotion/index.ts");

export interface VideoRenderJob {
  jobId: string;
  draftId: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url?: string;
  error?: string;
}

export async function resolveAndRenderVideo(
  draftId: string,
  format: "landscape" | "square" | "portrait",
  apiKey: string,
  backendBase: string,
  outputDir: string,
  port: number,
  stdout: NodeJS.WriteStream,
  job: VideoRenderJob,
): Promise<void> {
  const draft = await fetchJson<DraftResponse>(`${backendBase}/api/v1/drafts/${encodeURIComponent(draftId)}`, apiKey);
  const templateConfig = await resolveTemplate(draft.config.templateId, apiKey, backendBase);
  const brand = await resolveBrand(draft, apiKey, backendBase, templateConfig.colors, stdout);
  const objectData = await buildObjectDataForCLI(templateConfig, draft.config.objectContent, format, stdout);

  // Convert /media URLs to absolute http for OffthreadVideo in headless Chrome
  for (const entry of Object.values(objectData)) {
    if (entry.videoUrl?.startsWith("/media/")) {
      entry.videoUrl = `http://127.0.0.1:${port}${entry.videoUrl}`;
    }
  }

  const inputProps = {
    config: templateConfig,
    format,
    slides: [objectData],
    brand: { name: brand.name, logoBase64: brand.logoBase64 ?? "", website: brand.website ?? "", colors: brand.colors, font_family: brand.font_family ?? "Plus Jakarta Sans" },
    slideDuration: 8,
  };

  const onBrowserDownload: OnBrowserDownload = () => ({
    version: null,
    onProgress: ({ alreadyAvailable, percent }) => {
      if (alreadyAvailable) return;
      const pct = Math.round(percent * 100);
      job.phase = "chrome-download";
      job.downloadPct = pct;
      stdout.write(`  [brag] Chrome download: ${pct}%\n`);
    },
  });

  const req: LocalVideoRenderRequest = {
    compositionId: format,
    inputProps,
    remotionEntryPoint: REMOTION_ENTRY,
    onBrowserDownload,
    onProgress: ({ renderedFrames, totalFrames }) => {
      job.phase = "rendering";
      job.framesRendered = renderedFrames;
      job.totalFrames = totalFrames;
      stdout.write(`  [brag] Video: ${renderedFrames}/${totalFrames} frames\n`);
    },
  };

  // After ensureBrowser completes (inside renderVideo), we're in "rendering"
  const result = await renderVideo(req);

  const outPath = path.join(outputDir, draftId, `${format}.mp4`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.buffer);

  job.phase = "done";
  job.url = `/output/${draftId}/${format}.mp4`;
  stdout.write(`  [brag] Video rendered: ${format}.mp4\n`);
}
```

### `server.ts` additions (endpoint registration)

```typescript
// In buildApp(), alongside existing image render routes:
app.post("/api/local/render/video", localVideoRenderRoute(outputDir, port, credentials, stdout));
app.get("/api/local/render/video/:id/status", localVideoRenderStatusRoute());
// /api/local/reveal is reused as-is (same outputDir, same id = draftId)
// /output static route already mounted
```

### `api.ts` new functions

```typescript
export async function triggerVideoRender(
  draftId: string,
  format: FormatKey,
): Promise<{ id: string; status: "pending" }> {
  return requestJson<{ id: string; status: "pending" }>("/api/local/render/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId, format }),
  });
}

export async function pollVideoRenderStatus(id: string): Promise<VideoRenderStatusResponse> {
  return requestJson<VideoRenderStatusResponse>(
    `/api/local/render/video/${encodeURIComponent(id)}/status` as `/api/${string}`,
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 6 |
|--------------|------------------|-------------------|
| Lambda render (`renderVideoLambda`) | Local headless Chrome (`renderVideo`) | Phase 6 uses local only; Lambda path in `src/lib/video/lambda.ts` is untouched |
| `OUTPUT_LOCAL=true` env flag (legacy) | CLI resolver explicitly calls `renderVideo` | No env flag needed in CLI; it's the only render path |
| Per-format duration probing from video | Fixed 8s `slideDuration` (D-07) | Simplifies resolver; probe deferred |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `OffthreadVideo` freezes on last frame when composition continues past clip end (no built-in loop) | Q6: Loop-vs-trim | If Remotion auto-loops, the loop implementation is simpler; behavior may differ from expected |
| A2 | `CanvasTemplateConfig` is fully JSON-serializable (no function properties) | Pitfall 4 | Remotion throws `SerializeError` at render time; easy to fix but blocks render |
| A3 | Remotion bundle cache can be held in process memory between renders (same `bundleLocation` string) | Pitfall 6 | If Remotion invalidates the bundle, re-bundle is needed each time; performance impact only |
| A4 | `probeMp4DurationSeconds` (at `src/lib/video/probe.ts`) uses ffprobe bundled by `@remotion/renderer` | Q6: Loop-vs-trim | If it uses a system ffprobe, it may not be available in some environments |

---

## Open Questions (RESOLVED)

1. **`remotionEntryPoint` absolute path from CLI bundle** — **RESOLVED.**
   - What we know: The CLI bundle will be at `packages/cli/dist/server.js` (or similar). `src/remotion/index.ts` is at the monorepo root.
   - Resolution: Compute `REMOTION_ENTRY` via `fileURLToPath(new URL(..., import.meta.url))` (same technique as `getSpaDir`), NOT `process.cwd()`. Plan 06-02 includes a fail-fast `fs.existsSync(REMOTION_ENTRY)` check at module load (effectively a Wave 0 startup gate) that errors clearly if the path is wrong.

2. **Video duration probe dependency for loop-vs-trim** — **RESOLVED (D-07 honored: implement loop).**
   - What we know: `probeMp4DurationSeconds` exists at `src/lib/video/probe.ts` in the legacy app; ffprobe ships bundled with `@remotion/renderer` (no separate install).
   - Resolution (user decision 2026-05-21): Implement true loop per locked D-07. The CLI resolver probes the dragged clip's duration and the composition wraps the source with Remotion `<Loop>` so a short clip loops to fill the fixed 8s @ 30fps (240 frames); a long clip trims naturally. Freeze-on-last-frame is NOT used — D-07 stands as written.

3. **Bundle caching across renders** — **RESOLVED (deferred optimization, not in scope).**
   - What we know: Each `renderVideo()` call currently re-runs `bundle()`.
   - Resolution: First implementation runs without caching (correct but slower). In-process bundle caching is a deferred performance optimization, out of scope for this phase; no correctness impact.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `@remotion/renderer` | `renderVideo()` | Yes | Already in monorepo `node_modules` |
| `@remotion/bundler` | `renderVideo()` | Yes | Already in monorepo `node_modules` |
| ffmpeg/ffprobe | Remotion `renderMedia` encoding | Bundled by Remotion | Downloaded by Remotion during first render if not present |
| Chromium | `ensureBrowser` | First-run download | ~170 MB; triggers D-06 gate |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` (monorepo root) |
| Quick run | `npx vitest run packages/cli/src/__tests__/` |
| Full suite | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| RND-02 | Video renders locally to `.mp4` | Integration (manual) | Requires Chrome download; CI can mock `renderVideo` for unit |
| RND-02 | CLI `/api/local/render/video` endpoint returns 202 + job id | Unit | Mock `resolveAndRenderVideo` |
| RND-02 | Poll endpoint returns framesRendered/totalFrames/phase | Unit | In-memory job map |
| RND-02 | MP4 written to `brag-output/<id>/<format>.mp4` | Unit (with tmp dir) | Mock `renderVideo` to return a Buffer |
| RND-04 | Chrome-download gate shows on first run | Unit | Mock `onBrowserDownload` with `alreadyAvailable: false` |
| RND-04 | Chrome-download gate skipped when Chrome cached | Unit | Mock `onBrowserDownload` with `alreadyAvailable: true` |

### Wave 0 Gaps

- [ ] `packages/cli/src/__tests__/video-render-resolver.test.ts` — unit tests for `resolveAndRenderVideo` (mock renderVideo)
- [ ] `packages/cli/src/__tests__/video-render-route.test.ts` — endpoint 202 + status polling
- [ ] `packages/workspace/src/hooks/__tests__/useVideoRender.test.ts` — chrome-download phase, rendering phase, done phase
- [ ] Verify `REMOTION_ENTRY` path at CLI startup (fail-fast check)

---

## Security Domain

Not applicable for this phase. No new auth surfaces, no new network endpoints that accept untrusted input (all endpoints are origin-locked by Phase 5 middleware). The `/api/local/render/video` endpoint inherits the existing `originLockMiddleware`. `isUnsafeOutputId` check must be applied to video job ids the same way it is for image render.

---

## Sources

### Primary (HIGH confidence — verified in this session)
- `packages/render-core/src/video.ts` — confirmed `renderVideo` signature, current `renderMedia` options, `onBrowserDownload` already wired
- `packages/render-core/src/types.ts` — confirmed `LocalVideoRenderRequest`, `VideoRenderResult`, `OnBrowserDownload` import
- `node_modules/@remotion/renderer/dist/render-media.d.ts` — confirmed `RenderMediaProgress`, `RenderMediaOnProgress`, `onProgress?: RenderMediaOnProgress` on `renderMedia`
- `node_modules/@remotion/renderer/dist/options/on-browser-download.d.ts` — confirmed `OnBrowserDownload`, `DownloadBrowserProgressFn`, `alreadyAvailable: boolean`, `percent: number`
- `src/remotion/Root.tsx` — confirmed composition IDs `"landscape"`, `"square"`, `"portrait"` and `durationInFrames = Math.ceil(8 * 30)`
- `src/remotion/index.ts` — confirmed `registerRoot(RemotionRoot)` is the entry point
- `src/remotion/VideoCanvasComposition.tsx` — confirmed `showcase` entrance is not branching on `videoUrl`; `OffthreadVideo` passed as `VideoComponent` prop
- `src/lib/pipeline/render-video.ts` — confirmed legacy `OUTPUT_LOCAL` path uses `remotionEntryPoint: path.join(process.cwd(), "src/remotion/index.ts")` and `compositionId = formatKey`
- `packages/cli/src/server.ts` — confirmed Phase 5 endpoint/job pattern; `/output` static route; `originLockMiddleware`
- `packages/cli/src/render-resolver.ts` — confirmed full resolver pattern; `buildObjectDataForCLI` handling `video_url`
- `packages/workspace/src/types.ts` — confirmed `DraftOutput`, `DraftVideo`, `DraftConfig.output` already exist
- `packages/workspace/src/hooks/useRender.ts` — confirmed Phase 5 poll pattern, `RenderPhase`, 1000ms interval
- `packages/workspace/src/components/RenderPanel.tsx` — confirmed existing panel structure for extension

### Secondary (MEDIUM confidence)
- `packages/workspace/src/components/VisualField.tsx` — video upload already handled; `video_url` set correctly
- `packages/workspace/src/lib/buildDraftObjectData.ts` — confirmed `video_url` → `videoUrl` mapping already exists

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all confirmed in repo
- Architecture: HIGH — fully traced from existing code
- Entry point decision: HIGH — confirmed by Lambda `OUTPUT_LOCAL` path and Root.tsx composition IDs
- `onProgress` signature: HIGH — verified in `@remotion/renderer` type declarations
- Loop-vs-trim: MEDIUM — Remotion OffthreadVideo loop behavior is ASSUMED
- `remotionEntryPoint` path resolution: MEDIUM — exact relative path from CLI bundle to `src/remotion` needs build-time verification

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable Remotion API; Workspace component structure unlikely to change)
