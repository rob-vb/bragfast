# CLAUDE.md

## Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Convex codegen + Next.js build
npm run lint             # ESLint
npx vitest run           # Run tests once
npx vitest run src/lib/__tests__/credits.test.ts  # Single test file
npm run remotion:studio  # Remotion preview
```

## Stack

Next.js 16 App Router · Convex (DB + auth + Stripe) · Satori + Sharp (image gen) · Remotion + AWS Lambda (video gen) · Cloudflare R2 · Tailwind v4

## Render Pipeline

**Image** (`src/lib/pipeline/render.ts`): `POST /api/v1/cook` → allocate Convex record → return `{ status: "pending" }` → background via `after()`:
1. Resolve template → `migrateConfig()`
2. Resolve brand (by ID, inline, or fallback to template colors)
3. Pre-fetch static image URLs
4. Per format × slide: build `ObjectDataMap`, fetch images to base64, load fonts
5. `CanvasRenderer` → Satori → SVG → Sharp → JPEG → R2 (or local if `OUTPUT_LOCAL=true`)
6. On failure: refund credits, mark `failed`, fire webhook

**Video** (`src/lib/pipeline/render-video.ts` + `convex/videoRender.ts`): same `POST /api/v1/cook` with `video` field → Convex `internalAction` (`"use node"`) → Remotion Lambda. Composition: `src/remotion/VideoCanvasComposition.tsx`. Default 8s/slide, 0.5s transitions, 30fps.

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
| `src/lib/github/analyze-release.ts` | Claude Haiku → slide content from release notes |
| `src/lib/storage/r2.ts` | R2 via S3Client |
| `src/lib/fonts.ts` | Font loading, in-process cache |
| `src/lib/video/lambda.ts` | Remotion Lambda render + polling with retry |
| `src/lib/pipeline/shared.ts` | resolveTemplate, resolveBrand, buildSlideDataMaps |
| `convex/videoRender.ts` | Convex node action for video (`"use node"`) |
| `src/remotion/VideoCanvasComposition.tsx` | Remotion composition |
| `convex/schema.ts` | 10 tables: userProfiles, brands, templates, apiKeys, releases, rateLimits, githubInstallations, githubRepoConfigs, githubSkippedReleases, uploads |
| `docs/solutions/` | Past bugs/solutions with YAML frontmatter |

## Dimensions

Landscape: 1200×675 · Square: 1080×1080 · Portrait: 1080×1350 · Video: same

## GitHub App

`release.published` → webhook → verify → map notes to slides → if `autoApprove`: render, else `pending_review` → admin approves. Per-repo config in `githubRepoConfigs`.

## API Routes

`/api/v1/`: `cook`, `brands`, `templates`, `fonts`, `account`, `api-keys`, `upload`, `guided-cook` — all Bearer auth.
GitHub: `webhooks`, `callback`, `installations`, `repos`, `configs`, `releases/[id]/approve`

## Route Groups

- `(auth)` — login, signup, forgot/reset password
- `(admin)` — admin, history, brands, templates, keys, account/billing
- Public: `docs`, `demo`, `support`, `terms`, `privacy`

## Convex

Queries = reads, mutations = writes. Heavy compute → `internalAction` + `"use node"`. Next.js → `ConvexHttpClient` (server) or `fetchQuery`/`fetchMutation` (client).

## Storage

Local dev (`OUTPUT_LOCAL=true`): `.output/:id/`, `.brands/:id/`. Prod: Convex + R2.

## Brand & Design

See `BRAND_VOICE.md` (diner metaphor, NES-retro) and `DESIGN.md` (color tokens, Press Start 2P + Geist, hard-offset shadows, zero border-radius). Light mode only.

## Workflow

1. **Plan first** — write `tasks/todo.md` for any task 3+ steps or with architectural decisions. Stop and re-plan if stuck.
2. **Subagents** — offload research/exploration to keep main context clean. One task per subagent.
3. **Self-improve** — after any correction: update `tasks/lessons.md`. Review lessons at session start.
4. **Verify before done** — prove it works. "Would a staff engineer approve this?"
5. **Elegance check** — non-trivial changes: ask if simpler exists. Skip for obvious fixes.
6. **Bug reports** — just fix. No hand-holding.

## Task Tracking

1. Write plan → `tasks/todo.md` with checkable items; check in before implementing
2. Mark items complete as you go; high-level summary each step
3. Add review section when done; update `tasks/lessons.md` after corrections

## Principles

- **Simplicity first** — minimal code impact
- **No laziness** — find root causes, no temp fixes, senior standards
- **Minimal impact** — touch only what's necessary

## Plan Mode

Extremely concise — sacrifice grammar. End with list of unresolved questions, if any.

## Model Tier

Lookups on Opus = waste. Architecture on Sonnet = underpowered. Quick nudge, not a lecture.
