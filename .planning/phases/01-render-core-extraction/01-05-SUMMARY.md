# Plan 01-05 Summary — Video Render Core

Completed: 2026-05-20

## Changes

- Added `packages/render-core/src/video.ts` with `renderVideo()` promoted from the local Remotion renderer.
- `renderVideo()` accepts caller-provided `remotionEntryPoint`, renders through Remotion to `os.tmpdir()`, returns an MP4 `Buffer`, and cleans up the temp file.
- Exported the video API and request/result types from `@bragfast/render-core`.

## Verification

- `node packages/render-core/scripts/prove-video.mjs` — PASS, produced `/tmp/test-render-core-video.mp4` at 28328 bytes.
- `node packages/render-core/scripts/audit-deps.mjs` — PASS.
- `npm run build --workspace=packages/render-core` — PASS.
