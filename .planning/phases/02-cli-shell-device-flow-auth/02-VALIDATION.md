---
phase: 2
slug: cli-shell-device-flow-auth
status: implemented_with_distribution_caveat
nyquist_compliant: true
created: 2026-05-20
---

# Phase 2 Validation Strategy

## Success Criteria Map

| SC | Roadmap criterion | Proof |
|---|---|---|
| SC#1 | `npx bragfast` starts CLI and prompts login | ✅ workspace `bragfast` and `brag` bins proven; exact public `npx brag` blocked by npm name ownership |
| SC#2 | `brag login` prints code+URL, opens browser, polls until approve, then prints "Logged in" | ✅ CLI integration test with mocked device endpoints |
| SC#3 | second run reuses `~/.brag/credentials.json` chmod 600 | ✅ CLI credential unit tests |
| SC#4 | `brag logout` clears credential file | ✅ CLI credential unit tests + proof script |
| SC#5 | `/device?code=XXXX-1234` shows identity + approve button and approval completes handshake | ✅ Convex lifecycle tests + build includes `/device` route; manual browser e2e still recommended |

## Commands

Quick:

```bash
npx vitest run convex/__tests__/deviceCodes.test.ts
npx vitest run packages/cli
node packages/cli/scripts/prove-device-flow.mjs
```

Full:

```bash
npm run build
npm run lint
npx vitest run convex/__tests__/deviceCodes.test.ts
npx vitest run packages/cli
node packages/cli/scripts/prove-device-flow.mjs
```

## Required Test Files

- `convex/__tests__/deviceCodes.test.ts`
- `packages/cli/vitest.config.ts`
- `packages/cli/src/__tests__/credentials.test.ts`
- `packages/cli/src/__tests__/auth.test.ts`
- `packages/cli/scripts/prove-device-flow.mjs`

## Manual Verification

Because the page needs an authenticated browser session and the CLI opens a browser, one manual proof remains:

1. Run local app.
2. Run CLI against local URL with empty temp `BRAG_HOME`.
3. Confirm terminal prints code and URL.
4. Visit `/device?code=...` as a signed-in user.
5. Confirm identity and code display.
6. Click Approve.
7. Confirm CLI prints `Logged in as <email>` and credential file exists with mode `600`.
8. Run `brag logout`; confirm file is removed.

## Known Validation Gap

The exact public command `npx brag` cannot be proven until the npm package name `brag` is available. The implementation proves the `bragfast` package plus `bragfast` and `brag` workspace bins. Public first-run command is `npx bragfast`; installed/global usage can still be `brag`.

## Execution Results

Completed 2026-05-20:

- `npm run build` — PASS
- `npm run lint` — PASS with warnings
- `npx vitest run convex/__tests__/deviceCodes.test.ts` — PASS, 6 tests
- `npx vitest run packages/cli` — PASS, 3 tests
- `node packages/cli/scripts/prove-device-flow.mjs` — PASS
- `npm exec --workspace=packages/cli -- bragfast --help` — PASS when run with a temp npm cache
- `npm exec --workspace=packages/cli -- brag --help` — PASS when run with a temp npm cache
