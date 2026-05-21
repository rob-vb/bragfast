# Phase 5: Local Image Render - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A developer clicks "Render" in the Workspace editor and gets actual JPEG files for
all three formats (landscape/square/portrait) rendered locally via render-core
(Satori → Sharp). Render runs as an async CLI job: the SPA flushes the debounced
auto-save, the CLI renders the persisted Draft, progress streams to the terminal and
an inline render panel in the Workspace, the rendered files are written to
`./brag-output/<id>/`, and the Workspace previews the actual files with Copy caption,
Download, and Open folder actions. Render failures surface clearly in both the
Workspace and the terminal — never silently.

**In scope:** Render button + flush-save-then-render flow, a CLI async render endpoint
(`POST` → `{id, status}` + poll), the CLI-side resolver that turns a persisted Draft +
local media + brand into a render-core `LocalRenderRequest`, writing returned Buffers
to a configurable output folder, an inline per-format render-status panel, a static
route serving rendered output, actual-file previews, Copy caption (OUT-01), per-file
Download (OUT-04), Open folder via OS reveal (OUT-02), and actionable error surfacing
(RND-06).

**Out of scope:** local video render (Phase 6), schedule-time R2 upload + posting
(Phase 7), any server-side render (retired per ADR-0002), template authoring,
carousel/multi-slide, AI copy generation (ADR-0003).

Requirements covered: RND-01, RND-03, RND-05, RND-06, OUT-01, OUT-02, OUT-03, OUT-04.
</domain>

<decisions>
## Implementation Decisions

### Render trigger & flow
- **D-01:** Render is an **async job + poll**, mirroring the existing cook pipeline
  pattern. The CLI render endpoint accepts the request and returns `{ id, status:
  "pending" }` immediately; the SPA polls a status endpoint for per-format state until
  done/failed. (Chosen over sync-blocking and SSE — gives real Workspace progress
  without SSE plumbing.)
- **D-02:** On click, Render **flushes the debounced auto-save first** — force an
  immediate full-`DraftConfig` PATCH, wait for it to land, then render. The CLI renders
  the **persisted Draft**, so rendered output always equals saved state (single source
  of truth). (Chosen over rendering live editor state or blocking the button.)
- **D-03:** Terminal shows **per-format progress** as each format completes (RND-03,
  terminal half). Verbosity/format = Claude's discretion.

### Progress & preview in the Workspace
- **D-04:** Progress shows in an **inline render panel** on the editor (e.g.
  below/beside the canvas), showing per-format state (e.g. Landscape ⏳→✓, Square ⏳,
  Portrait ○); results fill in as each format completes. Stays on the editor screen —
  no modal, no canvas takeover.
- **D-05:** The Workspace previews the **actual rendered JPEGs** (OUT-03), not the live
  CanvasRenderer preview, served via a **new static `/output` route** on the CLI server
  (mirrors the existing `/media` static route from Phase 4). The poll/status response
  returns **relative URLs**; the SPA shows `<img src="/output/<id>/landscape.jpg">`.
  (Chosen over base64-in-response — cheaper on memory, consistent with media serving.)

### File actions
- **D-06:** **Download (OUT-04)** = a browser anchor with the `download` attribute
  pointing at the `/output` URL — saves a copy to the user's browser download location,
  per file/format.
- **D-07:** **Open folder (OUT-02)** = `POST` to a CLI endpoint that runs the OS reveal
  command (`open` on macOS, `xdg-open` on Linux, `explorer` on Windows) on
  `brag-output/<id>`. Native folder reveal.
- **D-08:** **Copy caption (OUT-01)** = `navigator.clipboard.writeText()` on the
  persisted `DraftConfig.caption`. (Caption is post copy, never drawn into the image —
  carried from Phase 4 D-04.)

