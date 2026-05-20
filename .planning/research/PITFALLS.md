# Pitfalls Research

**Domain:** CLI-first developer tool with local rendering (npx CLI + localhost Workspace + Satori/Sharp/Remotion)
**Researched:** 2026-05-20
**Confidence:** HIGH (most findings verified against official docs, GitHub issues, and known behavior in the existing codebase)

---

## Critical Pitfalls

### Pitfall 1: Sharp Native Binary Mismatch Silently Breaks on Install

**What goes wrong:**
A user installs `npx brag` on a platform that differs from the developer's build machine. Sharp ships platform-specific prebuilt binaries (darwin-arm64, darwin-x64, linux-x64, linux-arm64, linux-arm64-musl, win32-x64, win32-arm64-experimental). If the package-lock.json was committed from macOS arm64, Linux x64 users get the wrong or missing binary. The error — `Could not load the "sharp" module using the linux-x64 runtime` — only surfaces at runtime, after install appeared to succeed.

**Why it happens:**
npm's package-lock.json records the resolved binary for the platform that ran `npm install`. Other platforms cannot use that lockfile entry. This is a known npm bug (#4828). The sharp package uses optional dependencies per platform, but optional dep installation can also be silently disabled by `.npmrc` flags (`omit=optional`) set in enterprise or CI environments.

**How to avoid:**
- Do not commit a lockfile for the CLI package that was generated from one platform only. Use pnpm with `supportedArchitectures` in `.npmrc` to pin all four key targets: `["darwin", "linux", "win32"]` × `["arm64", "x64"]`. Alternatively use yarn v3+ berry with `supportedArchitectures`.
- Ship a `postinstall` check that prints a clear error if `sharp` cannot be required, with a link to platform-specific remediation.
- Test the install on macOS x64, macOS arm64, Linux x64, and Linux arm64 (Docker is fine) before releasing the CLI package.
- Verify that the npm package.json declares `optionalDependencies` not `dependencies` for the sharp platform packages, so a missing binary does not abort install on unsupported platforms.

**Warning signs:**
- CI passes on macOS but Linux Docker installs fail.
- Users on Windows report `The specified procedure could not be found` (canvas+sharp conflict).
- `npm ls sharp` shows the package but `require('sharp')` throws `ERR_DLOPEN_FAILED`.

**Phase to address:** Phase 1 — CLI skeleton + cross-platform packaging. Nail this before any feature work ships behind it.

---

### Pitfall 2: Remotion's Headless Chrome Download Blocks or Silently Fails on First Render

**What goes wrong:**
Remotion downloads Chrome Headless Shell into `node_modules/.remotion/chrome-headless-shell/[platform]/` on first use. This download is ~150 MB and happens inside a `node_modules` path that is not in the user's PATH and cannot be cached between `npx` invocations unless the package is installed globally or persistently. On Linux, Chrome also requires system libraries (`libnss3`, `libatk1.0-0`, etc.) that may be absent on minimal or corporate machines, causing a cryptic subprocess error rather than a clear missing-lib message.

**Why it happens:**
`renderMedia()` calls `ensureBrowser()` internally but only if no `browserExecutable` is passed. When the CLI runs via `npx brag` (non-persistent), `node_modules` may be ephemeral, causing a re-download on every invocation. Remotion also auto-deletes and re-downloads Chrome if its internal `VERSION` file mismatches after a Remotion upgrade, which catches users by surprise mid-session.

**How to avoid:**
- Call `ensureBrowser()` explicitly at CLI startup (before the user reaches Render), display a clear "Downloading video renderer (one-time, ~150 MB)..." progress line.
- Cache Chrome to a persistent user-scoped path (e.g. `~/.brag/chrome/`) rather than `node_modules`, using Remotion's `browserExecutable` option to point at the cached binary. This survives `npx` ephemeral node_modules and npm updates.
- Pin a specific Remotion version. Avoid Remotion versions below 4.0.208 where Chrome auto-upgrades to a headless-mode-broken version.
- On Linux, add a pre-flight check that lists required system packages and errors with installation instructions if they're missing (`ldd` the chrome binary).
- On Windows, validate that the `.exe` suffix path is used; Chrome Headless Shell is named differently there.

**Warning signs:**
- `video render` hangs at 0% with no error.
- "Chrome is downloading..." appears more than once across CLI sessions.
- Linux CI renders work but users report "Chromium failed to launch" locally.

