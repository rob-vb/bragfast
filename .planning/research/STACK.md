# Stack Research

**Domain:** Node/TypeScript CLI — `npx brag`, localhost Workspace, local render
**Researched:** 2026-05-20
**Confidence:** HIGH (all library versions verified against npm registry; render APIs verified against Remotion official docs)

---

## Context: What Changes, What Stays

**Keep as-is (do not re-research or replace):**
- Convex (DB + auth via Better Auth + Stripe billing) — thin backend, unchanged
- Cloudflare R2 — upload-at-schedule-time only, unchanged
- `@aws-sdk/client-s3` — already in use for R2, unchanged
- `satori` 0.24.1 + `sharp` 0.34.5 — already in-tree, these move to the shared render core
- `zod` 4.3.6 — already in-tree, use for CLI input validation and API response parsing
- `next` 16.1.6 — admin web app stays; only the render pipeline changes
- `typescript` 5.9.3, `vitest` 4.0.18 — dev tooling unchanged

**Remove / stop using:**
- `@remotion/lambda` + `@remotion/lambda-client` — replaced by local render
- All AWS Lambda-specific env vars (`REMOTION_FUNCTION_NAME`, `REMOTION_SERVE_URL`, `REMOTION_AWS_REGION`)

---

## Recommended Stack: New CLI Additions

### Core CLI Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `commander` | 14.0.3 | CLI argument parsing, subcommands (`brag login`, `brag start`) | ~500M weekly downloads; zero-dependency; first-class TypeScript generics since v13; fastest startup time (~22ms) vs Yargs (~42ms). Already in `node_modules` as a transitive dep. |
| `@clack/prompts` | 1.4.0 | Interactive prompts (confirm, select, spinner, text) during `brag login` and first-run setup | Modern default for interactive CLI prompts — minimal, TypeScript-native ESM, 80% smaller than Inquirer. Spinner surfaces the device-flow polling wait cleanly. |
| `open` | 11.0.0 | Cross-platform browser launch — opens `brag.fast/cli/auth` during device-flow login | The canonical cross-platform URL opener for CLIs (`gh`, `wrangler`, `vercel` all use this pattern). Native ESM only in v11+; CLI package must use ESM or dynamic `import()`. |

### Device-Flow Auth + Credential Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Custom device-flow (no extra lib) | N/A | Browser-based login: CLI opens browser to `brag.fast/cli/auth?device_code=...`, polls backend until user authorizes, backend mints API key | The backend already has API key minting (`api-keys` table, Better Auth). Device-flow is 40 lines of fetch + polling — no OAuth library needed since brag.fast is its own auth server, not a third-party IdP. |
| `conf` | 15.1.0 | Stores the minted API key to disk at `~/.config/brag/config.json` (XDG-compliant) | Purpose-built for CLI credential/config storage. Handles XDG dirs on Linux, `~/Library/Preferences` on macOS, `%APPDATA%` on Windows. Schema validation via Zod. Actively maintained (published 3 months ago). |

**No keychain native module.** `keytar` / `node-keytar` require native compilation (node-gyp), which breaks `npx` cold installs on machines without Xcode or build tools. A plain JSON file at `~/.config/brag/config.json` (mode 0600) is the pattern used by `gh` pre-secure-storage, `wrangler`, and `fly`. It is the correct MVP choice.

### Local Web Server (Workspace)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `express` | 5.2.1 | CLI-embedded HTTP server — serves the Workspace UI static bundle and proxies API calls to Convex | Mature, zero-surprise API for serving static files + REST-style proxy routes. For this use case (single localhost connection, no public traffic), Express's lower raw throughput vs Fastify is irrelevant. Native TypeScript types via `@types/express`. Simpler to embed than Vite's `createServer` which is designed for dev mode, not distribution. |
| `ws` | 8.20.1 | WebSocket channel for CLI ↔ Workspace UI — real-time render progress, file drop events | Same package Remotion's renderer already depends on (it's in `@remotion/renderer`'s deps tree). Using the same version avoids deduplication conflicts. |
| `cors` | 2.8.6 | CORS headers on the local server so the Workspace SPA can call the CLI API | Needed when the SPA is served from a file:// or cross-origin path during development; trivial to add. |

**Why not Vite's `createServer`?** Vite's programmatic server is a dev-mode HMR server, not a distribution primitive. It adds webpack/Rollup overhead and is designed for authoring, not end-user CLI execution. The Workspace UI is built once at publish time; the CLI just serves the dist folder with Express.

