# ICP Journey Expansion

Generated from CEO plan review on 2026-03-20.

## Vision

bragfast becomes the "release announcement autopilot." Developer pushes a tag, bragfast generates images AND draft social posts AND a download pack. Developer's total time goes from 30-45 minutes to under 2 minutes. Every release gets the attention it deserves.

### Platonic Ideal

The developer pushes `git tag v2.1.0 && git push --tags`. Their phone buzzes: "Your release images are ready. Here are your Twitter and LinkedIn drafts." They review, tap post, done. A weekly digest shows engagement trends. The feeling: "I can't believe I used to spend 30 minutes on this."

### ICP Journey Map (current vs target)

```
Phase 0: BUILD          - Developer writes code, merges, tags release
Phase 1: TRIGGER        - "I should announce this..." (decision fatigue)
Phase 2: CREATE ASSETS  - bragfast solves this TODAY (images)
Phase 3: WRITE COPY     - UNSOLVED -> Copy Generation
Phase 4: DISTRIBUTE     - UNSOLVED -> Download Pack
Phase 5: MEASURE        - UNSOLVED -> Weekly Brag Digest (deferred)

Onboarding gap: 4-5 context switches before first value -> First Cook wizard
Template gap: No good option for text-only releases -> Changelog Card
Link sharing gap: No OG images -> OG Image Auto-Gen
```

## Scope Decisions

| # | Proposal | Effort | Decision | Reasoning |
|---|----------|--------|----------|-----------|
| 1 | Copy Generation (social post drafts) | M | ACCEPTED | Solves Phase 3 pain, biggest gap after images |
| 2 | One-Click Download Pack (ZIP) | S | ACCEPTED | Quick win, removes real micro-friction |
| 3 | Social Posting Integration (OAuth) | L | SKIPPED | Too far from core, platform API complexity |
| 4 | Template Recommendations | S | DEFERRED | Smart but not urgent, users pick templates once |
| 5 | OG Image Auto-Generation | S | ACCEPTED | Near-zero marginal effort, extends value to link shares |
| 6 | Weekly Brag Digest | M | DEFERRED | Re-engagement loop, but needs more design work |
| 7 | Onboarding Fast-Track ("First Cook" wizard) | M | ACCEPTED | Critical for activation rate, time-to-value |
| 8 | Changelog Card Template | S | ACCEPTED | Every release becomes postable, even bugfix-only |

## Features

### 1. Onboarding Fast-Track ("First Cook" wizard)

Guided flow on first dashboard visit replacing empty state. 4 steps:

1. **Source** — Paste GitHub release URL or describe the release manually
2. **Template** — Pick from carousel of 5 built-in templates
3. **Brand** (optional) — Upload logo, set colors
4. **Cooking** — Progress bar, then "Order up!" celebration

Endpoint: `POST /api/v1/guided-cook` — accepts `{ url, template, brand_id? }`, handles changelog fetch + AI analysis + cook server-side.

### 2. Copy Generation

Auto-generates social post drafts (Twitter ~280 chars, LinkedIn ~500 chars) as part of every cook. Users can edit inline on release detail page.

Storage: `socialCopy: { twitter: string, linkedin: string }` field on releases table.

Edit endpoint: `PATCH /api/v1/cook/:id/copy`

### 3. One-Click Download Pack

"Download All" button on release detail page. Generates ZIP on-the-fly with `/landscape/`, `/square/`, `/portrait/`, `/og/` folders + `copy.txt`.

Endpoint: `GET /api/v1/cook/:id/download`

### 4. OG Image Auto-Generation

New `og` format: 1200x630. Processed alongside landscape/square/portrait. Costs 1 extra credit per slide.

### 5. Changelog Card Template

New built-in template — typographic, no screenshot. Version number in Press Start 2P, features with star bullets, fixes with diamond bullets. Truncates at 10+ items.

## Implementation Sequence

```
Sprint 1: Design doc + Onboarding wizard + guided-cook endpoint
Sprint 2: Copy generation + Download pack
Sprint 3: OG images + Changelog card template
```

## Deferred

- Weekly Brag Digest — needs email infrastructure design
- Template Recommendations — auto-suggest based on release content
- Social Posting Integration — OAuth complexity, platform dependency
