---
phase: 05-local-image-render
status: human_needed
verified_at: 2026-05-21T12:32:00Z
requirements:
  - RND-01
  - RND-03
  - RND-05
  - RND-06
  - OUT-01
  - OUT-02
  - OUT-03
  - OUT-04
---

# Phase 05 Verification: Local Image Render

## Verdict

Automated implementation checks passed. Human verification is required for the local CLI/browser render loop because this environment could not complete an authenticated local Workspace render session or OS folder reveal.

## Automated Checks

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | PASS | Full render-core, workspace, CLI, Convex codegen, and Next build completed. |
| `npx tsc -p packages/cli/tsconfig.json --noEmit` | PASS | CLI render resolver/server types are clean. |
| `npx tsc -p packages/workspace/tsconfig.json --noEmit` | PASS | Workspace render hooks/components are clean. |
| `npx vitest run packages/cli/src/__tests__/server.test.ts` | PASS | 16 local server tests pass with local port binding allowed. |
| `npx vitest run packages/workspace/src/__tests__/editor-flow.test.tsx packages/workspace/src/__tests__/useAutoSave.test.tsx` | PASS | 8 workspace tests pass. |
| `npx vitest run` | PARTIAL | 998 pass, 2 unrelated GitHub callback redirect tests fail as previously documented in STATE.md. |
| Schema drift | PASS | No schema drift detected. |
| Code review | PASS | One render id/output bug fixed in `c9725d1`; REVIEW status is clean. |

## Must-Have Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Async render trigger returns pending job | PASS | `POST /api/local/render` route and tests in `server.test.ts`; route returns 202. |
| Per-format status with done/failed URL state | PASS | `RenderJob.formats`, status route, `FormatRenderState`, `useRender` polling. |
| Output files served from `/output` | PASS | `app.use("/output", express.static(outputDir))`; server test serves fixture JPEG. |
| Output folder defaults/configurable | PASS | `getOutputDir()` reads `~/.brag/config.json` `outputDir`, else `./brag-output`. |
| Render failures surface in terminal and UI | PASS | Resolver writes failures to stdout; RenderPanel displays failed rows and all-failed summary. |
| Save flush before render | PASS | `useRender({ flush: save.flush })`; `trigger()` awaits `flush()` before `triggerRender()`. |
| Polling stops at terminal state | PASS | `isTerminal()` and interval clearing in `useRender.ts`. |
| Actual rendered JPEG preview | PASS | Editor swaps main preview to `activeRenderState.url`; RenderPanel also renders a compact preview. |
| Copy caption action | PASS | RenderPanel calls `navigator.clipboard.writeText(caption)` and flashes `Copied!`. |
| Download action | PASS | RenderPanel anchors use status URL with `download` attribute. |
| Open folder action | PASS | Editor guards `render.jobId` and calls `revealOutputFolder(render.jobId)`; server validates and opens output path. |

## Human Verification Required

1. Build exits 0 in the local environment.
2. Start the CLI with local credentials and open the Workspace.
3. Select a template and fill at least one text slot.
4. Click `Render images`; confirm save flush then three per-format progress rows.
5. Confirm the CLI terminal logs per-format progress lines.
6. Confirm the completed active format replaces the canvas with an actual rendered JPEG.
7. Confirm `Copy caption` writes the caption to the clipboard and flashes `Copied!`.
8. Confirm `Download landscape` downloads a JPEG.
9. Confirm `Open folder` opens the OS file manager to the output folder.
10. Confirm `./brag-output/<draftId>/` contains `landscape.jpg`, `square.jpg`, and `portrait.jpg`.

## Notes

- The plan-level key-link checker is overly literal for some new files and dynamic URLs; direct code inspection confirms the intended links.
- The Browser plugin control surface was unavailable in this session because the required Node REPL tool was not exposed.
