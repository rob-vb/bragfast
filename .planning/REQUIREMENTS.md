# Requirements: brag.fast — v2.0 CLI-First Reposition

**Defined:** 2026-05-20
**Core Value:** A developer can go from terminal to a finished, branded, ready-to-post image/video in minutes — rendered locally, no AI, no friction.

## v1 Requirements

Requirements for the CLI-first MVP. Each maps to a roadmap phase.

### CLI / Launch

- [ ] **CLI-01**: User can launch the tool with `npx brag` without any prior global install
- [ ] **CLI-02**: User can authenticate via a browser device-flow (`brag login`): CLI prints a code + URL, auto-opens the browser, and polls for approval
- [ ] **CLI-03**: CLI stores the minted credential locally and reuses it on later runs, re-prompting only on auth failure
- [ ] **CLI-04**: User can run `brag logout` to clear stored credentials
- [ ] **CLI-05**: After login, the CLI auto-opens the browser to the Workspace and prints the URL as a fallback
- [ ] **CLI-06**: CLI picks an open localhost port automatically when the default is taken
- [ ] **CLI-07**: CLI reads repo context (latest commit/tag, package.json version) to prefill the copy field (no AI)

### Auth (backend support)

- [ ] **AUTH-01**: A signed-in user can approve a CLI device-login request from a browser page, granting the CLI an API key
- [ ] **AUTH-02**: The Workspace browser communicates only with the local CLI; the local server is locked to the Workspace origin and rejects other callers

### Workspace Editor

- [x] **WORK-01**: User can pick a starting template from the 5 built-ins in the Workspace
- [x] **WORK-02**: User can see a live canvas preview at scaled production size
- [x] **WORK-03**: User can switch the preview between landscape, square, and portrait
- [x] **WORK-04**: User can fill text slots by typing or pasting copy
- [x] **WORK-05**: User can enter a separate caption for the social post
- [x] **WORK-06**: Workspace auto-saves the draft as the user edits
- [x] **WORK-07**: User can reopen a recent draft from the Workspace
- [x] **WORK-08**: Logo slot auto-populates from the user's brand when one is set

### Media / Slot Fill

- [x] **MEDIA-01**: User can drag an image from disk into a visual slot
- [x] **MEDIA-02**: User can drag a video from disk into a video slot
- [x] **MEDIA-03**: User can click-to-browse to fill a slot as a drag-drop fallback
- [x] **MEDIA-04**: User can clear or replace media in a slot
- [x] **MEDIA-05**: User sees a preview of filled media in the slot before rendering

### Local Render

- [x] **RND-01**: User can render the creation to images locally (Satori/Sharp) across all three formats
- [x] **RND-02**: User can render the creation to video locally (Remotion local / headless Chrome, no Lambda)
- [x] **RND-03**: User sees render progress in both the terminal and the Workspace
- [x] **RND-04**: On first video render, user sees clear messaging about the one-time renderer (Chrome) download
- [x] **RND-05**: Render output is written to a configurable local folder (default `./brag-output`)
- [x] **RND-06**: Render failures surface a clear, actionable error and never fail silently

### Output / Copy

- [x] **OUT-01**: User can copy the caption to the clipboard with one click
- [x] **OUT-02**: User can open the output folder from the Workspace
- [x] **OUT-03**: User sees the actual rendered file previewed in the Workspace after render
- [x] **OUT-04**: User can download a rendered file from the Workspace

### Scheduling (Buffer)

- [x] **SCHED-01**: User can connect Buffer via OAuth in the admin
- [x] **SCHED-02**: User can pick which Buffer channels a creation posts to, in the Workspace
- [x] **SCHED-03**: User can schedule with an exact date/time or the next queue slot
- [x] **SCHED-04**: On schedule, the rendered file uploads to R2 and its public URL is sent to Buffer
- [x] **SCHED-05**: User sees a confirmation when scheduling succeeds
- [x] **SCHED-06**: Scheduled creations are marked as scheduled and visible in the admin gallery

### Admin (thin hosted web)

