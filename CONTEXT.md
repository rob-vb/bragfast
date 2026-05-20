# Context

brag.fast is a **CLI-first creation tool for developers**. A developer runs the CLI from their machine, authors and fills branded post templates in a locally-served browser workspace, renders the output on their own machine, and either copies it or schedules it through a connected posting provider. The hosted backend is thin: it stores the user's assets, handles auth and billing, and proxies scheduling.

## Glossary

**CLI**
The `brag` binary, run via `npx brag` from a developer's terminal. Authenticates to the backend, reads local files and repo context, renders locally, and serves the Workspace.
_Avoid_: tool, agent.

**Workspace**
The localhost browser UI the CLI serves. The single surface where a user picks/authors a Template, fills Slots, drags in media, renders, and copies or schedules. Talks only to the local CLI, never to the backend directly.
_Avoid_: dashboard, editor (the admin is the dashboard; the Workspace is more than an editor).

**Template**
A reusable layout of absolute-positioned objects. User-authorable in the Workspace: the user lays out one primary format; the other formats are auto-derived (each object anchored to an edge/corner/center and scaled by the shorter canvas side), then optionally nudged per format. Backed by the existing `templates` table / `CanvasTemplateConfig`.

**Slot**
A fillable region in a Template — either text (copy) or media (image/video). Filling Slots is the core Workspace action.

**Creation**
A user-facing post the developer makes: a chosen Template with its Slots filled, plus the rendered output files. Single-slide only (no carousels/multi-slide in this milestone). Stored as a **Draft**.
_Avoid_: post (reserve for the scheduled artifact), release.

**Draft**
The stored editable unit behind a Creation — template choice, copy, media refs, and brand, persisted as the `drafts` table `config` JSON. The canonical noun for what the backend stores.

**Render**
Local production of output files from a Draft. Runs in the CLI on the user's machine — Satori/Sharp for images, Remotion (local headless Chrome) for video. The backend never renders.
_Avoid_: cook, bake (legacy server-pipeline verbs).

**Provider**
A posting service the user connects to schedule output — Buffer or Postiz. Connected via OAuth in the admin; used from the Workspace.

**Channel**
A single connected destination inside a Provider (e.g. the user's X account inside Buffer). A Provider holds many Channels.

**Admin**
The hosted web area. MVP scope: login, a read-only gallery of past Creations, brand setup, API keys, billing (single ~$29/mo subscription, 14-day trial), and connecting Providers. No template/Creation authoring (that lives in the Workspace).

## Relationships

- A **CLI** serves one **Workspace** and authenticates one user to the **backend**
- A **Template** contains many **Slots**
- A **Creation** is one **Draft** rendered against one **Template**
- A **Render** happens locally; its files upload to the backend only when scheduling
- A **Provider** holds many **Channels**; scheduling a Creation pushes to chosen Channels

## Example dialogue

> **Dev:** "When I drag a video into a **Slot** and hit render, does it go to your servers?"
> **Founder:** "No — the **CLI** renders it locally. Nothing hits the backend until you **schedule**, and then we only upload the finished file so the **Provider** can fetch a URL."

## Flagged ambiguities

- "creation" (user word) vs **Draft** (stored unit) — resolved: a Creation is a Draft plus its rendered files; Draft is the canonical persistence noun.
- "Platform" historically meant the social-network type of a Channel — retired earlier in favour of Channel class.

## Shelved language (automation model)

The prior glossary — **Source**, **Trigger**, **Goal**, **TriggerDrafting**, and server-side **Haiku** copy generation — described the automated build-in-public engine in `PRD.md`. That model is **shelved** under the CLI-first reposition: no triggers, no goals, no server-side AI copy. brag.fast generates no copy; the user brings their own (written with their own AI, e.g. Claude Code/Codex) and pastes it. These terms may return in a later milestone.
