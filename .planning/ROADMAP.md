# Roadmap: brag.fast — v2.0 CLI-First Reposition

## Overview

This milestone repositions brag.fast from a server-render SaaS into a CLI-first creation tool for developers. A developer runs `npx bragfast`, fills branded Templates in a locally-served Workspace, renders output on their own machine, and copies or schedules it through Buffer. Eight phases follow a strict dependency order derived from the codebase: extract the render core first (it has zero upstream dependencies and must be decoupled from Convex/R2 before anything else imports it), then build the CLI shell and auth, then the local server and Workspace shell, then the Workspace editor, then image render, then video render, then schedule-and-post, and finally trim the Admin to its thin-backend role. Each phase unblocks the next; none can be reordered without violating that dependency chain.

## Build-Order Rationale

The ordering is driven by hard technical dependencies, not preference:

- **Phase 1 (Render Core)** has no upstream dependencies and must be clean before Phases 5 and 6 import it. All Sharp/font/Convex pitfalls must be resolved here.
- **Phase 2 (CLI Shell + Auth)** establishes the CLI binary and credential store; the Phase 3 proxy needs a stored Bearer token before it can do anything useful.
- **Phase 3 (Local Server)** is the integration layer; the Workspace SPA has nothing to talk to without it.
- **Phase 4 (Workspace Editor)** produces the `objectContent` that render endpoints consume; image and video render are blocked until slots can be filled.
- **Phases 5 and 6 (Image / Video Render)** are independent of each other; image first because it is lower risk (no Chrome download UX).
- **Phase 7 (Scheduling)** requires rendered files from Phase 5 or 6 and the proxy from Phase 3.
- **Phase 8 (Admin Trim)** depends only on Phase 2 backend additions (device routes) and can proceed in parallel with Phase 7 if desired, but is last by convention since Admin is the lowest-priority surface.

Template authoring (canvas drag-resize editor, AUTHOR-01..05) is deliberately absent — deferred to a follow-on milestone. The 5 built-in Templates are sufficient for launch.

## Phases

- [x] **Phase 1: Render Core Extraction** - Extract and decouple the Satori/Sharp/Remotion render pipeline into a standalone package the CLI can import
- [x] **Phase 2: CLI Shell + Device-Flow Auth** - Ship the `npx bragfast` package with browser device-flow login and local credential storage *(public package name is `bragfast`; installed/global bin can be `brag`)*
- [x] **Phase 3: CLI Local Server + Workspace Shell** - Serve the Workspace SPA from a local Express server with origin-locked proxy to the backend (completed 2026-05-21)
- [x] **Phase 4: Workspace Editor + Slot Filling** - Template picker, slot fill UI (text + media drag-drop), format switcher, caption, and Draft auto-save (completed 2026-05-21)
- [ ] **Phase 5: Local Image Render** - Render all three formats locally via Satori/Sharp with in-Workspace preview and output folder (awaiting human verification)
- [ ] **Phase 6: Local Video Render** - Render video locally via Remotion headless Chrome with first-run Chrome download messaging (awaiting human verification)
- [x] **Phase 7: Schedule-Time Upload + Posting** - Upload rendered files to R2 at schedule-time and post to Buffer channels via the existing posting backbone (completed 2026-05-22)
- [ ] **Phase 8: Admin Trim** - Remove legacy cook UI, add device approval page, confirm read-only gallery and brand setup are working

## Phase Details

### Phase 1: Render Core Extraction

