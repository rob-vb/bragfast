# Phase 2: CLI Shell + Device-Flow Auth - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the `npx bragfast` CLI shell plus browser device-flow authentication end to end:
the CLI starts with no prior global install, runs an OAuth-style device flow (RFC
8628 shape) to log the user in via a browser approval page, mints an API key on
approval, stores the credential locally at `~/.brag/credentials.json` (chmod 600),
and reuses it on later runs. The backend gains the device-flow endpoints and a
`/device` approval page.

**In scope:** the `packages/cli` package (`bragfast`, `bragfast login`,
`bragfast logout`, plus the installed `brag` bin),
device-flow Convex data + Next API endpoints, the `/device` approval page,
local credential storage/reuse. **Covers:** CLI-01, CLI-02, CLI-03, CLI-04, AUTH-01.

**Not in scope (later phases):** the local Express server + Workspace serving, port
selection, origin-locked CORS, `/api/repo-context` (Phase 3 / AUTH-02); Workspace UI,
rendering, scheduling, admin trim. No Workspace is served yet — after login the CLI
just confirms "Logged in".

</domain>

<decisions>
## Implementation Decisions

### Device-Flow Data Model
- **D-01:** New dedicated `deviceCodes` Convex table — do NOT overload `oauthStates`
  (which is Buffer-shaped). Use `convex/oauthState.ts` as the *pattern* (two-phase
  nonce, TTL, atomic consume), not the home. Fields (planner refines):
  `device_code` (long secret), `user_code` (short `XXXX-1234`), `userId?` (bound on
  approval), `status` (`pending` → `approved` / `denied` → `consumed`), `expiresAt`,
  `created_at`. Index by `user_code` (browser lookup) and `device_code` (CLI poll),
  plus a `by_expires` sweep like `oauthState`/`uploadTokens`.
- **D-02:** RFC 8628 two-code split. `device_code` = long random secret the CLI polls
  with, **never shown to the user / never in the browser URL**. `user_code` =
  short `XXXX-1234` shown in the terminal and echoed on the `/device` page for the
  user to confirm. This keeps the polling secret out of browser history/logs.
- **D-03:** 10-minute TTL (matches `oauthState` `STATE_TTL_MS`), CLI polls every 5s.
  Code is single-use: consumed when the CLI exchanges it for the key. Until approved,
  the token endpoint returns `authorization_pending`; on deny it returns
  `access_denied`; after TTL, `expired_token`.
- **D-04:** On approval, the exchange reuses the existing key infra:
  `apiKeys.create(userId, "CLI")` → returns the `bf_` key to the polling CLI. No new
  key tables/hashing. One key per device-login, visible + revocable on the admin keys
  page.

### CLI Structure & Distribution
- **D-05:** Use **commander** for arg parsing (subcommands, auto help/version, small
  dep, extends cleanly when Phase 3 adds `serve` to the bare command).
- **D-06:** Command surface this phase: bare `bragfast`, `bragfast login`,
  `bragfast logout`, with equivalent installed-bin aliases under `brag`.
  Bare command is the auth gate now; Phase 3 attaches the local server to it.
- **D-07:** Bare `npx bragfast` with no valid credential **auto-starts the device-flow
  login**, then proceeds — one command does everything (lowest friction, matches
  CLI-01/CLI-05 intent). `bragfast login` remains the explicit entry point.
- **D-08:** Ship as a published npm package named `bragfast` with
  `bin: { bragfast, brag }`. `brag` is taken on npm, so public first-run command is
  `npx bragfast`; installed/global usage can still be `brag`.

### /device Approval Page (UI)
- **D-09:** Before approval the page shows the logged-in identity (email, avatar if
  available) **and echoes the `user_code`** being approved (from `?code=XXXX-1234`),
  so the user verifies it matches their terminal (anti-phishing). Session-gated via
  `getSessionUser()`; redirect to login (`?next=/device?code=…`) if not authed.
