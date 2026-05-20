# Feature Research

**Domain:** CLI-first creative tool for developers — localhost browser Workspace for branded social post creation
**Researched:** 2026-05-20
**Confidence:** HIGH (CLI auth patterns, Buffer/Postiz API, Satori/Sharp pipeline all verified against official sources; Workspace editor patterns derived from Remotion Studio, vercel dev, and comparable tooling)

---

## How Comparable Tools Work

This section grounds the feature table in observed patterns from tools developers already accept as normal.

**Remotion Studio** (`npx remotion studio`): Starts a localhost webpack dev server, opens the browser automatically, serves an interactive preview at `localhost:3000`. Server exposes internal API routes so the browser UI can trigger local renders, read filesystem state, and watch for file changes. Progress is streamed via SSE. The UI is authoritative; the CLI is infrastructure.

**`vercel dev` / `netlify dev` / `wrangler dev`**: Print a localhost URL and optionally open the browser. No device-flow auth (they read project credentials from disk). Users expect the browser to open automatically or be given the URL to paste. These tools print colorized, structured terminal output and stay quiet once running.

**OAuth device-flow** (GitHub CLI, AWS SSO, Vercel CLI): Print a short code + URL, open the browser, poll for a token, confirm success in the terminal. Token stored in OS keychain with dotfile fallback. This pattern is now developer-standard for CLI → cloud auth.

**Buffer API**: Posts require a public media URL — no direct file upload at schedule-time from an API call. Rendering locally and uploading the finished file to R2 just before scheduling (ADR-0002) is the correct pattern. Buffer supports scheduling with an exact timestamp or into the next queue slot.

**Postiz API**: REST API with API-key auth (`Authorization: {apiKey}`). Supports media upload then schedule. Rate-limited at 30 req/hr. OAuth 2.0 integration flow available for third-party apps acting on a user's behalf.

**Satori/Sharp pipeline (existing)**: JSX → SVG (Satori) → JPEG/PNG (Sharp). Already runs in Node; no browser required. First-run cost is binary downloads (Sharp native, fonts). Subsequent renders are fast (sub-second for images). Progress feedback is a simple terminal spinner + elapsed time — no streaming needed.

**Remotion local render**: Manages `ensureBrowser()` (downloads Chrome Headless Shell to `node_modules`), then renders frames with a `onProgress` callback that streams frame count. First run is heavy. Users need a clear "downloading renderer…" message. Subsequent renders use cached Chrome.

---

## Feature Landscape

### Category A — CLI / Auth

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| `npx brag` zero-install launch | Devs expect tools to work via npx without global install | LOW | — | Package published to npm; entry bin in package.json |
| Device-flow browser login (first run) | Developer-standard auth pattern (GitHub CLI, Vercel); no API-key copy-paste on day one | MEDIUM | Backend device-flow endpoint (thin new route) | Opens `brag.fast/device?code=XXXX`, polls, mints a local key stored to `~/.brag/token`; OS keychain preferred, dotfile fallback |
| Auto-open browser to Workspace after login | Remotion Studio, vite, next dev all do this; not doing it feels broken | LOW | Token in place | `open` package; print URL as fallback for headless/SSH environments |
| Token persistence between sessions | Devs expect login once, not every run | LOW | Token storage | Read `~/.brag/token` on startup; prompt re-login only on 401 |
| `brag logout` clears token | Expected hygiene; security auditors and shared machines need it | LOW | Token storage | Delete `~/.brag/token` + keychain entry |
| Graceful port conflict handling | `localhost:PORT` taken → should try next port, not crash | LOW | — | Try 3456, increment; print chosen port clearly |
| Colorized, structured terminal output | Devs read the terminal; walls of unformatted text are a signal of low quality | LOW | — | Use `chalk` or equivalent; spinner for async steps |

**Table stakes:** All of the above.
**Differentiator:** None — these are expected and must not be skipped.

---

