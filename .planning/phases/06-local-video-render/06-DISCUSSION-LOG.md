# Phase 6: Local Video Render - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 6-local-video-render
**Areas discussed:** Video format scope, Render trigger UX, Chrome download UX, Duration & video-in-slot

---

## Video format scope

| Option | Description | Selected |
|--------|-------------|----------|
| All 3 (parity) | landscape+square+portrait .mp4s; ~3x render time | |
| Single format | one .mp4 for the chosen format; fastest, simplest | ✓ |
| You decide | — | |

**User's choice:** Single format

### Which format (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Active format | render the format selected in the editor switcher (WYSIWYG) | ✓ |
| Wizard/draft format | render the wizard/draft-stored format | |
| You decide | — | |

**User's choice:** Active format

---

## Render trigger UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two buttons | Render (images) + Render video side by side | |
| Output-type switch | DraftOutput toggle; one Render button follows it | ✓ |
| You decide | — | |

**User's choice:** Output-type switch

### Switch location (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Editor toggle | image\|video toggle in editor, persists DraftConfig.output, flip anytime | ✓ |
| Wizard-set, editor shows | output type chosen in wizard, read-only in editor | |
| You decide | — | |

**User's choice:** Editor toggle (seeded by wizard)

---

## Chrome download UX

| Option | Description | Selected |
|--------|-------------|----------|
| Blocking gate + progress | pre-render gate + % bar from onBrowserDownload, auto-proceed | ✓ |
| Inline message, no bar | spinner message, then proceed | |
| You decide | — | |

**User's choice:** Blocking gate + progress
**Notes:** User first asked what the Chrome download is for. Clarified: Remotion local
render drives headless Chromium; render-core `ensureBrowser()` downloads ~170 MB on first
video render (cached after); `onBrowserDownload` emits progress. Then chose the blocking
gate + progress bar.

---

## Duration & video-in-slot

### Output length

| Option | Description | Selected |
|--------|-------------|----------|
| Match dragged clip | output length = source clip length | |
| Fixed default | fixed length; clip loops/trims to fit | ✓ |
| You decide | — | |

**User's choice:** Initially "Match dragged clip", then reversed during the audio question
to "don't match it" → Fixed default.

### Fixed duration value

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed ~8s default | 8s @ 30fps, loop if short / trim if long, DraftVideo.duration | ✓ |
| Preset choices | 6s/8s/15s via DraftVideo.preset | |
| You decide | — | |

**User's choice:** Fixed ~8s default

### Audio

| Option | Description | Selected |
|--------|-------------|----------|
| Keep audio | preserve source clip audio (drop render-core muted:true) | |
| Muted | keep muted:true | ✓ |
| You decide | — | |

**User's choice:** No audio (muted). User typed: "Dont include audio. Also, about the
match clip length, don't match it." — which also reversed the earlier duration choice.

---

## Claude's Discretion

- CLI video render/status endpoint paths and payload shapes (mirror Phase 5)
- Resolver construction of `LocalVideoRenderRequest` (compositionId, inputProps, media +
  brand resolution, remotionEntryPoint)
- Remotion entry/composition to drive locally (promote VideoCanvasComposition vs author
  render-core composition) — research target
- `renderVideo` `onProgress` signature + poll update cadence + polling interval
- Output filename in `./brag-output/<id>/`
- Loop-vs-trim implementation for fitting clip to 8s
- Inline panel styling for video (progress bar, frame counter, Chrome-download state)

## Deferred Ideas

- All-3-format video — single format only this milestone
- User-chosen duration/preset UI — fixed 8s for MVP
- Audio in output / audio toggle — muted for MVP
- Match-clip-length duration — considered, rejected for predictability
- Schedule-time R2 upload + posting of rendered video — Phase 7
