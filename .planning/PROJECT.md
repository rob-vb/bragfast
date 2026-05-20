# brag.fast

## What This Is

brag.fast is a CLI-first creation tool for developers. A developer runs `npx brag` from their terminal, authors and fills branded post templates in a locally-served browser Workspace, renders the output on their own machine, and copies it or schedules it through Buffer/Postiz. The hosted backend is thin: it stores the user's assets (templates, brands, drafts), handles auth and billing, and proxies scheduling.

## Core Value

A developer can go from terminal to a finished, branded, ready-to-post image/video in minutes — rendered locally, no AI, no friction.

## Current Milestone: v2.0 CLI-First Reposition

**Goal:** Ship the CLI + localhost Workspace MVP — author/fill templates, render locally, copy or schedule — backed by a thin store/auth/schedule backend.

**Target features:**
- `npx brag` CLI: browser device-flow login, serves localhost Workspace, reads local files + repo context, renders locally
- Workspace UI: pick/author template (one format + auto-derive), fill slots (copy paste + media drag-drop), render, copy/schedule
- Local render core (Satori/Sharp images, Remotion-local video) extracted from the existing server pipeline
- Thin backend: store templates/brands/drafts, device-flow auth endpoint, schedule proxy, upload-at-schedule to R2
- Minimal admin: login, read-only Creations gallery, brand setup, API keys, billing (single ~$29/mo sub, 14-day trial), connect Buffer/Postiz

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(Existing codebase — server-render image/video pipeline, API, Convex backend, posting backbone. Being repurposed, not validated under the new direction.)

### Active

See `.planning/REQUIREMENTS.md` for this milestone's scoped requirements.

### Out of Scope

- Automated build-in-public engine (triggers, goals, GitHub daily scan) — shelved by reposition (ADR-0001)
- Server-side AI / Haiku copy generation, voice calibration — removed; BYO-AI (ADR-0003)
- Remotion Lambda / any server-side rendering — render is local (ADR-0002)
- Multi-slide / carousel creations — deferred this milestone
- Template authoring per-format by hand — author one format, auto-derive others
- MCP / agent copy-push — deferred (manual paste only in MVP)
- Pricing tiers / credits — single flat subscription

## Context

- Existing codebase: Next.js 16 App Router · Convex (DB + auth + Stripe) · Satori + Sharp (image) · Remotion + AWS Lambda (video, being dropped) · Cloudflare R2 · Tailwind v4.
- Rich REST API already exists under `/api/v1/` (cook, brands, templates, drafts, upload, account, api-keys) with Bearer/session auth.
- Posting backbone exists: `integrationSecrets`, `oauthStates`, `draftPushes`, Provider/Channel, Buffer OAuth flow.
- Render logic (`src/lib/pipeline/render*`, `CanvasRenderer`, Satori) is reusable — relocate from API route into a shared render core the CLI imports.
- Full resolved design lives in `CONTEXT.md` (glossary) and `docs/adr/0001-0003`.
- This is the first GSD milestone for an existing codebase; prior product direction is the shelved `PRD.md`.

## Constraints

- **Tech stack**: Node/TypeScript CLI (`npx brag`) — reuses existing TS render core. No compiled-binary path in MVP.
- **Render**: must run on the user's machine (Satori/Sharp + Remotion local). No server render, no Lambda.
- **AI**: none server-side. Users bring their own AI for copy.
- **Backend**: thin — store/auth/schedule only. Upload to R2 only at schedule-time.
- **Auth**: browser device-flow login mints a key stored locally; browser talks only to the local CLI.
- **Pricing**: single flat ~$29/mo subscription, 14-day trial.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLI-first reposition; shelve automation PRD (ADR-0001) | Smaller MVP, dev-native distribution, validated direction | — Pending |
| Local render, thin backend; no Lambda (ADR-0002) | Zero server render cost, instant local iteration | — Pending |
| BYO-AI, no server copy gen (ADR-0003) | No LLM cost/safety burden; dev ICP has better AI | — Pending |
| Author one format, anchor+scale auto-derive + nudge | Cuts editor + user effort ~3x, keeps full authoring feasible | — Pending |
| Single flat ~$29/mo sub, 14-day trial | Simple billing; compute is free so meter coordination not throughput | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after bootstrapping v2.0 CLI-First Reposition milestone*
