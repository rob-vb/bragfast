# Phase 8: Admin Trim - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Trim the hosted **Admin** to its thin CLI-first role under the v2.0 reposition. The
Admin keeps: login/signup, brand setup (logo + colors → Workspace logo slot), a
**fully read-only** Creations gallery (rendered + scheduled), API key management,
billing as a **single ~$29/mo plan with a card-less 14-day trial**, a standalone
Buffer/Provider connection page, and the already-built `/device` approval page wired
into the login flow. **Template authoring stays** (existing admin canvas editor) and
custom templates become selectable in the Workspace.

Everything tied to the retired server-render / shelved-automation product is **deleted
outright** (not flag-gated): the cook/release authoring UI (Kitchen), the Sous-Chef
automation surface (Briefing, Goals, Voice presets, Activity log, Report,
routing-defaults page), the GitHub App connection UI + PR-merge→draft webhook, the
Drafts page, the multi-tier pricing, and the credits system. The
`NEXT_PUBLIC_LAUNCH_MODE` legacy/repositioned flag is removed entirely — this branch
*is* the repositioned product; rollback is via git, not a runtime flag.

**In scope:** delete Kitchen + all `src/components/kitchen/*` + cook entry points;
delete Sous-Chef automation pages/components + the backend they exclusively own
(pr-merge webhook, Haiku draft gen, triggerEvents, goals/voice/briefing Convex fns);
delete Drafts page, routing-defaults page, GitHub App UI; extract Buffer/Provider
connect to its own admin page; remove `launch-mode.ts` + flag + collapse its 5
consumers to repositioned behavior; collapse billing to a single Stripe price + a
card-less app-tracked 14-day trial (`trialEnd` in `userProfiles`) gating backend API
access (402) at expiry; full credits teardown; make the gallery fully read-only (strip
the inline social-copy editor) showing rendered + scheduled only; slim the `/admin`
dashboard (drop the Sous-Chef activity widget); keep the template list + canvas editor
and surface custom templates in the Workspace picker via a Default/Custom toggle; verify
the existing login→`/device?code=` approval path end-to-end.