- **D-10:** Both **Approve and Deny** buttons. Approve binds `userId` + sets
  `approved`; Deny sets `denied` (CLI poll gets `access_denied` and exits cleanly).
- **D-11:** After Approve, the page swaps to a success state — "CLI access approved —
  return to your terminal." (No redirect to /admin.) The terminal is already polling
  and prints "Logged in".
- **D-12:** Distinct error messages for invalid / expired / already-used codes, each
  with a recovery hint ("run `brag login` again"). No silent failures.

### CLI Terminal UX
- **D-13:** Polling display: print `user_code` + verification URL, open browser, then
  a spinner ("Waiting for approval in your browser…"); on approval print
  "Logged in as <email>". Fall back to plain-text lines when stdout is not a TTY.
- **D-14:** Always print the full verification URL **in addition to** auto-opening the
  browser, so SSH / headless / wrong-browser users can copy-paste. Browser-open
  failure is non-fatal.
- **D-15:** Credential reuse: if `~/.brag/credentials.json` exists, use it silently
  (no prompt, no validation round-trip). Only on a backend **401** does the CLI clear
  the credential and restart device-flow login. Matches CLI-03.
- **D-16:** `brag logout` deletes `~/.brag/credentials.json` and prints "Logged out."
  **Local-only** — the minted server-side key persists and is revocable via the admin
  keys page (no logout-time revoke endpoint / network call this phase).

### Backend Endpoint Shape
- **D-17:** Two new unauthenticated `/api/v1/` endpoints (CLI callers — they do NOT
  call `authenticate()`; they use device-code lookup): `POST /api/v1/device/code`
  (CLI requests a code → `{ device_code, user_code, verification_uri, expires_in,
  interval }`) and `POST /api/v1/device/token` (CLI polls → `{ access_token }` or
  `{ error: authorization_pending | access_denied | expired_token }`). Follow the
  existing `/api/v1/` route shape (`{ error }` bodies, JSON, status codes). The
  approval/deny actions are session-gated Convex mutations called from `/device`.

### Claude's Discretion
- Exact `deviceCodes` field names/types and which index layout; whether approval/deny
  are Convex `internalMutation`+action wrappers (mirroring `oauthState.ts`) or direct
  mutations.
- `slow_down` / polling backoff behavior and rate-limiting of the device endpoints
  (RFC 8628 nicety) — research recommends; not a user-facing decision.
- Credential file JSON schema (e.g. `{ api_key, user_id, email? }`) and the
  config-dir helper that resolves `~/.brag/` (align with render-core's
  `os.homedir()` + `path.join` convention, not XDG).
- Spinner library vs hand-rolled; browser-open library (e.g. `open`).
- Whether to also store the key name by hostname later (deferred; "CLI" for now).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (the why)
- `docs/adr/0001-cli-first-reposition.md` — the CLI-first pivot; original entry point was `npx brag`, superseded in Phase 2 by `npx bragfast` because npm package `brag` is already owned
- `docs/adr/0002-local-render-thin-backend.md` — thin backend (store/auth/schedule only); auth = device-flow minting a locally-stored key
- `CONTEXT.md` (repo root) — domain glossary (Draft, Creation, Render); "browser talks only to the local CLI" (note: origin-lock itself is Phase 3 / AUTH-02)

### Phase spec
- `.planning/ROADMAP.md` §"Phase 2: CLI Shell + Device-Flow Auth" — goal + 5 success criteria (the acceptance bar)
- `.planning/REQUIREMENTS.md` — CLI-01, CLI-02, CLI-03, CLI-04, AUTH-01 text

### Auth + keys (reuse targets — the what)
- `convex/auth.ts` — Better Auth setup; `requireAuthedUser(ctx)` (`:95-103`) server-side identity check
- `src/lib/auth/get-session-user.ts` — `getSessionUser()` for the `/device` page gate
- `src/lib/auth/authenticate.ts` — dual API-key/session auth (device endpoints bypass this)
- `convex/apiKeys.ts` — `create` (`:22-41`, the mint target), `hashKey`, `generateKey` (`bf_` prefix); `verifyKey.ts` for validation
- `convex/schema.ts` §`apiKeys` (`:62-71`) — key table shape (no change needed)

