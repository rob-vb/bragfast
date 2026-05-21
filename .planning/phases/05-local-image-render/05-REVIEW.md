---
phase: 05-local-image-render
status: clean
reviewed_at: 2026-05-21T12:28:00Z
depth: standard
---

# Phase 05 Code Review

## Verdict

Clean after one fix.

## Findings

### Fixed

**Warning: Render actions used a different id than the output folder**

- **Files:** `packages/cli/src/server.ts`, `packages/workspace/src/components/RenderPanel.tsx`
- **Risk:** `POST /api/local/render` returned a random job id, but files were written under `brag-output/<draftId>/`. Downloads and open-folder actions could target `/output/<jobId>/...` instead of the actual output files.
- **Fix:** Commit `c9725d1` makes the local render job id equal the draft id and makes download links use the status response URL.
- **Verification:** CLI TypeScript, workspace TypeScript, CLI server tests, workspace editor/autosave tests.

## Residual Risk

- Real end-to-end render UAT still needs a local authenticated CLI session to verify actual JPEG generation, browser download behavior, clipboard copy, and OS folder reveal.
- Full-suite Vitest still has the unrelated GitHub callback redirect expectation failures documented in project state.
