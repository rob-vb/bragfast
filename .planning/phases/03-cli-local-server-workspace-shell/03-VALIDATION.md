---
phase: 3
slug: cli-local-server-workspace-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `packages/cli/vitest.config.ts` (extend); `packages/workspace/vitest.config.ts` (new, if needed) |
| **Quick run command** | `npx vitest run packages/cli` |
| **Full suite command** | `npx vitest run packages/cli packages/workspace` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/cli`
- **After every plan wave:** Run full suite + `npm run build --workspace=packages/workspace`
- **Before `/gsd:verify-work`:** Full suite green + CLI proof script (server start → origin-lock → repo-context) passes
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | CLI-05 / CLI-06 / CLI-07 / AUTH-02 | T-03-* | wrong-origin request rejected; Bearer never reaches browser | unit + integration proof | `npx vitest run packages/cli` | ❌ W0 | ⬜ pending |

*Planner fills concrete per-task rows. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Proof script: server start on default port → assert listening on `127.0.0.1:<PORT>`
- [ ] Proof script: occupy default port → assert CLI picks next open port (CLI-06)
- [ ] Proof script: request with foreign `Origin`/`Host` → assert 401 or CORS block (AUTH-02)
- [ ] Proof script: `/api/repo-context` against a git fixture → assert tag/SHA/name/version (CLI-07)
- [ ] Unit: `getSpaDir()` ESM `__dirname` resolution resolves bundled `workspace-dist/`

*Existing `packages/cli` vitest infrastructure (Phase 2) covers the runner; new proof scripts/specs above are this phase's Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser auto-opens to Workspace URL | CLI-05 | OS-level browser launch not assertable in CI | Run `brag`; confirm browser opens to printed `http://127.0.0.1:<PORT>`; URL also printed as fallback |
| Workspace SPA shell renders | CLI-05 | Visual confirmation | Open printed URL; confirm shell loads and reaches local server |

*URL-print fallback and port selection ARE automatable; only the OS browser-launch + visual render are manual.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