**Phase to address:** Phase 1 (CLI skeleton) to establish the caching strategy; Phase 3 (local video render) to exercise it end-to-end on all three platforms.

---

### Pitfall 3: Font Parity Break Between Server Render and Local Render

**What goes wrong:**
The existing `fonts.ts` has two paths: (a) `loadLocalFonts()` which reads from `src/assets/fonts/` relative to `process.cwd()`, and (b) `fetchGoogleFontBuffer()` which fetches from `fonts.googleapis.com`. In the CLI, `process.cwd()` is the user's repo root, not the brag.fast source tree — the local font files do not exist there. The fallback is a live Google Fonts fetch, which depends on network availability and returns a different binary each time Google rotates font CDN endpoints. The result: the CLI either silently falls back to a wrong font or fails on offline machines. Even with network, Google Fonts returns woff2 in some CSS responses; Satori supports TTF/OTF/WOFF but not WOFF2, so those renders produce blank text.

**Why it happens:**
`loadLocalFonts()` uses `path.join(process.cwd(), "src/assets/fonts")`. When the CLI is an npm package, `process.cwd()` is the user's working directory, not the package root. The font assets are not copied into the CLI package by the TypeScript compiler. The server worked because Vercel/Next.js resolve `process.cwd()` to the Next.js project root where `src/assets/fonts/` exists.

**How to avoid:**
- Bundle the two Plus Jakarta Sans TTF files directly into the CLI package under a path resolved with `__dirname` or `import.meta.url` (not `process.cwd()`). Use `files` in `package.json` to ensure they are included.
- For Google Fonts used in templates, add a local font cache at `~/.brag/fonts/` that downloads once and validates by file size / SHA256. Render from the cache, not live from Google.
- Add a render-time assertion: after `loadFontsForObjects()`, verify that every `fontFamily` referenced in the template has at least one entry in the returned font array. If not, fail fast with a named-font error rather than silently rendering in a fallback font.
- Strip WOFF2 responses from Google Fonts by hardcoding a User-Agent that forces the API to return TTF (the existing `"User-Agent": "curl/7.85.0"` trick is already in `fetchGoogleFontBuffer` — do not remove it when refactoring to the CLI).

**Warning signs:**
- Rendered text is Arial or system sans-serif instead of the brand font.
- Renders differ between developer machine and user machine for the same template.
- Offline render produces blank text fields.
- `loadLocalFonts()` always returns `[]` in CLI context.

**Phase to address:** Phase 2 (render core extraction). Must be solved before any user-visible render output is produced.

---

### Pitfall 4: Localhost Auth Callback Broken by Port Conflict or 127.0.0.1 vs localhost Mismatch

**What goes wrong:**
The device-flow / PKCE callback server binds to a random ephemeral port on `127.0.0.1`. Two failure modes: (1) The port is already taken by another process; the CLI either crashes with `EADDRINUSE` or binds to a second port while the backend's registered redirect URI still points at the first. (2) The browser resolves the redirect to `localhost` (IPv6 `::1`) while the CLI listens on `127.0.0.1` — connection refused, or the state parameter is lost. Both look to the user like a silent hang after the browser page loads.

**Why it happens:**
Node's `http.createServer().listen(0)` picks a random free port, but the port must be communicated to the backend as part of the OAuth state or redirect URI before the flow starts. If the backend pre-registers redirect URIs (many OAuth providers require this), dynamic ports are impossible. On macOS 12.x+ and many Linux distros, `localhost` resolves to `::1` (IPv6) first; a server bound to `127.0.0.1` does not receive those connections.

**How to avoid:**
- Bind the callback server to `127.0.0.1` explicitly and construct the redirect URI with `127.0.0.1`, not `localhost`. RFC 8252 (OAuth for Native Apps) explicitly allows dynamic `127.0.0.1` ports; the backend redirect URI whitelist should accept any `127.0.0.1` port.
- Use `PKCE` (not device flow) for the laptop case: PKCE binds the authorization code to the code_verifier on the same machine, preventing code-intercept by other local processes. Device flow has a known phishing vector (attacker obtains a device code and tricks the user into authorizing it) with no technical detection mechanism.
- Generate the `state` parameter before starting the server, store it in memory, validate it in the callback handler. Tie the server lifecycle to a single auth attempt with a 5-minute timeout.
- Handle `EADDRINUSE` by retrying with a different port up to 5 times before failing with a human-readable error.

