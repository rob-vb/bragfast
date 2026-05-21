---
phase: 7
slug: schedule-time-upload-posting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Filled by the planner. Each task that produces verifiable logic (HEAD-check gate,
> Buffer custom-time param mapping, presigned-upload orchestration, releases-row
> creation) maps to an automated command here.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SCHED-0X | T-7-0X / — | TBD | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] HEAD-check all-or-nothing gate — unit test for abort-on-missing-URL (SCHED-03)
- [ ] `pushToBuffer` custom-time param mapping — unit test queue-slot vs exact-time (SCHED-04)
- [ ] Schedule endpoint contract — request/response shape test (SCHED-02, SCHED-05)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Buffer actually receives a scheduled post at the chosen time | SCHED-04 | Requires live Buffer account + wall-clock fire | Connect Buffer, schedule a Creation exact-time, confirm post appears in Buffer queue |
| Workspace schedule panel renders channel groups + timing toggle | SCHED-01, SCHED-06 | Visual/interaction | Open Workspace on a rendered image, open schedule panel, verify per-format channel groups + queue/exact toggle |
| Scheduled badge appears in Admin gallery | SCHED-06 | Visual | After scheduling, open Admin history, confirm "Scheduled" PixelBadge variant |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
