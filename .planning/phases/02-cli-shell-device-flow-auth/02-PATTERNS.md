# Phase 2 Pattern Map — CLI Shell + Device-Flow Auth

**Mapped:** 2026-05-20

## New / Modified Files

| File | Role | Closest analog |
|---|---|---|
| `convex/schema.ts` | data model | `oauthStates`, `uploadTokens` tables |
| `convex/deviceCodes.ts` | device-flow lifecycle | `convex/oauthState.ts`, `convex/uploadTokens.ts` |
| `convex/__tests__/deviceCodes.test.ts` | backend unit tests | `convex/__tests__/oauthState.test.ts` |
| `src/app/api/v1/device/code/route.ts` | unauthenticated issue endpoint | `src/app/api/v1/brands/route.ts` error shape |
| `src/app/api/v1/device/token/route.ts` | unauthenticated poll endpoint | `src/app/api/v1/cook/_shared.ts` JSON parsing style |
| `src/app/device/page.tsx` | approval UI | `src/app/(admin)/admin/keys/page.tsx` session gate + PixelCard |
| `src/components/device/device-approval.tsx` | approve/deny client controls | existing admin client components using Convex mutations |
| `packages/cli/package.json` | CLI workspace package | `packages/render-core/package.json` workspace package |
| `packages/cli/src/index.ts` | binary entry | new |
| `packages/cli/src/auth.ts` | device-flow orchestration | new |
| `packages/cli/src/credentials.ts` | `~/.brag/credentials.json` | `packages/render-core/src/fonts.ts` config-dir convention |
| `packages/cli/src/http.ts` | backend fetch helpers | new |
| `packages/cli/src/__tests__/credentials.test.ts` | CLI unit tests | render-core vitest package test config |

## Backend Pattern

### Schema

Add:

```ts
deviceCodes: defineTable({
  device_code: v.string(),
  user_code: v.string(),
  userId: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("denied"),
    v.literal("consumed"),
    v.literal("expired"),
  ),
  expiresAt: v.number(),
  created_at: v.string(),
  approved_at: v.optional(v.string()),
  consumed_at: v.optional(v.string()),
})
  .index("by_device_code", ["device_code"])
  .index("by_user_code", ["user_code"])
  .index("by_status_expires", ["status", "expiresAt"])
```

### Convex API

`convex/deviceCodes.ts` should own code generation and state transitions:

- `issueCode` mutation: returns `device_code`, `user_code`, `expires_in`, `interval`.
- `getByUserCode` query: returns safe page state only (`status`, `expiresAt`, `user_code`), never `device_code`.
- `approveCode` mutation: `requireAuthedUser(ctx)`, validates pending/not expired, sets `status: "approved"`, binds `userId`.
- `denyCode` mutation: `requireAuthedUser(ctx)`, validates pending/not expired, sets `status: "denied"`.
- `exchangeToken` mutation: checks `device_code`, returns status errors or mints an API key via `ctx.runMutation(api.apiKeys.create, { userId, name: "CLI" })`, then sets `consumed`.

If Convex disallows public mutation calling another public mutation, make the key creation helper internal in the same plan rather than duplicating key-generation logic unsafely.

## Route Pattern

`POST /api/v1/device/code`:

- no `authenticate()`
- calls `fetchMutation(api.deviceCodes.issueCode, {})`
- returns `{ device_code, user_code, verification_uri, expires_in, interval }`
- `verification_uri` should be `${SITE_URL ?? request origin}/device?code=${user_code}`

`POST /api/v1/device/token`:

- no `authenticate()`
- validates JSON object and `device_code: string`
- calls `fetchMutation(api.deviceCodes.exchangeToken, { device_code })`
- success: `{ access_token, token_type: "Bearer" }`
- errors: `{ error: "authorization_pending" }`, `{ error: "access_denied" }`, `{ error: "expired_token" }`

## Page Pattern

`src/app/device/page.tsx`:

- server component
- reads `searchParams.code`
- `getSessionUser()`, redirect to `/login?next=/device?code=XXXX-1234` if missing
- fetches safe code state via Convex
- renders PixelCard with identity and echoed code
- passes code to client component for Approve/Deny

`DeviceApproval`:

- `useMutation(api.deviceCodes.approveCode)` and `denyCode`
- success state: "CLI access approved — return to your terminal."
- deny state: "CLI access denied — return to your terminal."

## CLI Pattern

Package:

- name `bragfast`
- bin `{ "bragfast": "dist/index.js", "brag": "dist/index.js" }`
- ESM output
- dependencies: `commander`, `open`, `ora`

Commands:

- bare `brag`: if credential exists, print Phase 3 placeholder and exit 0; otherwise run login.
- `brag login`: force device-flow login.
- `brag logout`: delete credentials and print `Logged out.`

Credential:

```json
{
  "api_key": "bf_...",
  "email": "user@example.com",
  "created_at": "2026-05-20T..."
}
```

Store at `~/.brag/credentials.json`; create directory `0700`, file `0600`.

Environment:

- default backend URL from package constant, overridable by `BRAG_API_URL` for local testing.

Terminal behavior:

- always print full verification URL and code
- attempt `open(verification_uri)`, ignore failures
- TTY: spinner while polling
- non-TTY: plain "Waiting for approval..." lines
