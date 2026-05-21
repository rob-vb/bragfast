# Phase 4: Workspace Editor + Slot Filling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 4-workspace-editor-slot-filling
**Areas discussed:** Editor layout & reuse, Local media handling, Auto-save & reopen, Template picker & logo fill

---

## Editor layout & reuse

| Option | Description | Selected |
|--------|-------------|----------|
| Single-screen editor | Live preview + slot panel side-by-side, drop wizard machinery | ✓ |
| Port the wizard | Reuse multi-step kitchen flow as-is | |
| Hybrid | Single screen, template pick gated first | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs above the preview | Segmented format tabs above the canvas | ✓ |
| All three stacked | Show all 3 formats simultaneously | |
| You decide | Defer to planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated field below the slots | Caption textarea below on-canvas slots | ✓ |
| Top of the slot panel | Caption first | |
| Separate tab/section | Caption isolated | |

**User's choice:** Single-screen + format tabs + caption below slots.
**Notes:** "Can't we somewhat use the current kitchen editor design?" — yes: reuse kitchen design language + portable components (TemplatePreview, IngredientsStep fields, BrandColorPicker), collapse steps into one screen.

---

## Local media handling

| Option | Description | Selected |
|--------|-------------|----------|
| Local CLI cache + reference | POST to CLI → local cache dir, draft stores reference; R2 deferred | ✓ |
| Embedded in draft (base64) | base64 in config JSON; bloats Convex, bad for video | |
| Session-only | In-memory only; breaks resume-where-you-left-off | |

| Option | Description | Selected |
|--------|-------------|----------|
| Muted autoplay loop | Inline `<video>` muted/looping/autoplay | ✓ |
| First frame + play button | Static poster + play overlay | |
| You decide | Defer to planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Common web formats | PNG/JPG/WebP/SVG + MP4/MOV/WebM, reject others | ✓ |
| Images only this phase | Defer MEDIA-02 video fill | |
| Broad / permissive | Accept anything | |

**User's choice:** Local CLI cache + reference; muted autoplay video preview; common web formats.
**Notes:** Video slot fill + preview stays in scope (MEDIA-02); video render is Phase 6. New CLI media endpoint + static media route introduced this phase.

---

## Auto-save & reopen

| Option | Description | Selected |
|--------|-------------|----------|
| On template pick | Create draft at template select | |
| On first slot edit | Create draft on first content change | ✓ |
| Explicit 'New draft' | User clicks New | |

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced after edits | Full-config PATCH ~800ms–1s after last change | ✓ |
| Save on blur / field-exit | Persist on focus loss | |
| Fixed interval | Save every N seconds | |

| Option | Description | Selected |
|--------|-------------|----------|
| Recent drafts on Workspace home | Home lists recent drafts, click to load | ✓ |
| Drafts drawer in editor | In-editor side drawer | |
| Both | Home list + in-editor switcher | |

| Option | Description | Selected |
|--------|-------------|----------|
| Add explicit `caption` field | New `caption?: string` on DraftConfig | ✓ |
| Reuse `notes` | Overload generic field | |
| Use `copyByPlatform` | Per-platform copy structure | |

**User's choice:** Create on first content edit; debounced full-config save; recent drafts on home; explicit caption field.
**Notes:** PATCH shallow-merges config → auto-save must send full config to avoid dropping objectContent. No Convex schema change needed (config is a JSON string).

---

## Template picker & logo fill

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail grid on home | 5 live preview thumbnails on home, alongside recent drafts | ✓ |
| Picker inside editor | Default template, switch in editor | |
| Dropdown / list | Compact picker | |

| Option | Description | Selected |
|--------|-------------|----------|
| Apply brand colors + auto-fill logo | Brand colors + logo from brand.logo_url on select | ✓ |
| Logo only | Logo auto-fill, keep template colors | |
| Nothing auto | Load as-authored | |

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-pick default + switcher | First/default brand + in-editor switcher | ✓ |
| Prompt to choose on start | Ask which brand if >1 | |
| You decide | Defer to planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Move into render-core, import shared | Relocate canvas-defaults to render-core, one source | ✓ |
| Serve via backend templates API | Fetch built-ins through proxy | |
| Duplicate into the SPA | Copy into packages/workspace | |

**User's choice:** Thumbnail grid on home; apply brand colors + auto-fill logo; auto-pick default brand + switcher; move canvas-defaults into render-core.
**Notes:** Zero brands → template colors + empty logo, no error.

---

## Claude's Discretion

- Exact local cache dir path/layout and media id scheme.
- Debounce timing and "Saved" indicator styling.
- Precise boundary of the "first content edit" trigger.
- Slot labeling/ordering within the panel.
- Picker thumbnail sizing/grid layout.
- Empty/error/overflow states for text slots.

## Deferred Ideas

- Per-format/per-slide authoring + anchor-scale auto-derive — future authoring milestone.
- Carousel / multi-slide creations — deferred this milestone.
- AI-assisted slot fill / copy generation — out of scope (BYO-AI, ADR-0003).
- R2 upload of media — happens at schedule-time (Phase 7).