### Device-flow precedent (the how — pattern, not home)
- `convex/oauthState.ts` — two-phase nonce: `issueState`/`consumeState`, `STATE_TTL_MS` (10 min), action wrappers; the model to clone for `deviceCodes`
- `convex/schema.ts` §`oauthStates` (`:297-305`) — nonce table shape to adapt
- `convex/uploadTokens.ts` — pending→consumed state machine + `expireStale` sweep (second model)
- `convex/__tests__/oauthState.test.ts` — test patterns to follow

### Route + page patterns
- `src/app/api/v1/brands/route.ts`, `src/app/api/v1/cook/_shared.ts` — `/api/v1/` route shape (auth, error bodies, status)
- `convex/http.ts` — where Convex HTTP routes register (if device endpoints go on Convex HTTP)
- `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/keys/page.tsx` — page gate (`getSessionUser` + redirect) + UI shell (PixelCard) template for `/device`

### Config dir convention
- `packages/render-core/src/fonts.ts:19` — `FONT_DISK_CACHE_DIR = path.join(os.homedir(), ".brag", "fonts")`; credentials follow the same `~/.brag/` convention

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apiKeys.create(userId, name)` mints `bf_` keys + SHA-256 hash and returns the raw
  key once — the exact device-flow approval target, no new key infra.
- `convex/oauthState.ts` is a near-complete template for the device-code lifecycle
  (issue / consume / TTL / action wrappers) — clone its shape into `deviceCodes`.
- `getSessionUser()` + the `(admin)/admin/keys/page.tsx` shell (PixelCard) give the
  `/device` page its auth gate and visual scaffold for near-free.
- `packages/render-core` proves the npm-workspace setup; `packages/cli` slots in
  beside it (`workspaces: ["packages/*"]` already configured).

### Established Patterns
- `/api/v1/` routes: `authenticate()` → optional rate-limit → parse → fetchQuery/
  Mutation → `Response.json`. Device endpoints follow the response shape but skip
  `authenticate()` (they authenticate via device-code lookup).
- `~/.brag/` config dir via `os.homedir()` + `path.join` (render-core fonts) — reuse,
  no XDG.
- Two-phase nonce + `by_expires` sweep (`oauthState`, `uploadTokens`) for short-lived
  codes.

### Integration Points
- `/device` page → session-gated Convex mutation to approve/deny + bind `userId`.
- `POST /api/v1/device/token` exchange → `apiKeys.create` → returns key to CLI.
- CLI credential file at `~/.brag/credentials.json` (chmod 600) is read by every CLI
  invocation; written after device-flow completes; deleted by `brag logout`.

</code_context>

<specifics>
## Specific Ideas

- RFC 8628 (OAuth 2.0 Device Authorization Grant) is the explicit model for the flow
  shape: `device_code` / `user_code` / `verification_uri` / `interval` /
  `authorization_pending` / `slow_down` / `expired_token` / `access_denied`.
- `user_code` format is `XXXX-1234` (locked by ROADMAP SC#5 / `/device?code=XXXX-1234`).
- "Return to your terminal" success copy on `/device` after approval.
- Key minted as name "CLI" for now; hostname-based naming considered and deferred.

</specifics>

<deferred>
## Deferred Ideas

- Local Express server, port selection, origin-locked CORS, `/api/repo-context` —
  Phase 3 (AUTH-02, CLI-05/06/07).
- `brag whoami` / `status` command — considered, not added (outside the 5 success
  criteria); easy follow-up if useful.
- Logout-time server-side key revocation (revoke endpoint + network call) — deferred;
  logout is local-only, keys revoked via admin keys page.
- Hostname-based key naming for multi-device distinction — deferred; "CLI" for now.

None blocking — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-cli-shell-device-flow-auth*
*Context gathered: 2026-05-20*
