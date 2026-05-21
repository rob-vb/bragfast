# Phase 6: Local Video Render - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A developer drops a video into a media Slot, sets the editor's output toggle to
**video**, and clicks **Render** — render-core's `renderVideo()` drives Remotion
**local headless Chrome** to produce a single `.mp4` (the **active editor format**)
written to `./brag-output/<id>/`. On the very first video render, a **blocking gate
with a progress bar** announces the one-time ~170 MB Chromium download (terminal +
Workspace) before render begins; later renders skip it. Frame progress (frames
completed / total) streams to both the terminal and the inline Workspace render panel.
The rendered `.mp4` is previewable in the Workspace via a `<video>` element served
from the CLI's `/output` static route.

This phase is the **caller/wiring** for video — it reuses the entire Phase 5
async-job + poll + flush-save + inline-panel + `/output` machinery, swapping
`renderImage` (all 3 formats) for `renderVideo` (single active format).

**In scope:** image|video output toggle in the editor; the single Render button
following `DraftConfig.output`; CLI video render endpoint (async job + poll, mirrors
Phase 5); CLI-side resolver that turns the persisted Draft + dragged video + brand
into a `LocalVideoRenderRequest`; first-run Chrome download blocking gate with progress;
per-frame progress in terminal + inline panel; writing the returned MP4 buffer to
`./brag-output/<id>/`; `<video>` preview via the existing `/output` route; Download /
Open folder / Copy caption (carried from Phase 5).

**Out of scope:** all-3-format video (single format only this milestone); audio in
output (muted); user-chosen duration/preset UI (fixed 8s default); schedule-time R2
upload + posting (Phase 7); image render changes (stays all-3, untouched); any
server/Lambda render (retired per ADR-0002); template authoring; carousel/multi-slide;
AI copy.

Requirements covered: RND-02, RND-04.
</domain>

<decisions>
## Implementation Decisions

### Format scope
- **D-01:** Video renders a **single format**, not all three. (Images stay all-3.)
  render-core `renderVideo()` already returns one MP4 per `compositionId`; roadmap goal
  is "a local `.mp4`" (singular). Video is slow (~70s/format) so 3x is not worth it for
  MVP. All-3 video deferred.
- **D-02:** The single video uses the **active editor format** — whichever format is
  currently selected in the editor's format switcher when Render is clicked (WYSIWYG).
  Fall back to the draft default if no active selection.

### Render trigger / output toggle
- **D-03:** The editor has an **image|video output toggle** that persists to
  **`DraftConfig.output`** (the existing `DraftOutput "image" | "video"` field). The
  wizard seeds the initial value; the user can flip it anytime in the editor.
- **D-04:** **One Render button** that follows `DraftConfig.output`: when `image`, it
  runs the Phase 5 all-3 image render unchanged; when `video`, it runs the new
  single-format video render. (Chosen over two side-by-side buttons — less surface, one
  source of truth for "what gets rendered.")
- **D-05:** Video render reuses the **Phase 5 async-job + poll + flush-save-then-render**
  flow verbatim — flush the debounced auto-save first, render the **persisted Draft**,
  poll a status endpoint, fill the inline render panel. (Carried from Phase 5 D-01/D-02.)

### First-run Chrome download UX
- **D-06:** First video render shows a **blocking gate with a % progress bar** in the
  inline render panel: "One-time Chrome download (~170 MB)…", driven by Remotion's
  **`onBrowserDownload`** callback (already plumbed through
  `LocalVideoRenderRequest.onBrowserDownload`). The terminal mirrors the same
  progress. Render **auto-proceeds** when the download completes. Subsequent renders
  skip the gate (Chromium cached). (RND-04, success criterion 2.)

### Duration & video-in-slot
- **D-07:** Output is a **fixed ~8s @ 30fps** (reuse the old pipeline default; back it
  with `DraftVideo.duration`). The dragged clip **loops if shorter, trims if longer** to
  fill the fixed composition length. (Chosen over matching the clip length — predictable,
  social-friendly output. User-chosen duration/preset UI deferred.)
- **D-08:** Output is **muted — no audio** from the source clip. render-core's
  `renderVideo()` already sets `muted: true`; keep it. (Social autoplay is muted anyway;
  audio toggle deferred.)
- **D-09:** The source video plays inside its `visual` Slot using the **same `showcase`
  entrance as image visuals — no special-casing for `videoUrl`.** (Locked prior
  feedback: forcing a fade-in override for videos is a bug, reverted twice. See
  feedback note in canonical refs.)

