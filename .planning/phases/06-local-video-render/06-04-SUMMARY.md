---
phase: 06-local-video-render
plan: 04
subsystem: workspace-ui
tags: [react, render-panel, editor, video-render, human-uat]

requires:
  - phase: 06-local-video-render
    provides: Workspace video render hook and CLI video render endpoints from plans 06-01 through 06-03
provides:
  - Output toggle persisted through DraftConfig.output
  - RenderPanel video render states for Chrome download, frame progress, preview, and actions
  - Editor wiring for useVideoRender and video preview swap
affects: [workspace-editor, render-panel, local-video-render]

tech-stack:
  added: []
  patterns:
    - Workspace token-based segmented controls
    - RenderPanel branches on DraftConfig.output while preserving the image render path
    - Main preview swaps to rendered video only after video render completion

key-files:
  created:
    - .planning/phases/06-local-video-render/06-HUMAN-UAT.md
  modified:
    - packages/workspace/src/components/RenderPanel.tsx
    - packages/workspace/src/pages/Editor.tsx

key-decisions:
  - "DraftConfig.output is the source of truth for the image/video toggle; no separate UI state was added."
  - "RenderPanel keeps the existing image render path gated behind output=image and adds separate video-only render states."

patterns-established:
  - "Video render UI consumes useVideoRender fields directly: renderPhase, downloadPct, framesRendered, totalFrames, url, and jobId."
  - "Output-dependent reveal selects the video job id for video output and the image job id for image output."

requirements-completed: [RND-02, RND-04]

duration: 8min
completed: 2026-05-21
---

# Phase 06 Plan 04: Workspace Video Render UI Summary

**The Workspace editor now exposes the image/video output toggle and video render UI states.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T19:47:00Z
- **Completed:** 2026-05-21T19:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added the two-segment `Image` / `Video` output toggle between the slot editor and render panel.
- Wired `useVideoRender({ flush: save.flush, activeFormat })` into `Editor.tsx`.
- Extended `RenderPanel` with video render button, Chrome-download gate, frame progress row, rendered video preview, download, copy-caption, and open-folder actions.
- Preserved the existing all-format image render path behind `output === "image"`.
- Added a human UAT checklist at `.planning/phases/06-local-video-render/06-HUMAN-UAT.md`.

## Task Commits

1. **Task 1/2: Wire workspace video render UI** - `10b1bac` (feat)

## Files Created/Modified

- `packages/workspace/src/components/RenderPanel.tsx` - Adds output-aware image/video branches, video progress states, `<video>` preview, and video actions.
- `packages/workspace/src/pages/Editor.tsx` - Adds `useVideoRender`, output toggle persistence, video preview swap, and video props for `RenderPanel`.
- `.planning/phases/06-local-video-render/06-HUMAN-UAT.md` - Human verification checklist for the real CLI/browser video render flow.

## Decisions Made

- Kept `DraftConfig.output` as the only output-mode state so auto-save persists the toggle through the existing save path.
- Moved `RenderPanel` into the right control column under `SlotPanel` and `OutputToggle`, matching the Phase 6 UI contract.
- Did not add any `hasVideo` or `videoUrl` animation/entrance branch, preserving D-09.

## Verification Evidence

- `npx tsc --noEmit --project packages/workspace/tsconfig.json` - PASS.
- `npx vitest run packages/workspace/src/hooks/__tests__/useVideoRender.test.ts packages/workspace/src/__tests__/editor-flow.test.tsx` - PASS, 11 tests.
- `npx tsc --noEmit` - PASS.
- `npx vitest run` outside sandbox - FAIL only on the two known unrelated GitHub callback redirect expectations: legacy `/admin/account` and repositioned `/welcome/pick-repo` still receive `/admin/sous-chef`.
- `npm run build --workspace=packages/workspace` - PASS.
- `npm run lint` - FAIL on pre-existing repo-wide lint debt outside the Phase 6 files.
- `grep "useVideoRender" packages/workspace/src/pages/Editor.tsx` - PASS.
- `grep "tablist" packages/workspace/src/pages/Editor.tsx` - PASS.
- `grep "chrome-download" packages/workspace/src/components/RenderPanel.tsx` - PASS.
- `grep "Geist_Mono" packages/workspace/src/components/RenderPanel.tsx` - PASS.
- D-09 grep for `hasVideo`, `videoUrl.*fade`, and `videoUrl.*entrance` - PASS, zero matches.
- Workspace Vite dev server served HTML at `http://127.0.0.1:3001/`; screenshot verification could not proceed because the Browser plugin's Node bridge tool was not exposed and Vite later reported an existing client import issue: `CanvasRenderer` named import not found from `@bragfast/render-core/browser`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Layout Contract] RenderPanel was in the left column before this plan**
- **Found during:** Task 2 implementation
- **Issue:** The current `Editor.tsx` mounted `RenderPanel` below the canvas preview, while the Phase 6 UI contract places `OutputToggle` between `SlotPanel` and `RenderPanel` in the right column.
- **Fix:** Moved `RenderPanel` into the right column after the new output toggle.
- **Files modified:** `packages/workspace/src/pages/Editor.tsx`
- **Verification:** Workspace TypeScript and editor-flow tests pass.
- **Committed in:** `10b1bac`

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** The change aligns the live layout with the approved Phase 6 UI contract.

## Issues Encountered

- The first full Vitest run inside the sandbox failed on local server binding (`EPERM`). Re-running outside the sandbox got past those failures.
- Full Vitest still has the two previously documented GitHub callback redirect failures unrelated to Phase 6.
- The Browser plugin's required Node bridge tool was not exposed, so visual screenshot verification could not run in this session.
- The standalone Workspace Vite server reported `CanvasRenderer` named import not found from `@bragfast/render-core/browser` after serving HTML. The production workspace build still passes, but live dev-server UI smoke remains blocked by that pre-existing package export/runtime interop issue.

## Known Stubs

None.

## Threat Flags

None. This plan added client-side UI wiring only; no new HTTP endpoint, auth path, or storage surface was introduced.

## User Setup Required

Manual local video render UAT is still required because it depends on a real local CLI session, browser drag/drop, Remotion Chrome availability, and an actual video file.

## Next Phase Readiness

Phase 6 implementation is ready for human verification. After UAT approval, phase verification can confirm the end-to-end render path and decide whether Phase 6 can be marked complete.

## Self-Check: PASSED WITH HUMAN UAT PENDING

- Code-level checks passed.
- Planning summary and human UAT checklist exist.
- Manual video render flow is pending developer approval.

---
*Phase: 06-local-video-render*
*Completed: 2026-05-21*
