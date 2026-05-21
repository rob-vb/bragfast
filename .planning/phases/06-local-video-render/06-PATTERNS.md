# Phase 6: Local Video Render - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/render-core/src/types.ts` | model | — | self (extend existing) | exact |
| `packages/render-core/src/video.ts` | service | streaming | self (extend existing) | exact |
| `packages/cli/src/video-render-resolver.ts` | service | request-response | `packages/cli/src/render-resolver.ts` | exact |
| `packages/cli/src/server.ts` | controller | request-response | self (extend existing) | exact |
| `packages/workspace/src/types.ts` | model | — | self (extend existing) | exact |
| `packages/workspace/src/api.ts` | utility | request-response | self (extend existing) | exact |
| `packages/workspace/src/hooks/useVideoRender.ts` | hook | event-driven / poll | `packages/workspace/src/hooks/useRender.ts` | exact |
| `packages/workspace/src/components/RenderPanel.tsx` | component | request-response | self (extend existing) | exact |
| `packages/workspace/src/pages/Editor.tsx` | component | request-response | self (extend existing) | exact |

---

## Pattern Assignments

### `packages/render-core/src/types.ts` (model — extend)

**Analog:** self — add one field to `LocalVideoRenderRequest`

**Current `LocalVideoRenderRequest`** (lines 50-55):
```typescript
export interface LocalVideoRenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  remotionEntryPoint: string;
  onBrowserDownload?: OnBrowserDownload;
}
```

**Addition required (D-10):**
```typescript
export interface LocalVideoRenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  remotionEntryPoint: string;
  onBrowserDownload?: OnBrowserDownload;
  onProgress?: (progress: { renderedFrames: number; totalFrames: number }) => void;
}
```

No other changes. `VideoRenderResult` and existing types are unchanged.

---

### `packages/render-core/src/video.ts` (service, streaming — extend)

**Analog:** self — wire `onProgress` into the existing `renderMedia` call

**Current `renderMedia` call** (lines 24-35) — this is the block to extend:
```typescript
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
});
```

**After extension (add `onProgress` field):**
```typescript
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
    ? (p) => req.onProgress!({ renderedFrames: p.renderedFrames, totalFrames: composition.durationInFrames })
    : undefined,
});
```

`composition` is already in scope from the `selectComposition` call at line 16. `composition.durationInFrames` provides `totalFrames`. The `p` parameter is `RenderMediaProgress` from `@remotion/renderer` — its `renderedFrames` field maps directly.

---

### `packages/cli/src/video-render-resolver.ts` (service, request-response — new file)

**Analog:** `packages/cli/src/render-resolver.ts` (exact role match)

**Imports pattern** (from `render-resolver.ts` lines 1-13 — copy and adapt):
```typescript
import {
  getCanvasDefaultConfig,
  renderVideo,            // swap: renderImage → renderVideo
  type Brand,
  type BrandColors,
  type CanvasTemplateConfig,
  type FormatKey,
  type LocalVideoRenderRequest,  // swap type
  type ObjectDataMap,
} from "@bragfast/render-core";  // note: video exported from root, not /image
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OnBrowserDownload } from "@remotion/renderer";
import { getBragHome } from "./credentials";
```

**`remotionEntryPoint` resolution pattern** (from `server.ts` line 112 — `getSpaDir` pattern):
```typescript
const __dir = fileURLToPath(new URL(".", import.meta.url));
// CLI bundle is packages/cli/dist/server.js; src/remotion is at ../../src/remotion
const REMOTION_ENTRY = path.resolve(__dir, "../../src/remotion/index.ts");
```
Note: verify this relative path with `fs.existsSync(REMOTION_ENTRY)` fail-fast check at startup.

**`VideoRenderJob` type** (new, mirrors `RenderJob` from `render-resolver.ts` lines 20-27):
```typescript
export interface VideoRenderJob {
  jobId: string;
  draftId: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;       // 0–100 integer, from onBrowserDownload percent * 100
  url?: string;              // set when done: /output/<draftId>/<format>.mp4
  error?: string;
}
```

