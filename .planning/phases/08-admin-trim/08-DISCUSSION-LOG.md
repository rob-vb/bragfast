# Phase 8: Admin Trim - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 8-admin-trim
**Areas discussed:** Removal blast radius, Removal method, Billing reshape, Gallery + device wiring

---

## Removal blast radius

### Shelved Sous-Chef automation surface

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it all too | Cut Sous-Chef automation alongside Kitchen + template editor | ✓ |
| Cook authoring only | Remove only Kitchen + cook entry points | |
| Hide from nav, keep routes | Drop nav items, leave route files | |

**User's choice:** Remove it all too.

### Buffer/Provider connection home

| Option | Description | Selected |
|--------|-------------|----------|
| Extract to its own page | Standalone admin page; Sous-Chef page deleted | ✓ |
| Fold into Account/Settings | Connected-services section on Account | |
| Keep a minimal Settings page | Stripped /admin/sous-chef holding only connect | |

**User's choice:** Extract to its own page.

### GitHub App UI / routing page / Drafts page (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Remove GitHub App UI | Delete install/connect UI + PR-merge→draft webhook | ✓ |
| Remove routing page | Delete /admin/sous-chef/routing (redundant after Phase 7) | ✓ |
| Remove Drafts page | Delete /admin/drafts (only action is Edit→Kitchen) | ✓ |

**User's choice:** Remove all three. (drafts table itself stays.)

### Templates list + canvas editor

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | Delete list + editor + clone/delete/create-blank | |
| Read-only list only | Keep read-only gallery, drop editor | |
| (free text) | "The user should still be able to create templates imo." | ✓ |

**User's choice:** Keep template creation (overrides roadmap deferral).
**Notes:** Follow-up confirmed scope: keep editor as today AND surface custom
templates in the Workspace picker via a "Default/Custom" toggle (the larger of the
two follow-up options the user described in free text).

### /admin landing after trim

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to gallery | /admin → /admin/history | |
| Slim dashboard | Strip Sous-Chef activity widget, keep stats + recent Creations | ✓ |
| Gallery becomes /admin | Move gallery to /admin, drop /admin/history | |

**User's choice:** Slim dashboard.

---

## Removal method

### How to remove given the launch-mode flag

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-delete the files | Delete outright; breaks legacy mode | |
| Gate behind launch-mode flag | Hide when repositioned; reversible | |
| Delete + drop legacy mode | Hard-delete AND remove the flag entirely | ✓ |

**User's choice:** Delete + drop legacy mode.
**Notes:** User confirmed revert path is git/GitHub if ever needed — no runtime flag required.

### Deletion depth

| Option | Description | Selected |
|--------|-------------|----------|
| UI + dead backend it owns | Delete UI + backend exclusively serving it; keep shared infra | ✓ |
| UI only this phase | Delete admin surface only; backend orphaned for later | |
| You decide per-module | Remove where clearly exclusive, defer entangled | |

**User's choice:** UI + dead backend it owns.

---

## Billing reshape

### Plan model

| Option | Description | Selected |
|--------|-------------|----------|
| Single plan, one Stripe price | Collapse to one price; delete multi-tier upgrade page | ✓ |
| Single plan, keep tier scaffolding | One active plan, leave PLANS structure | |

**User's choice:** Single plan, one Stripe price.

### 14-day trial mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe trial_period_days: 14 | Stripe runs trial; card up front | |
| Card-less app-tracked trial | trialEnd in userProfiles; no card; prompt at expiry | ✓ |

**User's choice:** Card-less app-tracked trial.

### What expired trial gates

| Option | Description | Selected |
|--------|-------------|----------|
| Backend API access (402) | Reject CLI authenticated calls; subscribe prompt; local render still works | ✓ |
| Admin + CLI login gate | Hard paywall on whole product | |
| Defer enforcement | Set trialEnd + show countdown, no hard block | |

**User's choice:** Backend API access (402).

### Credit removal depth

| Option | Description | Selected |
|--------|-------------|----------|
| Remove credit UI + checks | Strip UI + enforcement; leave field dormant | |
| Full teardown | Remove credits everywhere incl render pipeline + cook API | ✓ |
| UI only this phase | Hide credit bar; leave logic | |

**User's choice:** Full teardown.
**Notes:** Flagged as a broad non-admin diff that intersects whether the server cook
API survives under ADR-0002.

---

## Gallery + device wiring

### Inline social-copy editor

| Option | Description | Selected |
|--------|-------------|----------|
| Strip it — fully read-only | Remove SocialCopySection; gallery read-only | ✓ |
| Keep copy editing | Treat copy-text edit as benign, keep | |

**User's choice:** Strip it — fully read-only.

### Status set handling

| Option | Description | Selected |
|--------|-------------|----------|
| Show rendered + scheduled only | Omit 'published' until tracking exists | ✓ |
| Include published (dormant) | Keep badge variant though unset | |

**User's choice:** Show rendered + scheduled only.

### login→/device redirect (criterion 1)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify URL-param path only | Existing ?next=/device?code= already satisfies it | ✓ |
| Add pending-code detection | Detect unconsumed code on plain login + redirect | |

**User's choice:** Verify URL-param path only.

---

## Claude's Discretion

- Exact route name for the extracted Buffer/Provider connect page.
- Slim-dashboard widget layout.
- Subscribe-prompt copy/UX on 402.
- Default/Custom toggle visuals in the Workspace picker.
- Delete order of operations + per-module exclusivity checks.

## Deferred Ideas

- Template-authoring feature work (AUTHOR-01..05) — stays deferred; keep existing editor, don't extend.
- Buffer published-status tracking — needs polling/webhook, out of scope.
- Pending-device-code detection on plain login — not needed (CLI always supplies code).
- Stripe-side trial (trial_period_days) — viable later if card-up-front wanted.
- Cook-API + server-render retirement — broader cleanup; flagged cross-cutting question.
</content>
