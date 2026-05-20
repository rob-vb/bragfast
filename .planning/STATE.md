---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: CLI-First Reposition
status: planning
stopped_at: Phase 1 context gathered
last_updated: "2026-05-20T14:12:41.133Z"
last_activity: 2026-05-20 — Roadmap created; all 36 v1 requirements mapped across 8 phases
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20)

**Core value:** A developer can go from terminal to a finished, branded, ready-to-post image/video in minutes — rendered locally, no AI, no friction.
**Current focus:** Phase 1 — Render Core Extraction (ready to plan)

## Current Position

Phase: 1 of 8 (Render Core Extraction)
Plan: — of — in current phase
Status: Ready to plan
Last activity: 2026-05-20 — Roadmap created; all 36 v1 requirements mapped across 8 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- ADR-0001: CLI-first reposition — shelved automation PRD
- ADR-0002: Local render, thin backend — no Lambda, no server render
- ADR-0003: BYO-AI — no server copy gen; repo context prefill only

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Sharp cross-platform binary mismatch — must verify on macOS arm64, Linux x64, Linux arm64 before CLI release
- Phase 1: Font path resolution — fonts.ts uses process.cwd(); render-core must use __dirname
- Phase 2: npm package name `brag` availability must be checked before Phase 2 begins
- Phase 4/6: Workspace SPA tech decision (Vite standalone vs Next.js SPA export) — resolve at Phase 3 planning
- Phase 6: Remotion Chrome path isolation on macOS vs Linux — verify in CI before Phase 6 ships

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Template Authoring | AUTHOR-01..05 canvas editor + auto-derive | v3 scope | Milestone start |
| Additional Providers | SCHED-07 Postiz connect | v3 scope | Milestone start |
| CLI power features | MCP-01 agent copy-push | v3 scope | Milestone start |
| Creation types | MULTI-01 multi-slide / carousel | v3 scope | Milestone start |

## Session Continuity

Last session: 2026-05-20T14:12:41.126Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-render-core-extraction/01-CONTEXT.md