**`fetchJson` / `resolveTemplate` / `resolveBrand` / `buildObjectDataForCLI`** — copy verbatim from `render-resolver.ts` lines 79-160 and lines 162-209. These helpers are identical for video. Do NOT re-export them; keep them module-private in the new file. (Refactoring into a shared module is a deferred optimization.)

**`buildObjectDataForCLI` video-URL transform** — after calling `buildObjectDataForCLI`, convert `/media/*` video URLs to absolute localhost URLs. Pattern from `render-resolver.ts` line 153 (`slide[obj.id] = { videoUrl: content.video_url }`) plus the media-upload URL transform from `server.ts` line 187:
```typescript
// After buildObjectDataForCLI returns the ObjectDataMap:
for (const entry of Object.values(objectData)) {
  if (typeof entry.videoUrl === "string" && entry.videoUrl.startsWith("/media/")) {
    entry.videoUrl = `http://127.0.0.1:${port}${entry.videoUrl}`;
  }
}
```

**`onBrowserDownload` closure pattern** — drives D-06 gate. Only sets `chrome-download` phase when `alreadyAvailable === false`. Pattern from RESEARCH.md Q3:
```typescript
const onBrowserDownload: OnBrowserDownload = () => ({
  version: null,
  onProgress: ({ alreadyAvailable, percent }) => {
    if (alreadyAvailable) return;          // chrome cached — skip gate
    job.phase = "chrome-download";
    job.downloadPct = Math.round(percent * 100);
    stdout.write(`  [brag] Chrome download: ${Math.round(percent * 100)}%\n`);
  },
});
```

**`resolveAndRenderVideo` main function** — mirrors `resolveAndRender` from `render-resolver.ts` lines 236-310. Key differences: single format (not `FORMAT_KEYS.map`), calls `renderVideo` instead of `renderImage`, writes `.mp4`, mutates the `VideoRenderJob` reference passed in (job is already in the map):
```typescript
export async function resolveAndRenderVideo(
  draftId: string,
  format: "landscape" | "square" | "portrait",
  apiKey: string,
  backendBase: string,
  outputDir: string,
  port: number,
  stdout: NodeJS.WriteStream,
  job: VideoRenderJob,          // mutated in place for poll status
): Promise<void> {
  // 1. fetch draft (same as render-resolver.ts line 254)
  // 2. resolveTemplate (same)
  // 3. resolveBrand (same)
  // 4. buildObjectDataForCLI for single format + video URL transform (above)
  // 5. build inputProps for VideoCanvasCompositionProps
  // 6. call renderVideo(req) with onBrowserDownload + onProgress closures
  // 7. write buffer to brag-output/<draftId>/<format>.mp4
  // 8. set job.phase = "done", job.url = /output/<draftId>/<format>.mp4
}
```

**Output write pattern** (from `render-resolver.ts` lines 292-295 — copy exactly, swap `.jpg` → `.mp4`):
```typescript
const outPath = path.join(outputDir, draftId, `${format}.mp4`);
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, result.buffer);
job.phase = "done";
job.url = `/output/${draftId}/${format}.mp4`;
stdout.write(`  [brag] ${format} rendered\n`);
```

**Error handling pattern** (from `render-resolver.ts` lines 300-307):
```typescript
} catch (err) {
  const error = err instanceof Error ? err.message : String(err);
  stdout.write(`  [brag] Render failed for ${draftId}: ${error}\n`);
  job.phase = "failed";
  job.error = error;
}
```

---

### `packages/cli/src/server.ts` (controller, request-response — extend)

**Analog:** self — add two new route functions and register them in `buildApp`

**`videoRenderJobs` map** — add alongside `renderJobs` (line 31):
```typescript
const renderJobs = new Map<string, RenderJob>();
const videoRenderJobs = new Map<string, VideoRenderJob>();  // new
```

**`localVideoRenderRoute`** — mirrors `localRenderRoute` (lines 195-240). Key differences: reads `format` from body (optional, defaults to `config.format ?? "landscape"`), creates a `VideoRenderJob` with initial counters, calls `resolveAndRenderVideo` (which mutates the job in place), and does NOT set the job again via `.then()` because the resolver mutates directly:
```typescript
function localVideoRenderRoute(
  outputDir: string,
  port: number,
  credentials: Credentials,
  stdout: Pick<NodeJS.WriteStream, "write">,
): RequestHandler {
  return (req, res) => {
    const body = req.body as { draftId?: unknown; format?: unknown } | undefined;
    if (!body || typeof body.draftId !== "string" || !body.draftId) {
      res.status(400).json({ error: "Missing draftId" });
      return;
    }
    const draftId = body.draftId;
    const format = (typeof body.format === "string" ? body.format : "landscape") as FormatKey;
    const jobId = draftId;

    const job: VideoRenderJob = {
      jobId, draftId,
      phase: "pending",
      framesRendered: 0, totalFrames: 0, downloadPct: 0,
    };
    videoRenderJobs.set(jobId, job);

    void resolveAndRenderVideo(draftId, format, credentials.api_key, ...)
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        stdout.write(`  [brag] Video render failed for ${draftId}: ${error}\n`);
        job.phase = "failed";
        job.error = error;
      });

    res.status(202).json({ id: jobId, status: "pending" });
  };
}
```

**`localVideoRenderStatusRoute`** — mirrors `localRenderStatusRoute` (lines 242-262). Returns the `VideoRenderJob` directly (not `{ id, formats: ... }`):
```typescript
function localVideoRenderStatusRoute(): RequestHandler {
  return (req, res) => {
    const id = req.params.id;
    if (!id || isUnsafeOutputId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const job = videoRenderJobs.get(id);
    if (!job) {
      res.status(404).json({ error: "Video render job not found" });
      return;
    }
    res.json(job);
  };
}
```

**`buildApp` registration** — add after existing render routes (lines 315-317). `/api/local/reveal` and `/output` static are already present and shared:
```typescript
app.post("/api/local/render", localRenderRoute(...));
app.get("/api/local/render/:id/status", localRenderStatusRoute());
// new:
app.post("/api/local/render/video", localVideoRenderRoute(outputDir, port, credentials, stdout));
app.get("/api/local/render/video/:id/status", localVideoRenderStatusRoute());
app.post("/api/local/reveal", localRevealRoute(outputDir));  // unchanged — shared
```

**Import additions** at top of `server.ts`:
```typescript
import { resolveAndRenderVideo, type VideoRenderJob } from "./video-render-resolver";
```

---

### `packages/workspace/src/types.ts` (model — extend)

**Analog:** self — `DraftOutput`, `DraftVideo`, `DraftConfig.output` already present (lines 9, 25-28, 50-51). Add video render state types.

**Add after `RenderStatusResponse`** (after line 92):
```typescript
// Phase 6: video render types
export type VideoRenderPhase =
  | "idle"
  | "flushing"
  | "chrome-download"
  | "rendering"
  | "done"
  | "failed";

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

No changes to existing types. `DraftOutput`, `DraftVideo`, `DraftConfig.output` are already correct.

---

### `packages/workspace/src/api.ts` (utility, request-response — extend)

**Analog:** self — mirror `triggerRender` / `pollRenderStatus` pattern (lines 55-67)

**`triggerRender` pattern to mirror** (lines 55-61):
```typescript
export async function triggerRender(draftId: string): Promise<{ id: string; status: "pending" }> {
  return requestJson<{ id: string; status: "pending" }>("/api/local/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId }),
  });
}
```

**New functions — copy shape exactly:**
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

Import `VideoRenderStatusResponse` from `./types`. Import `FormatKey` from `./types` (it is already declared there as `export type FormatKey`).

---

### `packages/workspace/src/hooks/useVideoRender.ts` (hook, event-driven/poll — new file)

**Analog:** `packages/workspace/src/hooks/useRender.ts` (exact role match)

**Imports pattern** (from `useRender.ts` lines 1-3 — copy and adapt):
```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { pollVideoRenderStatus, triggerVideoRender } from "../api";
import type { FormatKey, VideoRenderPhase, VideoRenderStatusResponse } from "../types";
```

**Poll interval constant** (from `useRender.ts` line 5 — copy exactly):
```typescript
const POLL_INTERVAL_MS = 1000;
```

**`UseVideoRenderArgs` / `UseVideoRenderResult`** — mirrors `UseRenderArgs` / `UseRenderResult` (lines 16-25). Single format instead of `Record<FormatKey, ...>`:
```typescript
export interface UseVideoRenderArgs {
  flush: () => Promise<string | null>;
  activeFormat: FormatKey;
}

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

**`trigger` callback pattern** (from `useRender.ts` lines 76-101 — copy structure exactly):
```typescript
const trigger = useCallback(async (): Promise<void> => {
  if (renderPhaseRef.current === "flushing" || renderPhaseRef.current === "rendering"
      || renderPhaseRef.current === "chrome-download") return;

  setRenderPhase("flushing");
  const draftId = await flush();
  if (draftId === null) {
    setRenderPhase("failed");
    setError("Save failed before render");
    return;
  }

  try {
    const job = await triggerVideoRender(draftId, activeFormat);
    setJobId(job.id);
    setRenderPhase("rendering");
  } catch (err) {
    setRenderPhase("failed");
    setError(err instanceof Error ? err.message : "Video render request failed");
  }
}, [flush, activeFormat]);
```

**Poll `useEffect` pattern** (from `useRender.ts` lines 103-128 — copy structure exactly, map `VideoRenderStatusResponse` fields):
```typescript
useEffect(() => {
  if (jobId === null) return;

  const pollTick = async () => {
    try {
      const response = await pollVideoRenderStatus(jobId);
      setFramesRendered(response.framesRendered);
      setTotalFrames(response.totalFrames);
      setDownloadPct(response.downloadPct);
      if (response.phase !== "pending") setRenderPhase(response.phase);
      if (response.url) setUrl(response.url);
      if (response.phase === "done" || response.phase === "failed") {
        window.clearInterval(interval);
        if (response.error) setError(response.error);
      }
    } catch (err) {
      window.clearInterval(interval);
      setRenderPhase("failed");
      setError(err instanceof Error ? err.message : "Video status polling failed");
    }
  };

  const interval = window.setInterval(() => { void pollTick(); }, POLL_INTERVAL_MS);
  void pollTick();
  return () => window.clearInterval(interval);
}, [jobId]);
```

**`renderPhaseRef` pattern** (from `useRender.ts` lines 70-74 — copy exactly to avoid stale closure in `trigger`):
```typescript
const renderPhaseRef = useRef<VideoRenderPhase>(renderPhase);
useEffect(() => { renderPhaseRef.current = renderPhase; }, [renderPhase]);
```

---

### `packages/workspace/src/components/RenderPanel.tsx` (component, request-response — extend)

**Analog:** self — add `output` prop and video-path render states

**New props shape** — add to existing `RenderPanelProps` interface (lines 7-15):
```typescript
interface RenderPanelProps {
  // existing:
  renderPhase: RenderPhase;
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
  jobId: string | null;
  caption: string;
  activeFormat: FormatKey;
  onTrigger: () => Promise<void>;
  onReveal: () => void;
  // new:
  output: DraftOutput;
  videoRenderPhase?: VideoRenderPhase;
  framesRendered?: number;
  totalFrames?: number;
  downloadPct?: number;
  videoUrl?: string | null;
  onVideoTrigger?: () => Promise<void>;
}
```

**`actionClassName` helper** (line 22 — reuse verbatim for Download video / Open folder / Copy caption):
```typescript
function actionClassName(): string {
  return "flex min-h-[44px] items-center rounded-[8px] border border-[var(--workspace-border)] bg-white px-3 text-[12px] font-semibold text-[var(--workspace-forest)] hover:bg-[var(--workspace-surface)]";
}
```

**Render button pattern** (lines 121-131 — extend to branch on `output`):
```typescript
// Image path (unchanged):
const buttonLabel = renderPhase === "flushing" ? "Saving…" : showRetry ? "Retry render" : "Render images";

// Video path (new, same DOM structure):
const videoButtonLabel = videoRenderPhase === "flushing" ? "Saving…"
  : videoRenderPhase === "failed" ? "Retry render"
  : "Render video";
```

**Chrome-download gate** (new, shown when `output === "video"` and `videoRenderPhase === "chrome-download"`):
```typescript
{output === "video" && videoRenderPhase === "chrome-download" ? (
  <div>
    <p className="text-[12px] font-semibold text-[var(--workspace-forest)]">One-time setup</p>
    <p className="text-[12px] text-[var(--workspace-muted)]">
      Downloading Chrome renderer (~170 MB). This only happens once.
    </p>
    <div
      role="progressbar"
      aria-valuenow={downloadPct ?? 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Chrome download progress"
      className="mt-2 h-2 w-full rounded-full bg-[var(--workspace-border)]"
    >
      <div
        className="h-2 rounded-full bg-[var(--workspace-lime)]"
        style={{ width: `${downloadPct ?? 0}%` }}
      />
    </div>
    <p className="mt-1 text-[12px] text-[var(--workspace-muted)]">
      {downloadPct ?? 0}% — Render will start automatically.
    </p>
  </div>
) : null}
```

**Frame progress row** (new, shown when `output === "video"` and `videoRenderPhase === "rendering"`):
```typescript
{output === "video" && videoRenderPhase === "rendering" ? (
  <div className="flex items-center gap-2">
    <span
      role="status"
      aria-label="Rendering video"
      className="h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin"
    />
    <span className="text-[12px] font-semibold text-[var(--workspace-forest)]">Rendering video…</span>
    <span
      aria-live="polite"
      className="font-[Geist_Mono,monospace] text-[12px] text-[var(--workspace-muted)]"
    >
      {framesRendered ?? 0} / {totalFrames ?? 0} frames
    </span>
  </div>
) : null}
```

**`<video>` preview** (new, shown when `output === "video"` and `videoRenderPhase === "done"`):
```typescript
{output === "video" && videoRenderPhase === "done" && videoUrl ? (
  <video
    src={videoUrl}
    muted
    controls
    aria-label="Rendered video preview"
    className="mt-4 w-full rounded-[8px] border border-[var(--workspace-border)]"
  />
) : null}
```

**Video Download action** (mirrors image `<a>` at line 162 — same `actionClassName()`):
```typescript
{output === "video" && videoRenderPhase === "done" && videoUrl ? (
  <a
    href={videoUrl}
    download={`${activeFormat}.mp4`}
    aria-label="Download rendered video"
    className={actionClassName()}
  >
    Download video
  </a>
) : null}
```

**Spinner CSS class** (from `FormatStatusRow` line 43 — reuse exactly):
```
h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin
```

---

### `packages/workspace/src/pages/Editor.tsx` (component, request-response — extend)

**Analog:** self — add output toggle + video render path

**New import additions** (after existing imports at lines 1-14):
```typescript
import { useVideoRender } from "../hooks/useVideoRender";
import { triggerVideoRender } from "../api";
import type { DraftOutput } from "../types";
```

**`output` state** — read from `config.output`, defaulting to `"image"`. No new `useState` needed; `config.output` is the source of truth. Helper derived value:
```typescript
const output = config.output ?? "image";
```

**`useVideoRender` instantiation** (after `useRender` at line 48):
```typescript
const render = useRender({ flush: save.flush });
const videoRender = useVideoRender({ flush: save.flush, activeFormat });  // new
```

**OutputToggle** — add between `<SlotPanel>` and `<RenderPanel>` in the right column (after line 138, before `</section>`). Uses same two-segment pattern as `FormatSwitcher.tsx` (lines 14-47), but `grid-cols-2` and `DraftOutput` values:
```typescript
<div
  role="tablist"
  aria-label="Output type"
  className="grid w-full max-w-[420px] grid-cols-2 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-1"
>
  {(["image", "video"] as DraftOutput[]).map((opt) => {
    const active = output === opt;
    const label = opt === "image" ? "Image" : "Video";
    return (
      <button
        key={opt}
        type="button"
        role="tab"
        aria-selected={active}
        className={[
          "relative min-h-[40px] min-w-0 rounded-[6px] px-2 text-[12px] font-semibold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]",
          active
            ? "bg-[rgba(111,143,136,0.16)] text-[var(--workspace-forest)]"
            : "text-[var(--workspace-muted)] hover:text-[var(--workspace-forest)]",
        ].join(" ")}
        onClick={() => updateConfig({ ...config, output: opt })}
      >
        {label}
        {active ? (
          <span className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-[var(--workspace-lime)]" />
        ) : null}
      </button>
    );
  })}
</div>
```

**Canvas preview area** (lines 91-107 — extend to show `<video>` when video render is done):
```typescript
{output === "video" && videoRender.renderPhase === "done" && videoRender.url ? (
  <video
    src={videoRender.url}
    muted
    controls
    aria-label={`${activeFormat} render`}
    className="w-full"
  />
) : (render.renderPhase === "done" || render.renderPhase === "partial") &&
  activeRenderState.phase === "done" ? (
  <img src={activeRenderState.url} alt={`${activeFormat} render`} className="w-full" />
) : (
  <TemplatePreview ... />
)}
```

**`RenderPanel` invocation** (lines 109-119 — add video props):
```typescript
<RenderPanel
  renderPhase={render.renderPhase}
  formats={render.formats}
  jobId={render.jobId}
  caption={config.caption ?? ""}
  activeFormat={activeFormat}
  onTrigger={output === "image" ? render.trigger : videoRender.trigger}
  onReveal={() => {
    const id = output === "image" ? render.jobId : videoRender.jobId;
    if (id) void revealOutputFolder(id);
  }}
  output={output}
  videoRenderPhase={videoRender.renderPhase}
  framesRendered={videoRender.framesRendered}
  totalFrames={videoRender.totalFrames}
  downloadPct={videoRender.downloadPct}
  videoUrl={videoRender.url}
  onVideoTrigger={videoRender.trigger}
/>
```

---

## Shared Patterns

### Origin-lock middleware
**Source:** `packages/cli/src/server.ts` lines 62-103
**Apply to:** All new CLI route handler functions
```typescript
// Already applied at app level via app.use(...originLockMiddleware(port))
// New routes inherit it — no per-route changes needed.
```

### Path traversal guard
**Source:** `packages/cli/src/server.ts` lines 134-136 — `isUnsafeOutputId`
**Apply to:** `localVideoRenderStatusRoute` — validate `req.params.id` before Map lookup
```typescript
function isUnsafeOutputId(id: string): boolean {
  return id.includes("..") || id.includes("/");
}
// Apply: if (!id || isUnsafeOutputId(id)) { res.status(400).json({ error: "Invalid id" }); return; }
```

### `stdout.write` error reporting
**Source:** `packages/cli/src/render-resolver.ts` lines 188-190, 297-298
**Apply to:** `resolveAndRenderVideo` throughout
```typescript
stdout.write(`  [brag] ${message}\n`);
// Prefix always: "  [brag] "
```

### `requestJson` helper
**Source:** `packages/workspace/src/api.ts` lines 10-14
**Apply to:** New `triggerVideoRender` / `pollVideoRenderStatus` in `api.ts` — reuse existing `requestJson<T>` helper; do not duplicate it.
```typescript
async function requestJson<T>(url: `/api/${string}`, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  return (await response.json()) as T;
}
```

### `min-h-[44px]` touch targets
**Source:** `packages/workspace/src/components/RenderPanel.tsx` line 37 and line 126
**Apply to:** All new interactive elements in `RenderPanel` video states, the `OutputToggle` segments in `Editor.tsx`

### `aria-live="polite"` on render panel
**Source:** `packages/workspace/src/components/RenderPanel.tsx` line 113
**Apply to:** Frame counter span (`aria-live="polite"`) and Chrome-download gate — inherited from the existing panel wrapper; no additional wrapper needed.

### `focus-visible` lime outline
**Source:** `packages/workspace/src/components/FormatSwitcher.tsx` line 31
**Apply to:** OutputToggle segments, all new interactive elements
```
focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]
```

---

## No Analog Found

All files have strong analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `packages/render-core/src/`, `packages/cli/src/`, `packages/workspace/src/`
**Files read:** 9 source files
**Pattern extraction date:** 2026-05-21