**Warning signs:**
- Auth flow opens browser, user approves, but CLI hangs at "Waiting for browser..."
- `state mismatch` error in callback despite no attack.
- Works on macOS but fails on Ubuntu where `localhost` resolves differently.

**Phase to address:** Phase 1 (CLI skeleton / auth). This is the first thing users hit; a broken auth flow kills the entire CLI.

---

### Pitfall 5: Local HTTP Server Exposes the API Key to Any Local Process via Overly Permissive CORS

**What goes wrong:**
The Workspace browser UI talks to the CLI's local HTTP server. If the server sets `Access-Control-Allow-Origin: *`, any webpage the user has open can make cross-origin requests to the local server and trigger API calls that carry the user's backend API key. This is a documented 1-click attack pattern (CORS misconfiguration in local proxies). Conversely, if `Origin` validation is too strict (checking the exact string `http://localhost:PORT` when the browser sends `http://127.0.0.1:PORT`), the Workspace itself is blocked.

**Why it happens:**
Developers add `*` CORS to silence browser errors during development and forget to restrict it for production. Because the Workspace is a static HTML page served by the CLI itself, not loaded from a third-party origin, the legitimate `Origin` header is predictable and can be allowlisted exactly.

**How to avoid:**
- Set `Access-Control-Allow-Origin` to exactly the origin of the Workspace page the CLI serves (e.g. `http://127.0.0.1:<PORT>`). Do not use `*`.
- Generate a random session token at CLI startup; require it as a bearer token or custom header on every Workspace→CLI request. This means a cross-origin attacker cannot forge the token even if CORS were misconfigured.
- The CLI server should never accept requests from origins other than its own Workspace origin. Reject all other `Origin` headers with 403.
- Do not forward the backend API key in Workspace responses; the CLI holds the key server-side and makes backend calls on behalf of the Workspace. The Workspace should only see operation results, not the raw key.

**Warning signs:**
- Browser console shows CORS errors in the Workspace during development.
- Developer adds `*` to "fix" the CORS error and ships it.
- API key appears in browser network inspector responses.

**Phase to address:** Phase 1 (CLI skeleton / local server setup). Establish the security model before any Workspace→CLI request path is built.

---

### Pitfall 6: Satori/Sharp Render Core Has Implicit Convex + R2 Coupling That Breaks in CLI Context

**What goes wrong:**
`render.ts` imports `ConvexHttpClient`, calls `convex.mutation(api.releases.create)`, `convex.mutation(api.releases.markCompleted)`, and `uploadImage()` to R2 inline with the render loop. These are server-only concerns. If the render core is extracted naively into the CLI package, it drags Convex client and R2/S3 dependencies into the CLI, and it attempts to connect to the backend during every render — which contradicts the offline-capable local render design and breaks when the backend is unreachable.

**Why it happens:**
The existing `renderReleaseAsync` function was built as a single server-side operation: allocate record → render → upload → mark complete. All concerns are entangled. The CLI needs only: resolve template → resolve brand → build ObjectDataMap → Satori → Sharp → write to disk. The Convex mutations and R2 upload happen at different times (draft save on the backend, upload only at schedule-time).

**How to avoid:**
- Extract a pure render function that takes `{ templateConfig, brand, objectDataMaps, outputDir }` and returns local file paths. Zero network calls, zero Convex, zero R2.
- Keep the Convex client in the CLI's backend communication layer only (draft sync, auth, scheduling). Never import it inside the render hot path.
- The CLI package should not depend on `convex/browser` or `@aws-sdk/client-s3`. Verify this with a dependency audit in the phase that extracts the render core.
- Unit-test the extracted render function against the existing server's output for the same input fixture to establish baseline parity.

**Warning signs:**
- CLI bundle size is unexpectedly large (Convex client, AWS SDK dragged in).
- Render fails when the CLI has no network connection.
- `NEXT_PUBLIC_CONVEX_URL` is referenced in the CLI render path.

**Phase to address:** Phase 2 (render core extraction). This is the central architectural split of the milestone.

---

### Pitfall 7: Auto-Derive Silently Clips or Reflows Text at Portrait/Square Ratios