**Goal**: A standalone `packages/render-core` package exists that renders images and video from a `LocalRenderRequest` with zero Convex, zero R2, and zero Next.js imports — fonts resolved by `__dirname`, Sharp binaries verified across platforms
**Depends on**: Nothing (first phase)
**Requirements**: *(engineering foundation — no direct user-facing v1 requirements; all 36 requirements are delivered in Phases 2–8 which import from this package)*
**Success Criteria** (what must be TRUE):

  1. `renderImage()` called from a standalone Node script produces valid JPEGs for all three formats using the existing CanvasTemplateConfig and brand inputs, without any Convex or R2 call
  2. `renderVideo()` called from a standalone Node script produces a valid `.mp4` using the promoted `renderVideoLocal()` logic, without Lambda or any network call
  3. A dependency audit on `packages/render-core` reports zero imports of `convex`, `@aws-sdk`, or `next`
  4. Font paths resolve correctly from `__dirname` (not `process.cwd()`) so render succeeds regardless of the working directory
  5. Sharp native binaries install successfully on macOS arm64 and Linux x64 (verified in CI)

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Workspace scaffold: package.json, tsup config, tsconfig, peerDeps, font TTFs, stub barrel

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Test harness: proof scripts (SC#1–SC#3), vitest config, fonts unit test (SC#4), CI matrix (SC#5)
- [x] 01-03-PLAN.md — Pure types + canvas-renderer + fonts (__dirname fix + disk cache)
- [x] 01-04-PLAN.md — pure-helpers.ts + image.ts (renderImage Satori/Sharp loop — SC#1)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — video.ts (renderVideo promoted from renderVideoLocal — SC#2)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — App rewiring: next.config.ts + render.ts + render-video.ts adapters + build verification

### Phase 2: CLI Shell + Device-Flow Auth

**Goal**: A developer can run `npx bragfast` and complete browser device-flow login; the CLI stores a credential locally and reuses it on future runs; the backend has the device-flow endpoints and `/device` approval page. The package also exposes a `brag` bin for installed/global usage.
**Depends on**: Nothing (parallel with Phase 1; Phase 3 depends on both)
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, AUTH-01
**Success Criteria** (what must be TRUE):

  1. Running `npx bragfast` without a prior global install starts the CLI and prompts the user to log in
  2. `brag login` prints a short code and URL, opens the browser, and polls until the user approves — after approval the CLI prints "Logged in" and proceeds
  3. A second run of `brag` does not prompt for login because the credential file at `~/.brag/credentials.json` (chmod 600) is reused
  4. `brag logout` clears the credential file and confirms logout in the terminal
  5. A logged-in user visiting `/device?code=XXXX-1234` in the browser sees their identity and an "Approve CLI Access" button; clicking it completes the device-flow handshake

**Plans**: 5 plans
**Plan status**: 5/5 complete; public command is `npx bragfast`, installed/global bin can be `brag`
**UI hint**: yes

### Phase 3: CLI Local Server + Workspace Shell

**Goal**: Running `brag` starts a local Express server on an available port, auto-opens the browser to the Workspace, serves the Workspace SPA with origin-locked CORS, proxies authenticated backend requests, exposes repo context, and handles port conflicts gracefully
**Depends on**: Phase 2 (stored credential for Bearer injection)
**Requirements**: CLI-05, CLI-06, CLI-07, AUTH-02
**Success Criteria** (what must be TRUE):

  1. After login, the CLI auto-opens the browser to `http://127.0.0.1:<PORT>` and prints the URL as a fallback; the Workspace SPA loads
  2. If the default port is occupied, the CLI picks the next available port and prints the actual URL
  3. A request from a tab at a different origin is rejected by the CLI server (401 or CORS block), confirming origin-locking works
  4. The `/api/repo-context` endpoint returns the current repo's git tag, commit SHA, package name, and package version, which the Workspace can use to prefill copy slots

**Plans**: 5 plans

Plans:
**Wave 1** *(parallel — no dependencies)*

- [x] 03-01-PLAN.md — packages/workspace SPA scaffold (Vite react-ts, types, api, App shell)
- [x] 03-02-PLAN.md — Test harnesses for all Phase 3 CLI behaviors (server, origin-lock, proxy, repo-context)

**Wave 2** *(blocked on Wave 1 — tests must exist before implementation)*

- [x] 03-03-PLAN.md — packages/cli/src/server.ts + proxy.ts (Express lifecycle, origin-lock, authenticated proxy)
- [x] 03-04-PLAN.md — packages/cli/src/repo-context.ts (git context extraction, non-git graceful)

**Wave 3** *(blocked on Waves 1 + 2 — wiring)*

- [x] 03-05-PLAN.md — Dependency install (legitimacy checkpoint), tsup.config.ts copy hook, index.ts wire, root build order
**UI hint**: yes

### Phase 4: Workspace Editor + Slot Filling

**Goal**: A developer can open the Workspace, pick one of the 5 built-in Templates, fill text and media Slots, switch between landscape/square/portrait previews, enter a caption, and have the Draft auto-saved — with logo auto-populated from their brand
**Depends on**: Phase 3 (local server + Workspace shell)
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, WORK-08, MEDIA-01, MEDIA-02, MEDIA-03, MEDIA-04, MEDIA-05
**Success Criteria** (what must be TRUE):

  1. User can select any of the 5 built-in Templates from the Workspace picker and see a scaled live canvas preview immediately
  2. User can type or paste text into each text Slot and see the canvas update in real time; switching between landscape, square, and portrait shows the derived layout for each format
  3. User can drag an image or video file from their desktop into a visual Slot and see a preview of it in the Slot; they can also click to browse for a file, and can clear or replace media already in a Slot
  4. User can enter a caption for the social post in a dedicated caption field
  5. After editing, the Draft auto-saves without any explicit user action; the user can reopen a recent Draft from the Workspace and resume editing where they left off
  6. When the user's brand has a logo, the logo Slot auto-populates with it on Template selection

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Shared contracts, workspace test/style setup, render-core browser entry, built-in template relocation, caption validation

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — CLI-local media upload and static media serving
- [x] 04-03-PLAN.md — Workspace draft/brand/media API helpers and debounced full-config auto-save
- [x] 04-04-PLAN.md — Workspace home, template thumbnails, browser preview, format switcher, brand picker

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-05-PLAN.md — Single-screen editor, slot panel, media fields, caption, saved indicator, app transitions

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-06-PLAN.md — Final integration, UI/accessibility polish, full build/test/manual Workspace verification
**UI hint**: yes

### Phase 5: Local Image Render

**Goal**: A developer can render the current Creation to JPEG images for all three formats on their local machine, see progress in the terminal and Workspace, preview the rendered files in the Workspace, copy the caption, download a file, and open the output folder
**Depends on**: Phase 1 (render-core), Phase 4 (slot-filled objectContent)
**Requirements**: RND-01, RND-03, RND-05, RND-06, OUT-01, OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):

  1. Clicking "Render" in the Workspace triggers local Satori/Sharp rendering across all three formats; the terminal shows a progress indicator and the Workspace shows render status
  2. Rendered JPEG files appear in `./brag-output/<id>/` (or the configured output folder); the path is user-configurable
  3. After render, the Workspace shows the actual rendered image previews (one per format)
  4. User can click "Copy caption" to copy the caption to clipboard, "Download" to save a rendered file, and "Open folder" to reveal the output folder in their file manager
  5. A render failure surfaces a clear, actionable error message in the Workspace and terminal — never a silent failure

**Plans**: 4 plans

Plans:
**Wave 1** *(parallel — no dependencies)*

- [x] 05-01-PLAN.md — CLI render infrastructure: render-resolver.ts + server.ts routes + /output static + security guards
- [x] 05-02-PLAN.md — SPA type contracts and API helpers: types.ts + api.ts render/poll/reveal functions

**Wave 2** *(blocked on Wave 1)*

- [x] 05-03-PLAN.md — Hooks: useAutoSave.flush() + useRender lifecycle hook

**Wave 3** *(blocked on Wave 2)*

- [x] 05-04-PLAN.md — RenderPanel component + Editor.tsx wiring + human verification checkpoint
**UI hint**: yes

### Phase 6: Local Video Render

**Goal**: A developer can drag a video into a media Slot and render it to a local `.mp4` using Remotion headless Chrome, with clear first-run Chrome download messaging and progress visible in both the terminal and Workspace
**Depends on**: Phase 1 (render-core/video.ts), Phase 4 (media slot fill)
**Requirements**: RND-02, RND-04
**Success Criteria** (what must be TRUE):

  1. User can drag a video file into a video Slot, then click "Render video" to trigger Remotion local render; the `.mp4` is written to the output folder
  2. On the first video render, the user sees clear messaging (terminal + Workspace) that a one-time Chrome download (~170 MB) is happening before render begins; subsequent renders skip the download
  3. Render progress (frames completed / total) is visible in both the terminal and the Workspace during video render
  4. The rendered video is previewable directly in the Workspace via a `<video>` element served from the CLI's static output directory

**Plans**: 4 plans

Plans:
**Wave 1** *(parallel — no dependencies)*

- [x] 06-01-PLAN.md — render-core onProgress extension: add onProgress to LocalVideoRenderRequest + wire into renderMedia
- [x] 06-02-PLAN.md — CLI video resolver + server routes: video-render-resolver.ts + POST/GET endpoints + unit tests

**Wave 2** *(blocked on Wave 1)*

- [x] 06-03-PLAN.md — Workspace contracts + useVideoRender hook: types.ts + api.ts + hook + unit tests

**Wave 3** *(blocked on Wave 2)*

- [x] 06-04-PLAN.md — RenderPanel extension + Editor.tsx wiring + human verification checkpoint
**UI hint**: yes

### Phase 7: Schedule-Time Upload + Posting

**Goal**: A developer can pick Buffer channels in the Workspace, schedule or queue the rendered Creation, and see a confirmation — with the rendered file uploaded to R2 atomically at schedule-time and the scheduled Creation marked and visible in the Admin gallery
**Depends on**: Phase 5 or Phase 6 (rendered files), Phase 3 (proxy for R2 upload + approveDraftPost)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06
**Success Criteria** (what must be TRUE):

  1. A user who has connected Buffer in the Admin can see their Buffer channels in the Workspace schedule panel and pick which channels to post to
  2. User can set an exact date/time or choose "next queue slot" and submit; the rendered file uploads to R2, a HEAD-check confirms the upload before proceeding, and the Buffer push is made — if the upload fails, scheduling is aborted and an error is shown (no silent partial post)
  3. After successful scheduling, the Workspace shows a confirmation ("Scheduled to Buffer") with the channel name and post time
  4. The scheduled Creation appears in the Admin gallery with a "Scheduled" status badge

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Buffer scheduling primitive: queue + customScheduled support in pushToBuffer

**Wave 2** *(blocked on Wave 1)*

- [x] 07-02-PLAN.md — Backend schedule core: Convex schedule action, releases scheduled status, Admin badge type

**Wave 3** *(blocked on Wave 2)*

- [x] 07-03-PLAN.md — Backend API routes: presigned upload-url + schedule endpoint with all-or-nothing errors

**Wave 4** *(blocked on Wave 3)*

- [x] 07-04-PLAN.md — CLI + Workspace schedule orchestration: local file upload to R2 + useSchedule hook

**Wave 5** *(blocked on Wave 4)*

- [x] 07-05-PLAN.md — SchedulePanel + Editor wiring + human verification checkpoint

**Wave 6** *(gap closure; blocked on Wave 5)*

- [x] 07-06-PLAN.md — Gap closure: trusted schedule action, derived R2 URLs, durable provider-post recording
**UI hint**: yes

### Phase 8: Admin Trim

**Goal**: The Admin is intentionally thin: login/signup works, brand setup feeds the Workspace logo slot, the read-only Creation gallery shows rendered/scheduled/published status, API key management works, billing with a 14-day trial is active, and the device approval page is wired in — legacy cook/release authoring UI is removed
**Depends on**: Phase 2 (device-flow backend routes), Phase 7 (scheduled Creations to display)
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05
**Success Criteria** (what must be TRUE):

  1. A new user can sign up, log in, and access the Admin without errors; an existing user can log in to the Admin and be redirected to the `/device` approval page when a CLI device-flow code is pending
  2. User can set up or update a brand (logo + colors) in the Admin, and the logo immediately auto-populates the logo Slot in the next Workspace session
  3. The Admin gallery shows a read-only thumbnail grid of past Creations with status indicators (rendered, scheduled, published); no creation or editing UI is present in Admin
  4. User can create, list, and revoke API keys from the Admin
  5. User can subscribe to the single ~$29/mo plan with a 14-day trial and see their current billing status

**Plans**: 10 plans
**UI hint**: yes

Plans:
**Wave 1** *(no dependencies)*

- [x] 08-01-PLAN.md — Wave 0 test scaffolds: subscription-gate test + trialEnd assertion

**Wave 2** *(blocked on Wave 1)*

- [x] 08-02-PLAN.md — Schema Step 1: make creditsRemaining optional + add trialEnd; userProfiles.create sets trialEnd
- [x] 08-03-PLAN.md — Mass deletion: Kitchen, Sous-Chef, GitHub App, Briefing, goals/backend Convex modules

**Wave 3** *(blocked on Wave 2)*

- [ ] 08-04-PLAN.md — Credits teardown: strip calculateCredits, reserve/refund mutations, cook API credit logic, render pipeline credits
- [ ] 08-05-PLAN.md — Launch-mode collapse + admin sidebar trim + dashboard slim

**Wave 4** *(blocked on Wave 3)*

- [ ] 08-06-PLAN.md — Billing reshape: single-price stripe.ts, plan union migration, account/upgrade pages
- [ ] 08-07-PLAN.md — Gallery read-only (strip SocialCopySection) + new /admin/integrations page

**Wave 5** *(blocked on Wave 4)*

- [ ] 08-08-PLAN.md — 402 subscription gate: subscription-gate.ts + 4 gated routes
- [ ] 08-09-PLAN.md — Workspace Default/Custom template toggle

**Wave 6** *(blocked on Wave 5)*

- [ ] 08-10-PLAN.md — Final schema cleanup (remove creditsRemaining) + device path verification + human checkpoint

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Render Core Extraction | 6/6 | Complete | 2026-05-20 |
| 2. CLI Shell + Device-Flow Auth | 5/5 | Complete | 2026-05-20 |
| 3. CLI Local Server + Workspace Shell | 5/5 | Complete   | 2026-05-21 |
| 4. Workspace Editor + Slot Filling | 6/6 | Complete   | 2026-05-21 |
| 5. Local Image Render | 4/4 | Human verification | - |
| 6. Local Video Render | 3/4 | In Progress|  |
| 7. Schedule-Time Upload + Posting | 6/6 | Complete   | 2026-05-22 |
| 8. Admin Trim | 3/10 | In Progress|  |
