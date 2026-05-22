---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: CLI-First Reposition
status: executing
stopped_at: Planned 07-06-PLAN.md
last_updated: "2026-05-22T06:48:08.876Z"
last_activity: 2026-05-22 -- Phase 07 planning complete
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 36
  completed_plans: 31
  percent: 86
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A developer can go from terminal to a finished, branded, ready-to-post image/video in minutes — rendered locally, no AI, no friction.
**Current focus:** Phase 07 — schedule-time-upload-posting

## Current Position

Phase: 07 (schedule-time-upload-posting) — GAP CLOSURE READY
Plan: 6 of 6
Status: Ready to execute gap-closure plan 07-06
Last activity: 2026-05-22 -- Phase 07 planning complete

Progress: [█████████░] 86%

## Performance Metrics

**Velocity:**

- Total plans completed: 20
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1: Render Core Extraction | 6 | — | — |
| Phase 2: CLI Shell + Device-Flow Auth | 5 | — | — |
| 03 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: 02-01, 02-02, 02-03, 02-04, 02-05
- Trend: —

*Updated after each plan completion*
| Phase 04 P01 | 7 min | 3 tasks | 16 files |
| Phase 04 P02 | 5 min | 2 tasks | 4 files |
| Phase 04 P03 | 8 min | 3 tasks | 6 files |
| Phase 04 P04 | 10 min | 3 tasks | 9 files |
| Phase 04 P05 | 7 min | 3 tasks | 7 files |
| Phase 04 P06 | 6 min | 3 tasks | 0 files |
| Phase 06 P01 | 2min | 2 tasks | 3 files |
| Phase 06 P02 | 7min | 2 tasks | 4 files |
| Phase 06 P03 | 4min | 2 tasks | 5 files |
| Phase 06 P04 | 8min | 2 tasks | 2 files |
| Phase 07 P01 | 2min | 2 tasks | 4 files |
| Phase 07 P02 | 5min | 3 tasks | 8 files |
| Phase 07 P03 | 4min | 3 tasks | 3 files |
| Phase 07 P04 | 8min | 4 tasks | 7 files |
| Phase 07 P05 | 10min | 4 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- ADR-0001: CLI-first reposition — shelved automation PRD
- ADR-0002: Local render, thin backend — no Lambda, thin backend, R2 upload only at schedule-time
- ADR-0003: BYO-AI — no server copy gen; repo context prefill only
- Phase 04: Workspace API helpers use relative URLs only; the CLI proxy owns auth.
- Phase 04: Auto-save sends full DraftConfig payloads to avoid PATCH shallow-merge data loss.
- Phase 04: Template browsing opens editor state but does not create a draft.
- Phase 04: Caption lives on DraftConfig.caption and is not rendered into the canvas.
- Phase 04: Final full-suite verification documents unrelated GitHub callback redirect failures instead of masking them.
- [Phase ?]: Phase 06 Plan 01: render-core video progress exposes only renderedFrames and totalFrames. — Keeps render-core public API independent of Remotion internals.
- [Phase 06]: Phase 06 Plan 02: CLI video render writes a single active-format MP4 to brag-output/<draftId>/<format>.mp4.
- [Phase 06]: Phase 06 Plan 02: Chrome download status only enters chrome-download when Remotion reports alreadyAvailable:false.
- [Phase 06]: Phase 06 Plan 02: CLI Remotion entry resolves from import.meta.url using ../../../src/remotion/index.ts from the CLI module directory.
- [Phase 06]: Phase 06 Plan 03: pending video poll status remains in rendering phase. — Avoids a separate Workspace pending UI state after trigger while CLI job starts.
- [Phase 06]: Phase 06 Plan 03: video render trigger guard blocks flushing, chrome-download, and rendering. — Prevents duplicate local video render jobs during in-progress phases.
- [Phase 06]: Phase 06 Plan 04: DraftConfig.output is the source of truth for the image/video output toggle.
- [Phase 06]: Phase 06 Plan 04: RenderPanel now branches by output mode while keeping the existing image render path intact.
- [Phase 07]: Phase 07 Plan 01: Buffer queue scheduling maps to schedulingType automatic and mode addToQueue.
- [Phase 07]: Phase 07 Plan 01: Buffer exact-time scheduling maps to mode customScheduled with dueAt preserved as the caller-provided UTC ISO string.
- [Phase 07]: Phase 07 Plan 02: schedulePush.run is a public trusted action for authenticated route handlers; it keeps Buffer credentials server-side and returns only provider post summaries.
- [Phase 07]: Phase 07 Plan 02: scheduled release rows use externalId prefix rel_ and template local-render with channel/scheduling details in metadata JSON.
- [Phase 07]: Phase 07 Plan 02: R2 HEAD checks run for every provided key before the first Buffer push to prevent partial scheduling.
- [Phase 07]: Phase 07 Plan 03: schedule routes accept only landscape, square, and portrait image formats; video formats are excluded from this phase.
- [Phase 07]: Phase 07 Plan 03: route handlers derive userId from authenticate(request) and pass it to schedulePush.run instead of trusting request-supplied user identifiers.
- [Phase 07]: Phase 07 Plan 04: Workspace schedule calls target /api/local/schedule; the CLI performs presigned R2 PUTs and only sends public URLs/keys to the hosted backend.
- [Phase 07]: Phase 07 Plan 04: CLI schedule orchestration accepts only landscape, square, and portrait image formats for this phase.
- [Phase 07]: Phase 07 Plan 04: useSchedule ignores duplicate trigger calls while uploading or scheduling.
- [Phase 07]: Phase 07 Plan 05: SchedulePanel respects saved routingDefaults first and uses BUILT_IN_FORMAT_DEFAULTS only when a format has no saved defaults.
- [Phase 07]: Phase 07 Plan 05: Workspace exact-time scheduling sends a UTC ISO dueAt derived from the native datetime-local input.
- [Phase 07]: Phase 07 Plan 05: Editor only mounts SchedulePanel for image output after rendered image output is available; video scheduling remains deferred.
- [Phase 07]: Phase 07 Plan 05: Human verification checkpoint was approved by user response `Proceed` on 2026-05-22.

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Sharp cross-platform binary mismatch — CI matrix added for macOS arm64 and Linux x64; live CI must still be checked after push
- Phase 2: npm package name `brag` is taken (`0.0.2`); package name `bragfast` is selected and Phase 2 is complete. Public first-run command is `npx bragfast`; installed/global bin can still be `brag`.
- ~~Phase 4/6: Workspace SPA tech decision~~ — RESOLVED 2026-05-20: Vite standalone SPA in `packages/workspace`, served by CLI Express (see 03-CONTEXT.md)
- Phase 4 final manual smoke: authenticated local CLI smoke could not run here because the CLI entered device-login and exited with `fetch failed`; retry after local credentials/device-login are working.
- Full-suite Vitest currently has two unrelated GitHub callback redirect failures expecting legacy/repositioned redirects while current route returns `/admin/sous-chef`.
- Phase 6: Remotion Chrome path isolation on macOS vs Linux — verify in CI before Phase 6 ships
- Phase 6 human UAT pending: drag/drop a real video, render locally, confirm Chrome gate, frame progress, MP4 preview/download/open-folder.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Template Authoring | AUTHOR-01..05 canvas editor + auto-derive | v3 scope | Milestone start |
| Additional Providers | SCHED-07 Postiz connect | v3 scope | Milestone start |
| CLI power features | MCP-01 agent copy-push | v3 scope | Milestone start |
| Creation types | MULTI-01 multi-slide / carousel | v3 scope | Milestone start |

## Session Continuity

Last session: 2026-05-22T06:23:42.830Z
Stopped at: Completed 07-05-PLAN.md
Resume file: None
