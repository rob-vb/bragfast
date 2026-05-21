---
phase: 7
slug: schedule-time-upload-posting
status: ready
nyquist_compliant: true
wave_0_complete: true
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
| 07-01-T1 | 07-01 | 1 | SCHED-03, SCHED-04 | T-7-03 / T-7-04 | Queue-slot and exact-time Buffer payloads are explicit and image-only rejection remains intact | unit | `npx vitest run src/lib/integrations/__tests__/push.test.ts` | ✅ planned | ⬜ pending |
| 07-02-T1 | 07-02 | 2 | SCHED-04, SCHED-05, SCHED-06 | T-7-01 / T-7-02 / T-7-05 | Missing uploads abort before Buffer; success records a scheduled release without draft push side effects | unit | `npx vitest run convex/__tests__/schedulePush.test.ts` | ✅ planned | ⬜ pending |
| 07-03-T1 | 07-03 | 3 | SCHED-02, SCHED-03, SCHED-04, SCHED-05 | T-7-01 / T-7-02 / T-7-03 | Upload URLs are scoped to the authenticated user and schedule errors are all-or-nothing | route | `npx vitest run src/app/api/v1/schedule/__tests__/route.test.ts` | ✅ planned | ⬜ pending |
| 07-04-T1 | 07-04 | 4 | SCHED-02, SCHED-03, SCHED-05 | T-7-01 / T-7-02 | CLI uploads local rendered bytes through presigned URLs before calling schedule | integration | `npx vitest run packages/cli/src/__tests__/schedule-route.test.ts` | ✅ planned | ⬜ pending |
| 07-04-T3 | 07-04 | 4 | SCHED-01, SCHED-05 | — | Workspace hook reports progress, success, and backend failures without hiding local upload failures | hook | `npx vitest run packages/workspace/src/hooks/__tests__/useSchedule.test.ts` | ✅ planned | ⬜ pending |
| 07-05-T1 | 07-05 | 5 | SCHED-01, SCHED-04, SCHED-05, SCHED-06 | T-7-05 / T-7-07 | SchedulePanel exposes channel selection, queue/exact-time controls, and confirmation/error states | component | `npx vitest run packages/workspace/src/__tests__/schedule-panel.test.tsx packages/workspace/src/__tests__/editor-flow.test.tsx` | ✅ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] HEAD-check all-or-nothing gate — unit test for abort-on-missing-URL (SCHED-03)
- [x] `pushToBuffer` custom-time param mapping — unit test queue-slot vs exact-time (SCHED-04)
- [x] Schedule endpoint contract — request/response shape test (SCHED-02, SCHED-05)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned
