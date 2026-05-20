# Project Research Summary

**Project:** brag.fast v2.0 CLI-First Reposition
**Domain:** Node/TypeScript CLI + localhost browser Workspace + local render pipeline
**Researched:** 2026-05-20
**Confidence:** HIGH

## Executive Summary

brag.fast v2.0 is a CLI-first creation tool: `npx brag` starts a local HTTP server, opens the user's browser to a Workspace SPA, and the user picks a template, fills slots, renders locally, then copies or schedules output. The backend remains deliberately thin — it stores templates, brands, and drafts, handles billing and auth, and proxies scheduling to Buffer/Postiz. All rendering moves to the user's machine. This pattern is well-established (Remotion Studio, Vercel CLI, GitHub CLI device-flow auth) and the existing codebase already has most of the render infrastructure — the work is extraction and packaging, not reimplementation.

The recommended approach locks to a strict dependency-ordered build sequence that all four research threads converged on independently: extract the render core first, then build the CLI shell with auth, then the local HTTP server and Workspace shell, then the editor/slot-fill UI, then image render, then video render, then schedule-and-post, then admin cleanup. This order is not stylistic — each phase literally unblocks the next. The render-core extraction is Phase 1 because every other phase imports from it or depends on its clean separation from Convex and R2. Template authoring (the canvas drag-resize editor plus auto-derive) is explicitly a follow-on phase, not part of the core loop — the 5 built-in templates are sufficient for launch.

The critical risks are all Phase 1 problems: Sharp cross-platform binary packaging, font-path resolution broken by `process.cwd()` in a CLI context, local server CORS security, and the render core's implicit coupling to Convex mutations and R2 uploads. All four must be solved in Phase 1/2 before any user-visible feature is built on top. Video render is low-risk architecturally (`renderVideoLocal()` already exists and is exercised by `OUTPUT_LOCAL=true`) but carries significant UX risk around the 150 MB Chrome download — explicit progress messaging and a persistent `~/.brag/chrome/` cache are mandatory, not optional.

---

## Key Findings

### Recommended Stack

The stack is almost entirely the existing codebase reorganized into a workspace monorepo with two new packages. No new render libraries. No new databases. No Electron.

The CLI distribution model: `npm workspaces` monorepo with `packages/render-core` (shared Satori/Sharp/Remotion logic) and `packages/cli` (the `brag` binary). The CLI runs via a `tsx` shebang — TypeScript directly, no compile step, ~150ms startup overhead (acceptable). The Workspace is a Vite + React SPA built once at publish time and served as static files by the CLI's embedded Express server.

**Core new technologies:**

- `commander` 14.0.3 — CLI argument parsing and subcommands; already a transitive dep, ~22ms startup
- `@clack/prompts` 1.4.0 — interactive prompts and spinners for device-flow wait and first-run setup
- `open` 11.0.0 — cross-platform browser launch; used by gh, vercel CLI, wrangler
- `conf` 15.1.0 — XDG-compliant credential storage at `~/.config/brag/config.json` (chmod 600); avoids `keytar` native compilation that breaks `npx`
- `express` 5.2.1 — local HTTP server serving the Workspace SPA and proxying backend calls
- `ws` 8.20.1 — WebSocket for render progress; already in the Remotion dep tree
- `simple-git` 3.36.0 — reads git log, branch, and repo name for slot pre-fill context
- `tsx` 4.22.3 — TypeScript shebang runner; no compile step, esbuild-backed

**Keep exactly as-is:** `satori` 0.24.1, `sharp` 0.34.5, `@remotion/renderer` 4.0.448, `@remotion/bundler` 4.0.448, `remotion` 4.0.448, Convex, Better Auth, Stripe, Cloudflare R2, Next.js 16.

**Remove:** `@remotion/lambda`, `@remotion/lambda-client`, all Lambda-specific env vars. These are replaced by `renderMedia()` from `@remotion/renderer` (already in-tree).

**Critical version constraints:** All Remotion packages must be the same exact version across the workspace. Node.js `>=20` required for `tsx`. `open` and `conf` are ESM-only — use dynamic `import()` or set `"type": "module"` on the CLI package.

### Expected Features

The feature research is notable for how much it cuts. The 5 built-in templates are sufficient for launch. Template authoring (the canvas drag-resize editor + auto-derive algorithm) is a P2 item — high complexity, not on the critical path.

