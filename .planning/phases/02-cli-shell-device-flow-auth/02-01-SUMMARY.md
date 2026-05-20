# Plan 02-01 Summary — Convex Device-Code Lifecycle

Completed: 2026-05-20

## Changes

- Added `deviceCodes` schema table and indexes.
- Added `convex/deviceCodes.ts` with issue, lookup, approve, deny, and token exchange.
- Extracted `createApiKeyForUser()` helper so token exchange mints existing `bf_` API keys in the same mutation.
- Added `convex/__tests__/deviceCodes.test.ts`.

## Verification

- `npx convex codegen --typecheck=disable` — PASS
- `npx vitest run convex/__tests__/deviceCodes.test.ts` — PASS