**What goes wrong:**
The anchor+shorter-side-scale auto-derive strategy scales object coordinates proportionally by the shorter side of each target canvas. For landscape→portrait (1200×675 → 1080×1350), the canvas height more than doubles. Text objects sized for landscape may become enormous — `autoFitFontSize` reduces to a minimum of 8px rather than refusing to fit, so text that overflows its container is clipped by the absolute-positioned layout rather than reflowing. The user sees their landscape template "fit" portrait but half the text is invisible, and there is no warning.

**Why it happens:**
`CanvasRenderer` uses absolute positioning: every object has a fixed `left, top, width, height`. The auto-derive math scales `x, y, width, height` proportionally, but aspect ratio changes create different canvas shapes, so the same content density that fit landscape does not fit portrait. `autoFitFontSize` shrinks text until `size >= MIN_SIZE (8)`, then clips — it does not report overflow. Text at minimum size on a large canvas reads as invisible at social media thumbnail resolution.

**How to avoid:**
- After auto-derive, run a validation pass that checks: for each text object, does `autoFitFontSize` return `> MIN_SIZE * 1.5` for the object's current dimensions? If not, flag it in the Workspace UI as "text may be clipped in [format] — review and nudge."
- Cap the scaling multiplier: if the derived `height` of a text container exceeds 2× the landscape height, apply a reduced scale to the container height to prevent runaway text areas.
- Render a thumbnail preview of all three derived formats in the Workspace before the user confirms the template. The preview makes clipping visible immediately without requiring a full render.
- Require an explicit "Confirm derived formats" step before saving the template, so the user cannot accidentally ship a broken portrait variant.

**Warning signs:**
- Template looks correct in landscape preview but portrait output has empty areas.
- `autoFitFontSize` log shows `returning MIN_SIZE` for derived format.
- Users report "my template only works for Twitter/X but looks broken on Instagram."

**Phase to address:** Phase 4 (Workspace template authoring). Must be verified before the auto-derive feature is considered shippable.

---

### Pitfall 8: Schedule-Time R2 Upload Fails Silently, Posting to Provider with No Media URL

**What goes wrong:**
The design uploads rendered files to R2 only at schedule-time. If the upload fails (network error, expired credentials, R2 outage), the schedule job may still proceed and push the post to Buffer/Postiz with no media URL — or with a URL that resolves to a 403 because the R2 object is not yet public/accessible. Buffer/Postiz accept the push with 200 but the posted content has no image, which is silent from brag.fast's perspective.

**Why it happens:**
Upload failure and provider push are separate network calls in a Convex action. If the upload step is not awaited correctly, or if error handling only logs without aborting the push, the post goes out without media. R2 presigned URLs also have an expiry; if the Convex action queues the push job and it runs after the URL expires, the provider gets a 403 on the media fetch.

**How to avoid:**
- Make the schedule Convex action atomic: upload to R2 → verify the object is accessible (HEAD request or check ETag) → push to provider. If upload fails, fail the entire action and surface the error to the user; do not proceed to the provider push.
- Use R2 public bucket URLs (not presigned) for the scheduled media URL, or generate presigned URLs with a long expiry (≥ 7 days) and store the URL in the Draft record before pushing. Buffer/Postiz fetch the URL at post time, not schedule time, so the URL must remain valid.
- Add a post-push status check: after calling the Buffer/Postiz API, store the provider's returned `scheduled_post_id` and surface it in the Creations gallery so the user can verify the post was accepted with media.
- Test the upload→push pipeline with a deliberately failed upload to verify the error path aborts the push.

**Warning signs:**
- Provider reports scheduled post ID successfully but the live post has no image.
- R2 access logs show 0 bytes written for a scheduled post.
- Users report "I scheduled a post but it went live with no screenshot."

**Phase to address:** Phase 5 (schedule + posting backbone integration). Build the error handling before connecting to a live Buffer/Postiz account.

---

### Pitfall 9: npx Cold-Start Downloads Deps on Every Invocation for Non-Global Install

**What goes wrong:**
`npx brag` without a prior `npm install -g` re-downloads the package on every invocation. The brag CLI is heavy: Remotion (~20 MB), Sharp platform binaries (~15 MB per platform), and fonts. A developer who runs `npx brag` from a project directory gets a 30–60 second cold start every time npm's cache does not have the package, or after a version bump invalidates the cache. This makes the CLI feel broken compared to native binaries.