### Workspace UI (the localhost browser app)

The Workspace UI is a separate Vite + React SPA inside the monorepo. It is built at publish time and shipped in the npm package as a `dist/` folder. The CLI serves it statically.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `vite` | 8.0.13 | Build tool for the Workspace SPA | Already the de-facto standard; builds fast, produces optimal static output. Used only at **build time** — not embedded in the CLI runtime. |
| React 19.2.3 + Tailwind v4 | (existing) | Workspace UI | Reuse existing stack. No new UI framework. |

### Local Render Core

The existing `src/lib/pipeline/render.ts`, `src/lib/templates/canvas-renderer.tsx`, and `src/lib/fonts.ts` are **relocated to a shared package** (`packages/render-core`). No rewrite — just moving the module boundary.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `satori` | 0.24.1 (existing) | JSX → SVG for image rendering | Already in-tree, already working. No change. |
| `sharp` | 0.34.5 (existing) | SVG → JPEG, image normalization | Already in-tree. Ships platform-specific prebuilt binaries via `optionalDependencies` — npm/npx selects the correct binary automatically. No native compilation. |
| `@remotion/renderer` | 4.0.448 (existing) | `renderMedia()`, `selectComposition()`, `ensureBrowser()` for local video rendering | **This replaces `@remotion/lambda`.** The same package already exists in-tree. `renderMedia()` drives headless Chrome locally. `ensureBrowser()` handles first-run Chrome download with progress callback — hook this to a `@clack/prompts` spinner. |
| `@remotion/bundler` | 4.0.448 (existing) | `bundle()` — webpack bundle of the Remotion composition before `renderMedia()` | Already in-tree. Must be called once per CLI session (or cached) to produce a local bundle from `src/remotion/index.ts`. Cannot be used in Next.js API routes (documented Remotion limitation); this is fine since render moves to CLI. |
| `remotion` | 4.0.448 (existing) | Core Remotion types + React components | Unchanged. |

**Chrome download note:** Remotion downloads Chrome Headless Shell (~120–150 MB, platform-specific) to `node_modules/.remotion/` on first video render. This is automatic via `ensureBrowser()`. The CLI should call `ensureBrowser()` on first video render with a spinner ("Downloading renderer — this happens once…"). Subsequent calls are instant (VERSION file check). The binary is stored in the user's global npm cache if `npx` is used with `--yes`; for `npm install -g brag` it lives in the global node_modules.

### Git / Repo Context

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `simple-git` | 3.36.0 | Read `git log`, branch name, repo root | ~7.5M weekly downloads; 7965 npm dependents; actively maintained (3.36.0 published May 2026). Thin wrapper over `git` CLI — no native deps, no binary weight. Use to prefill draft context (recent commit message, branch). Fallback gracefully if not a git repo. |

### Package Distribution

| Approach | Rationale |
|----------|-----------|
| npm workspaces monorepo | Root `package.json` adds `"workspaces": ["packages/*"]`. Two packages: `packages/render-core` (shared Satori/Sharp/Remotion logic) and `packages/cli` (the `brag` binary). The Next.js app stays at the root. This avoids path aliasing hacks and lets the CLI `import` the render core as a proper local package dep. |
| `tsx` as the bin shim | `packages/cli/package.json` sets `"bin": { "brag": "bin/brag.ts" }` with the shebang `#!/usr/bin/env tsx`. The `tsx` package (4.22.3) is listed as a runtime dependency so `npx brag` installs it. This avoids a compile step — TypeScript runs directly via esbuild transpilation. No `tsc` build required for MVP. |
| No compiled binary | A pre-compiled binary (pkg, nexe, bun compile) adds CI complexity and platform-specific artifact management. For MVP, `npx` + `tsx` is the correct tradeoff. Startup adds ~150ms for `tsx` esbuild parse — acceptable for a CLI that then starts a server. |

---

## Package Structure

