# CLAUDE.md

## Task Delegation  

Spawn subagents to isolate context, parallelize independent work, or offload bulk mechanical tasks. Don't spawn when the parent needs the reasoning, when synthesis requires holding things together, or when spawn overhead dominates.  

Pick the cheapest model that can do the subtask well: 
- Haiku: bulk mechanical work, no judgment 
- Sonnet: scoped research, code exploration, in-scope synthesis 
- Opus: subtasks needing real planning or tradeoffs  

If a subagent realizes it needs a higher tier than itself, return to the parent. Parent owns final output and cross-spawn synthesis. User instructions override.

## Preferred Tools

### Data Fetching

1. **WebFetch** — free, text-only, works on public pages that don't block bots.
2. **agent-browser CLI** — free, local Rust CLI + Chrome via CDP. For dynamic pages or auth walls that WebFetch can't handle. Returns the accessibility tree with element refs (
@e1
, 
@e2
) — ~82% fewer tokens than screenshot-based tools. Install: `npm i -g agent-browser && agent-browser install`. Use `snapshot` for AI-friendly DOM state, element refs for interaction.
3. **Notice recurring fetch patterns and propose wrapping them as dedicated tools.** When the same fetch/parse logic comes up more than once, suggest wrapping it as a named tool (e.g. a skill file or a .py script that calls `agent-browser` with the snapshot and extraction steps baked in for that source). Add the entry to `## Dedicated Tools` below and reference it by name on future calls.

### PDF Files

Use 'pdftotext', not the 'Read' tool. Use 'Read' only when the user directly asks to analyze images or charts inside the document.

## Dedicated Tools


## Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Convex codegen + Next.js build
npm run lint             # ESLint
npx vitest run           # Run tests once
npm run remotion:studio  # Remotion preview
```

## Stack

Next.js 16 App Router · Convex (DB + auth + Stripe) · Satori + Sharp (image gen) · Remotion + AWS Lambda (video gen) · Cloudflare R2 · Tailwind v4

## Render Pipeline

**Image** (`src/lib/pipeline/render.ts`): `POST /api/v1/cook/image` → allocate Convex record → return `{ status: "pending" }` → background via `after()`:
1. Resolve template → `migrateConfig()`
2. Resolve brand (by ID, inline, or fallback to template colors)
3. Pre-fetch static image URLs
4. Per format × slide: build `ObjectDataMap`, fetch images to base64, load fonts
5. `CanvasRenderer` → Satori → SVG → Sharp → JPEG → R2 (or local if `OUTPUT_LOCAL=true`)
6. On failure: refund credits, mark `failed`, fire webhook

**Video** (`src/lib/pipeline/render-video.ts` + `convex/videoRender.ts`): `POST /api/v1/cook/video` → Convex `internalAction` (`"use node"`) → Remotion Lambda. Composition: `src/remotion/VideoCanvasComposition.tsx`. Default 8s/slide, 0.5s transitions, 30fps. Optional body.video `{ duration, preset }` overrides defaults.

## Template System (v2)

- `CanvasTemplateConfig`: `version: 2`, `formats: { landscape, square, portrait }`, each with `objects: TemplateObject[]`
- `TemplateObject`: absolute-positioned (x, y, width, height, zIndex), types: `text | image | logo`
- 5 built-ins in `canvas-defaults.ts`: `standard-browser`, `standard-mobile`, `split-browser`, `split-mobile`, `hero`
- Custom templates in Convex `templates` table, prefixed `tmpl_*`
- `migrateConfig()` handles legacy schema at read time

## Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/types.ts` | Brand, ReleaseRequest, FormatEntry, calculateCredits |
| `src/lib/templates/canvas-types.ts` | CanvasTemplateConfig, TemplateObject, migrateConfig() |
| `src/lib/templates/canvas-renderer.tsx` | Satori-compatible JSX renderer |
| `src/lib/auth/authenticate.ts` | Dual auth: API key or session (Better Auth cookies) |
| `src/lib/storage/r2.ts` | R2 via S3Client |
| `src/lib/fonts.ts` | Font loading, in-process cache |
| `src/lib/pipeline/shared.ts` | resolveTemplate, resolveBrand, buildSlideDataMaps |
| `convex/videoRender.ts` | Convex node action for video (`"use node"`) |
| `src/remotion/VideoCanvasComposition.tsx` | Remotion composition |
| `convex/schema.ts` | Tables: userProfiles, brands, templates, apiKeys, deviceCodes, releases, rateLimits, drafts, integrationSecrets, routingDefaults, draftPushes, oauthStates, uploadTokens, uploads |
| `docs/solutions/` | Past bugs/solutions with YAML frontmatter |

## Dimensions

Landscape: 1200×675 · Square: 1080×1080 · Portrait: 1080×1350 · Video: same

## GitHub App

GitHub App integration removed in Phase 8 (ADR-0001 — shelved automation).

## API Routes

`/api/v1/`: `cook/image`, `cook/video`, `cook/[id]` (poll/download/copy), `brands`, `templates`, `fonts`, `account`, `api-keys`, `upload`, `drafts`, `schedule`, `integrations` — all Bearer auth.

## Route Groups

- `(auth)` — login, signup, forgot/reset password
- `(admin)` — admin, history, brands, templates, keys, account/billing
- Public: `docs`, `demo`, `support`, `terms`, `privacy`

## Convex

Queries = reads, mutations = writes. Heavy compute → `internalAction` + `"use node"`. Next.js → `ConvexHttpClient` (server) or `fetchQuery`/`fetchMutation` (client).

## Storage

Local dev (`OUTPUT_LOCAL=true`): `.output/:id/`, `.brands/:id/`. Prod: Convex + R2.

## Conventions

See `docs/conventions.md` for PostHog naming/setup and launch events. New analytics events must conform.

## Brand & Design

See `BRAND_VOICE.md` (diner metaphor, NES-retro) and `DESIGN.md` (color tokens, Press Start 2P + Geist, hard-offset shadows, zero border-radius). Light mode only.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `rob-vb/bragfast`, accessed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles map 1:1 to label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
