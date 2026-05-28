# Context

## Glossary

**Source**
A connected integration that watches for user activity, such as GitHub, Stripe, PostHog, or GA4.

**Trigger**
An event from a Source, such as a merged PR, revenue milestone, traffic milestone, or star threshold. A Trigger is *surfaced* in the activity feed with a readable summary and a brag-worthiness score. It does not become a Draft on its own — the user decides by performing a Brag.

**Brag**
The user action of choosing to turn a surfaced Trigger into a post. Clicking Brag creates a Draft seeded with the Trigger's summary and source reference, then opens it in the Kitchen.

**Draft**
Visual configuration (and, once written, copy) for a post awaiting user approval. Created on a Brag or manually in the Kitchen — never eagerly by a Source scanner.

**Brag-worthiness score**
A confidence value (0–1) attached to a surfaced Trigger that estimates how post-worthy the underlying win is. Used to sort the activity feed; nothing is hidden by it.

**Post**
An approved Draft that is handed off to a posting destination such as Buffer, Postiz, clipboard, or X intent.

**Goal**
A user-defined milestone that the system tracks against Source data and may turn into a Draft when hit.

**PostAllowance**
The user's current posting meter and entitlement shape. It hides whether the stored accounting row is a new-tier posts meter or a legacy credits meter.

**Trigger surfacing**
The Trigger-to-feed workflow shared by Source scanners. It writes a summary (via Haiku), a brag-worthiness score, the source reference, and Goal fired state, then surfaces the Trigger in the activity feed. It no longer composes copy or inserts Drafts — that happens on a Brag. (Supersedes the former eager *TriggerDrafting* workflow.)

**Provider**
A posting service the user has connected to push approved Posts. Currently Buffer or Postiz.

**Channel**
A single connected destination inside a Provider — for example, the user's Acme X account inside Buffer. A Provider holds many Channels.

**Channel class**
The social-network type of a Channel: `x`, `linkedin`, `instagram`, `tiktok`, `threads`, `facebook`, `youtube`, or `other`. Derived from a Buffer channel's `service` or a Postiz channel's `identifier`. Per-Channel-class copy variants are what the approve modal lets a user customise.

## Flagged ambiguities

- "Platform" was historically used to mean **Channel class** (the social network: x, linkedin, …). Retired in favour of **Channel class** so it can't be confused with the Provider or the broader brag.fast platform.
