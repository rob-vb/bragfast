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
