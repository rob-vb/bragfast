# Phase 5: Local Image Render - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 5-local-image-render
**Areas selected for discussion:** Render trigger & progress, Preview & file actions
**Areas set as defaults (not deep-discussed):** Output folder & file naming, Error & failure handling

---

## Render trigger & progress

### Render flow

| Option | Description | Selected |
|--------|-------------|----------|
| Async job + poll | POST returns `{id, status:pending}`; SPA polls per-format status; terminal logs per format. Mirrors cook pipeline. | ✓ |
| Sync + spinner | POST blocks until done, returns paths; generic spinner; no per-format Workspace progress. | |
| SSE stream | POST opens SSE; live per-format events. Richest, most plumbing. | |

**User's choice:** Async job + poll
**Notes:** Matches the existing cook pipeline pattern; gives real Workspace progress without SSE complexity.

### Render source (save vs editor state)

| Option | Description | Selected |
|--------|-------------|----------|
| Flush save, then render draft | Force immediate full-config PATCH, wait, then CLI renders persisted draft. Rendered = saved. | ✓ |
| Render current editor state | SPA sends live config to /render; faster start, may differ from persisted. | |
| Block render until saved | Disable Render while save in-flight; only render persisted draft. | |

**User's choice:** Flush save, then render draft
**Notes:** Single source of truth — rendered output always equals the saved draft.

### Progress UI in the Workspace

| Option | Description | Selected |
|--------|-------------|----------|
| Inline render panel | Per-format status area on the editor; results fill in as each completes. | ✓ |
| Modal/overlay | Render dialog overlays the editor with progress + results. | |
| Replace canvas area | Live-preview region swaps to progress then rendered previews. | |

**User's choice:** Inline render panel
**Notes:** Stays on the editor screen; no modal, no canvas takeover.

---

## Preview & file actions

### Preview source

| Option | Description | Selected |
|--------|-------------|----------|
| Static /output route | CLI serves brag-output statically (mirrors /media); poll returns relative URLs; SPA `<img src>`. | ✓ |
| Base64 in poll response | CLI returns rendered files base64 in status response; inline render. Bloats JSON, re-reads to memory. | |

**User's choice:** Static /output route
**Notes:** Consistent with Phase 4 media serving; cheap on memory.

### Download + Open folder semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Browser download + OS reveal | Download = anchor `download` on /output URL; Open folder = CLI endpoint runs OS reveal (open/xdg-open/explorer). | ✓ |
| Both via CLI endpoints | Both act on filesystem natively; Download redundant since file already on disk. | |
| Reveal-only | Drop separate Download; Open folder reveals dir. Simplest but OUT-04 wants per-file download. | |

**User's choice:** Browser download + OS reveal
**Notes:** Familiar browser download UX + native folder reveal.

---

## Claude's Discretion

- Exact CLI render/status/reveal/config endpoint paths and request/response shapes.
- CLI render resolver internals (draft fetch, ObjectDataMap build, media→base64, brand→logoBase64).
- Terminal progress verbosity/format; inline panel styling.
- Render job state storage (in-memory map keyed by id acceptable — local single-user).
- Whether output `<id>` subdir adds a render/timestamp segment for history.
- Polling interval and status payload shape.
- Output folder defaults (`./brag-output/<draft-id>/{landscape,square,portrait}.jpg`, configurable via `~/.brag/`) — set as defaults, user accepted without deep discussion.
- Error/failure handling (per-format partial success, errors surfaced inline + terminal) — set as defaults, user accepted.
- Copy caption via `navigator.clipboard.writeText()` — trivial, not discussed.

## Deferred Ideas

- Local video render — Phase 6.
- Schedule-time R2 upload + posting — Phase 7.
- Render history / keeping prior renders per draft — possible later; default overwrites per draft id.
- Download-all / ZIP bundle — not requested; per-file download only this phase.
