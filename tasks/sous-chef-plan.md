# Sous Chef — Build in Public Automation

## Context

Brag.fast zet nu handmatige "cook"-acties + één GitHub-release-webhook om in images/videos. Users moeten zelf bedenken wánneer iets post-waardig is, en zelf naar de Kitchen gaan om te genereren. Doel van deze feature: een automation-laag die build-in-public-momenten (merged PRs, MRR-bewegingen) zelfstandig signaleert, door een LLM laat evalueren, en als pre-render drafts klaarzet voor review. Gebrand als "Sous Chef" — past bij bestaande diner-metafoor (Kitchen, Recipe, Seasoning, Cook). Included in Full Plate + Buffet; Trial/Toast uitgesloten.

**Scope MVP:** GitHub PR-merges + Stripe wekelijkse MRR-check → LLM-gegenereerde drafts → in-app badge. Bestaande `release.published` flow blijft ongemoeid (Sous Chef draait er parallel naast). Geen Slack, geen auto-publish, geen email — alleen in-app notificatie. Geen per-user tone/persona — brand voice komt uit `BRAND_VOICE.md`.

---

## Data model

### Nieuwe Convex tabellen (`convex/schema.ts`)

**`sousChefConfigs`** — één per user
- `userId` (unique, `by_userId` index)
- `enabled: boolean`
- `stripeKeyCiphertext`, `stripeKeyIv`, `stripeKeyTag` — AES-256-GCM trio
- `stripeKeyPrefix` — bv. `rk_live_…abc`, alleen voor UI-weergave
- `mrrMilestones: number[]` — defaults `[1000, 5000, 10000, 25000, 50000, 100000]`
- `lastMrrSnapshot: { mrr, subs, at }`
- `lastError?: string` — voor Stripe-auth failure banner
- `defaultBrandId`, `defaultTemplate`, `defaultFormats`
- `created_at`, `updated_at`

**`sousChefEvents`** — audit log voor alle LLM-beslissingen
- `userId`, `trigger: "pr" | "release" | "mrr"`, `decision: "post" | "skip"`, `reason` (LLM-text of systeem-reden zoals `plan_ineligible`, `rate_capped`, `stripe_auth_failed`)
- `sourceRef` (unieke idempotency-key: `github:pr:${repo}#${nr}:${sha}` of `mrr:${userId}:${isoWeek}`)
- `draftExternalId?`
- `created_at`
- Indexes: `by_userId`, `by_sourceRef`

### Uitbreidingen bestaande tabellen

- `githubRepoConfigs`: `monitorPRs?: boolean`, `prDailyCap?: number` (default 20)
- `userProfiles`: `lastSeenDraftsAt?: string` (ISO)
- `src/lib/plans.ts`: `sousChef: boolean` per plan — `true` voor Full Plate + Buffet

### Stripe restricted-key encryptie

Geen crypto-util bestaat nog. Nieuw: `src/lib/sous-chef/crypt.ts` met Node `crypto` (AES-256-GCM). Key uit env `SOUS_CHEF_ENC_KEY` (32-byte base64), gezet in Convex dashboard naast `BETTER_AUTH_SECRET`. Decryptie uitsluitend in `"use node"` actions; plaintext komt nooit terug uit queries.

---

## Nieuwe modules

| Pad | Verantwoordelijkheid |
|---|---|
| `src/lib/sous-chef/crypt.ts` | AES-256-GCM encrypt/decrypt Stripe key |
| `src/lib/sous-chef/stripe-client.ts` | `ping(key)`, `fetchMrrSnapshot(key)` — `subscriptions.list` active, som `plan.amount * quantity`, normaliseer naar maandelijks |
| `src/lib/sous-chef/analyze-pr.ts` | Haiku-call, spiegel van `src/lib/github/analyze-release.ts`. Input: `{ title, body, diffSummary, templateObjects, brandVoice }`. Output: `{ decision, reason, slides? }` |
| `src/lib/sous-chef/analyze-stripe.ts` | Haiku-call. Input: `{ prevMrr, currentMrr, prevSubs, currentSubs, crossedMilestones, brandVoice }` |
| `src/lib/sous-chef/brand-voice.ts` | Leest curated excerpt uit `BRAND_VOICE.md` als system-prompt fragment (niet het hele bestand — stabiele prompt-grootte) |
| `src/lib/sous-chef/draft-from-slides.ts` | Shared helper: maakt `drafts` row met `source: "agent"` — géén credits |
| `src/lib/sous-chef/gate.ts` | `assertSousChefAccess(userId)` — leest `plans.sousChef`, gooit bij `trial`/`starter` |
| `convex/sousChef.ts` | `getConfig`, `upsertConfig`, `setStripeKey` (ciphertext-trio), `logEvent`, `listEvents`, `unseenAgentDraftsCount`, `markDraftsSeen`, internal `runMrrSweep` (`"use node"`) |
| `convex/crons.ts` (nieuw) | Weekly cron maandag 14:00 UTC → `internal.sousChef.runMrrSweep` |
| `src/app/api/admin/sous-chef/stripe-key/route.ts` | POST met plaintext key → ping Stripe → encrypt → store via Convex |
| `src/app/(admin)/admin/sous-chef/setup/page.tsx` + `setup-client.tsx` | Wizard |
| `src/app/(admin)/admin/sous-chef/page.tsx` | Status + event-log dashboard |
| `src/components/sous-chef/` | `wizard-shell`, `step-welcome`, `step-github`, `step-repos`, `step-stripe-key`, `step-milestones`, `step-defaults`, `step-activate` |

