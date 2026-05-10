# TODOS

Tracked work that is intentionally deferred. Each entry has a trigger condition for when to revisit.

## Template library (added 2026-05-07 by /plan-design-review)

### Per-template "Best for" copy
**What:** Hand-written one-liner per built-in template (e.g. "Best for product launches with a desktop screenshot") shown on `/templates/[id]`.
**Why:** Calibrates user expectations between layout shape and use case. De-risks "wrong template" regret after import.
**Pros:** Low cost (~10 min for 6 templates); improves discoverability without filters.
**Cons:** Copy maintenance as templates evolve.
**Trigger:** Revisit at user-publish phase, when template count grows and "what is this for" becomes a real question.

### Filter chips on /templates
**What:** Filter strip above the gallery (medium, format, use case).
**Why:** Six templates fit a single scan. Past ~12, scan-cost overwhelms density.
**Pros:** Scales gallery to 20+ templates without redesign.
**Cons:** Filter UI adds noise below the threshold.
**Trigger:** Template count ≥ 12.

### Server-side banner-dismissal persistence
**What:** Upgrade `ImportedBanner` from session-only dismiss to per-import server-stored dismiss (Convex field on imported template row).
**Why:** Session-only dismissal re-shows the banner every visit until acted on. May feel noisy with frequent kitchen returns.
**Pros:** Calmer UX once user has acknowledged an import.
**Cons:** Schema field + mutation; only worth building if users report it.
**Trigger:** First user feedback signal that the banner is repetitive.