**Why it happens:**
npx caches packages in `~/.npm/_npx/` by content hash. Any version change forces a re-fetch. Heavy CLI packages with large native binaries make this especially painful. `npx` does not give a clear progress indicator during the package install phase before the CLI's own startup code runs.

**How to avoid:**
- In onboarding docs and the `npx brag` first-run message, strongly recommend `npm install -g brag` or the equivalent for the user's package manager. Frame `npx brag` as "try before install" only.
- Use lazy-loading for Remotion and Sharp: import them only when the user triggers a Render, not at CLI startup. This keeps the startup path fast even on global install, and separates the heavy dep load from the auth and Workspace-serve paths.
- Consider offering a standalone binary path (via `pkg` or `bun build --compile`) as a later milestone deliverable, once the feature set is stable.
- Log a startup timing measurement during development; if CLI init to Workspace-open exceeds 3 seconds on a warm global install, investigate what is being eagerly loaded.

**Warning signs:**
- CLI startup log shows Sharp or Remotion being `require()`d before the user selects "Render."
- `time npx brag --version` takes more than 2 seconds on a warm npm cache.
- Users report "it downloaded something huge every time I run it."

**Phase to address:** Phase 1 (CLI skeleton). Establish lazy-load boundaries before features are built on top.

---

### Pitfall 10: Remotion Local Video Render Font Race Condition Produces Arial on User Machines

**What goes wrong:**
Remotion renders video frames using headless Chrome. CSS `@import` or `@font-face` loaded via Google Fonts URL inside the Remotion composition may not finish downloading before the first frame is captured. The headless Chrome process renders the first N frames in Arial (system fallback), and the rest in the correct font, resulting in a font flash visible in the final video. This is not reproducible in Remotion Studio (which uses live browser rendering with warm caches) and does not appear in the Satori image pipeline (which explicitly passes font buffers).

**Why it happens:**
`VideoCanvasComposition.tsx` uses the same `CanvasRenderer` JSX as the image pipeline, but in the Remotion context, fonts must be loaded through `@remotion/fonts` or `@remotion/google-fonts` with `loadFont()` + `waitForFonts()`. The existing image pipeline passes pre-fetched font buffers to Satori directly; the video pipeline cannot do this — Remotion's headless Chrome needs fonts injected at the CSS/font-face level before rendering begins.

**How to avoid:**
- In the Remotion composition entry point (`VideoCanvasComposition.tsx`), replace any CSS-based Google Fonts import with `@remotion/google-fonts` package calls that use `loadFont()`. This API pre-fetches and injects fonts before Chrome starts capturing frames.
- For the brand's custom `font_family`, pre-fetch the TTF from the local font cache (established in Pitfall 3's solution) and inject it via a `@font-face` blob URL before calling `renderMedia()`.
- Add a smoke-test render that inspects the first frame of a video containing a text object; extract the rendered font name via pixel comparison or a canvas text measurement. This catches the race condition in CI.
- Do not assume that because the Remotion Studio preview shows the correct font, the `renderMedia()` output will too.

**Warning signs:**
- First few frames of video have mismatched font weight/style compared to later frames.
- Video render passes on macOS (warm Google Fonts cache in Chrome profile) but fails on Linux CI.
- User reports "the font changes partway through the video."