**Out of scope:** new template-authoring features beyond what already exists
(AUTHOR-01..05 stay deferred — we *keep* the current editor, we don't extend it);
Stripe-side trial (we chose card-less app-tracked); Buffer published-status tracking
(deferred Phase 7 D-11); video posting; Postiz; pending-device-code detection on plain
login (URL-param path only); any new gallery capability beyond read-only display.

Requirements covered: ADM-01 (signup/login), ADM-02 (brand setup), ADM-03 (read-only
gallery), ADM-04 (API keys), ADM-05 (single plan + 14-day trial).
</domain>

<decisions>
## Implementation Decisions

### Removal blast radius
- **D-01:** **Remove the entire shelved Sous-Chef automation surface**, not just cook
  authoring — Briefing, Goals, Voice presets, Activity log, Report. Parked by ADR-0001;
  no place in the thin admin.
- **D-02:** **Extract Buffer/Provider connection to its own standalone admin page**
  (e.g. `/admin/integrations`). The Sous-Chef settings page is deleted, but Buffer
  connect is *kept infra* — the new model needs it (glossary: "Provider connected via
  OAuth in the admin"). Pull the connect UI out of the Sous-Chef page before deleting
  that page.
- **D-03:** **Remove the GitHub App connection UI + PR-merge→draft webhook** (shelved
  automation, ADR-0001), the **routing-defaults page** (`/admin/sous-chef/routing` —
  Phase 7 now writes `routingDefaults` from the Workspace schedule panel, page
  redundant; the table stays), and the **Drafts page** (`/admin/drafts` — its only
  action is Edit→Kitchen; the `drafts` table itself stays, it backs the CLI Workspace).
- **D-04:** **Keep the template list + canvas editor** (`/admin/templates`,
  `/admin/templates/[id]/edit`, clone/delete/create-blank). This *overrides* the
  roadmap's "template authoring deferred" note — the editor already exists, so keeping
  it is non-deletion, not new work. Cook/release authoring (Kitchen) is what's removed,
  not template authoring.
- **D-05:** **Surface custom templates in the Workspace picker** with a **Default/Custom
  toggle**, so author-in-admin → use-in-Workspace works end-to-end. FLAGGED: this adds
  Workspace-picker work (Phase 4 surface) + fetching user templates via
  `/api/v1/templates` through the CLI proxy — slightly beyond a pure "trim." Deliberate.
- **D-06:** **`/admin` becomes a slim dashboard** — strip the Sous-Chef activity widget;
  keep stats + recent Creations. (Not a redirect; keep a landing summary.)

### Removal method
- **D-07:** **Delete + drop legacy mode entirely.** Hard-delete the legacy files AND
  remove the `NEXT_PUBLIC_LAUNCH_MODE` flag, `src/lib/launch-mode.ts`, and collapse its
  5 consumers to the repositioned branch. No runtime rollback path — this branch is the
  repositioned product; revert via git/GitHub if ever needed.
- **D-08:** **Deletion depth = UI + the backend it exclusively owns.** Remove admin
  pages/components AND backend serving only them (pr-merge webhook, Sous-Chef Haiku
  draft gen, triggerEvents, goals/voice/briefing Convex fns). **Leave shared infra**:
  `drafts`, `releases`, `brands`, `apiKeys`, `integrationSecrets`, `routingDefaults`,
  `deviceCodes`. Planner/researcher confirm exclusivity before deleting each module.

### Billing reshape
- **D-09:** **Single ~$29/mo plan, one Stripe price ID.** Collapse the 3 tiers
  (Toast/Plate/Buffet at the Plate price point). Delete the multi-tier upgrade page;
  `PLANS` map collapses to one entry; Account shows subscribed / not-subscribed.
- **D-10:** **Card-less app-tracked 14-day trial.** Set a `trialEnd` timestamp in
  `userProfiles` at signup; no card required up front; prompt to subscribe at expiry.
  No Stripe `trial_period_days`. (Stripe already handles `trialing` status, but we chose
  the lower-friction card-less path.)
- **D-11:** **Expired/unsubscribed trial gates backend API access with 402.** The thin
  backend rejects the CLI's authenticated calls (schedule, presigned upload, draft save)
  with 402; the Workspace/CLI surfaces a "subscribe to continue" prompt. Local render
  still works offline — the gate sits where the backend's value is.
- **D-12:** **Full credits teardown.** Remove `creditsRemaining`, `calculateCredits`,
  refund-on-failure logic, and credit UI everywhere — including the render pipeline
  (Phase 5/6) and the cook API. FLAGGED: broad, non-admin diff; intersects the open
  question of whether the server-side cook API survives at all under ADR-0002 (server
  render retired). Researcher/planner should resolve cook-API survival alongside this.

### Gallery + device wiring
- **D-13:** **Fully read-only gallery — strip the inline social-copy editor.** Remove
  `SocialCopySection` (the `PATCH /api/v1/cook/[id]/copy` edit affordance). Gallery =
  thumbnails + status + download only. Copy is authored in the Workspace now. Satisfies
  criterion 3 ("no creation or editing UI present in Admin").
- **D-14:** **Show rendered + scheduled statuses only** (plus pending/failed). Omit a
  "published" badge until Buffer status tracking exists (deferred Phase 7 D-11). The
  `scheduled` badge variant already exists from Phase 7.
- **D-15:** **Device approval = verify the URL-param path only.** The CLI always opens
  `/device?code=XXXX`; the existing `?next=/device?code=` redirect-after-login already
  satisfies criterion 1. Phase 8 verifies/tests this end-to-end — no new pending-code
  detection on plain login.

### Claude's Discretion
- Exact route name for the extracted Buffer/Provider connect page (D-02) — `/admin/integrations` suggested; planner decides.
- Slim-dashboard exact widget layout (D-06).
- Subscribe-prompt copy/UX in Workspace/CLI on 402 (D-11).
- Default/Custom toggle visuals in the Workspace picker (D-05).
- Order of operations for the delete (which modules first) and exclusivity checks (D-08).

### Folded Todos
None — no pending todos matched this phase.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategic direction (constraints)
- `docs/adr/0001-cli-first-reposition.md` — CLI-first direction; shelves the automation surface (D-01/D-03).
- `docs/adr/0002-local-render-thin-backend.md` — thin backend, no Lambda, no server render; the constraint behind the credits teardown + cook-API survival question (D-12).
- `docs/adr/0003-byo-ai-no-server-copy-gen.md` — no server-side AI / Haiku copy gen (D-08 removes the draft-gen path).
- `CONTEXT.md` (repo root) — domain glossary: Admin scope ("login, read-only gallery, brand setup, API keys, billing, connect Providers; no template/Creation authoring"), Provider/Channel, Creation, Draft.
- `.planning/PROJECT.md` — milestone scope; "Pricing tiers / credits — single flat subscription" is **Out of Scope** (D-09/D-12).
- `.planning/ROADMAP.md` §"Phase 8" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — ADM-01..05 wording.

### Removal targets — cook/release authoring (DELETE)
- `src/app/(admin)/admin/kitchen/page.tsx`, `src/app/(admin)/admin/kitchen/kitchen-client.tsx` — Kitchen entry.
- `src/components/kitchen/*` — all 20 files (cook-page, cook-button, cook-results, *-step, motion-*, kitchen-scene*, save-draft-dialog, template-picker-dialog, etc.).
- `src/app/(admin)/admin/drafts/page.tsx` + `src/components/admin/drafts-client.tsx` — Drafts page (`drafts-client.tsx:205-208,291-295` push to Kitchen). `drafts` table stays.

### Removal targets — Sous-Chef automation (DELETE)
- `src/app/(admin)/admin/briefing/page.tsx` + `src/components/admin/briefing-client.tsx` (`:414-480` Kitchen CTAs).
- `src/app/(admin)/admin/sous-chef/goals/page.tsx`, `src/app/(admin)/admin/sous-chef/history/page.tsx`, `src/app/(admin)/admin/sous-chef/page.tsx` (+ `VoicePresetPicker`), `src/app/(admin)/admin/sous-chef/routing/page.tsx`, `src/app/(admin)/admin/report/page.tsx`.
- Backend exclusively owned (D-08, confirm exclusivity): `src/lib/github/pr-merge.ts` (PR-merge → Sous-Chef draft via Haiku), trigger-events Convex fns, goals/voice/briefing Convex fns. Webhook handler in `src/app/api/github/webhooks` (drop `pull_request` → draft path; keep `installation` only if anything still needs it — likely also removable with GitHub App UI).

### Keep + extract — Buffer/Provider connection (D-02)
- `src/app/api/v1/sous-chef/integrations/route.ts` — `GET`/`POST`/`DELETE` `integrationSecrets`; the connect API stays, the UI moves to a new standalone page.
- `src/lib/integrations/buffer/*` (`client.ts` `validateApiKey`/`fetchChannels`, `push.ts`) — Buffer connect infra stays.
- `convex/integrationSecrets.ts`, `src/lib/crypto/secret-box.ts` — sealed credential storage; stays.

### Keep — template authoring (D-04/D-05)
- `src/app/(admin)/admin/templates/page.tsx` + `src/components/admin/template-list-client.tsx` (`:66-98` create-blank/clone/delete) + `src/components/admin/template-card.tsx` (`:99-106` Edit) — keep.
- `src/app/(admin)/admin/templates/[id]/edit/page.tsx` + `src/components/editor/template-editor` — keep.
- `src/app/api/v1/templates/route.ts` (+ `[id]`) — template CRUD; the Workspace picker reads user templates here via the CLI proxy (D-05).
- `packages/workspace/src/pages/Editor.tsx` + `packages/workspace/src/api.ts` + `types.ts` — Workspace picker; add Default/Custom toggle (D-05). Built-ins in `src/lib/templates/canvas-defaults.ts`.

### Gallery (D-13/D-14)
- `src/components/admin/history-client.tsx` (`:1-56`) — read-only; subscribes `api.releases.listByUser`, filters by `?status=`.
- `src/components/admin/history-table.tsx` — `Release` type (`:8-22`, statuses incl. `scheduled`); **`SocialCopySection` (`:79-203`, edit at `:93-116`) → DELETE (D-13)**; download + JSON viewer stay.
- `src/components/admin/pixel-badge.tsx` (`:1-27`) — status variants incl. `scheduled` (`:3`); no `published` variant needed (D-14).
- `convex/releases.ts`, `convex/schema.ts` `releases` table — read path; no schema change needed for D-14.

### Billing (D-09..D-12)
- `src/lib/plans.ts` (`:1-40`) — `PlanId`/`PLANS` (trial/starter/pro/scale) → collapse to single plan (D-09); remove `credits` field (D-12).
- `src/lib/pricing-data.ts` — `NEW_TIERS` (Toast/Plate/Buffet) → collapse (D-09).
- `src/app/(admin)/admin/account/page.tsx` (`:30`) — plan name, **credit bar → remove (D-12)**, `ManageBillingButton`, upgrade link.
- `src/app/(admin)/admin/account/upgrade/*` — multi-tier upgrade page + `actions.ts` `createCheckout` → collapse to single price (D-09).
- `src/app/(admin)/admin/account/billing-actions.ts` (`:7` `createPortalSession`), `manage-billing-button.tsx` — keep (Stripe portal).
- `convex/stripe.ts` (`:37` `createCheckoutSession`, `:98/:117` `trialing` handling, `:138-203` plan/credit logic) — collapse to single price; add `trialEnd` trial (D-10); strip credit grants (D-12).
- `convex/schema.ts` `userProfiles` — add `trialEnd` (D-10); remove `creditsRemaining` (D-12).
- Credit enforcement to tear out (D-12, broad): `src/lib/types.ts` `calculateCredits`; refund-on-failure in `src/lib/pipeline/render.ts` + `render-video.ts`; cook API credit checks (`src/app/api/v1/cook/*`). **Resolve cook-API survival under ADR-0002 first.**

### Launch-mode flag removal (D-07)
- `src/lib/launch-mode.ts` — delete (flag, `getLaunchMode`, `isLaunchModeRepositioned`).
- `docs/conventions.md` §"Launch mode flag" — update/remove.
- Consumers to collapse to repositioned behavior: `src/app/welcome/pick-repo/pick-repo-client.tsx`, `src/app/welcome/install-warning/page.tsx`, `src/app/page.tsx`, `src/components/admin/dashboard-client.tsx`, `src/app/api/github/__tests__/callback.test.ts`.

### Device approval (D-15) + nav
- `src/app/device/page.tsx` + `src/components/device/device-approval.tsx` — exists; verify path.
- `src/app/api/v1/device/code/route.ts`, `src/app/api/v1/device/token/route.ts` — device-flow backend (Phase 2).
- `src/app/(auth)/login/page.tsx` (`:10`, `?next=` support) — verify redirect to `/device?code=`.
- `src/components/admin/admin-sidebar.tsx` (`:61-82` nav groups; `:312-339` footer) — remove Kitchen/Drafts/Briefing/Goals/Activity/Settings(Sous-Chef) links; add Buffer-connect link; keep Templates/Brands/API history/API Keys/Account.

### Project guides
- `CLAUDE.md` — posting backbone, API routes, Convex tables, GitHub App section (update after webhook removal), conventions/launch-mode pointer.
- `.planning/phases/07-schedule-time-upload-posting/07-CONTEXT.md` — `releases.status='scheduled'` + `PixelBadge` variant this phase builds on (D-14); routing-defaults now written from Workspace (D-03).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`/device` page already complete** (`src/app/device/page.tsx` + `device-approval.tsx`) — criterion 5/1 mostly done; verify only (D-15).
- **`scheduled` status + badge already exist** (Phase 7) — gallery needs no new status work for D-14.
- **Stripe `trialing` status already handled** (`convex/stripe.ts:98,117`) — though D-10 uses a card-less app-tracked trial instead.
- **Read-only gallery already exists** (`history-client.tsx`) — only the inline `SocialCopySection` editor must be removed (D-13).
- **Buffer connect infra is sound** (`integrations` route + `buffer/*` + sealed secrets) — only the *UI host* moves (D-02).
- **Template editor + CRUD already exist** — D-04 is non-deletion; D-05 adds a Workspace picker read of `/api/v1/templates`.

### Established Patterns
- All Workspace→backend calls go through the CLI proxy (`packages/cli/src/proxy.ts`) with Bearer injected — the Workspace template fetch (D-05) and any 402 gate (D-11) ride existing proxy wiring, no new proxy routes.
- `data-launch-mode` on root layouts + `isLaunchModeRepositioned()` branching is the current rollout pattern — D-07 collapses every branch to the repositioned arm and removes the attribute.
- Sealed credentials → push/connect is server-side; the extracted Buffer page (D-02) still talks to the same server route.
- Credits are threaded through render refund-on-failure + cook API + account UI — D-12 is intentionally broad.

### Integration Points
- **New:** standalone Buffer/Provider connect admin page (D-02); Workspace Default/Custom template toggle + `/api/v1/templates` read (D-05); `trialEnd` field + 402 trial gate on backend API (D-10/D-11); subscribe-prompt UX in Workspace/CLI on 402.
- **Modify:** `admin-sidebar.tsx` nav (remove ~6 links, add 1); `/admin` slim dashboard (D-06); single-price Stripe checkout (D-09); strip credit logic across `plans.ts`/`stripe.ts`/`types.ts`/render pipeline/cook API (D-12).
- **Delete:** Kitchen + `kitchen/*`; Sous-Chef pages + owned backend; Drafts/routing/report/briefing pages; GitHub App UI + pr-merge webhook; multi-tier upgrade page; `launch-mode.ts` + flag; `SocialCopySection`.
- **Open cross-cutting question (FLAGGED):** does the server-side cook API (`/api/v1/cook/*`) survive at all under ADR-0002? Resolving it shapes how much of D-12 (credit checks there) and the gallery's data source applies.

</code_context>

<specifics>
## Specific Ideas

- Workspace template picker gets a **Default/Custom toggle** to switch between built-ins
  and the user's admin-authored templates (D-05).
- Trial is **card-less, 14 days, app-tracked** via `trialEnd`; expiry → **402 on backend
  API** with a subscribe prompt; local render keeps working (D-10/D-11).
- Gallery is **purely read-only** — thumbnails, status (rendered/scheduled/pending/
  failed), download; no copy editing (D-13/D-14).
- `/admin` stays a **slim dashboard** (stats + recent Creations, no activity feed) rather
  than redirecting (D-06).
- Removal is **hard delete + git-revert-if-needed**, no runtime flag (D-07).

</specifics>

<deferred>
## Deferred Ideas

- **Template-authoring feature work (AUTHOR-01..05)** — stays deferred to a follow-on
  milestone. Phase 8 *keeps* the existing editor but does not extend it (D-04).
- **Buffer published-status tracking** — flip a badge to "Published" when Buffer posts;
  needs status polling/webhook, out of scope (Phase 7 D-11, D-14 here).
- **Pending-device-code detection on plain login** — proactively redirect a user who
  logs in without a code in the URL; not needed since the CLI always supplies the code
  (D-15).
- **Stripe-side trial** (`trial_period_days`) — viable later if card-up-front is wanted;
  this phase uses card-less app-tracked (D-10).
- **Cook-API + server-render retirement** — likely a broader cleanup; this phase only
  removes credit checks where they sit. Whether `/api/v1/cook/*` is deleted entirely is
  a flagged cross-cutting question for research/planning.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 8-admin-trim*
*Context gathered: 2026-05-22*
</content>
</invoke>
