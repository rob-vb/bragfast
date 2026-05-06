# Context

## Glossary

**Source**
A connected integration that watches for user activity, such as GitHub, Stripe, PostHog, or GA4.

**Trigger**
An event from a Source that may become a Draft, such as a merged PR, revenue milestone, traffic milestone, or star threshold.

**Draft**
Generated copy plus visual configuration waiting for user approval.

**Post**
An approved Draft that is handed off to a posting destination such as Buffer, Postiz, clipboard, or X intent.

**Goal**
A user-defined milestone that the system tracks against Source data and may turn into a Draft when hit.

**PostAllowance**
The user's current posting meter and entitlement shape. It hides whether the stored accounting row is a new-tier posts meter or a legacy credits meter.

**TriggerDrafting**
The Trigger-to-Draft workflow shared by Source scanners. It owns milestone keys, voice examples, template selection, Draft insertion, Goal fired state, celebration email scheduling, and `goal_hit` analytics.

**Provider**
A posting service the user has connected to push approved Posts. Currently Buffer or Postiz.

**Channel**
A single connected destination inside a Provider — for example, the user's Acme X account inside Buffer. A Provider holds many Channels.

**Channel class**
The social-network type of a Channel: `x`, `linkedin`, `instagram`, `tiktok`, `threads`, `facebook`, `youtube`, or `other`. Derived from a Buffer channel's `service` or a Postiz channel's `identifier`. Per-Channel-class copy variants are what the approve modal lets a user customise.

## Flagged ambiguities

- "Platform" was historically used to mean **Channel class** (the social network: x, linkedin, …). Retired in favour of **Channel class** so it can't be confused with the Provider or the broader brag.fast platform.