**Phase to address:** Phase 3 (local video render). Add the smoke-test frame check as a Phase 3 acceptance criterion.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `process.cwd()` for font paths in CLI | Works on developer's machine | Font not found on any user machine | Never — resolve with `__dirname` from the start |
| Import full `convex/browser` in render core | No refactor needed | CLI bundle size inflated, offline render breaks | Never — extract before any CLI release |
| Bind CORS to `*` on local server | Silences browser errors in dev | Any page can abuse the API key via 1-click attack | Never |
| Skip `ensureBrowser()` explicit call | Simpler startup | First render hangs with no feedback while Chrome downloads | Acceptable only in `--fast` dev mode; never in production CLI |
| Ship lockfile from macOS arm64 only | Simple CI | Sharp fails on 50%+ of user platforms | Never |
| Auto-derive without preview confirmation | Faster workflow | Users ship broken portrait templates without knowing | Never — preview before confirm is mandatory |
| Store API key as plaintext in `~/.brag/config.json` | Simple | World-readable file on shared machines | Acceptable MVP if file is chmod 600; defer keychain integration to next milestone |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sharp cross-platform | Commit lockfile from one OS | Use pnpm `supportedArchitectures` or test multi-platform installs in CI |
| Remotion Chrome | Let Chrome download happen at first render call | Call `ensureBrowser()` at CLI startup with progress display; cache to `~/.brag/chrome/` |
| Google Fonts in CLI | Fetch live on every render | Cache TTF to `~/.brag/fonts/` after first download; validate by SHA |
| Satori WOFF2 | Pass Google Fonts URL response directly | Force TTF via curl User-Agent trick; assert format before passing to Satori |
| R2 presigned URLs | Generate URL at schedule time with short expiry | Use public bucket URL or generate URL with ≥7-day expiry before posting |
| Buffer/Postiz push | Push immediately after upload attempt | Verify upload success (HEAD check) before calling provider API |
| PKCE localhost callback | Use `localhost` in redirect URI | Use `127.0.0.1`; RFC 8252 allows any port; validate IPv4 binding explicitly |
| Convex in render core | Import ConvexHttpClient in the render function | Keep Convex in CLI's backend layer; render function is pure in/out with no network |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Eager Sharp/Remotion import at CLI startup | Every `npx brag --help` takes 3s+ | Lazy-import inside the `render` command handler only | Day 1 if not designed in |
| Font re-fetch on every render call | 2–5s added to each image render when online; failure when offline | Persistent `~/.brag/fonts/` cache with TTL | After first user with 3+ templates using Google Fonts |
| Chrome re-download across npx invocations | 30s+ download per session | Cache to `~/.brag/chrome/`, point `browserExecutable` at cache | Every session for non-global install users |
| Satori font array rebuilt per render | Noticeable lag on first render of each format | Build font array once per CLI session and reuse across formats | When templates use 3+ Google Font families |
| R2 upload of full video at schedule time | Long wait before post goes out (100MB+ files) | Keep video under 50MB (1080p 30fps h264 crf28 is ~8–15MB/min); validate at render time | When users render 30s+ videos |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CORS `*` on local CLI server | Any webpage abuses API key via cross-origin request | Allowlist only the CLI-served Workspace origin |
| API key in Workspace browser responses | Key extracted from DevTools | CLI holds key server-side; Workspace receives operation results only |
| API key file chmod 644 (default) | World-readable on shared machines | `chmod 600` the credentials file on write; warn if permissions are wrong on read |
| No state parameter in auth callback | CSRF: attacker redirects auth code to attacker's URI | Generate cryptographically random `state`; validate before accepting code |
| Device flow without user confirmation UI | Phishing: attacker obtains device code, tricks user into authorizing | Use PKCE for laptop flow; device flow only for headless/CI; show confirmation prompt |
| Plain API key stored in git-tracked file | Key committed accidentally | Store credentials in `~/.brag/config.json`, never in the project directory |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent font fallback to Arial | User publishes posts with wrong brand font | Assert font loaded; show named error in Workspace render status |
| Chrome download during first render with no progress | CLI appears frozen; user kills it | Show "Downloading video renderer (one-time, ~150MB)..." with progress bar before render begins |
| Port conflict crashes auth flow | User never completes login | Retry up to 5 ports; surface human error: "Port 12345 is in use; retrying..." |
| Auto-derived portrait/square clips text invisibly | User schedules broken post | Show thumbnail previews of all three derived formats before template is saved |
| npx cold-start with no progress | User thinks CLI is broken | Log "Installing brag CLI (~XMB)..." immediately; recommend `npm install -g brag` in first-run message |
| Schedule succeeds but post has no media | User's announcement goes out as text-only | Verify R2 HEAD before provider push; surface error in Creations gallery if provider push fails |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cross-platform Sharp install:** Tested install on Linux x64 Docker — not just macOS arm64 developer machine.
- [ ] **Font parity:** Rendered a template with a Google Font on a machine with no prior internet access — offline render must use cached TTF, not fail.
- [ ] **CORS lockdown:** Opened a separate browser tab with `fetch("http://127.0.0.1:<PORT>/api/...")` while Workspace is running — request must be rejected with 403.
- [ ] **Auth state validation:** Simulated a state-mismatch callback — CLI must reject it with a clear error, not hang.
- [ ] **Auto-derive portrait clip:** Authored a landscape template with dense text and derived portrait — Workspace must flag any text object near minimum font size.
- [ ] **Schedule-time upload failure:** Injected an R2 credential error during a schedule action — post must NOT go to provider; error must surface in UI.
- [ ] **Video font race:** Inspected first frame of a rendered video for font correctness — must not be Arial.
- [ ] **Remotion Chrome cache:** Ran `npx brag render` after deleting `~/.brag/chrome/` — must re-download with progress, not fail silently.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sharp binary mismatch shipped to users | HIGH | Patch release with correct multi-platform lockfile; add platform check to postinstall |
| Font parity break discovered post-launch | MEDIUM | Add `~/.brag/fonts/` cache layer + assert-font-loaded; patch release |
| CORS `*` shipped in CLI server | HIGH | Immediate patch release; rotate any exposed API keys; notify affected users |
| Auto-derive clips portrait text for existing templates | MEDIUM | Add retroactive validation pass; show warning in Workspace for existing templates |
| Schedule posts without media (R2 upload race) | HIGH | Immediately gate all provider pushes on R2 HEAD check; contact affected users to reschedule |
| Chrome download blocks first render forever | LOW | `ensureBrowser()` at startup with timeout; clear user messaging to run `brag doctor` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Sharp binary mismatch | Phase 1 — CLI skeleton | Multi-platform install test in CI (macOS arm64, Linux x64, Linux arm64) |
| Remotion Chrome download | Phase 1 + Phase 3 | Run `brag render` on clean machine; verify download progress shows, cache persists |
| Font parity break | Phase 2 — render core extraction | Render same template offline and online; pixel-compare outputs |
| Auth callback port conflict | Phase 1 — CLI auth | Simulate occupied port; verify retry and user error message |
| Local server CORS abuse | Phase 1 — local server | Cross-origin fetch test from separate tab; verify 403 |
| Convex coupling in render core | Phase 2 — render core extraction | Dependency audit: `brag` package must not import `convex/browser` or `@aws-sdk` |
| Auto-derive text clipping | Phase 4 — Workspace template authoring | Derive portrait from a dense landscape template; verify warning appears |
| Schedule upload failure | Phase 5 — schedule + posting integration | Inject R2 failure; verify post does not reach provider |
| npx cold-start latency | Phase 1 — CLI skeleton | Measure `time npx brag --version` with warm cache; must be under 3s |
| Remotion video font race | Phase 3 — local video render | Smoke-test first frame of rendered video for correct font |

