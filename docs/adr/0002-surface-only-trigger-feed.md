# Triggers surface in the activity feed; Drafts are created on a Brag, not eagerly

**Status:** accepted

Sous-Chef used to eagerly create a Draft — composing copy via Haiku and inserting
a `drafts` row — the moment a Source produced a qualifying Trigger (e.g. a PR
merged to the default branch). The dashboard activity feed then read its summary
from the linked Draft's `config.objectContent.description.text`.

We are replacing this with a **surface-only** model:

- A Trigger no longer composes copy or creates a Draft. It writes a short,
  human-readable summary (one Haiku call at webhook time, phrased so the user
  knows what visual to make), a brag-worthiness score, and the source reference.
- Every merge to the default branch is **surfaced** in the feed, **sorted by
  brag-worthiness score** (high highlighted, low muted). Nothing is hidden.
- Each card has a **Brag** button. Clicking it creates a lightweight Draft
  seeded with the summary and source reference, then opens it in the Kitchen via
  the existing `?draft=<id>` flow. The summary is shown as a context note so the
  user knows what to make.

## Why

The eager model contradicted the product's core stance: brag.fast is a
**generator the user drives**, not an automation tool that acts on its own. The
user always approves and posts; pre-composing a full Draft for every merge spent
Haiku on copy most merges would never become a post, and produced dead "No
summary" rows whenever copy was thin or absent.

Surfacing first, drafting on intent:

- Maps AI spend to user intent — the same discipline as
  [ADR 0001](0001-per-class-copy-on-demand.md), where per-class copy moved from
  eager to on-demand. A Draft (and later, its copy) is created only when the user
  has committed by hitting Brag.
- Gives the feed a reliable summary independent of any Draft, fixing the empty
  "No summary" cards.
- Keeps the user in control: a merge becomes a post only by an explicit Brag.

## Alternatives considered

- **Keep eager auto-draft for high-confidence merges, surface the rest.** Rejected
  for now: two code paths, and existing users' "magic" draft is exactly the
  behaviour we're intentionally pulling back from. Re-addable later as a prefill
  step (generate copy on Brag) without changing this decision.
- **Surface only brag-worthy merges (score-gated).** Rejected: hiding merges
  forces a threshold judgement the user hasn't asked us to make. Sorting by score
  keeps signal high without dropping anything.

## Consequences

- The eager Trigger-to-Draft workflow (formerly "TriggerDrafting") is removed in
  favour of "Trigger surfacing" (see `CONTEXT.md`).
- `SousChefHistoryFeed` stops deriving its summary from a linked Draft; the
  summary lives on the Trigger event.
- The `drafted` / `approved` / `auto_skipped` decision lifecycle collapses toward
  surfaced → bragged / dismissed.
- Prefilling post copy on Brag is deferred; it can be added as a second,
  intent-gated AI step without revisiting this ADR.