- [x] **ADM-01**: User can sign up and log in to the admin
- [x] **ADM-02**: User can set up a brand (logo + colors) in the admin
- [x] **ADM-03**: User can view a read-only gallery of past creations
- [ ] **ADM-04**: User can create, list, and revoke API keys
- [x] **ADM-05**: User can subscribe to the single plan with a 14-day trial

## v2 Requirements

Deferred to future release. Tracked but not in this roadmap.

### Template Authoring

- **AUTHOR-01**: User can author a template's primary format on a canvas (drag/resize/position objects)
- **AUTHOR-02**: Other two formats auto-derive via anchor + shorter-side-scale
- **AUTHOR-03**: User can nudge object position/size per format to correct the derived layout
- **AUTHOR-04**: User can save, rename, and delete custom templates
- **AUTHOR-05**: User can configure background (color / mesh gradient / image)

### Additional Providers

- **SCHED-07**: User can connect and schedule via Postiz

### Other

- **MULTI-01**: User can create multi-slide / carousel creations
- **MCP-01**: A coding agent can push copy + asset refs into a draft via MCP/CLI

## Out of Scope

Explicitly excluded for this milestone. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automated triggers / goals / GitHub daily scan | Shelved by reposition (ADR-0001) |
| Server-side AI / Haiku copy gen / voice calibration | Removed; BYO-AI (ADR-0003) |
| Remotion Lambda / any server-side render | Render is local (ADR-0002) |
| Pricing tiers / credit metering | Single flat subscription; compute is free locally |
| Template marketplace / sharing | Moderation + trust burden; not core |
| Real-time collaboration / multiplayer | Workspace is local-first by definition |
| In-app screenshot capture from URL | Drag-in is sufficient; avoids headless browser in CLI |
| Social analytics / performance tracking | Buffer/Postiz own their dashboards |
| Compiled standalone binary | Node/`npx` distribution reuses TS render core |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 2 | Pending |
| CLI-02 | Phase 2 | Pending |
| CLI-03 | Phase 2 | Pending |
| CLI-04 | Phase 2 | Pending |
| CLI-05 | Phase 3 | Pending |
| CLI-06 | Phase 3 | Pending |
| CLI-07 | Phase 3 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 3 | Pending |
| WORK-01 | Phase 4 | Complete |
| WORK-02 | Phase 4 | Complete |
| WORK-03 | Phase 4 | Complete |
| WORK-04 | Phase 4 | Complete |
| WORK-05 | Phase 4 | Complete |
| WORK-06 | Phase 4 | Complete |
| WORK-07 | Phase 4 | Complete |
| WORK-08 | Phase 4 | Complete |
| MEDIA-01 | Phase 4 | Complete |
| MEDIA-02 | Phase 4 | Complete |
| MEDIA-03 | Phase 4 | Complete |
| MEDIA-04 | Phase 4 | Complete |
| MEDIA-05 | Phase 4 | Complete |
| RND-01 | Phase 5 | Complete |
| RND-02 | Phase 6 | Complete |
| RND-03 | Phase 5 | Complete |
| RND-04 | Phase 6 | Complete |
| RND-05 | Phase 5 | Complete |
| RND-06 | Phase 5 | Complete |
| OUT-01 | Phase 5 | Complete |
| OUT-02 | Phase 5 | Complete |
| OUT-03 | Phase 5 | Complete |
| OUT-04 | Phase 5 | Complete |
| SCHED-01 | Phase 7 | Complete |
| SCHED-02 | Phase 7 | Complete |
| SCHED-03 | Phase 7 | Complete |
| SCHED-04 | Phase 7 | Complete |
| SCHED-05 | Phase 7 | Complete |
| SCHED-06 | Phase 7 | Complete |
| ADM-01 | Phase 8 | Complete |
| ADM-02 | Phase 8 | Complete |
| ADM-03 | Phase 8 | Complete |
| ADM-04 | Phase 8 | Pending |
| ADM-05 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after roadmap creation — all 36 requirements mapped*
