---
phase: 07-schedule-time-upload-posting
plan: 05
subsystem: scheduling-ui
tags: [workspace, react, buffer, scheduling, vitest]

requires:
  - phase: 07-schedule-time-upload-posting
    provides: CLI upload orchestration and Workspace useSchedule hook from 07-04
provides:
  - Workspace SchedulePanel for Buffer channel selection grouped by render format
  - Queue-slot and exact-time scheduling controls wired to useSchedule
  - Editor integration that shows scheduling only for rendered image output
affects: [schedule-time-upload-posting, workspace-schedule, editor-sidebar, buffer-posting]

tech-stack:
  added: []
  patterns:
    - Workspace scheduling UI stays in raw Tailwind and workspace design tokens, without shadcn components
    - SchedulePanel seeds channel selections from saved routing defaults before built-in format defaults
    - Exact-time scheduling converts datetime-local values to UTC ISO before submission

key-files:
  created:
    - packages/workspace/src/components/SchedulePanel.tsx
    - packages/workspace/src/__tests__/schedule-panel.test.tsx
    - .planning/phases/07-schedule-time-upload-posting/07-05-SUMMARY.md
  modified:
    - packages/workspace/src/pages/Editor.tsx
    - packages/workspace/src/__tests__/editor-flow.test.tsx

key-decisions:
  - "SchedulePanel respects saved routingDefaults first and uses BUILT_IN_FORMAT_DEFAULTS only when a format has no saved defaults."
  - "Workspace exact-time scheduling sends a UTC ISO dueAt derived from the native datetime-local input."
  - "Editor only mounts SchedulePanel for image output after rendered image output is available; video scheduling remains deferred."
  - "Human verification checkpoint was approved by user response `Proceed` on 2026-05-22."

patterns-established:
  - "SchedulePanel groups Buffer channels by Landscape, Square, and Portrait using channelClassFromBufferService."
  - "Workspace scheduling confirmation names each scheduled channel and distinguishes queue vs exact-time copy."

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06]

duration: 10min
completed: 2026-05-22
---

# Phase 07 Plan 05: SchedulePanel + Editor Wiring Summary

**Workspace users can select Buffer channels by image format, choose queue or exact scheduling, and submit rendered images through the completed schedule-time upload path.**

## Performance

- **Duration:** 10 min close-out after checkpoint resume
- **Started:** 2026-05-22T06:12:00Z
- **Completed:** 2026-05-22T06:22:35Z
- **Tasks:** 4
- **Files modified:** 4 code/test files plus this summary

## Accomplishments

- Added failing-first SchedulePanel and editor-flow tests for Buffer connection state, grouped channels, routing defaults, exact-time input, trigger payloads, and success copy.
- Implemented `SchedulePanel` with Workspace design tokens, format-grouped Buffer channels, routing-default seeding, queue/exact timing controls, progress states, actionable errors, and scheduled confirmations.
- Wired `SchedulePanel` into the Workspace editor below `RenderPanel` for rendered image output using the existing `useSchedule` hook.
- Closed the human verification checkpoint as approved from the user response `Proceed`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schedule panel UI tests** - `599b10d` (test)
2. **Task 2: Implement SchedulePanel** - `958c221` (feat)
3. **Task 3: Wire SchedulePanel into Editor** - `4266d8d` (feat)
4. **Task 4: Human verification checkpoint close-out** - approved by user response `Proceed`

**Plan metadata:** committed separately with this SUMMARY.

## Files Created/Modified

- `packages/workspace/src/components/SchedulePanel.tsx` - Schedule panel UI for Buffer channel selection, queue/exact timing, submission, progress, errors, and success confirmation.
- `packages/workspace/src/__tests__/schedule-panel.test.tsx` - Component coverage for channel grouping, defaults, exact timing, disabled states, trigger payloads, and confirmation copy.
- `packages/workspace/src/pages/Editor.tsx` - Mounts `SchedulePanel` under `RenderPanel` for rendered image output and wires `useSchedule`.
- `packages/workspace/src/__tests__/editor-flow.test.tsx` - Editor coverage confirming the schedule panel appears after rendered image output is active.

## Decisions Made

- Kept the Workspace schedule UI image-only in this plan, matching the backend and CLI schedule scope for landscape, square, and portrait image formats.
- Used native `datetime-local` for exact scheduling and converted the chosen local value with `new Date(value).toISOString()` before calling `useSchedule.trigger()`.
- Honored saved routing defaults over built-in format defaults so user preference takes precedence over automatic channel seeding.
- Treated the user response `Proceed` as approval of the human verification checkpoint.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Full-suite `npx vitest run` still fails on unrelated pre-existing tests: missing `TEST_API_KEY` for cook API tests, `.worktrees/hyperframes-milestone` Anthropic browser-environment import, preview route mock hoisting, Postiz mock hoisting, and two GitHub callback redirect expectations. The 07-05 targeted Workspace tests pass.

## User Setup Required

None - no external service configuration required for the code changes. Manual Buffer connection remains part of product UAT for SCHED-01.

## Verification

- `rtk proxy npx vitest run packages/workspace/src/__tests__/schedule-panel.test.tsx packages/workspace/src/__tests__/editor-flow.test.tsx` passed: 2 files, 10 tests.
- `rtk proxy npx tsc --noEmit --project packages/workspace/tsconfig.json` passed.
- `rtk proxy npx vitest run` ran and failed only on unrelated pre-existing suite issues listed above; 103 files passed, 1055 tests passed.
- Acceptance checks confirmed `SchedulePanel.tsx` contains `Schedule post`, `datetime-local`, `BUILT_IN_FORMAT_DEFAULTS`, `Next queue slot`, `Exact time`, and `Scheduled`.
- Prior task commits verified: `599b10d`, `958c221`, and `4266d8d`.

## Known Stubs

None. Stub-pattern scan only found intentional test defaults and a pre-existing `placeholderForEmpty` editor render-core option.

## Threat Flags

None. This plan introduced client scheduling UI only; provider hardcoding, ISO timing validation, R2 HEAD checks, Buffer credential handling, and scheduled status persistence remain enforced by prior backend/CLI layers.

## Next Phase Readiness

Phase 7 implementation is complete. End-of-phase verification should focus on the manual Buffer UAT path: connect Buffer, render images locally, schedule queue and exact-time posts, verify Admin scheduled badge, and confirm missing local output aborts without partial Buffer posts.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/07-schedule-time-upload-posting/07-05-SUMMARY.md`.
- Task commits exist: `599b10d`, `958c221`, `4266d8d`.
- Targeted plan verification passed after checkpoint approval.

---
*Phase: 07-schedule-time-upload-posting*
*Completed: 2026-05-22*
