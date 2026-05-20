# Phase 2 Research — CLI Shell + Device-Flow Auth

**Date:** 2026-05-20
**Status:** Complete for planning

## Package Name Check

`npm view brag` returns an existing package:

- name: `brag`
- version: `0.0.2`
- description: `notification functions for ficion`

Conclusion: the literal published package name `brag` is not available. `bragfast` is available, so Phase 2 uses a workspace package named `bragfast` with `bin: { "bragfast": "dist/index.js", "brag": "dist/index.js" }`. Public first-run command is `npx bragfast`; installed/global usage can still be `brag`. The exact public command `npx brag` remains blocked unless the package name is acquired/transferred.

## CLI Dependencies

Checked current npm metadata:

- `commander@14.0.3` — Node `>=20`, established CLI parser.
- `open@11.0.0` — Node `>=20`, browser opener, ESM-only.
- `ora@9.4.0` — Node `>=20`, spinner, ESM-only.

Recommendation: make `packages/cli` ESM (`"type": "module"`) and build with `tsup` to ESM. Avoid CJS because `open` and `ora` are ESM-oriented.

## Backend Shape

Existing reusable code:

- `convex/apiKeys.ts#create` already mints `bf_` keys and returns the raw key once. Use this on device-token exchange.
- `convex/oauthState.ts` is the best lifecycle pattern: 10-minute TTL, single-use consume, internal mutation plus public wrapper style.
- `convex/uploadTokens.ts` confirms pending/consumed/expired state-machine style and expiry indexing.
- `src/app/api/v1/*` route handlers consistently return `Response.json({ error }, { status })` for failures.

Decision: add a dedicated `deviceCodes` table and `convex/deviceCodes.ts`, then expose the CLI flow through Next API routes:

- `POST /api/v1/device/code`
- `POST /api/v1/device/token`

The `/device` approval page uses session-gated Convex calls and does not depend on API-key auth.

## Device Flow Semantics

Use RFC 8628 vocabulary and response names:

- issue: `device_code`, `user_code`, `verification_uri`, `expires_in`, `interval`
- polling pending: `authorization_pending`
- denied: `access_denied`
- expired: `expired_token`
- optional over-polling: `slow_down`

Implementation constraints:

- `device_code` is long, random, and never shown in the browser URL.
- `user_code` is short, displayed as `XXXX-1234`, and shown on `/device?code=XXXX-1234`.
- token exchange consumes the row and mints exactly one API key.

## Test Strategy

Convex behavior should be unit-tested with `convex-test`:

- issue creates pending codes with indexes.
- approve requires auth and binds the authed user.
- deny requires auth.
- token exchange returns pending/denied/expired/approved outcomes.
- approved exchange is single-use and returns a `bf_` API key.

Next route tests can use direct route invocation with mocked Convex functions if necessary, but the core behavior belongs in Convex tests. CLI tests should focus on credential file behavior and command flow helpers, not real browser opening.

## Risks

- Literal `npx brag` is blocked by npm package ownership.
- Device endpoints are unauthenticated by design; they must avoid leaking account state and must use high-entropy `device_code`.
- The raw API key is returned once. The token exchange must mark the device code consumed in the same mutation that creates the key, or at least expose a single internal operation that prevents double exchange.