**Must have for launch (P1):**
- `npx brag` zero-install launch with device-flow browser login and auto-open Workspace
- Template picker showing the 5 built-ins and any user-saved templates
- Slot panel: text slot fill (paste), visual slot drag-in (image), caption field with copy-to-clipboard
- Format switcher showing landscape/square/portrait previews
- Local image render (Satori/Sharp) to `./brag-output`; post-render preview + open folder
- Draft auto-save to Convex
- Admin: login, brand setup (logo + colors), billing, connect at least one provider (Buffer or Postiz)
- Schedule to connected provider: channel picker + timestamp + R2 upload at schedule-time + confirmation

**Add in first follow-on phase (P2):**
- Template authoring: primary format canvas editor + anchor+scale auto-derive + per-format nudge
- Video slot drag-in + local Remotion render (the local path already exists; wire and polish it)
- Second provider (whichever of Buffer/Postiz was not launched with)
- Creations gallery in admin (read-only)
- `brag logout` / token management

**Explicit anti-features (out of scope, no exceptions):**
- Multi-slide / carousel creation
- Server-side AI copy generation
- Template marketplace or sharing
- Remotion Lambda / any server-side video render
- MCP / agent copy-push
- Real-time collaboration
- Pricing tiers or credit metering
- Social analytics / performance tracking
- In-app screenshot capture from URL

### Architecture Approach

The architecture is a clean three-layer split: `packages/render-core` (pure Node render functions with no network calls), the CLI HTTP server (auth, proxy, render dispatch, schedule orchestration), and the thin Convex backend (store, auth, billing, scheduling). The Workspace SPA talks only to the CLI's local server — it never calls the backend directly, and it never sees the API key.

The most important architectural discovery: `renderVideoLocal()` already exists in `src/lib/pipeline/render-video.ts` (lines 240-275), guarded by `OUTPUT_LOCAL=true`. Local video render is a promotion of existing code, not a new build. Similarly, `approveDraftPost()`, the R2 upload client, and the `draftPushes` table are all reused unchanged at schedule-time.

**Major components:**

1. `packages/render-core` — pure render functions (`renderImage`, `renderVideo`); takes pre-resolved template config, brand, and object data; writes to a local temp dir; zero Convex, zero R2, zero network calls
2. `packages/cli/src/server.ts` — Express server on localhost:3847; serves Workspace SPA statically; routes `/api/render/*` to render-core; proxies `/api/*` to the backend with the stored Bearer token injected; handles `/api/schedule` (upload to R2, then proxy approve)
3. `packages/cli/src/auth.ts` — device-flow handshake: POST device/start, open browser, poll device/poll, store key at `~/.brag/credentials.json` chmod 600
4. Workspace SPA — Vite/React SPA; template picker, slot fill UI, format switcher, render trigger, schedule panel; talks only to `localhost:3847`
5. Backend additions — `deviceCodes` Convex table; three new device-flow routes; `/device` admin approval page

**Key patterns:**
- Render-core is pure in/out: `{ templateConfig, brand, objectDataMaps, outputDir }` returns `{ localFilePaths }`. No side effects, no network.
- The CLI server holds the API key server-side only; the Workspace never sees it.
- Media dragged into the Workspace uploads to R2 immediately at drag-time (stable URL for draft config). Rendered output uploads to R2 only at schedule-time.
- Auto-derive (one format to three) lives in the Workspace UI, not render-core. The Workspace sends three separate `FormatEntry` objects to the render endpoint.
- Schedule flow: Workspace POSTs local file paths, CLI reads files, CLI uploads each to R2, CLI calls `approveDraftPost()` via proxy, `draftPushes` rows created, existing Buffer/Postiz posting backbone runs unchanged.

### Critical Pitfalls

All five critical pitfalls must be addressed in Phase 1 or Phase 2. None can be deferred.

1. **Sharp cross-platform binary mismatch** — The npm package-lock generated from macOS arm64 breaks on Linux x64/arm64 and Windows. Use pnpm `supportedArchitectures` to pin all four key targets. Add a `postinstall` check that fails loudly with remediation instructions. Test on macOS arm64, Linux x64, and Linux arm64 (Docker) before any CLI release. Phase 1.