---

## Sources

- [Sharp installation documentation](https://sharp.pixelplumbing.com/install/) — native binary platform requirements, optional dependencies, lockfile pitfalls
- [Sharp GitHub issues #3898, #3911, #3994, #4507](https://github.com/lovell/sharp/issues/) — real-world cross-platform failure reports
- [Remotion Chrome Headless Shell docs](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell) — download location, version pinning, Linux deps
- [Remotion ensureBrowser() docs](https://www.remotion.dev/docs/renderer/ensure-browser) — pre-fetch strategy
- [Remotion font race condition issue #5843](https://github.com/remotion-dev/remotion/issues/5843) — local font loading timeout
- [WorkOS: PKCE vs Device Flow for CLI auth](https://workos.com/blog/pkce-vs-device-flow-cli-auth) — security comparison, phishing vector in device flow
- [WorkOS: CLI authentication best practices](https://workos.com/blog/best-practices-for-cli-authentication-a-technical-guide) — PKCE, state parameter, token storage
- [Claude Code OAuth race condition issue #22538](https://github.com/google-gemini/gemini-cli/issues/22538) — real-world state mismatch in CLI auth
- [CORS misconfiguration in local proxy issue](https://github.com/farion1231/cc-switch/issues/1841) — 1-click API key abuse via `*` CORS
- [Cloudflare R2 presigned URLs docs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) — expiry and CORS requirements
- [Satori GitHub issues #36, #590](https://github.com/vercel/satori/issues/) — WOFF2 not supported, font caching for performance
- Existing codebase: `src/lib/fonts.ts`, `src/lib/pipeline/render.ts`, `src/lib/templates/canvas-renderer.tsx`, `src/lib/video/lambda.ts`

---
*Pitfalls research for: brag.fast CLI-first reposition (v2.0 milestone)*
*Researched: 2026-05-20*