### Category B — Workspace Editor (Template Picker + Slot Filler)

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Template picker gallery | First screen after open; user needs to choose starting point | LOW | Existing templates table + 5 built-ins | Show thumbnail previews (pre-rendered or SVG); built-ins + user saved templates |
| Live canvas preview at production size (scaled) | Core interaction contract — users must see what they'll get | MEDIUM | CanvasRenderer, existing Satori JSX | Render preview via the local CLI HTTP endpoint; browser polls or uses WS for updates. Canvas is read-only in the viewer; editing is in side panel |
| Slot panel (text + media fill) | The primary creation action; missing = no product | LOW | Existing `drafts` config schema | List of all Slots from the template; text boxes for text Slots, drop zones for media Slots |
| Text Slot: paste/type copy | BYO-AI means copy arrives by paste; this is the entire copy flow | LOW | Slot panel | Rich multiline textarea; no AI, no suggestions. Character/line count as soft guide |
| Caption field (separate from template Slots) | Caption is for the social post text, not the image; every scheduling tool has this | LOW | Scheduling flow | Single text area below the canvas; "copy to clipboard" button adjacent |
| Format switcher (landscape / square / portrait) | Users need to see all three derived formats before rendering | LOW | Auto-derive logic | Tab or segmented control; switching shows each format's canvas preview |
| Draft auto-save | Expected in any web editor; losing work to a refresh is unacceptable | LOW | `drafts` table (existing) | Debounced save to Convex on every Slot change; no manual save button needed |
| Open draft from gallery | Users will revisit past Creations | LOW | `drafts` table | "Recent" list in the Workspace sidebar or on the picker screen |

**Table stakes:** All of the above.

---

### Category C — Template Authoring

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Author one primary format | Core MVP promise — without this, users can't make custom templates | HIGH | Canvas editor surface, TemplateObject model | Drag-resize-position objects on a pixel canvas. Object types: text, visual, logo. Properties panel on right. Uses existing `CanvasTemplateConfig` schema |
| Auto-derive other two formats (anchor + shorter-side-scale) | Authoring 3 formats by hand is 3x work; the ADR commits to this | HIGH | Primary format authoring | When primary is saved, derive landscape/square/portrait using per-object anchorX/anchorY and shorter-side-scale. ADR-0002 details |
| Per-format manual nudge | Auto-derive is 80%; nudge is the 20% safety net | MEDIUM | Auto-derive | Switch to a secondary format tab and adjust object positions/sizes; overrides stored separately from the derived values |
| Template save / overwrite | Users can't author without save | LOW | `templates` table (existing) | Save named template to Convex; conflict → confirm overwrite |
| Template rename / delete | Basic hygiene | LOW | `templates` table | Inline rename in gallery; delete with confirm |
| Preview text for Slot placeholders | Template author needs to see realistic layout | LOW | TemplateObject.previewText (existing field) | Already in schema; surface in the authoring UI's object properties panel |
| Background config (color / mesh gradient / image) | Present in existing `BackgroundConfig` type | LOW | Existing schema | Color picker for solid; mesh gradient preset options; image upload for static BG |

**Table stakes:** Object authoring + auto-derive + nudge + save.
**Differentiator:** Mesh gradient backgrounds (nice visual quality signal; low-effort given existing BackgroundConfig type).
**Deferred:** Per-object animation settings (currently exist in schema as `animation_preset` — leave as template-level only for MVP).

---

### Category D — Media / Slot Fill

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Drag image from disk into visual Slot | Devs expect OS drag-drop into browser; it's the natural gesture | MEDIUM | HTML5 DataTransfer File API + local CLI file read | Browser receives the File object; CLI receives it via multipart POST to `localhost`; CLI writes to a temp dir and returns a `file://` or `data:` URL for preview |
| Click-to-browse file picker (fallback) | Drag-drop can feel unreliable; a click fallback is table stakes | LOW | Same file upload path | `<input type="file" accept="image/*,video/*">` |
| Image preview in Slot drop zone | Users need visual confirmation before render | LOW | File received | Show thumbnail; crop to slot bounds as preview |
| Video file drag-in for video Slots | Video creation path needs the same UX as images | MEDIUM | Remotion local render | Same drag-drop; browser previews first frame via `<video>`; CLI uses the local path at render time |
| Logo Slot handled separately from visual Slot | Logo is brand identity (SVG/PNG transparency matters); treat differently | LOW | Brand setup (admin) | Logo Slot auto-populates from the user's brand if set; can be overridden per Creation |
| Clear/replace media in Slot | Users will drag the wrong file | LOW | Slot panel | "×" button on filled Slot; re-accepts new drop |

**Table stakes:** Image drag-in + click-to-browse + clear/replace. Video drag-in is table stakes for video render path.
**Differentiator:** None in this category — expected behavior.

---