---

## GitHub webhook-uitbreiding

In `src/app/api/github/webhooks/route.ts` naast bestaande `release.published` branch een nieuwe case:

- `pull_request` event met `action === "closed"` én `pull_request.merged === true` én base-ref = default branch → `handlePrMerged`
- `handlePrMerged` spiegelt de early steps van `handleReleasePublished`: installation-lookup, `installation.enabled`, `repoConfig.enabled`, idempotency via `sourceRef` op `sousChefEvents.by_sourceRef`
- Extra gates: `repoConfig.monitorPRs === true` én `sousChefConfig.enabled === true` én `assertSousChefAccess` — elke fail logt een skip-event met reden
- Diff-context voor Haiku: `GET /repos/:owner/:repo/pulls/:n/files` met `per_page=20` → alleen `filename + status + additions/deletions` (géén patches — compact + geen code-leakage)
- Bij `decision = "post"`: `draft-from-slides` → draft aangemaakt met `source: "agent"`. Bij skip: alleen event-log.
- Per-repo daily cap (`prDailyCap`) via rolling check op `sousChefEvents` — voorkomt Haiku-cost runaway bij monorepo-merges.

Bestaande release-handler blijft ongewijzigd.

---

## Convex cron (wekelijkse MRR-sweep)

Nieuw `convex/crons.ts`:

```
crons.weekly("sous chef mrr sweep",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 },
  internal.sousChef.runMrrSweep, {})
```

`runMrrSweep` (internalAction, `"use node"`):
1. Paginate `listEnabledConfigs` (50 per batch) — inner-join check op plan zodat downgrades auto-disablen
2. Per user: decrypt key → `fetchMrrSnapshot` → diff tegen `lastMrrSnapshot` → bepaal gekruiste milestones → `analyzeStripe`
3. Idempotency: `sourceRef = mrr:${userId}:${isoWeek}` — skip als al aanwezig
4. Post-pad: draft aanmaken, event loggen, snapshot updaten. Skip-pad: event loggen + snapshot updaten (voorkomt her-evaluatie van identieke state)
5. Stripe-auth failure: event met `reason: "stripe_auth_failed"`, `lastError` op config, banner in dashboard
6. Errors isolated per user (`try/catch`); sweep continues

---

## Wizard UI — "Sous-chef sollicitatie"

Route: `/admin/sous-chef/setup`. Server-page hydrateert installaties, brands, templates, bestaande config → `setup-client.tsx`. Patroon: zelfde als `src/components/kitchen/cook-page.tsx` — `useReducer` + step components, maar linear i.p.v. tabs.

Stappen:
1. **Welkom** — CV-intro, sollicitatie-metafoor
2. **Connect GitHub** — reuse bestaande `/api/github/callback` install-flow; skip als al verbonden
3. **Repos** — checklist → POST `monitorPRs` naar `api.githubRepoConfigs.upsert`
4. **Stripe key** — password-input + "Test key" knop (`stripe.balance.retrieve()` ping); prefix `sk_` triggert warning
5. **Milestones** — chips-editor, defaults prefilled, optioneel
6. **Defaults** — brand/template/formats voor agent-drafts
7. **Activate** — summary + enable-toggle

Resumable: elke Next persisteert partial config.

---

## Tier gating

Single helper `src/lib/sous-chef/gate.ts` → `assertSousChefAccess(userId)`. Call sites:
- Wizard server page → redirect naar `/admin/account/upgrade` bij deny
- Webhook PR-branch → silent skip + `reason: "plan_ineligible"` event
- Cron sweep → `listEnabledConfigs` filtert op plan → downgrades auto-disablen
- `/api/admin/sous-chef/*` → check direct na auth

