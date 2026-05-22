---
phase: 8
slug: admin-trim
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run <changed-test-file>` |
| **Full suite command** | `npx vitest run` |
| **Build/type gate** | `npm run build` (Convex codegen + Next.js build — proves no dangling imports after deletes) |
| **Estimated runtime** | ~30-90 seconds (unit), build ~2-3 min |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-test-file>` (or `npm run lint` for delete-only tasks)
- **After every delete wave:** Run `npm run build` — the primary regression net for a delete-heavy phase (dangling imports surface here, not in unit tests)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite + `npm run build` must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

> The planner fills exact task IDs. The dominant verification for this delete-heavy phase
> is `npm run build` passing with no dangling imports — most delete tasks are verified by
> compilation, not new unit tests. New-code tasks (trial gate, trialEnd, template fetch)
> get behavior assertions.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-XX-XX | XX | 1 | ADM-04 | T-8-01 / — | revoked API key returns 401 on backend call | build + behavior | `npm run build` | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 2 | ADM-05 | T-8-02 / — | request to gated route with expired trial returns 402 | unit | `npx vitest run src/lib/auth/__tests__/subscription-gate.test.ts` | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | 2 | ADM-05 | — | userProfiles.create sets trialEnd = now + 14d | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 8-XX-XX | XX | N | ADM-01/02/03 | — | build passes with deleted Kitchen/Sous-Chef/credits files | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/auth/__tests__/subscription-gate.test.ts` — stub for the 402 trial gate (ADM-05): expired `trialEnd` + no subscription → 402; active trial → pass; active subscription → pass.
- [ ] Trial-set assertion — `userProfiles.create` sets `trialEnd` to `now + 14 days` (ADM-05).
- [ ] No new framework install — vitest already configured.

*Build (`npm run build`) is the standing regression gate for all deletion tasks (ADM-01/02/03) — no per-delete unit stub needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login → `/device?code=XXXX` approval path works end-to-end | ADM-01 | Cross-service flow (CLI device-flow + Better Auth session + redirect); no harness for full browser+CLI round-trip | Start CLI device flow, copy the `/device?code=` URL, log in, confirm redirect lands on the device approval page and approval completes |
| Brand logo auto-populates Workspace logo slot in next session | ADM-02 | Requires Workspace render + visual confirmation | Set brand logo in Admin, open a new Workspace session, confirm the logo Slot is pre-filled |
| Gallery is fully read-only (no SocialCopySection / no edit affordance) | ADM-03 | Visual absence assertion across rendered UI | Open `/admin/history`, confirm thumbnails + status + download only; no copy editor present |
| Workspace Default/Custom template toggle shows admin-authored templates | ADM-02/D-05 | Requires Workspace UI + live `/api/v1/templates` data | Author a custom template in Admin, open Workspace picker, toggle to Custom, confirm it appears and is selectable |
| Subscribe prompt appears in Workspace/CLI on 402 | ADM-05 | UX surface in CLI/Workspace on backend rejection | Force expired `trialEnd`, attempt a schedule/upload, confirm "subscribe to continue" prompt surfaces |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (build or unit) or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (build counts)
- [ ] Wave 0 covers the trial-gate + trialEnd assertions
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