### Frame progress (flagged gap → planner)
- **D-10:** Frames completed / total must reach both terminal and Workspace (RND-03
  carries; success criterion 3). **`renderVideo()` currently calls `renderMedia`
  WITHOUT `onProgress`** — render-core must be extended to accept/forward an
  `onProgress` callback (frames rendered / total) so the CLI can stream it to the poll
  status payload and terminal. This is the one render-core change Phase 6 needs;
  exact signature = planner's call.

### Claude's Discretion
- Exact CLI video render/status endpoint paths and request/response shapes (mirror
  Phase 5's render/poll endpoints).
- How the resolver builds `LocalVideoRenderRequest`: `compositionId`, `inputProps`
  (from persisted Draft `objectContent` → composition props, dragged video resolved
  from `~/.brag/media` → URL/base64), `remotionEntryPoint`, brand resolution.
- The Remotion entry point / composition the local renderer drives (research:
  promote/lift from `src/remotion/VideoCanvasComposition.tsx` vs author a render-core
  composition with `registerRoot()` — Phase 1 D flagged this open).
- `renderVideo` `onProgress` signature and how often the poll status updates frame
  count; polling interval.
- Output filename within `./brag-output/<id>/` (e.g. `<format>.mp4`).
- Loop-vs-trim implementation detail for fitting the clip to 8s.
- Inline panel styling for video (progress bar, frame counter, Chrome-download state).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (constraints)
- `docs/adr/0002-local-render-thin-backend.md` — local render only, no Lambda, no server
  render. The constraint this phase realizes for video.
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction.
- `CONTEXT.md` (repo root) — domain glossary: Render, Draft, Creation, "backend never renders".

### Video render engine (the API to call)
- `packages/render-core/src/video.ts` — `renderVideo(req: LocalVideoRenderRequest):
  Promise<VideoRenderResult>`. Calls `ensureBrowser({ onBrowserDownload })`, `bundle`,
  `selectComposition`, `renderMedia` (h264, crf 28, **muted:true**). **NOTE: no
  `onProgress` wired yet — D-10 gap.**
- `packages/render-core/src/types.ts` — `LocalVideoRenderRequest` (`compositionId`,
  `inputProps`, `remotionEntryPoint`, `onBrowserDownload?`), `VideoRenderResult`
  (`buffer`, `compositionId`), `OnBrowserDownload` (from `@remotion/renderer`).
- `packages/render-core/src/index.ts` — public exports.
- `packages/render-core/src/components/` — `BrowserFrame`, `MobileFrame`, `LogoBar`,
  `TextBlock` (Remotion-compatible visual components).

### Remotion composition (what the local renderer drives — research target)
- `src/remotion/VideoCanvasComposition.tsx` — current (Lambda) composition; promote or
  lift for local. Honor the `showcase` entrance feedback (D-09).
- `src/remotion/Root.tsx`, `src/remotion/fonts.ts` — registerRoot + font loading.
- `src/lib/pipeline/render-video.ts`, `convex/videoRender.ts`, `src/lib/video/lambda.ts`
  — current Lambda video path (the source to localize; do NOT reintroduce Lambda).

### CLI server (where endpoints + resolver land)
- `packages/cli/src/server.ts` — Express server: existing Phase 5 render endpoints,
  `/output` static route, `/media` static route, origin lock, backend proxy, SPA static.
  Add video render endpoint here.
- `packages/cli/src/proxy.ts` — authenticated backend proxy (Draft/brand fetch).

### Workspace SPA (where toggle + Render + panel + preview land)
- `packages/workspace/src/pages/Editor.tsx` — editor screen: Render button + inline panel
  (Phase 5). Add output toggle + video render path + `<video>` preview + Chrome-download gate.
- `packages/workspace/src/types.ts` — `DraftOutput "image"|"video"`, `DraftVideo
  {duration?, preset?}`, `video_url`, `DraftConfig.output`/`.video` (already present).
- `packages/workspace/src/components/VisualField.tsx` — video drop already supported
  (`VIDEO_TYPES`, `<video>` preview, `video_url`).
- `packages/workspace/src/lib/buildDraftObjectData.ts` — already maps `content.video_url
  → { videoUrl }` into `ObjectDataMap`.
- `packages/workspace/src/components/TemplatePreview.tsx` — `BrowserVideoComponent`,
  `<video>` preview in editor.
- `packages/workspace/src/api.ts` — SPA→CLI calls (relative URLs only).
- `packages/workspace/src/hooks/useAutoSave.ts` — debounced auto-save with flush (Phase 5).

### Prior phase context (dependencies)
- `.planning/phases/05-local-image-render/05-CONTEXT.md` — the pattern this phase mirrors:
  async-job+poll (D-01), flush-save-then-render (D-02), inline panel (D-04), `/output`
  static route + actual-file preview (D-05), Download/Open folder/Copy caption (D-06..08),
  output dir + `~/.brag` config (D-09/10), never-silent failures (D-11/12).
- `.planning/phases/01-render-core-extraction/01-CONTEXT.md` — render-core returns Buffers
  (MP4 for video, D-06); open question on promoting `renderVideoLocal()` from Lambda path;
  Remotion Chromium download CI verification.
- `.planning/phases/04-workspace-editor-slot-filling/04-CONTEXT.md` — media local-ref model
  (`~/.brag/media` + `/media`), caption on DraftConfig, full-config PATCH save.

### Locked prior feedback (MUST honor)
- Video visuals use the **same `showcase` entrance as images** — do NOT branch on
  `hasVideo`/`videoUrl` to force fade-in (reverted twice). Applies to the local
  composition (D-09).

### Project guides
- `CLAUDE.md` — render pipeline overview (Video section), key modules, dimensions
  (Video = same as image dims: landscape 1200×675, square 1080×1080, portrait 1080×1350).
- `.planning/ROADMAP.md` §"Phase 6" — goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` — RND-02, RND-04 wording.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderVideo()` (render-core) already exists end-to-end (ensureBrowser → bundle →
  selectComposition → renderMedia → MP4 Buffer). Phase 6 is the **caller/wiring**, plus
  the one `onProgress` extension (D-10).
- The **entire Phase 5 render pipeline** (async endpoint, poll, flush-save, inline panel,
  `/output` static route, Download/Open folder/Copy caption) is reusable — video swaps
  the render call and produces one file instead of three.
- Workspace already supports video slots: `VisualField` accepts `video/*`, previews via
  `<video>`, stores `video_url`; `buildDraftObjectData` maps `video_url → videoUrl`;
  `DraftOutput`, `DraftVideo`, `DraftConfig.output` types exist.
- `onBrowserDownload` is already a first-class field on `LocalVideoRenderRequest` — the
  blocking-gate progress (D-06) wires straight into it.

### Established Patterns
- Async-job + poll is the established render pattern (Phase 5 / old cook pipeline).
- All Workspace→backend calls go through the CLI proxy; SPA uses relative URLs only.
- `~/.brag/` convention for credentials (Phase 2), media cache (Phase 4), output config
  (Phase 5).

### Integration Points
- New CLI video render endpoint + resolver in `server.ts` (Draft + dragged video +
  brand → `LocalVideoRenderRequest`; resolve media from `~/.brag/media`, brand logo →
  base64).
- render-core `renderVideo` extended with `onProgress` (D-10); CLI streams frame count
  into the poll status payload + terminal.
- Editor.tsx gains output toggle (writes `DraftConfig.output`), video render path,
  `<video>` preview from `/output`, and the first-run Chrome-download gate.
- MP4 buffer from `VideoRenderResult.buffer` → write to `brag-output/<id>/<format>.mp4`.
</code_context>

<specifics>
## Specific Ideas

- First-run Chrome download = a **blocking gate with a % progress bar** in the inline
  panel + terminal, then auto-proceed (D-06).
- Fixed **8s @ 30fps**; clip loops if shorter, trims if longer (D-07).
- **Muted** output, no source audio (D-08).
- Reuse the Phase 5 inline panel + `/output` serving; video preview is a `<video>`
  element (success criterion 4).
</specifics>

<deferred>
## Deferred Ideas

- **All-3-format video** (landscape + square + portrait .mp4s) — single format only this
  milestone; revisit if video render time drops or users ask.
- **User-chosen duration / preset UI** (e.g. 6s/8s/15s via `DraftVideo.preset`) — fixed
  8s for MVP.
- **Audio in output** (keep source clip audio / audio toggle) — muted for MVP.
- **Match-clip-length duration** — considered, rejected for predictability (D-07).
- Schedule-time **R2 upload** of rendered video + posting — Phase 7.

None of the above were scope creep — noted for orientation.
</deferred>

---

*Phase: 6-local-video-render*
*Context gathered: 2026-05-21*