```
bragfast/                          ← existing Next.js root (stays)
  package.json                     ← add "workspaces": ["packages/*"]
  src/                             ← existing Next.js app
  convex/                          ← existing Convex backend
  packages/
    render-core/                   ← NEW: extracted from src/lib/pipeline/render*
      package.json                 ← name: "@brag/render-core", private: true
      src/
        render-image.ts            ← satori + sharp pipeline (moved from render.ts)
        render-video.ts            ← renderMedia() local path (replaces lambda.ts)
        canvas-renderer.tsx        ← moved from src/lib/templates/
        canvas-types.ts            ← moved from src/lib/templates/
        fonts.ts                   ← moved from src/lib/
        shared.ts                  ← moved from src/lib/pipeline/
    cli/                           ← NEW: the npx brag binary
      package.json                 ← name: "brag", public, bin: brag → bin/brag.ts
      bin/
        brag.ts                    ← shebang + commander entrypoint
      src/
        commands/
          login.ts                 ← device-flow: open browser, poll, store token
          start.ts                 ← start Express + open Workspace
          render.ts                ← CLI render command (non-interactive)
        server/
          index.ts                 ← Express server, static serve of workspace/dist
          proxy.ts                 ← proxy /api/* to Convex backend
          ws.ts                    ← WebSocket for render progress
        auth/
          device-flow.ts           ← poll brag.fast/api/cli/auth endpoint
          store.ts                 ← conf-based token read/write (~/.config/brag)
      workspace/                   ← Vite SPA (built at publish time)
        dist/                      ← served by Express; checked into npm package
```

---

## Installation (new deps only, in `packages/cli`)

```bash
# CLI runtime
npm install commander @clack/prompts open conf express ws cors simple-git tsx

# Dev
npm install -D @types/express @types/ws @types/cors vite
```

`@remotion/renderer`, `@remotion/bundler`, `satori`, `sharp`, `remotion` come from the shared `render-core` package (already in the root `node_modules` via workspace hoisting).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `commander` | `yargs` | Yargs pulls multiple sub-packages, ~2x install size, 2x slower startup. For a simple CLI with 3–5 subcommands, the power is unnecessary. |
| `commander` | `citty` | Promising but young (from unjs ecosystem). Lower community adoption, docs thinner than Commander. |
| `express` (local server) | Fastify | 20% faster for static files — irrelevant at localhost single-user scale. Express's ecosystem (middleware, types) is more familiar and has fewer ESM gotchas. |
| `express` (local server) | Vite `createServer` | Vite's programmatic server is a dev HMR tool, not a distribution primitive. Adds bundler overhead to the CLI runtime. Wrong abstraction. |
| `tsx` (shebang runner) | `pkg` / `nexe` binary | Binary compilation adds per-platform CI artifacts, complicates `npx` distribution, needs code signing on macOS. Unnecessary for MVP. |
| `tsx` (shebang runner) | `ts-node` | ts-node uses full TypeScript compiler (slower, ~400ms startup). tsx uses esbuild (~150ms). |
| `conf` (file storage) | `keytar` | keytar requires native compilation (node-gyp). Breaks on machines without Xcode/build tools, breaks in CI, breaks for users who install via `npx`. File-based token at `~/.config/brag/` (chmod 0600) is the industry standard for CLI tools (gh, wrangler, fly). |
| `simple-git` | `execa` + `git` subprocess | simple-git provides the same thing with a typed async API and better error handling. `execa` is fine if simple-git seems heavy, but simple-git has zero native deps. |
| npm workspaces | turborepo / nx | Turborepo and nx are orchestration layers on top of workspaces. For two packages sharing one TS codebase, npm workspaces alone is sufficient. Add turbo only if build times become painful. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@remotion/lambda` / `@remotion/lambda-client` | Lambda render is being dropped per ADR-0002. Keep in package.json until CLI render-core is wired; then remove. | `@remotion/renderer` (already in-tree) |
| Any new database | Convex is the store. The CLI has no local database. | `conf` for local config only; Convex for all user data |
| `electron` | Way too heavy for a CLI that already has the browser device-flow pattern. The Workspace runs in the user's existing browser. | Express + `open` |
| `oclif` | Opinionated framework that generates its own project structure. Overkill when Commander + Clack already covers the surface. | `commander` + `@clack/prompts` |
| `pkg` or `bun compile` | Pre-compiled binaries break `npx` cold install and require per-platform CI jobs and macOS notarization. | `tsx` shebang |
| `inquirer` / `prompts` | Older interactive prompt libraries. Clack is smaller, more modern, and natively TypeScript. | `@clack/prompts` |
| A new auth library | Better Auth already handles sessions and API keys on the backend. Device-flow is custom protocol between CLI and brag.fast — no third-party IdP involved. | Custom polling (40 lines) + `conf` for storage |
| `multer` or `formidable` | File uploads only happen at schedule-time via the existing `/api/v1/upload` route on the backend. The CLI server doesn't need a multipart parser. | Existing backend upload API |

---

## Version Compatibility Notes

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tsx` 4.22.3 | Node.js 20+ | tsx requires Node.js 20+. Enforce in `package.json` `engines` field: `"node": ">=20"`. |
| `@remotion/renderer` 4.0.448 | `remotion` 4.0.448 | Remotion packages must be **exact same version** across all packages in the tree. Workspace hoisting ensures this if the root `package.json` controls the version. |
| `@remotion/bundler` 4.0.448 | `@remotion/renderer` 4.0.448 | Same as above — must match. |
| `sharp` 0.34.5 | Node.js 20+ | Uses prebuilt libvips binaries via `optionalDependencies`. Works with npm, yarn, pnpm. No node-gyp. No Xcode. `npx`-safe. |
| `open` 11.0.0 | ESM only | The CLI package must either use `"type": "module"` or use dynamic `import('open')`. If using CommonJS entry points with tsx, use `async function openBrowser() { const {default: open} = await import('open'); ... }`. |
| `conf` 15.1.0 | ESM only | Same ESM-only caveat as `open`. Use dynamic import or set `"type": "module"` on the CLI package. |

