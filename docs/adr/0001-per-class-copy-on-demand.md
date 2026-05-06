# Per-class copy variants are generated on demand, not eagerly

**Status:** accepted

The Sous-Chef pipeline used to generate one copy variant per **Channel class**
(historically called "platform") at Draft creation time — typically X and
LinkedIn. We removed that and now generate per-class variants on demand from
the approve modal, via `POST /api/v1/drafts/[id]/rewrite-copy`.

## Why

Eager generation wasted a Haiku call for every Draft on every class we
guessed the user might want — usually all of them, since the per-Channel-class
selection is unknown until the user opens the approve modal. Most variants
were never read. The cost-per-Draft scaled with the number of Channel classes
we supported, not with what the user actually used.

On-demand generation pushes the call to the moment the user has already
committed to customising for a specific Channel class, so every Haiku request
maps to a variant the user will see.

## Rewrite mode, not regenerate-from-trigger

The endpoint takes the modal's current shared title + description as the seed
and rewrites them in the target Channel class's voice. It does **not**
re-run the original Trigger context (PR title/body, MRR threshold, repo name,
etc.) through `composeCopy` for each class.

We considered the alternative — persisting the full Trigger context on the
Draft and regenerating from source for each class — and rejected it because:

- It would force every Draft type to grow a typed payload schema and a Convex
  field for it, plus a forwards-compatibility story when the schema changes.
- Rewriting already produces good per-Channel-class results without that
  schema cost.
- The rewrite seed is whatever the user has just edited in the modal, which
  is the most up-to-date intent — regenerating from the original Trigger
  would discard those edits.

If we ever need fundamentally different per-class generations (e.g. a TikTok
variant that needs the original commit list, not a rewrite of a description),
we can revisit. Today, rewrite is enough.

## Variants are ephemeral

Generated variants live only in the approve modal's component state. Closing
the modal discards them; only `copyByPlatform` entries that survive an
approve are persisted, and only on the resulting `draftPushes` rows. We do
not write per-class variants back onto the Draft.

This is deliberate: the Draft is the trigger-shaped seed, the approve flow
is where the user picks destinations and tunes copy. Persisting variants on
the Draft would conflate the two stages and create stale copy if the user
re-opens the modal later.

Legacy Drafts with `config.copyByPlatform` (created before this change) still
seed the variants state on modal open, so nothing is lost in the transition.

## Three-per-class generation cap

The modal caps generation at three calls per Channel class per modal session.
After three, the button switches to "Edit X manually" and is disabled until
the modal is closed. Users who aren't satisfied after three rewrites are
faster off editing the variant directly than burning a fourth call.

The cap exists because rewrite is cheap *per call* but unbounded if the user
spam-clicks. Three is enough to get a usable variant for any reasonable seed
without giving the UI a foot-gun.
