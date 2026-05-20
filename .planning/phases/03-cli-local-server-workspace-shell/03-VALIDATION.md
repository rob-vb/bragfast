---
phase: 3
slug: cli-local-server-workspace-shell
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> NOTE: Plan 03-02 is the designated Wave 0 plan. It creates all test scaffolds (server.test.ts,
> origin-lock.test.ts, proxy.test.ts, repo-context.test.ts) in RED state before any implementation
> exists. `wave_0_complete` will be set to `true` after Plan 03-02 executes.

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
| 03-01-01 | 03-01 | 1 | CLI-05 | T-03-01 | No hardcoded 127.0.0.1 in SPA source | structural (node -e assert) | `node -e "const p=JSON.parse(require('fs').readFileSync('packages/workspace/package.json','utf8')); console.assert(p.name==='@bragfast/workspace'); console.log('OK')"` | ❌ W0 creates impl | ⬜ pending |
| 03-01-02 | 03-01 | 1 | CLI-05 | T-03-01 | Bearer URL never in SPA source | structural (node -e assert) | `node -e "const fs=require('fs'); const api=fs.readFileSync('packages/workspace/src/api.ts','utf8'); console.assert(!api.includes('127.0.0.1')); console.assert(api.includes('/api/repo-context')); console.log('OK')"` | ❌ W0 creates impl | ⬜ pending |
| 03-02-01 | 03-02 | 1 | CLI-05, CLI-06 | T-03-02 | Test files exist in RED state | file existence | `ls packages/cli/src/__tests__/server.test.ts` | ❌ W0 creates test | ⬜ pending |
| 03-02-02 | 03-02 | 1 | AUTH-02 | T-03-02, T-03-03 | Wrong-origin test written (RED) | file existence | `ls packages/cli/src/__tests__/origin-lock.test.ts packages/cli/src/__tests__/proxy.test.ts` | ❌ W0 creates test | ⬜ pending |
| 03-02-03 | 03-02 | 1 | CLI-07 | T-03-08 | Non-git fallback test written (RED) | file existence | `ls packages/cli/src/__tests__/repo-context.test.ts` | ❌ W0 creates test | ⬜ pending |
| 03-03-01 | 03-03 | 2 | AUTH-02 | T-03-06 | Bearer injected in proxyReq; not in response | unit (vitest) | `npx vitest run packages/cli 2>&1 | tail -20` | ✅ W0 (03-02) | ⬜ pending |
| 03-03-02 | 03-03 | 2 | CLI-05, CLI-06, AUTH-02 | T-03-04, T-03-05, T-03-07 | loopback bind; origin-lock rejects wrong origin | unit + integration (vitest) | `npx vitest run packages/cli 2>&1 | tail -20` | ✅ W0 (03-02) | ⬜ pending |
| 03-04-01 | 03-04 | 2 | CLI-07 | T-03-08, T-03-09 | Non-git dir returns all-null; no shell injection | unit (vitest) | `npx vitest run packages/cli 2>&1 | tail -20` | ✅ W0 (03-02) | ⬜ pending |
| 03-05-01 | 03-05 | 3 | CLI-05, CLI-06, CLI-07, AUTH-02 | T-03-10 | npm install approved by human; package legitimacy confirmed | checkpoint:human-verify | manual (blocking checkpoint) | n/a — human gate | ⬜ pending |
| 03-05-02 | 03-05 | 3 | CLI-05, CLI-06, CLI-07, AUTH-02 | T-03-10 | Deps installed; build scripts updated | structural (node -e assert) | `node -e "const p=JSON.parse(require('fs').readFileSync('packages/cli/package.json','utf8')); console.assert(p.dependencies.express); console.log('OK')"` | n/a | ⬜ pending |
| 03-05-03 | 03-05 | 3 | CLI-05, CLI-06, CLI-07, AUTH-02 | T-03-11, T-03-12 | End-to-end build passes; all tests green; workspace-dist present | integration (vitest + build) | `npm run cli:build 2>&1 | tail -20 && ls packages/cli/dist/workspace-dist/index.html && npx vitest run packages/cli 2>&1 | tail -20` | ✅ W0 (03-02) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is Plan 03-02. It creates all test scaffolds before implementation exists. When Plan 03-02 executes, set `wave_0_complete: true` in this file.

- [ ] `packages/cli/src/__tests__/server.test.ts` — covers CLI-05 (URL print, browser open), CLI-06 (port conflict fallback), SPA static fallback
- [ ] `packages/cli/src/__tests__/origin-lock.test.ts` — covers AUTH-02 (wrong-origin rejection, HOST guard)
- [ ] `packages/cli/src/__tests__/proxy.test.ts` — covers AUTH-02 (Bearer injected server-side, not leaked in response)
- [ ] `packages/cli/src/__tests__/repo-context.test.ts` — covers CLI-07 (non-git all-null, real repo sha, package.json only, execSync throws)
- [ ] Install `supertest` + `@types/supertest` as devDependency in `packages/cli` for integration tests (done in Plan 03-05 Task 2)

*Existing `packages/cli` vitest infrastructure (Phase 2) covers the runner; new test files above are this phase's Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser auto-opens to Workspace URL | CLI-05 | OS-level browser launch not assertable in CI | Run `brag`; confirm browser opens to printed `http://127.0.0.1:<PORT>`; URL also printed as fallback |
| Workspace SPA shell renders | CLI-05 | Visual confirmation | Open printed URL; confirm shell loads and reaches local server |

*URL-print fallback and port selection ARE automatable; only the OS browser-launch + visual render are manual.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (03-02 is the designated Wave 0 plan)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (03-02 creates all test files; 03-05-01 is a human checkpoint, not a missing test)
- [x] No watch-mode flags (all commands use `npx vitest run`, not `npx vitest`)
- [x] Feedback latency < 30s (`npx vitest run packages/cli` runs in ~10s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