---

## Key Integration Points with Existing Code

1. **`src/lib/pipeline/render.ts` → `packages/render-core/src/render-image.ts`**
   The core Satori/Sharp pipeline is self-contained Node.js (no Next.js deps, no Convex mutation calls). Strip out the Convex `markCompleted`/`refund` calls — the CLI handles draft state differently. The `resolveTemplate`, `resolveBrand`, `buildSlideDataMaps` helpers in `shared.ts` do call Convex, but only as `ConvexHttpClient` queries — this works fine from CLI using the stored API key.

2. **`src/lib/video/lambda.ts` → `packages/render-core/src/render-video.ts`**
   Replace `renderMediaOnLambda` + `getRenderProgress` with `renderMedia()` from `@remotion/renderer`. The composition (`src/remotion/VideoCanvasComposition.tsx`) and its entry point (`src/remotion/index.ts`) stay in the Next.js tree and are referenced via their file path for `bundle()`. The CLI must call `bundle(require.resolve('../../src/remotion/index.ts'))` pointing into the root workspace.

3. **`src/lib/fonts.ts` → `packages/render-core/src/fonts.ts`**
   No changes needed. The Google Fonts fetch + `readFileSync` for local TTFs both work in Node. The font TTF files (`src/assets/fonts/`) must be copied/referenced in the render-core package or the file path resolved to the root workspace.

4. **Backend API key minting for device-flow**
   The backend needs one new endpoint: `POST /api/cli/auth` (or reuse `/api/v1/api-keys`) to complete device-flow. The CLI polls this with a `device_code`; the browser leg at `brag.fast/cli/auth` approves it. This is ~50 lines of new backend code, not a new library.

5. **`/api/v1/` proxy**
   The CLI's Express server proxies `/api/*` to the configured `BRAG_API_URL` (default `https://brag.fast`). The CLI includes the stored API key as `Authorization: Bearer <token>` on all proxied requests. Use `http-proxy-middleware` (1 package) or raw `fetch` + stream piping — the surface is small enough that a raw implementation is cleaner.

---

## Sources

- Remotion official docs: https://www.remotion.dev/docs/renderer/render-media — renderMedia() API, @remotion/renderer package (HIGH confidence)
- Remotion official docs: https://www.remotion.dev/docs/renderer/ensure-browser — ensureBrowser() API (HIGH confidence)
- Remotion official docs: https://www.remotion.dev/docs/ssr-node — full SSR workflow, bundle/selectComposition/renderMedia (HIGH confidence)
- Remotion official docs: https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell — Chrome download mechanics, platform support (HIGH confidence)
- npm registry: commander@14.0.3, @clack/prompts@1.4.0, open@11.0.0, conf@15.1.0, simple-git@3.36.0, tsx@4.22.3, express@5.2.1, ws@8.20.1, vite@8.0.13 — verified with `npm show` (HIGH confidence)
- sharp installation docs: https://sharp.pixelplumbing.com/install/ — binary packaging via optionalDependencies, npx compatibility (HIGH confidence)
- WebSearch: commander vs yargs vs citty comparison 2025/2026 — supports commander recommendation (MEDIUM confidence, multiple sources agree)
- GitHub CLI design discussion: https://github.com/cli/cli/issues/10108 — file-based token fallback pattern justification (MEDIUM confidence)
- WebSearch: @clack/prompts vs inquirer/ink 2026 — supports clack recommendation (MEDIUM confidence)

---

*Stack research for: brag.fast CLI-first reposition (v2.0 milestone)*
*Researched: 2026-05-20*