### Output folder (defaults — set, not deep-discussed)
- **D-09:** Default output dir is **`./brag-output/<id>/`** (relative to the CLI's
  working dir; RND-05 default). `<id>` = the **Draft id** so re-rendering the same Draft
  overwrites in place (planner may append a render/timestamp subdir if needed for
  history — Claude's discretion). File names: **`landscape.jpg` / `square.jpg` /
  `portrait.jpg`**.
- **D-10:** Output path is **user-configurable** (RND-05). Default mechanism: a
  `~/.brag/` config entry (consistent with Phase 2 `~/.brag/credentials.json` and
  Phase 4 `~/.brag/media/`). Whether to also expose a CLI flag / env override = Claude's
  discretion.

### Error & failure handling (defaults — set, not deep-discussed)
- **D-11:** Failures **never silent** (RND-06): every failure surfaces in the inline
  render panel (Workspace) AND the terminal with an actionable message. Known failure
  modes to handle: missing local media file, offline Google-font fetch, render-core
  throw, output-dir write failure.
- **D-12:** **Per-format partial success** is allowed — if one format fails, the others
  still render, preview, and are downloadable; the failed format shows its error in the
  panel. (Not all-or-nothing.) Planner may revisit if render-core's `renderImage`
  surface makes per-format isolation awkward.

### Claude's Discretion
- Exact CLI render/status/reveal/config endpoint paths and request/response shapes.
- How the CLI render resolver builds the `LocalRenderRequest`: read persisted Draft
  (via backend proxy or local), build `ObjectDataMap` from `objectContent`, resolve
  local media refs (`~/.brag/media`) → base64/`srcMap`, resolve brand → `Brand` with
  `logoBase64` (fetch `brand.logo_url` → base64 at render time).
- Terminal progress verbosity/format; inline panel styling.
- Render job state storage (in-memory map keyed by id is fine — local single-user CLI).
- Whether `<id>` output subdir adds a render/timestamp segment for history.
- Polling interval and status payload shape.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (constraints)
- `docs/adr/0002-local-render-thin-backend.md` — local render only, no Lambda, no server
  render, R2 upload only at schedule-time (Phase 7). The constraint this phase realizes.
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction
- `CONTEXT.md` (repo root) — domain glossary: Render, Draft, Creation, "backend never
  renders"

### Render engine (the API to call)
- `packages/render-core/src/index.ts` — public exports: `renderImage`, `FORMAT_DIMENSIONS`,
  `CanvasRenderer`, `loadFonts*`, types
- `packages/render-core/src/image.ts` — `renderImage(req: LocalRenderRequest):
  Promise<ImageRenderResult>` — the function to call
- `packages/render-core/src/types.ts` — `LocalRenderRequest` (`formats[].slides[]
  {objectData, templateConfig, backgroundImageBase64?, srcMap?}`, `brand`),
  `ImageRenderResult` (`formats: Record<string,{slides: Buffer[], dimensions}>`),
  `Brand` (needs `logoBase64`), `BrandColors`
- `packages/render-core/src/canvas-renderer.tsx` — `ObjectDataMap` shape
- `packages/render-core/src/fonts.ts` — font loading (node-only; disk cache `~/.brag/fonts`)
- `packages/render-core/src/pure-helpers.ts` — `injectStaticImages`,
  `applySignatureDefaults`, `normalizeDataUri`

### CLI server (where endpoints + static route land)
- `packages/cli/src/server.ts` — Express server; existing `POST /api/local/media`,
  `app.use("/media", express.static(mediaDir))`, origin lock, backend proxy, SPA static.
  Add render endpoints + `/output` static route here.
- `packages/cli/src/proxy.ts` — authenticated backend proxy (Draft/brand fetch goes through here)

### Workspace SPA (where Render button + panel + actions land)
- `packages/workspace/src/pages/Editor.tsx` — editor screen (Render button + inline panel)
- `packages/workspace/src/api.ts` — SPA→CLI/backend calls (relative URLs only)
- `packages/workspace/src/hooks/useAutoSave.ts` — debounced auto-save (must expose a flush)
- `packages/workspace/src/lib/buildDraftObjectData.ts` — draft `objectContent` → `ObjectDataMap`
- `packages/workspace/src/types.ts` — SPA types

### Draft / brand model
- `src/lib/drafts/types.ts` — `DraftConfig` (incl. `caption` from Phase 4 D-11),
  `DraftObjectContent`
- `src/lib/types.ts` — `Brand`, `BrandRecord`, `ObjectModification`
- `src/app/api/v1/drafts/` — Draft GET/PATCH (PATCH shallow-merges config — Phase 4 D-09)

### Prior phase context (dependencies)
- `.planning/phases/01-render-core-extraction/01-CONTEXT.md` — render-core returns
  Buffers, no FS/R2 opinion (D-06 there); caller writes to disk
- `.planning/phases/04-workspace-editor-slot-filling/04-CONTEXT.md` — media local-ref
  model (`~/.brag/media` + `/media`), caption on DraftConfig, full-config PATCH save

### Project guides
- `CLAUDE.md` — render pipeline overview, key modules, dimensions
- `.planning/ROADMAP.md` §"Phase 5" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` — RND-01/03/05/06, OUT-01..04 wording
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderImage()` (render-core) already renders all formats from a `LocalRenderRequest`
  and returns Buffers — the engine is done; this phase is the **caller/wiring**.
- `/media` static route + `localMediaUploadRoute` in `packages/cli/src/server.ts` is the
  exact pattern to copy for `/output` static serving.
- `buildDraftObjectData()` (SPA) and `buildDraftObjectData.ts` already bridge stored
  `objectContent` → `ObjectDataMap` — reuse for building render input.
- `useAutoSave` hook already does full-config debounced PATCH — extend with a flush()
  for D-02.

### Established Patterns
- Async-job-+-poll is the existing cook pipeline pattern (`POST /api/v1/cook/image`
  returns `{status:"pending"}`, poll `cook/[id]`) — D-01 mirrors it locally.
- All Workspace→backend calls go through the CLI proxy (auth injected server-side);
  SPA uses relative URLs only (Phase 3/4).
- Object model: `type: "text" | "visual" | "logo"`, absolute positioning; each built-in
  hand-authors all 3 formats.

### Integration Points
- New CLI render endpoint(s) + `/output` static route in `server.ts`.
- CLI render resolver: persisted Draft + `~/.brag/media` refs + brand → `LocalRenderRequest`
  (resolve media + logo to base64; this is the I/O the pure core deliberately omits).
- Render Buffers from `ImageRenderResult.formats[*].slides` → write to
  `brag-output/<id>/<format>.jpg`.
- Editor.tsx gains Render button + inline render panel; api.ts gains render/poll/reveal calls.
</code_context>

<specifics>
## Specific Ideas

- Inline per-format status indicator (e.g. Landscape ⏳→✓, Square ⏳, Portrait ○).
- `/output` route should mirror the `/media` static-serving approach already in
  `server.ts` for consistency.
- Output dir + config keep the `~/.brag/` convention established by credentials (Phase 2)
  and media cache (Phase 4).
- Open folder uses native OS reveal (`open`/`xdg-open`/`explorer`).
</specifics>

<deferred>
## Deferred Ideas

- Local **video** render (Render-for-video button + Remotion local) — Phase 6.
- Schedule-time **R2 upload** of rendered files + posting to providers — Phase 7.
- Render **history** / keeping prior renders per Draft — possible later; default
  overwrites in place per Draft id (D-09).
- Output as ZIP / "download all" bundle — not requested; per-file download only this phase.

None of the above were requested as scope creep; noted for orientation.
</deferred>

---

*Phase: 5-local-image-render*
*Context gathered: 2026-05-21*