### Category E — Local Render

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| "Render" button triggers local image render | Core product action | MEDIUM | Satori/Sharp extract from existing pipeline (ADR-0002) | CLI receives render command from Workspace; runs `CanvasRenderer → Satori → Sharp → JPEG` for each format |
| Live progress indicator during render | Users expect feedback; silent spinner with no progress feels broken | LOW | Render pipeline | Terminal: spinner + "Rendering landscape… done (0.4s)". Browser: simple step indicator (not frame count) |
| First-run renderer download with clear messaging | Chrome Headless Shell download is ~100MB; users must know what's happening | LOW | Remotion `ensureBrowser()` | Print "Downloading video renderer (first run only, ~100MB)…" with progress % |
| Render output written to configurable local folder | Devs expect files on disk, not locked in the app | LOW | — | Default `./brag-output`; configurable via `~/.brag/config.json` or `--output` flag |
| Render all three formats in one click | Users scheduling to multiple platforms need all three | LOW | Image render | Iterate landscape, square, portrait; save all three to output folder |
| Video render (local Remotion, headless Chrome) | Video is a product pillar; the render path must exist | HIGH | Remotion local render (not Lambda — ADR-0002) | `renderMedia()` with `onProgress` callback; stream frame count to Workspace. Significantly slower than image — 8s/slide at 30fps means ~240 frames |
| Render error with clear message | Render can fail (missing font, bad image size, corrupted file) | LOW | Render pipeline | Show error in Workspace panel; include file path and hint; no silent failure |

**Table stakes:** Image render + progress + output to disk + video render. First-run download messaging is table stakes (missing it causes panic/support requests).

---

### Category F — Output / Copy

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Caption copy to clipboard | Every scheduling workflow starts with caption; one-click copy is expected | LOW | Caption field | `navigator.clipboard.writeText()` in browser; toast confirmation |
| "Open output folder" shortcut | Devs want the files; shell.openPath() or equivalent | LOW | Render output | Button in Workspace post-render; CLI can print the path too |
| Rendered image preview in Workspace post-render | Users need to confirm quality before copying or scheduling | LOW | Render pipeline | Show the actual rendered JPEG in the Workspace; not a re-render of the canvas |
| Download rendered file from Workspace | Some users will want browser save-as rather than folder | LOW | Render output | Serve rendered file from CLI's local server; `<a download>` link |

**Table stakes:** Caption clipboard + output folder shortcut + post-render preview.
**Differentiator:** None — these are expected table stakes for any creative tool with local output.

---

### Category G — Scheduling / Provider

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Connect Buffer via OAuth in admin | Buffer is the dominant choice for devs scheduling social; expected if it's advertised | MEDIUM | Existing OAuth flow + `integrationSecrets` table (already built) | Admin-only; brag.fast handles OAuth dance |
| Connect Postiz via OAuth in admin | Alternative for self-hosters and open-source advocates | MEDIUM | Same existing backbone | Same flow; Postiz API key or OAuth |
| Channel picker in Workspace | User picks which channels this Creation posts to | LOW | Connected provider + channels API | Dropdown showing channels from the connected provider; multi-select for posting to multiple |
| Schedule with exact date/time OR "next slot" | Buffer supports both; users expect to choose | LOW | Buffer/Postiz API | Date-time picker + "add to queue" toggle |
| Upload rendered file to R2 at schedule-time | Buffer/Postiz need a public URL — this is mandatory | MEDIUM | R2 upload (existing `src/lib/storage/r2.ts`) | At "Schedule" action: upload rendered JPEG/MP4 to R2, get public URL, pass to Buffer/Postiz API |
| Schedule confirmation in Workspace | Users need to know it worked | LOW | Scheduling API | In-Workspace toast: "Scheduled for [datetime] on [channel]" |
| Draft marked as scheduled | History tracking | LOW | `drafts` table | Update draft status; visible in admin gallery |

**Table stakes:** Connect at least one provider (Buffer or Postiz) + channel picker + schedule with timestamp + R2 upload-at-schedule + confirmation. Both providers on day one is ideal but one is MVP-minimum.
**Differentiator:** None — this is expected output for a "post scheduler" product promise.

---

### Category H — Admin (Hosted Web Area)

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Login / signup | Minimum viable auth | LOW | Better Auth + Convex (existing) | Email/password; existing `(auth)` route group |
| Brand setup (logo, colors) | Workspace auto-populates logo Slot from brand; no brand = no logo | LOW | Existing `brands` table | Upload logo SVG/PNG; pick background/text/primary colors; this feeds the template color defaults |
| Creations gallery (read-only) | Users need to see history | LOW | `drafts` table (existing) | Thumbnail grid of past Creations with status (rendered, scheduled, published); no editing in admin |
| API keys management | Power users will script against the existing REST API | LOW | Existing `apiKeys` table + routes | List + create + revoke; existing infrastructure |
| Billing (single ~$29/mo, 14-day trial) | No billing = no business | MEDIUM | Convex + Stripe (existing) | Single plan; trial gate; upgrade flow |
| Connect providers (Buffer, Postiz) | Provider connection lives in admin, not Workspace | MEDIUM | Existing `integrationSecrets` + OAuth backbone | Admin `/admin/connections` or similar |

