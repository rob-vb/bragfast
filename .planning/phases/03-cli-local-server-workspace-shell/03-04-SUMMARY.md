---
phase: 03-cli-local-server-workspace-shell
plan: "04"
subsystem: cli
tags:
  - tdd
  - green-state
  - repo-context
  - git
  - workspace-prefill
dependency_graph:
  requires:
    - 03-02
  provides:
    - getRepoContext
  affects:
    - packages/cli/src/repo-context.ts
tech_stack:
  added: []
  patterns:
    - per-call try/catch so a missing tag does not suppress a valid sha
    - static command strings + execSync options.cwd (no shell interpolation)
    - vi.doMock + vi.resetModules for test-scoped child_process mock
key_files:
  created:
    - packages/cli/src/repo-context.ts
  modified:
    - packages/cli/src/__tests__/repo-context.test.ts
decisions:
  - "execSync with stdio: 'pipe' so git stderr does not bleed to the CLI console on non-git dirs"
  - "cwd passed only via execSync options.cwd — command strings are static literals (no injection vector)"
  - "test defect fix: execSync-throws case switched from vi.mock (hoisted) to vi.doMock + vi.resetModules so it is scoped to that test only"
metrics:
  completed_date: "2026-05-21"
  tasks_completed: 1
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 04: getRepoContext (CLI-07) Summary

**One-liner:** `getRepoContext(cwd)` reads latest git tag + short SHA and package.json name/version to prefill Workspace copy slots — pure local, never throws.

## What Was Built

`packages/cli/src/repo-context.ts` exporting `RepoContext` interface and `getRepoContext(cwd)`. Each fallible read is independently try/caught so a missing tag does not suppress a valid SHA, and any failure (non-git dir, missing package.json, git not installed) yields `null` for the affected fields rather than throwing.

- `tag` ← `git describe --tags --abbrev=0`
- `sha` ← `git rev-parse --short HEAD`
- `name` / `version` ← parsed from `package.json`

Commit `8f39320`.

## Deviations from Plan

**Test defect fix (carried from 03-02 RED).** The "execSync throws" test used `vi.mock("child_process")`, which vitest hoists to module top — making execSync throw for the real-git-repo assertions too, so the `sha` test could never pass against a correct implementation. Switched that one test to `vi.doMock` + `vi.resetModules` (not hoisted, scoped to the test) and added the `default: { execSync }` export required by vitest's CJS↔ESM interop. Test intent and assertions unchanged.

## GREEN State Confirmation

```
npx vitest run packages/cli/src/__tests__/repo-context.test.ts
PASS (6) FAIL (0)
```

All 6 CLI-07 contract tests pass.

## Threat Flags

None new. Security posture per plan: git invocations are static string literals; the only dynamic value (`cwd`) is passed via `execSync` `options.cwd`, never interpolated into the command — no shell-injection vector. `stdio: "pipe"` keeps git stderr off the console.

## Self-Check: PASSED

- [x] `packages/cli/src/repo-context.ts` — exists
- [x] `getRepoContext` + `RepoContext` exported
- [x] static command strings (grep `exec(\`` interpolation = 0)
- [x] `stdio: "pipe"` present, no `__dirname`
- [x] 6/6 tests GREEN
- [x] commit `8f39320` in git log
