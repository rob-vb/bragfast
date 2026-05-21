---
phase: 6
slug: local-video-render
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (root config) |
| **Config file** | `vitest.config.ts` (root); package-level configs under `packages/*` if present — Wave 0 confirms |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (scoped to touched package/file where possible)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Populated by the planner from PLAN.md task IDs. One row per task; map each to its requirement and an automated command (or mark MANUAL with rationale).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | RND-02 / RND-04 | — | N/A | unit/integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Confirm vitest config + run command resolves in the monorepo (render-core / cli / workspace)
- [ ] Fail-fast check: compiled CLI bundle can resolve `src/remotion/index.ts` entry point (research open question #1)
- [ ] Stubs for render-core `onProgress` extension (D-10) and CLI resolver

*A real local video render (Chrome download + .mp4 written) is a MANUAL verification — see below.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-run Chrome download gate (~170 MB) with progress, then auto-proceed | RND-04 | Real headless-Chrome download is slow/network-bound and one-time; not deterministic in CI | Clear Remotion browser cache, drag a video into a slot, set output=video, click Render; observe terminal + Workspace download progress, then render proceeds |
| End-to-end local video render writes a playable `.mp4` | RND-02 | Requires headless Chrome render (~70s) + ffmpeg output; too slow/heavy for unit suite | Render a video draft; confirm `./brag-output/<id>/<format>.mp4` exists and plays in the Workspace `<video>` preview |
| Frame progress (frames done/total) visible in terminal + Workspace | RND-02 | Streamed during a real render; observable behavior | During render, watch frame counter increment in both terminal and inline panel |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