**Table stakes:** All of the above. Admin is intentionally thin — no template authoring or Creation editing here.

---

## Anti-Features (Explicitly Out of Scope for MVP)

| Anti-Feature | Why It Seems Appealing | Why It's Wrong for MVP | What to Do Instead |
|---|---|---|---|
| Multi-slide / carousel creation | Devs want to post carousels eventually | 3x editor complexity; single-slide covers most launch announcements | Defer to v2; note it as planned |
| Server-side AI copy generation | Reduces friction | Ongoing LLM cost, safety surface, and the dev ICP already has better AI | BYO-AI; copy is pasted in. ADR-0003 |
| In-app template marketplace / sharing | "More templates = more value" | Backend moderation burden; trust/safety on shared templates; distraction from core workflow | Let users build their own; add later |
| Remotion Lambda / server-side video render | Faster for users on slow machines | Compute cost on every render; defeats the "zero server render cost" thesis (ADR-0002) | Local render only; user's CPU |
| MCP / agent copy-push | Power-user appeal | Integration surface complexity; not needed if paste works | Manual paste for MVP; MCP is a later milestone power path |
| Real-time collaboration / multiplayer | Looks impressive | Entirely out of scope; the Workspace is local-first by definition | N/A |
| Pricing tiers / credit metering | Granular monetization | Coordination complexity; compute is free locally | Single flat subscription |
| In-app screenshot capture (from URL) | "I want to screenshot my app" | Requires headless browser in the CLI; drag-in is already sufficient | User takes their own screenshot, drags it in |
| Social analytics / performance tracking | "See how your post did" | Requires platform API read-access; separate product surface | Out of scope; Buffer/Postiz show analytics on their own dashboards |
| Template versioning / history | Power users want undo | Complex; not blocking launch | Save-before-overwrite confirm is sufficient |

---

## Feature Dependencies

```
[CLI Auth / Device-Flow]
    └──required-by──> [Workspace serves at localhost]
                          └──required-by──> [Template picker]
                                                └──required-by──> [Slot filling]
                                                                      └──required-by──> [Local render]
                                                                                            └──required-by──> [Output / Copy]
                                                                                            └──required-by──> [Upload to R2 → Schedule]

[Brand setup (Admin)]
    └──enhances──> [Logo Slot auto-population]

[Provider connect (Admin)]
    └──required-by──> [Channel picker in Workspace]
                          └──required-by──> [Schedule action]
                                                └──required-by──> [R2 upload at schedule-time]

[Template authoring]
    └──requires──> [Primary format canvas editor]
    └──produces──> [Auto-derived landscape/square/portrait]
                       └──enhances──> [Format switcher in Workspace]

[Video render]
    └──requires──> [Remotion ensureBrowser() first-run download]
    └──independent-of──> [Image render]
```

### Dependency Notes

- **Scheduling requires R2 upload:** Buffer/Postiz need a public URL; local file paths cannot be used. R2 client (`src/lib/storage/r2.ts`) already exists.
- **Template authoring is optional for day-one users:** 5 built-in templates mean users can create without authoring. Authoring is a power-user path that can ship slightly later in the phase without blocking the core loop.
- **Video render is independent of image render:** They share the Satori/CanvasRenderer for frame composition but diverge at Sharp (image) vs Remotion (video). Either can ship without the other; image is lower complexity and should ship first.
- **Brand setup enhances but does not block:** A user without a brand can still use a template; the logo Slot will be empty. Brand setup in admin is a day-one quality-of-life item.

---

## MVP Definition

### Launch With (v1)

The minimum path: terminal → pick template → fill slots → render image → copy caption + file → optionally schedule.

- [x] `npx brag` start + device-flow login + auto-open browser
- [x] Template picker (5 built-ins + any user-saved templates)
- [x] Slot panel: text Slot fill + visual Slot drag-in (image)
- [x] Caption field with copy-to-clipboard
- [x] Live canvas preview (all three formats via format switcher)
- [x] Local image render (Satori/Sharp) → output to `./brag-output`
- [x] Post-render file preview + open output folder
- [x] Draft auto-save
- [x] Admin: login, brand setup, billing
- [x] Admin: connect one provider (Buffer or Postiz)
- [x] Schedule to connected provider (channel picker + timestamp + R2 upload)

### Add After Validation (v1.x)

