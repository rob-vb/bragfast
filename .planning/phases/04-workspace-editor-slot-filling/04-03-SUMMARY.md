---
phase: 04-workspace-editor-slot-filling
plan: 03
subsystem: workspace-data-layer
tags: [workspace, react-hooks, drafts, brands, autosave]
requires:
  - phase: 04-workspace-editor-slot-filling
    provides: Plans 04-01 and 04-02 foundation contracts and local media route
provides:
  - Typed Workspace draft and brand API helpers
  - Local media upload helper
  - Debounced full-config auto-save hook
  - Brand resolver mapping logo_url to logoBase64
affects: [workspace-home, workspace-editor, phase-04]
tech-stack:
  added: []
  patterns:
    - "Workspace API helpers use only relative /api/v1 URLs"
    - "Auto-save PATCH sends the full DraftConfig object"
key-files:
  created:
    - packages/workspace/src/media.ts
    - packages/workspace/src/hooks/useAutoSave.ts
    - packages/workspace/src/hooks/useBrand.ts
    - packages/workspace/src/__tests__/useAutoSave.test.tsx
  modified:
    - packages/workspace/src/types.ts
    - packages/workspace/src/api.ts
key-decisions:
  - "The hook treats null config as template-browsing/no-op; callers decide when content is dirty enough to pass config."
  - "Brand fallback returns template colors and an empty logo without surfacing an error."
patterns-established:
  - "Workspace hooks are tested with the package-local Vitest config and jsdom."
requirements-completed: [WORK-05, WORK-06, WORK-07, WORK-08, MEDIA-01, MEDIA-02]
duration: 8 min
completed: 2026-05-21
---

# Phase 04 Plan 03: Workspace Data Layer Summary

**Typed Workspace API/media helpers with debounced full-config auto-save and brand resolution**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-21T08:35:00Z
- **Completed:** 2026-05-21T08:43:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added local Workspace mirrors for draft previews/details, draft config, brand records, and render-ready brand data.
- Added draft list/fetch/create/patch helpers, brand fetching, and `/api/local/media` upload helper using relative URLs only.
- Added a 900ms debounced auto-save hook that creates on first non-null config and patches full configs thereafter.
- Added brand resolution that auto-picks the first/default brand, maps `logo_url` to `logoBase64`, and falls back cleanly to template colors.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define workspace draft, brand, template, and API types** - `47e2fc2` (feat)
2. **Task 2 RED: Implement debounced full-config auto-save hook tests** - `1e289de` (test)
3. **Task 2 GREEN: Implement debounced full-config auto-save hook** - `7fbcaf9` (feat)
4. **Task 3: Implement brand resolution helper** - `0f24064` (feat)

**Plan metadata:** committed after summary creation.

## Files Created/Modified

- `packages/workspace/src/types.ts` - Draft, brand, and editor state mirrors.
- `packages/workspace/src/api.ts` - Typed draft and brand API helpers.
- `packages/workspace/src/media.ts` - Local media upload helper.
- `packages/workspace/src/hooks/useAutoSave.ts` - Debounced save lifecycle.
- `packages/workspace/src/hooks/useBrand.ts` - Brand fetch/select/map helper.
- `packages/workspace/src/__tests__/useAutoSave.test.tsx` - Auto-save behavior tests.

## Decisions Made

- Kept API URLs relative so the CLI proxy owns auth and the browser never sees the API key.
- Used `null` config as the no-op boundary for template browsing; the editor decides when a real content edit has occurred.
- Exposed a UI-ready status label for `Save failed - retrying on next edit` while keeping a compact status enum.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes.

## Issues Encountered

- The originally planned root-relative Vitest file filter did not match under the Workspace config root. Verification was run with the same config and package-root path: `npx vitest run --config packages/workspace/vitest.config.ts src/__tests__/useAutoSave.test.tsx`.

## User Setup Required

None - no external service configuration required.

## Verification

- `npx vitest run --config packages/workspace/vitest.config.ts src/__tests__/useAutoSave.test.tsx` - passed, 5 tests.
- `npm run build --workspace=packages/workspace` - passed.

## Self-Check: PASSED

- `api.ts` exports `fetchDrafts`, `fetchDraft`, `createDraft`, `patchDraft`, and `fetchBrands`.
- `media.ts` posts only to `/api/local/media`.
- Auto-save tests prove null config no-op, full-config PATCH with `objectContent` and `caption`, debounce collapse, and retryable error status.
- Brand mapping sets `logoBase64` from `logo_url ?? ""` and handles zero brands as a non-error fallback.

## Next Phase Readiness

Ready for Plan 04-04 to build the Workspace home, recent drafts, template grid, previews, format switcher, and brand application entry flow.

---
*Phase: 04-workspace-editor-slot-filling*
*Completed: 2026-05-21*
