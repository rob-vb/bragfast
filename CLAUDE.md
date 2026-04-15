# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server
- `npm run build` — runs `convex codegen` then `next build`
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm test` — Vitest (config: `vitest.config.ts`). Run a single test: `npx vitest run path/to/file.test.ts -t "test name"`
- `npm run remotion:studio` — local Remotion studio on `src/remotion/index.ts`
- `npm run remotion:deploy` — deploys Remotion site + Lambda function. **Required after any change in `src/remotion/`** before it takes effect in prod rendering.
- Convex: dev runs implicitly via the app; deploys happen via Convex's own tooling. `convex/_generated/` is generated — don't edit.

## Architecture

**brag.fast** is an API-first service that turns release metadata into branded images (and videos). See `PRD.md` for product context and `DESIGN.md` for the design system (NES/breakfast-diner aesthetic, Press Start 2P + Geist, `--color-brand` / `--color-gold` / `--color-surface`).

### Stack
- **Next.js 16 / React 19** (App Router) in `src/app/`
- **Convex** backend in `convex/` — schema in `convex/schema.ts`, tables include `userProfiles` (credits/plan), `brands`, `templates`, `apiKeys`, releases, github installations, uploads, video renders
- **Better Auth** via `@convex-dev/better-auth` (`convex/auth.ts`, `src/lib/auth/`)
- **Stripe** via `@convex-dev/stripe` (`convex/stripe.ts`)
- **Satori** for image rendering, **Remotion + Lambda** for video rendering
- **R2 / S3** for asset storage (AWS SDK + presigned URLs)
- **Resend + React Email** for transactional mail (`src/lib/emails/`)

### Rendering pipelines
- **Images**: `src/lib/pipeline/render.ts` — Satori → SVG → sharp → PNG. Templates in `src/lib/templates/`. Satori supports `objectPosition` directly; do not switch those to `backgroundImage`.
- **Video**: `src/lib/pipeline/render-video.ts` + `src/lib/video/lambda.ts` drive `src/remotion/` compositions (`Root.tsx`, `VideoCanvasComposition.tsx`). Render status tracked in Convex (`convex/videoRender.ts`).
- Shared pipeline utilities: `src/lib/pipeline/shared.ts`, `cleanup.ts`.

### API surface
- `src/app/api/v1/**` — public API (authenticated via API keys verified in `convex/verifyKey.ts` / `apiKeys.ts`).
- `src/app/api/github/**` — GitHub App webhook + OAuth; config lives in `convex/githubInstallations.ts` / `githubRepoConfigs.ts` / `githubSkippedReleases.ts`.
- `src/app/api/internal/**` — internal-only endpoints.
- `src/app/api/auth/**` — Better Auth handlers.

### Uploads
Uploads use **R2-direct presigned PUT** to bypass Vercel's 4.5 MB request body limit. Flow: client → `bragfast_get_upload_url` / `src/lib/upload/` → PUT directly to R2 → register with Convex. Don't route large uploads through Next route handlers.

### App routes
`src/app/` uses route groups: `(admin)` for admin dashboard, `(auth)` for signup/login. Marketing/docs pages live at the root (`page.tsx`, `pricing/`, `docs/`, `support/`, `terms/`, `privacy/`).

### Testing
Vitest with `@vitejs/plugin-react`. Tests live under `src/lib/__tests__/`. Integration tests for rendering should hit real pipelines where feasible; avoid over-mocking the database layer.

## Conventions

- TypeScript strict; Zod for runtime validation (`src/lib/validation.ts`).
- UI uses shadcn/Radix + Tailwind v4 (`components.json`, `src/components/`). Design tokens per `DESIGN.md`.
- Brand name in user-facing copy is "brag.fast" (with the dot), not "bragfast".
- Remotion changes require `npm run remotion:deploy` to propagate to Lambda.
- Cherry-picks: always use an explicit commit hash, never a range expression.
