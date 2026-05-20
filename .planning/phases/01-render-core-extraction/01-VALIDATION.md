---
phase: 1
slug: render-core-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> The 5 ROADMAP success criteria are the validation spine for this phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) + standalone Node proof scripts |
| **Config file** | root `vitest.config.ts` (existing); package adds `packages/render-core/vitest.config.ts` in Wave 0 |
| **Quick run command** | `npx vitest run packages/render-core` |
| **Full suite command** | `npx vitest run && node packages/render-core/scripts/prove-image.mjs && node packages/render-core/scripts/prove-video.mjs && node packages/render-core/scripts/audit-deps.mjs` |
| **Estimated runtime** | ~90 seconds (video proof dominates) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/render-core`
- **After every plan wave:** Run the full suite command above
- **Before `/gsd:verify-work`:** Full suite green AND all 3 proof scripts exit 0
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> The planner refines Task IDs. This maps each ROADMAP Success Criterion (SC) to its proving check.

| SC | Validates | Test Type | Automated Command | Status |
|----|-----------|-----------|-------------------|--------|
| SC#1 | `renderImage()` standalone → valid JPEGs for landscape/square/portrait, no Convex/R2 | integration (proof script) | `node packages/render-core/scripts/prove-image.mjs` | ⬜ pending |
| SC#2 | `renderVideo()` standalone → valid `.mp4` via promoted `renderVideoLocal()`, no Lambda/network | integration (proof script) | `node packages/render-core/scripts/prove-video.mjs` | ⬜ pending |
| SC#3 | dependency audit: zero resolved imports of `convex`, `@aws-sdk`, `next` | unit (audit script) | `node packages/render-core/scripts/audit-deps.mjs` | ⬜ pending |
| SC#4 | font paths resolve from `__dirname`, render works regardless of cwd | unit | `npx vitest run packages/render-core -t "font __dirname"` | ⬜ pending |
| SC#5 | Sharp native binaries install on macOS arm64 + Linux x64 | CI matrix | GitHub Actions job `render-core (macos-arm64, ubuntu-x64)` green | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/render-core/vitest.config.ts` — package test config
- [ ] `packages/render-core/scripts/prove-image.mjs` — SC#1 standalone image proof (Buffer in → JPEG out asserted via Sharp metadata)
- [ ] `packages/render-core/scripts/prove-video.mjs` — SC#2 standalone video proof (MP4 magic-bytes / ffprobe-free Buffer assertion)
- [ ] `packages/render-core/scripts/audit-deps.mjs` — SC#3 resolved-import audit asserting absence of `convex`/`@aws-sdk`/`next`
- [ ] CI workflow matrix (macOS arm64 + Linux x64) — SC#5

*JPEG/MP4 fixtures: prove scripts construct a minimal in-memory `LocalRenderRequest` (CanvasTemplateConfig + resolved Brand + base64 media), avoiding any network/Convex.*

---

## Manual-Only Verifications

| Behavior | SC | Why Manual | Test Instructions |
|----------|----|-----------|--------------------|
| Cross-platform Sharp/Remotion Chromium install | SC#5 | Local dev cannot exercise both OS arches | Confirmed by green CI matrix; reviewer checks both legs ran, not skipped |

*All other phase behaviors have automated verification via the proof scripts above.*

---

## Validation Sign-Off

- [ ] All success criteria have an automated proof script or CI check
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 creates the 3 proof scripts + CI matrix
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set after planner maps every plan task to a check

**Approval:** pending