- [ ] Template authoring (primary format canvas editor + auto-derive) — blocking for users who want custom layouts; add in first follow-on phase
- [ ] Video slot drag-in + local Remotion render — high-complexity first run; validate image loop first
- [ ] Per-format manual nudge — needed once template authoring ships
- [ ] Second provider (Buffer or Postiz, whichever wasn't shipped first)
- [ ] Creations gallery in admin

### Future Consideration (v2+)

- [ ] Multi-slide / carousel
- [ ] MCP / agent copy-push
- [ ] Template sharing / marketplace
- [ ] Analytics read from Buffer/Postiz

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `npx brag` + device-flow login | HIGH | MEDIUM | P1 |
| Template picker + Slot fill | HIGH | LOW | P1 |
| Caption clipboard copy | HIGH | LOW | P1 |
| Local image render + output to disk | HIGH | MEDIUM | P1 |
| Draft auto-save | HIGH | LOW | P1 |
| Post-render preview + open folder | MEDIUM | LOW | P1 |
| Admin: login + brand + billing | HIGH | LOW (existing) | P1 |
| Connect Buffer/Postiz + schedule | HIGH | MEDIUM (existing backbone) | P1 |
| Format switcher (all three previews) | MEDIUM | LOW | P1 |
| Template authoring (canvas editor + auto-derive) | HIGH | HIGH | P2 |
| Video drag-in + local Remotion render | HIGH | HIGH | P2 |
| Per-format manual nudge | MEDIUM | MEDIUM | P2 |
| Creations gallery in admin | MEDIUM | LOW | P2 |
| Second provider (Buffer or Postiz) | MEDIUM | LOW (existing backbone) | P2 |
| `brag logout` / token management | LOW | LOW | P2 |
| Mesh gradient background authoring | LOW | LOW (existing type) | P3 |
| Background image authoring | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Ship in first follow-on phase
- P3: Nice to have

---

## Existing Code Dependencies (What Reuses vs. What Is New)

| Feature Area | Reuses | New Work |
|---|---|---|
| Auth (Admin) | Better Auth + Convex sessions (existing) | Device-flow endpoint for CLI |
| Token storage (CLI) | — | `~/.brag/token`, OS keychain |
| Image render | `CanvasRenderer`, Satori, Sharp from `src/lib/pipeline/render.ts` | Extract into shared CLI-importable render core |
| Video render | Remotion (local, not Lambda) — `src/remotion/VideoCanvasComposition.tsx` | Remove Lambda path; wire `renderMedia()` local mode |
| Template model | `CanvasTemplateConfig`, `TemplateObject`, `migrateConfig()`, `canvas-defaults.ts` | Auto-derive logic (anchor + scale) + per-format nudge storage |
| Draft persistence | `drafts` table, config JSON schema | Workspace auto-save calls |
| Brand | `brands` table, logo upload | Logo Slot auto-population in Workspace |
| Scheduling / posting | `integrationSecrets`, Buffer/Postiz OAuth flow, `draftPushes` | R2 upload-at-schedule-time, channel picker UI |
| R2 upload | `src/lib/storage/r2.ts` | Called at schedule-time (not render-time); already correct |
| API keys | `apiKeys` table + `/api/v1/api-keys` (existing) | No change |
| Billing | Convex + Stripe (existing) | No change |

---

## Sources

- Remotion Studio docs: https://www.remotion.dev/docs/studio
- Remotion renderMedia(): https://www.remotion.dev/docs/renderer/render-media
- Remotion ensureBrowser(): https://www.remotion.dev/docs/renderer/ensure-browser
- Buffer GraphQL API (scheduling, media URL requirement): https://developers.buffer.com/guides/posts-and-scheduling.html
- Postiz API overview: https://docs.postiz.com/public-api/introduction
- Postiz OAuth 2.0 integration: https://postiz.com/blog/direct-postiz-integration-oauth-api
- OAuth device-flow best practices (WorkOS): https://workos.com/blog/best-practices-for-cli-authentication-a-technical-guide
- Browser auto-open pattern for CLI auth: https://dev.to/kriasoft/browser-auto-open-seamless-oauth-ux-for-cli-tools-3nh4
- Satori npm: https://www.npmjs.com/package/satori
- ADR-0001 (CLI-first reposition), ADR-0002 (local render), ADR-0003 (BYO-AI): local project docs
- Existing codebase: `src/lib/pipeline/render.ts`, `canvas-types.ts`, `canvas-defaults.ts`, `src/lib/storage/r2.ts`

---
*Feature research for: brag.fast CLI-first Workspace MVP*
*Researched: 2026-05-20*
