# Repository Guidelines

## Project Structure & Module Organization
`src/app` contains the Next.js 16 App Router surface, including public pages, `(auth)` routes, `(admin)` routes, and API handlers under `src/app/api`. Shared logic lives in `src/lib` (`auth`, `drafts`, `github`, `integrations`, `pipeline`, `templates`). UI components live in `src/components`. Convex backend code is in `convex/`, with schema, queries, mutations, internal actions, and cron wiring in `convex/crons.ts`. Tests are mostly colocated under `src/**/__tests__`. Static assets are in `public/`, and product/design docs live in `docs/`.

## Build, Test, and Development Commands
- `npm run dev`: start the Next.js dev server.
- `npm run build`: run Convex codegen, then build the app.
- `npm run lint`: run ESLint across the repo.
- `npm test`: run the Vitest suite in watch mode.
- `npx vitest run`: run tests once for CI-style verification.
- `npm run remotion:studio`: open the Remotion studio for video work.
- `npx convex run integrations/stripe:scanAll`: manually trigger a Convex cron target when testing integrations.

## Coding Style & Naming Conventions
Use TypeScript with strict typing and 2-space/Prettier-style formatting. Prefer `camelCase` for variables/functions, `PascalCase` for React components, and kebab-case for route folders. Keep server-only security boundaries explicit: public Convex functions are for safe client access; sensitive write paths should use `internalMutation`/`internalAction` and derive `userId` from auth, never request body. Follow existing UI patterns in the NES-retro design system rather than introducing new visual conventions.

## Testing Guidelines
Vitest is the test runner. Name tests `*.test.ts` or `*.test.tsx` under `__tests__` near the code they cover. Add focused tests for auth, route validation, and idempotency when changing API or Convex flows. For targeted runs, use commands like `npx vitest run src/app/api/v1/sous-chef/__tests__/integrations.test.ts`.

## Commit & Pull Request Guidelines
Recent history uses short imperative subjects, often with prefixes like `feat(...)`, `chore(...)`, or plain fix-style messages. Keep commits scoped and descriptive, for example: `feat(sous-chef): add admin UI + integrations API`. PRs should include a brief summary, risk notes, test evidence, and screenshots for UI changes. Call out schema, cron, auth, or webhook changes explicitly.

## Security & Configuration Tips
Secrets must never be stored plaintext in Convex; use the existing sealed-secret path in `src/lib/crypto/secret-box.ts`. Validate external hosts with explicit allowlists. Test cron-driven integrations via manual `convex run` commands before relying on schedule timing.