2. **Font path broken by `process.cwd()` in CLI context** — `fonts.ts` uses `path.join(process.cwd(), "src/assets/fonts")` which resolves to the user's repo, not the CLI package. In render-core, resolve fonts using `__dirname` or `import.meta.url`. Bundle the Plus Jakarta Sans TTFs into the CLI package `files`. Cache Google Fonts to `~/.brag/fonts/` after first download (validate by SHA). Assert after `loadFontsForObjects()` that every referenced `fontFamily` has at least one buffer — fail fast with a named error rather than silently rendering in Arial. Phase 2.

3. **Render-core coupled to Convex and R2** — `render.ts` imports `ConvexHttpClient`, calls `releases.create`, `releases.markCompleted`, and `uploadImage()` inline. Naively extracting this drags Convex and the AWS SDK into the CLI bundle and the render fails offline. The extracted render-core must have zero Convex and zero R2 imports. Verify with a dependency audit. Phase 2.

4. **Local server CORS and session token** — Setting `Access-Control-Allow-Origin: *` allows any open browser tab to abuse the API key via cross-origin requests. Lock CORS to exactly the Workspace origin (`http://127.0.0.1:<PORT>`). Generate a random session token at CLI startup and require it as a custom header on all Workspace-to-CLI requests. Phase 1.

5. **Auth callback: `localhost` vs `127.0.0.1` and `EADDRINUSE`** — On macOS 12+ and most Linux distros, `localhost` resolves to IPv6 `::1` while the CLI binds to `127.0.0.1`, causing connection refused. Always bind to `127.0.0.1` explicitly and construct redirect URIs with `127.0.0.1`. Handle `EADDRINUSE` by retrying up to 5 ports with a clear user message. Validate the `state` parameter before accepting any callback. Phase 1.

**Additional important pitfalls:**

6. **Remotion Chrome download blocking first render** — Chrome Headless Shell is ~150 MB; on `npx` (ephemeral node_modules) it re-downloads every session. Cache to `~/.brag/chrome/` and point `browserExecutable` at the cache. Call `ensureBrowser()` at CLI startup with a clear progress message. Phases 1 (caching strategy) and 6 (end-to-end exercise).

7. **Remotion video font race condition** — Headless Chrome may not finish loading Google Fonts before the first frame is captured, producing Arial in early frames. Replace CSS-based font imports in `VideoCanvasComposition.tsx` with `@remotion/google-fonts` `loadFont()` + `waitForFonts()`. Add a smoke test inspecting the first rendered frame. Phase 6.

8. **Schedule-time R2 upload failure silently posts with no media** — Make the schedule flow atomic: upload, HEAD-check R2 object, then push to provider. If upload fails, abort and surface the error; never proceed to the provider push. Phase 7.

---

## Implications for Roadmap

All four research files independently converged on the same 8-phase build order.

### Phase 1: Render Core Extraction

**Rationale:** Everything downstream imports from render-core. No upstream dependencies. Sharp binary and Convex/R2 coupling must be solved here before any user-visible surface is built on top.

**Delivers:** `packages/render-core` with `renderImage()` and `renderVideo()` (promoted from existing `renderVideoLocal()`); `LocalRenderRequest` / `LocalRenderResult` types; fonts bundled with `__dirname` resolution; zero Convex/R2 imports verified by dependency audit; multi-platform Sharp install verified in CI.

**Pitfalls addressed:** Sharp binary mismatch (P1), font `process.cwd()` bug (P3), Convex/R2 coupling (P6).

**Research flag:** No phase research needed — all APIs verified at HIGH confidence, code is existing and being moved.

---

### Phase 2: CLI Shell + Device-Flow Auth

**Rationale:** Auth must exist before the local server can proxy authenticated requests. Establishes the CLI binary, credential storage, and device-flow handshake end-to-end.

**Delivers:** `npx brag` binary (tsx shebang, Commander), `brag login` device-flow (POST start, open browser, poll, store key), `~/.brag/credentials.json` (chmod 600), new Convex `deviceCodes` table, three new backend routes, `/device` admin approval page.

**Pitfalls addressed:** `127.0.0.1` vs `localhost` binding (P4), CORS session token model established (P5), Chrome caching strategy established (P2).

**Research flag:** No phase research needed — device-flow is ~40 lines of polling; `apiKeys.create` is reused unchanged.

---

### Phase 3: CLI Local HTTP Server + Workspace Shell

**Rationale:** The server is the integration layer. Once it exists with proxy working, the Workspace SPA can be built against real data.