`plans.ts` krijgt `sousChef: boolean` — gate leest metadata, geen hardcoded plan-ids.

---

## Badge / notificatie

- `userProfiles.lastSeenDraftsAt` (ISO string)
- Query `unseenAgentDraftsCount({ userId })` in `convex/sousChef.ts` — telt `drafts` met `source = "agent"` en `created_at > lastSeenDraftsAt` (bestaande `drafts.by_userId` index)
- Mutation `markDraftsSeen` triggert bij mount van Kitchen drafts-tab
- UI: rode pip in `src/app/(admin)/layout.tsx` bij nieuwe "Sous Chef" nav-link + op Drafts-tab in Kitchen

---

## Verificatie

- **Unit tests (`npx vitest run`):** `analyze-pr.parseResponse` + `analyze-stripe.parseResponse` met fixtures; `crypt.ts` round-trip; `gate.ts` per plan
- **PR-trigger E2E:** `scripts/sim-pr-webhook.ts` post fixture payload met valid HMAC naar `/api/github/webhooks` → assert draft met `source="agent"` in DB
- **Stripe E2E:** `stripe-client` neemt injected `Stripe`-instance; tests passen een mock met canned `subscriptions.list`. Lokaal end-to-end: Stripe test-mode restricted key (`rk_test_…`) tegen test-data — geen echt account nodig
- **Cron:** `npx convex run sousChef:runMrrSweep` lokaal
- **Haiku dry-run:** `CLAUDE_DRY_RUN=1` env → canned "post" zonder netwerk; handig voor CI
- **Wizard:** handmatige walkthrough als Full Plate user; als Toast user verwacht redirect naar upgrade

---

## Sequencing

1. **Plumbing** — schema, `plans.sousChef`, gate, `crypt.ts`, `sousChef` mutations. Geen UI.
2. **PR vertical slice** — webhook-branch, `analyze-pr.ts`, `draft-from-slides.ts`, badge-query. End-to-end testbaar via simulator. Achter `SOUS_CHEF_ENABLED` env-vlag.
3. **Stripe vertical slice** — `stripe-client`, `analyze-stripe`, `convex/crons.ts`, `runMrrSweep`, key-storage API. Config via `convex run` seed.
4. **Wizard UI** — `/admin/sous-chef/setup`, event-log, nav + badge. Feature zichtbaar.
5. **Polish** — diner-metafoor copy pass, empty states, downgrade-auto-disable hook in `convex/stripe.ts`.

---

## Kritieke bestaande files

- `convex/schema.ts` — schema-toevoegingen
- `src/app/api/github/webhooks/route.ts` — PR-branch inhaken
- `src/lib/github/analyze-release.ts` — template voor `analyze-pr.ts` / `analyze-stripe.ts`
- `src/lib/plans.ts` — `sousChef` flag
- `src/components/kitchen/cook-page.tsx` — wizard-patroon spiegelen
- `convex/userProfiles.ts` — `reserve()` blijft ongewijzigd; drafts kosten geen credits
- `src/lib/auth/authenticate.ts` — dual auth voor nieuwe API routes
- `BRAND_VOICE.md` — excerpt-bron voor LLM system prompts

---

## Risico's

- **Stripe key-validatie bij paste:** `stripe.balance.retrieve()` is goedkoop en heeft alleen `read`-perm nodig. Vereiste scopes documenteren: `read` op `subscriptions`, `customers`, `balance`. Detect `sk_` prefix → waarschuw (user pastet secret i.p.v. restricted key).
- **PR-heavy repos:** monorepos kunnen 50+ merges/dag → Haiku-cost runaway. Mitigatie: `prDailyCap` (default 20) per repo, rolling check tegen `sousChefEvents`; cap bereikt = event `reason: "rate_capped"`.
- **Diff payload size:** harde cap 20 files + 2KB prompt-budget voor diff-summary.
- **Stripe key rotation/revocation:** wekelijkse cron kan silent failen. `lastError` op config + banner in `/admin/sous-chef`.
- **BRAND_VOICE.md groei:** curated excerpt gebruiken (niet full file) voor stabiele prompt-grootte.
- **Orphaned installation/repoConfig:** bestaande webhook skipt al met `unlinked_installation`; PR-branch hergebruikt dat pad.

---

## Openstaande vragen

Geen blokkers. Wel later te beslissen:
- Exacte copy/tone voor wizard-stappen (sollicitatie-metafoor uitwerken)
- Of de LLM-beslisprompt een `confidenceThreshold` krijgt die user kan bijstellen — buiten MVP
- Stripe Connect OAuth als upgrade-pad na MVP (nu: restricted API key)
