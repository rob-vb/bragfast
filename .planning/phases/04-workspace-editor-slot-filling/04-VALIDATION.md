---
phase: 4
slug: workspace-editor-slot-filling
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for Workspace editor + slot filling.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/cli/vitest.config.ts`; workspace config added in Wave 1 |
| **Quick run command** | `npx vitest run packages/cli/src/__tests__/server.test.ts src/lib/drafts/__tests__/validate.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's listed automated verify command.
- **After every plan wave:** Run `npx vitest run`.
- **Before `$gsd-verify-work`:** `npm run build` and `npx vitest run` must both pass.
- **Max feedback latency:** 60 seconds for focused tests, full suite at wave boundaries.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | WORK-01, WORK-02 | T-04-03 | Browser-safe render-core exports omit node-only font loaders | unit/build | `npm run build --workspace=packages/render-core` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | WORK-05, WORK-06 | T-04-04 | Caption is validated as a string, unknown keys still reject | unit | `npx vitest run src/lib/drafts/__tests__/validate.test.ts` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | MEDIA-01, MEDIA-02, MEDIA-05 | T-04-01, T-04-02 | Local media endpoint accepts only supported MIME types and serves only random cached filenames | unit | `npx vitest run packages/cli/src/__tests__/server.test.ts` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 2 | WORK-05, WORK-06, WORK-07 | T-04-04 | Auto-save sends full config and never exposes the API key in browser code | unit | `npx vitest run --config packages/workspace/vitest.config.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | WORK-01, WORK-02, WORK-03, WORK-08 | T-04-03 | Template previews render with browser-safe imports and brand logo is supplied via brand state | unit/build | `npm run build --workspace=packages/workspace` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 3 | WORK-04, MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-05 | T-04-01, T-04-02 | Slot inputs update local state, rejected media shows inline error, video preview uses muted looping video | unit/build | `npm run build --workspace=packages/workspace` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 4 | WORK-01..08, MEDIA-01..05 | T-04-ALL | End-to-end editor flow persists draft content and has no hardcoded localhost/API credentials | build/manual | `npm run build && npx vitest run` | mixed | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/workspace/vitest.config.ts` — jsdom vitest config for hooks/components.
- [ ] `packages/workspace/src/__tests__/useAutoSave.test.tsx` — debounce and full-config save coverage.
- [ ] `packages/workspace/src/__tests__/Home.test.tsx` — recent drafts + template grid render coverage.
- [ ] `packages/workspace/src/__tests__/editor-flow.test.tsx` — slot panel, format switch, caption, media preview coverage.
- [ ] `packages/cli/src/__tests__/server.test.ts` — extend with local media upload/static serving tests.
- [ ] `src/lib/drafts/__tests__/validate.test.ts` — extend with caption acceptance/rejection tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dragging a desktop image/video into the browser drop zone | MEDIA-01, MEDIA-02 | jsdom cannot fully simulate OS drag payloads or native file picker UX | Run `npm run cli:build`, start `brag`, open the Workspace, drop PNG/JPG/WebP/SVG/MP4/MOV/WebM files, confirm previews appear and unsupported files show the exact inline error. |
| Reopen recent draft after local server restart | WORK-07 | Requires authenticated local server + backend draft persistence | Create a draft, stop/start CLI, reopen from recent drafts, confirm text, caption, media refs, format, colors, and brand state are preserved. |
| Responsive editor layout | WORK-02, WORK-03 | Visual layout quality requires viewport inspection | Check desktop and mobile widths: preview and slot panel are both reachable, format switcher stays above canvas, no text overlaps. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s for focused checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21
