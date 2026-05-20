# Plan 01-06 Summary — App Rewiring

Completed: 2026-05-20

## Changes

- Added `@bragfast/render-core` as a workspace dependency and externalized it in `next.config.ts`.
- Rewired `src/lib/pipeline/render.ts` to resolve app-side data, call `renderImage()`, then keep existing local/R2 upload and Convex completion behavior.
- Rewired the local branch of `src/lib/pipeline/render-video.ts` to call render-core `renderVideo()` while leaving the Lambda branch in place.
- Ignored generated package `dist/` and local `.worktrees/` in ESLint.

## Verification

- `npm run build` — PASS.
- `npm run lint` — PASS with warnings.
- Full render-core suite — PASS:
  - `npm run build --workspace=packages/render-core`
  - `node packages/render-core/scripts/audit-deps.mjs`
  - `npx vitest run packages/render-core`
  - `node packages/render-core/scripts/prove-image.mjs`
  - `node packages/render-core/scripts/prove-video.mjs`