**Delivers:** Express server on `localhost:3847`; static serving of Workspace `dist/`; proxy routes with Bearer injection; repo-context endpoint; CORS locked to `127.0.0.1:<PORT>`; random session token on all Workspace-to-CLI requests; `brag start` command; graceful port conflict handling.

**Pitfalls addressed:** CORS `*` misconfiguration (P5).

**Research flag:** No phase research needed. One open question to resolve at planning time: Vite standalone vs Next.js SPA export for the Workspace.

---

### Phase 4: Workspace Editor + Slot Filling

**Rationale:** Template picking and slot filling are the core creation loop. Largest UI phase but has no further blocking dependencies once the server exists.

**Delivers:** Workspace SPA: template picker gallery, slot panel (text paste + image drag-in + click-to-browse + clear/replace), format switcher with three derived previews, caption field with copy-to-clipboard, draft auto-save (debounced via proxy), open-draft-from-gallery. Media drag-in uploads to R2 immediately via `/api/v1/upload` proxy.

**Pitfalls addressed:** Auto-derive text clipping (P7) — show derived format thumbnails before confirming; flag objects near minimum font size.

**Research flag:** Low-risk phase research recommended for Workspace SPA distribution decision (Vite vs Next.js SPA export) to resolve the open question from Phase 3 planning.

---

### Phase 5: Local Image Render

**Rationale:** Image render is lower complexity than video and delivers the first complete creation-to-output loop. Validates render-core extraction end-to-end in a user-visible context.

**Delivers:** Workspace "Render" button triggering `POST /api/render/image`; CLI routes to `render-core/image.ts`; renders all three formats in one request; writes JPEGs to `.brag-output/<id>/`; CLI serves output as static files; Workspace post-render preview; "Open output folder" button; render progress indicator; render error with clear message.

**Pitfalls addressed:** Font `process.cwd()` bug validated with offline render test (P3); render-core Convex/R2 dependency confirmed absent (P6).

**Research flag:** No phase research needed — render pipeline is existing code being moved, not new.

---

### Phase 6: Local Video Render

**Rationale:** `renderVideoLocal()` already exists. This phase promotes it from `OUTPUT_LOCAL=true` to the primary path and adds required UX around Chrome download. Separate from image render because the first-run Chrome download and font race condition require dedicated attention.

**Delivers:** Video slot drag-in to Workspace; `POST /api/render/video` route; `bundle()` call with session-level caching; `ensureBrowser()` at CLI startup with Chrome cached to `~/.brag/chrome/`; `renderMedia()` with `onProgress` callback; Workspace video preview via served `.mp4`; smoke test on first rendered frame for correct font.

**Pitfalls addressed:** Remotion Chrome blocking/silent failure (P2), video font race condition (P10).

**Research flag:** Chrome path isolation on macOS vs Linux needs verification before this phase ships — test in CI on both platforms.

---

### Phase 7: Schedule-Time Upload + Posting

**Rationale:** Scheduling depends on rendered output from Phase 5 or 6. The upload-then-approve flow reuses `approveDraftPost()` and `draftPushes` unchanged — mostly CLI orchestration and a thin Workspace schedule panel.

**Delivers:** Workspace schedule panel (channel picker, date-time picker or queue toggle, confirmation toast); CLI `/api/schedule` endpoint: reads local file, multipart upload to R2, HEAD-check R2 object, proxy `approveDraftPost()`, return push IDs; draft marked as scheduled; existing Buffer/Postiz posting backbone runs unchanged; provider connect flow in admin.

**Pitfalls addressed:** R2 upload failure allowing provider push with no media (P8) — atomic upload, verify, then push.

**Research flag:** No phase research needed — `approveDraftPost()`, `draftPushes`, and R2 client are existing.

---

### Phase 8: Admin Trim

**Rationale:** The admin app currently has cook/release-authoring UI superseded by the CLI Workspace. This phase removes the dead surface and ensures admin is intentionally thin.

**Delivers:** Removed cook/release-creation UI from admin; `/device` approval page wired in admin (backend from Phase 2); Creations gallery (read-only thumbnail grid with status: rendered/scheduled/published); brand setup confirmed working for logo slot auto-population in Workspace.

**Research flag:** No phase research needed — pure subtraction of existing UI.

---

### Phase Ordering Rationale

The ordering is driven by hard dependencies, not preference:

- Phase 1 (render-core) must precede Phases 5, 6, and any Workspace render trigger.
- Phase 2 (auth) must precede Phase 3 (server) — the proxy needs a stored credential.
- Phase 3 (server) must precede Phase 4 (Workspace) — the SPA has nothing to talk to without the local server.
- Phase 4 (slot fill) must precede Phases 5 and 6 — rendering needs `objectContent` from filled slots.
- Phases 5 and 6 are independent of each other; image first is recommended as lower risk.
- Phase 7 (schedule) requires rendered files from Phase 5 or 6.
- Phase 8 (admin trim) is independent of all CLI phases and can overlap with Phase 7.

Template authoring (canvas drag-resize editor + auto-derive algorithm) is deliberately absent. It is a P2 follow-on milestone. The 5 built-in templates are sufficient for launch.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4:** Workspace SPA distribution — Vite standalone vs Next.js SPA export; affects build pipeline and component sharing.
- **Phase 6:** Chrome path isolation — Remotion Chrome download location and interaction with system Chrome/Puppeteer caches; needs multi-platform verification before implementation.

**Phases with standard patterns (skip research-phase):**
- Phases 1, 2, 3, 5, 7, 8 — all based on existing code, verified APIs, or well-documented patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library versions verified against npm registry; render APIs verified against Remotion official docs; existing code inspected directly |
| Features | HIGH | CLI auth patterns, Buffer/Postiz APIs, Satori/Sharp pipeline all verified against official sources; comparable tools observed directly |
| Architecture | HIGH | Grounded in direct inspection of the full existing codebase; `renderVideoLocal()` confirmed at lines 240-275; all integration points traced from actual source |
| Pitfalls | HIGH | Most findings verified against official docs, GitHub issues, and known behavior in existing codebase |

**Overall confidence:** HIGH

### Gaps to Address

- **Workspace SPA tech decision (Vite vs Next.js SPA export):** Must be resolved at Phase 3 planning. Affects how existing React components from the root app are reused in the Workspace. ARCHITECTURE.md recommends Vite as lighter; confirm shared component surface before committing.
- **npm package name availability:** `brag` on npm must be checked and reserved before Phase 2 begins. If unavailable, the scoped name changes the `npx` invocation and onboarding docs.
- **Device-flow PKCE:** Current design skips PKCE. Acceptable for MVP (same security as a personal API key) but noted as a known gap. Address in a security-focused follow-on.
- **Credential rotation UX:** If a CLI-minted API key is revoked in admin, the proxy must detect the 401 and re-trigger device-flow automatically. Build into Phase 3 proxy error handling.
- **Font bundling in CLI package:** Plus Jakarta Sans TTFs in `src/assets/fonts/` must be included in the CLI package's `files` array. Verify at Phase 1 packaging time.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/pipeline/render-video.ts` (lines 240-275) — `renderVideoLocal()` confirmed existing
- `src/lib/pipeline/render.ts`, `shared.ts`, `fonts.ts` — Convex/Next.js entanglement mapped from source
- `src/lib/templates/canvas-renderer.tsx`, `canvas-types.ts`, `canvas-defaults.ts` — pure JSX, no server deps confirmed
- `convex/schema.ts` — full table inventory; `apiKeys.create` reused unchanged
- `src/lib/posts/approve-draft.ts`, `src/lib/storage/r2.ts`, `convex/draftPushes.ts` — schedule flow reuse confirmed
- Remotion official docs: `renderMedia()`, `ensureBrowser()`, SSR/Node workflow, Chrome Headless Shell
- Sharp installation docs — native binary packaging, `optionalDependencies`, npx compatibility
- npm registry — all new package versions verified with `npm show`

### Secondary (MEDIUM confidence)

- Buffer GraphQL API docs (scheduling, media URL requirement)
- Postiz API overview and OAuth 2.0 integration docs
- WorkOS: PKCE vs Device Flow for CLI auth
- WebSearch: commander vs yargs vs citty 2025/2026 comparison (multiple sources agree)

### Tertiary (LOW confidence)

- Sharp GitHub issues #3898, #3911, #3994, #4507 — cross-platform failure reports
- Remotion font race condition issue #5843 — local font loading timeout
- CORS misconfiguration in local proxy — 1-click API key abuse pattern

---
*Research completed: 2026-05-20*
*Ready for roadmap: yes*
