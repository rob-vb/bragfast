# Phase 5: Local Image Render — Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/cli/src/server.ts` (modified) | server/route | request-response + file-I/O | same file — existing `POST /api/local/media` + `/media` static route | exact |
| `packages/cli/src/render-resolver.ts` (new) | service | CRUD + file-I/O | `src/lib/pipeline/shared.ts` (`resolveBrand`, `buildSlideDataMaps`, `prefetchStaticImages`) | role-match |
| `packages/workspace/src/pages/Editor.tsx` (modified) | component | request-response | same file — existing layout + `useAutoSave` wiring | exact |
| `packages/workspace/src/components/RenderPanel.tsx` (new) | component | request-response | `packages/workspace/src/components/SavedIndicator.tsx` (status-state → visual pattern) | role-match |
| `packages/workspace/src/api.ts` (modified) | utility | request-response | same file — existing `requestJson` + `patchDraft` calls | exact |
| `packages/workspace/src/hooks/useAutoSave.ts` (modified) | hook | request-response | same file | exact |
| `packages/workspace/src/hooks/useRender.ts` (new) | hook | request-response (poll) | `useAutoSave.ts` (async-state + effect lifecycle) | role-match |

---

## Pattern Assignments

### `packages/cli/src/server.ts` — new render endpoints + `/output` static route

**Analog:** same file, lines 115–186

**Existing local-route pattern** (lines 115–157, 170–185) — copy this structure exactly for render endpoints:

```typescript
// Pattern: local-only route registered BEFORE the /api proxy, then static mount
app.post("/api/local/media", localMediaUploadRoute(mediaDir, port));
app.use("/media", express.static(mediaDir));

// ↑ Mirror for render:
app.post("/api/local/render", localRenderRoute(outputDir, port));
app.post("/api/local/render/:id/status", /* poll handler */);
app.post("/api/local/reveal", localRevealRoute(outputDir));
app.use("/output", express.static(outputDir));
```

**Route handler function shape** (lines 115–157) — inline async IIFE inside Express handler:

```typescript
function localMediaUploadRoute(mediaDir: string, port: number): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      // ... validation
      await fs.mkdir(mediaDir, { recursive: true });
      const id = randomUUID().replace(/-/g, "").slice(0, 16);
      await fs.writeFile(path.join(mediaDir, filename), file.buffer);
      res.json({ id, url: `http://127.0.0.1:${port}/media/${filename}` });
    })().catch(next);
  };
}
```

**Async-job response shape** (analog: `src/app/api/v1/cook/image/route.ts` line 48) — return `202` immediately:

```typescript
// POST /api/local/render → immediate return
return Response.json(result, { status: 202 }); // upstream Next.js pattern
// In Express equivalent:
res.status(202).json({ id: jobId, status: "pending" });
```

**buildApp() modification** (lines 159–186) — add render routes and outputDir param before the proxy:

```typescript
function buildApp(
  credentials: Credentials,
  port: number,
  spaDir: string,
  mediaDir: string,
  outputDir: string,  // ← add
): Application {
  const app = express();
  app.use(...originLockMiddleware(port));
  app.get("/api/repo-context", ...);
  app.post("/api/local/media", localMediaUploadRoute(mediaDir, port));
  app.use("/media", express.static(mediaDir));
  // ↓ new render routes here, before proxy
  app.post("/api/local/render", localRenderRoute(outputDir));
  app.get("/api/local/render/:id/status", localRenderStatusRoute());
  app.post("/api/local/reveal", localRevealRoute(outputDir));
  app.use("/output", express.static(outputDir));
  app.use(createBackendProxy(credentials.api_key));
  app.use(express.static(spaDir));
  app.get("/*splat", (_req, res) => { res.sendFile(path.join(spaDir, "index.html")); });
  return app;
}
```

**Imports already available** (lines 1–16) — `randomUUID`, `fs.promises`, `path`, `homedir`, `open` are all already imported. Add render-core import for the resolver.

---

### `packages/cli/src/render-resolver.ts` — new CLI render resolver service

**Analog:** `src/lib/pipeline/shared.ts`

**resolveBrand pattern** (lines 50–82) — fetch logo URL → base64 at resolve time; adapt for CLI (use `fetchImageAsBase64`-style node fetch, no Convex):

```typescript
export async function resolveBrand(
  request: { brand_id?: string; name?: string; logo_url?: string; colors?: BrandColors; font_family?: string },
  fallbackColors: BrandColors,
  convex: ConvexHttpClient
): Promise<Brand> {
  if (request.brand_id) {
    // ... fetch from Convex
    return {
      name: record.name,
      logoBase64: record.logo_url ? await fetchImageAsBase64(record.logo_url) : "",
      website: record.website ?? "",
      colors: record.colors,
      font_family: record.font_family,
    };
  }
  // inline brand fallback
}
```

For the CLI resolver, brand comes from the Draft's `brandId` — fetch via the backend proxy (already auth-injected) using `GET /api/v1/brands`, then resolve logo to base64 via node `fetch`.

**buildSlideDataMaps pattern** (lines 84–108) — image_url → base64 conversion; CLI equivalent reads `~/.brag/media/<filename>` from disk instead of remote fetch:

```typescript
// Upstream server pattern (src/lib/pipeline/shared.ts:94)
if (mod.image_url) entry.imageBase64 = await fetchImageAsBase64(mod.image_url);

