# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Convex codegen + Next.js build
npm run lint             # ESLint
npm test                 # Vitest (watch mode)
npx vitest run           # Run tests once
npx vitest run src/lib/__tests__/credits.test.ts  # Single test file
npm run remotion:studio  # Remotion preview
```

## Architecture

**Stack:** Next.js 16 App Router, Convex (DB + auth + Stripe), Satori + Sharp (image gen), Remotion + AWS Lambda (video gen), Cloudflare R2 (storage), Tailwind v4.

### Render Pipeline (`src/lib/pipeline/render.ts`)

`POST /api/v1/cook` → `createRelease()` allocates a Convex record, returns `{ status: "pending" }` immediately → `renderReleaseAsync()` runs in background via `after()`:
1. Resolve template config (built-in default or user's custom `tmpl_*` from Convex) → `migrateConfig()`
2. Resolve brand (by `brand_id` from Convex, or inline from request, fallback to template colors)
3. Pre-fetch static image URLs from template config
4. Per format × per slide: build `ObjectDataMap`, fetch user images to base64, load fonts (Google Fonts + local TTF)
5. `CanvasRenderer` JSX → Satori → SVG → Sharp → JPEG → upload to R2 (or local if `OUTPUT_LOCAL=true`)
6. On failure: refund credits, mark `failed`, fire webhook

### Template System (v2, canvas-based)

- `CanvasTemplateConfig` — `version: 2`, contains `formats: { landscape, square, portrait }`, each with `objects: TemplateObject[]`
- `TemplateObject` — absolute-positioned (x, y, width, height, zIndex), typed as `text | image | logo`
- `CanvasRenderer` — React component rendering objects absolute-positioned in a fixed-size div, sorted by zIndex
- 5 built-in templates in `canvas-defaults.ts`: `standard-browser`, `standard-mobile`, `split-browser`, `split-mobile`, `hero`
- Custom templates stored in Convex `templates` table, prefixed `tmpl_*`
- `migrateConfig()` handles legacy schema at read time

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/types.ts` | Shared types (Brand, ReleaseRequest, FormatEntry, calculateCredits) |
| `src/lib/templates/canvas-types.ts` | CanvasTemplateConfig, TemplateObject, migrateConfig() |
| `src/lib/templates/canvas-renderer.tsx` | Satori-compatible JSX renderer |
| `src/lib/auth/authenticate.ts` | Dual auth: API key (Bearer token) or session (Better Auth cookies) |
| `src/lib/github/analyze-release.ts` | Claude Haiku extracts slide content from GitHub release notes |
| `src/lib/storage/r2.ts` | Cloudflare R2 via AWS SDK S3Client |
| `src/lib/fonts.ts` | Font loading with in-process caching |
| `convex/schema.ts` | 10 tables: userProfiles, brands, templates, apiKeys, releases, etc. |

### Image Dimensions

- Landscape: 1200×675, Square: 1080×1080, Portrait: 1080×1350, OG: 1200×630
- Video: Same as image dimensions (renders at template resolution)

### Storage

File-based for local dev (`OUTPUT_LOCAL=true`): releases in `.output/:id/`, brands in `.brands/:id/`. Production uses Convex + R2.

## Brand & Design

See `BRAND_VOICE.md` (breakfast diner metaphor, NES-retro personality) and `DESIGN.md` (color tokens, Press Start 2P + Geist fonts, hard-offset shadows, zero border-radius). Light mode only.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately -- don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Model Tier Awareness

- Call out when I'm using the wrong model tier
- Lookups on Opus = waste
- Architecture on Sonnet = underpowered
- Quick nudge, not a lecture
