# Phase 1: Render Core Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 1-render-core-extraction
**Areas discussed:** Purity boundary, Font bundling & offline, Output contract, Monorepo setup

---

## Purity boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Fully resolved, pure | Core takes CanvasTemplateConfig + Brand + media as base64/buffers; caller does all Convex/R2/fetch; pure data→files | ✓ |
| Resolved data, core fetches media | Caller passes template+brand objects but core still HTTP-fetches remote image/logo URLs | |
| Core resolves templates too | Core takes IDs + pluggable resolver callback | |

**User's choice:** Fully resolved, pure
**Notes:** Cleanest route to the zero-Convex / zero-R2 / zero-network goal and the SC#2 "no network call" for video.

---

## Font bundling & offline

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle defaults + runtime Google fetch | Bundle Plus Jakarta Sans via __dirname, fetch other Google Fonts at runtime (in-process cache only) | |
| Fully bundle, no network | Ship fixed font set, never fetch | |
| Bundle defaults + cached Google fetch to disk | Bundled defaults via __dirname + Google fetches cached to persistent disk dir (~/.brag/fonts) | ✓ |

**User's choice:** Bundle defaults + cached Google fetch to disk
**Notes:** Default font always works offline; repeat renders go offline after first Google fetch. Fixes SC#4 (process.cwd → __dirname).

---

## Output contract

| Option | Description | Selected |
|--------|-------------|----------|
| Return buffers | render() returns JPEG/MP4 Buffers + metadata; caller writes/uploads | ✓ |
| Write to caller-specified dir | Caller passes outputDir; core writes and returns paths | |
| Both (buffers + optional dir) | Return buffers always; also write if outputDir given | |

**User's choice:** Return buffers
**Notes:** Core stays free of any filesystem/R2 opinion; CLI writes to disk, app uploads to R2.

---

## Monorepo setup

| Option | Description | Selected |
|--------|-------------|----------|
| npm workspaces | packages/render-core as npm workspace consumed by Next app + future CLI | ✓ |
| Plain internal dir | Imported by path/tsconfig alias, no workspace | |
| Decide in research | Defer workspace-vs-alias + ESM/CJS call to researcher | |

**User's choice:** npm workspaces
**Notes:** Clean auditable dependency boundary (enables SC#3 audit). ESM/CJS + build tooling specifics still deferred to research.

---

## Claude's Discretion

- ESM vs CJS / build tooling for the package (deferred to research — must work with __dirname, Next 16, Convex codegen)
- Exact LocalRenderRequest field names and app-side resolver refactor
- Sharp native binary + Remotion Chromium CI verification approach (macOS arm64 + Linux x64)
- Whether renderVideoLocal() is promoted from existing code vs lifted from Lambda composition path

## Deferred Ideas

- CLI shell, device-flow auth, Workspace UI, scheduling/providers — Phases 2–8
- R2 upload at schedule-time + credit/billing — stays app-side
- Retiring server cook API routes as the render path — per ADR 0002, not removed this phase