// CLI equivalent: local media refs are /media/<filename> relative URLs
// Resolve to absolute path: path.join(mediaDir, filename)
// Then: fs.readFile(absPath) → Buffer.toString("base64") → data URI
```

**prefetchStaticImages pattern** (lines 115–144) — template static `src` fields → base64 srcMap. Same logic applies in CLI resolver; use node `fetch` (no Cloudflare R2 shortcut needed for static template assets).

**buildDraftObjectData pattern** (`packages/workspace/src/lib/buildDraftObjectData.ts` lines 21–59) — `DraftConfig.objectContent` → `ObjectDataMap`. The CLI resolver calls this logic (or imports `buildDraftObjectData` from workspace if shared, or duplicates the pure mapping). Note: the SPA version uses `@bragfast/render-core/browser` types; CLI uses `@bragfast/render-core` (node).

**LocalRenderRequest assembly** (`packages/render-core/src/types.ts` lines 36–39):

```typescript
export interface LocalRenderRequest {
  formats: LocalRenderFormat[];  // one entry per format key
  brand: Brand;
}
// Each LocalRenderFormat:
{ name: "landscape" | "square" | "portrait", slides: LocalRenderSlide[] }
// Each LocalRenderSlide:
{ objectData: ObjectDataMap, templateConfig, backgroundImageBase64?, srcMap? }
```

**Resolver output → disk write pattern** (`packages/render-core/src/image.ts` lines 10–72) — `renderImage()` returns `ImageRenderResult.formats[format].slides[0]` as `Buffer`. Write pattern:

```typescript
// After renderImage(req):
for (const [formatName, formatResult] of Object.entries(result.formats)) {
  const buf = formatResult.slides[0]; // single-slide
  const outPath = path.join(outputDir, jobId, `${formatName}.jpg`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
}
```

---

### `packages/workspace/src/pages/Editor.tsx` — add Render button + RenderPanel

**Analog:** same file, lines 1–118

**Existing layout structure** (lines 64–117) — Render button goes inside the left `<section>` below `FormatSwitcher`, RenderPanel below the canvas wrapper:

```tsx
// Current structure (lines 78–93):
<div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <FormatSwitcher ... />
</div>
<div className="overflow-hidden rounded-[8px] border border-[var(--workspace-border)] bg-white">
  <TemplatePreview ... />
</div>

// Extended — add RenderPanel below canvas:
<RenderPanel
  draftId={savedDraftId}
  caption={config.caption ?? ""}
  activeFormat={activeFormat}
  onFlushAndRender={handleRender}
  renderState={renderState}
/>
```

**useAutoSave wiring** (line 44) — the flush trigger needs `savedDraftId` from `save.draftId`; access it via the returned object:

```tsx
const save = useAutoSave({ draftId, config: dirty ? config : null });
// save.draftId is the persisted id (may differ from prop draftId for new drafts)
// save.status drives the SavedIndicator
```

**Import extension pattern** (lines 1–11) — add new imports following the same grouping (React hooks, render-core types, components, hooks, lib, types):

```tsx
import { RenderPanel } from "../components/RenderPanel";
import { useAutoSave } from "../hooks/useAutoSave";  // already imported
import { useRender } from "../hooks/useRender";       // new
```

---

### `packages/workspace/src/components/RenderPanel.tsx` — new component

**Analog:** `packages/workspace/src/components/SavedIndicator.tsx`

**Status-keyed visual pattern** (lines 1–31) — map a status union to visual output with a `Record<Status, ...>` lookup:

```tsx
// SavedIndicator pattern (lines 3–9, 15–31):
const LABELS: Record<SaveStatus, string> = {
  idle: "Unsaved",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed - retrying on next edit",
};

export function SavedIndicator({ status }: SavedIndicatorProps) {
  return (
    <div className="flex min-h-[32px] items-center gap-2 text-[12px] font-semibold text-[var(--workspace-muted)]">
      <span aria-hidden className={[
        "h-2 w-2 rounded-full",
        status === "saved" ? "bg-[var(--workspace-lime)]" : "",
        status === "error" ? "bg-red-600" : "",
      ].join(" ")} />
      {LABELS[status]}
    </div>
  );
}
```

**Token usage pattern** (Editor.tsx lines 65–66, 68, 86) — tokens used throughout Editor that RenderPanel must mirror:

```tsx
// Background: bg-[var(--workspace-bg)]
// Border: border border-[var(--workspace-border)]
// Surface: bg-white (--workspace-surface)
// Forest text: text-[var(--workspace-forest)]
// Muted text: text-[var(--workspace-muted)]
// Lime accent: bg-[var(--workspace-lime)]
// Red failure: text-red-500 / bg-red-500/10
```

**Render button shape** (UI-SPEC line 144) — primary CTA, full-width, 44px min height:

```tsx
<button
  type="button"
  disabled={phase === "flushing"}
  aria-disabled={phase === "flushing"}
  className="w-full min-h-[44px] bg-[var(--workspace-lime)] text-[var(--workspace-forest)] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {phase === "flushing" ? "Saving…" : phase === "failed-all" ? "Retry render" : "Render images"}
</button>
```

**Spinner pattern** — CSS animation only (no external library, per UI-SPEC). Use inline `@keyframes` via Tailwind `animate-spin` (already available) or a simple border-spinner:

```tsx
// Tailwind animate-spin on a border element (no external dep)
<span
  role="status"
  aria-label={`Rendering ${format}`}
  className="h-4 w-4 rounded-full border-2 border-[var(--workspace-border)] border-t-[var(--workspace-forest)] animate-spin"
/>
```

**Copy-caption flash pattern** — local `useState` for 2-second revert, same pattern used in many clipboard utilities:

```tsx
const [copied, setCopied] = useState(false);
function handleCopy() {
  void navigator.clipboard.writeText(caption).then(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  });
}
```

---

### `packages/workspace/src/api.ts` — add render/poll/reveal calls

**Analog:** same file, lines 1–53

**requestJson helper** (lines 9–12) — all new calls use this exact pattern; relative `/api/...` URLs only:

```typescript
async function requestJson<T>(url: `/api/${string}`, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  return (await response.json()) as T;
}
```

**POST with JSON body pattern** (lines 28–34, 36–48):

```typescript
export async function createDraft(config: DraftConfig): Promise<{ draft_id: string }> {
  return requestJson<{ draft_id: string }>("/api/v1/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}
```

**New render calls to add** — follow the same pattern:

```typescript
export async function triggerRender(draftId: string): Promise<{ id: string; status: "pending" }> {
  return requestJson("/api/local/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId }),
  });
}

export async function pollRenderStatus(id: string): Promise<RenderStatusResponse> {
  return requestJson(`/api/local/render/${encodeURIComponent(id)}/status`);
}

export async function revealOutputFolder(id: string): Promise<void> {
  await requestJson("/api/local/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
```

The `RenderStatusResponse` type should be added to `packages/workspace/src/types.ts` following the existing interface pattern there.

---

### `packages/workspace/src/hooks/useAutoSave.ts` — add flush() method

**Analog:** same file, lines 1–72

**Current hook return shape** (lines 14–17, 67–71):

```typescript
export interface UseAutoSaveResult {
  draftId: string | null;
  status: SaveStatus;
  statusLabel: "Unsaved" | "Saving..." | "Saved" | "Save failed - retrying on next edit";
}
// returns: { draftId: savedDraftId, status, statusLabel }
```

**Debounce cancel pattern** (lines 46–65) — the `window.clearTimeout` in the cleanup of the `useEffect` is the mechanism to cancel pending saves. A `flush()` must cancel any pending timeout, immediately save, and resolve when the PATCH completes:

```typescript
// Current debounced save (lines 46–64):
const timeout = window.setTimeout(() => {
  void (async () => {
    setStatus("saving");
    try {
      const result = currentDraftId
        ? await patchDraft(currentDraftId, config)
        : await createDraft(config);
      setSavedDraftId(nextDraftId);
      lastSavedConfigRef.current = config;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  })();
}, SAVE_DELAY_MS);
return () => window.clearTimeout(timeout);
```

**Extended return shape** — add `flush: () => Promise<string | null>` (returns the saved draftId):

```typescript
export interface UseAutoSaveResult {
  draftId: string | null;
  status: SaveStatus;
  statusLabel: ...; // unchanged
  flush: () => Promise<string | null>; // ← new: cancel debounce, save now, return draftId
}
```

**Implementation approach** — store a `pendingRef` (refs to current config + savedDraftId + timeout id) so `flush()` can access current values without stale closure issues:

```typescript
const pendingTimeoutRef = useRef<number | null>(null);
const currentConfigRef = useRef<DraftConfig | null>(config);
const savedDraftIdRef = useRef<string | null>(savedDraftId);
// keep refs in sync in the effect
// flush() clears pendingTimeoutRef, reads currentConfigRef, runs the save inline
```

---

### `packages/workspace/src/hooks/useRender.ts` — new polling hook

**Analog:** `packages/workspace/src/hooks/useAutoSave.ts`

**Async-state-machine pattern** (lines 28–72 of useAutoSave) — the pattern is: `useEffect` triggers async work; `useState` tracks phases; refs hold mutable values that outlive re-renders.

**Polling loop implementation** — use `setInterval` inside a `useEffect` (cleanup clears the interval), same as the timeout pattern in `useAutoSave`:

```typescript
// Analog pattern from useAutoSave (lines 46, 64):
const timeout = window.setTimeout(() => { ... }, SAVE_DELAY_MS);
return () => window.clearTimeout(timeout);

// Polling equivalent:
useEffect(() => {
  if (!jobId) return;
  const interval = window.setInterval(() => {
    void pollRenderStatus(jobId).then(updateFormatStates).catch(handlePollError);
  }, 1000);
  return () => window.clearInterval(interval);
}, [jobId]);
```

**Hook interface shape** — modeled after `UseAutoSaveResult`:

```typescript
export type FormatRenderState =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "done"; url: string }
  | { phase: "failed"; error: string };

export interface UseRenderResult {
  renderPhase: "idle" | "flushing" | "rendering" | "done" | "failed-all" | "partial";
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
  jobId: string | null;
  trigger: () => Promise<void>; // flush save → POST render → start polling
}
```

---

## Shared Patterns

### Express local-route registration order
**Source:** `packages/cli/src/server.ts` lines 169–185
**Apply to:** All new CLI endpoints in `server.ts`

All local-only endpoints (`/api/local/*`) MUST be registered BEFORE `app.use(createBackendProxy(...))`. The proxy has a `pathFilter: "/api"` and will intercept any `/api/*` route not already matched by Express. Static mounts (`/output`, `/media`) go before the proxy too.

```typescript
// Mandatory order in buildApp():
app.post("/api/local/media", ...);
app.use("/media", express.static(mediaDir));
// ↓ new
app.post("/api/local/render", ...);
app.get("/api/local/render/:id/status", ...);
app.post("/api/local/reveal", ...);
app.use("/output", express.static(outputDir));
// ↓ must be last before SPA fallback
app.use(createBackendProxy(credentials.api_key));
```

### Async handler IIFE pattern
**Source:** `packages/cli/src/server.ts` lines 131–154
**Apply to:** All new Express route handlers in `server.ts`

Express route handlers that need `async/await` use `void (async () => { ... })().catch(next)` to prevent unhandled promise rejections from silently swallowing errors:

```typescript
return (req, res, next) => {
  void (async () => {
    // async work
    res.json({ ... });
  })().catch(next);
};
```

### Relative URL convention
**Source:** `packages/workspace/src/api.ts` lines 9–12
**Apply to:** All new `api.ts` functions

The `requestJson` helper's URL parameter is typed as `` `/api/${string}` `` — enforcing relative URLs at the type level. Never use absolute URLs in the SPA; the CLI server handles proxy routing.

### Workspace token usage
**Source:** `packages/workspace/src/index.css` lines 1–12, `packages/workspace/src/pages/Editor.tsx` lines 65–93
**Apply to:** `RenderPanel.tsx` and all new Workspace components

All color/spacing values come from CSS custom properties. No hex literals except `#EF4444` (Tailwind red-500, destructive). No `--workspace-*` tokens outside this set:
- `--workspace-bg` `--workspace-surface` `--workspace-forest` `--workspace-lime`
- `--workspace-sage` `--workspace-ink` `--workspace-border` `--workspace-muted`

### Error propagation: never silent
**Source:** `packages/cli/src/server.ts` line 154 (`.catch(next)`)
**Apply to:** All new CLI route handlers

All async errors propagate via `next(err)` to Express's default error handler, which will log to terminal. Additionally, the render resolver must log per-format errors to `stdout` before storing them in the in-memory job map, satisfying D-11 (terminal surfacing).

### In-memory job store
**Source:** `src/app/api/v1/cook/image/route.ts` — `after()` fires async work; `getRelease(id)` reads from Convex
**Apply to:** CLI render job tracking in `server.ts`

The CLI equivalent is a `Map<string, RenderJob>` module-level variable in `server.ts` (single-user, local process — no persistence needed). Key = jobId (`randomUUID`), value = per-format state. Pattern mirrored from the cook pipeline's async-job model.

---

## No Analog Found

All files in scope have a close codebase analog. No entries.

---

## Metadata

**Analog search scope:** `packages/cli/src/`, `packages/workspace/src/`, `src/lib/pipeline/`, `src/app/api/v1/cook/`
**Files scanned:** 14
**Pattern extraction date:** 2026-05-21
