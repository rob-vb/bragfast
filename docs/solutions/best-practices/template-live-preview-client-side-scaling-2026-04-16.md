---
title: "Browser-side CanvasRenderer scaling for live template thumbnails"
date: 2026-04-16
category: docs/solutions/best-practices/
module: Cook Flow / Template Picker
problem_type: best_practice
component: tooling
severity: low
applies_when:
  - Building a template or layout picker that needs live thumbnails
  - CanvasTemplateConfig-based templates need visual differentiation without server roundtrips
  - Preview must stay current when template definitions or brand data change
related_components:
  - src/components/kitchen/template-preview.tsx
  - src/components/kitchen/recipe-step.tsx
  - src/components/kitchen/cook-page.tsx
  - src/lib/preview-sample.ts
  - src/lib/templates/canvas-renderer.tsx
tags:
  - template-picker
  - live-preview
  - client-side-rendering
  - scale-transform
  - canvas-renderer
  - ResizeObserver
  - no-server-roundtrip
---

# Browser-side CanvasRenderer scaling for live template thumbnails

## Context

The cook flow template picker displayed five built-in template tiles plus any custom user templates — every tile showed an identical dashed "No preview" placeholder. Users had to choose a template by name alone with no visual signal of layout, color scheme, or object arrangement.

The obvious fix — pre-generating JPEG thumbnails via the existing `/api/v1/templates/[id]/preview` Satori endpoint and storing them in R2 — was explicitly rejected. It would require a regeneration trigger (when? on template save? on brand change?), a storage path per template per format, and special handling for custom user templates that have no pre-generated asset. Any invalidation gap would show stale thumbnails silently.

The actual fix required one observation: **`CanvasRenderer` uses no Satori-specific APIs**. It is a pure React component that can be mounted directly in the browser DOM. That unlocks zero-roundtrip, always-current live thumbnails.

## Guidance

**Mount `CanvasRenderer` in the browser inside a `transform: scale()` wrapper.**

`CanvasRenderer` renders at native template dimensions (1200×675 for landscape). Use a `ResizeObserver` to measure the container and compute a scale factor. `transform: scale()` is preferred over the non-standard `zoom` property for Firefox compatibility.

```tsx
// src/components/kitchen/template-preview.tsx
const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 675;

export const TemplatePreview = memo(function TemplatePreview({ config, brand }: {
  config: CanvasTemplateConfig;
  brand: Brand;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;                             // safe early return, no non-null assertions

    const update = () => setScale(container.clientWidth / PREVIEW_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const objectData = buildSampleSlide(config, "landscape");

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      {scale > 0 && (
        <div style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, transformOrigin: "top left", transform: `scale(${scale})` }}>
          <CanvasRenderer
            config={config}
            format="landscape"
            objectData={objectData}
            brand={brand}
            showPlaceholders
          />
        </div>
      )}
    </div>
  );
});
```

**`showPlaceholders` prop** — added to `CanvasRendererProps` so visual image slots render as device-framed styled boxes (not broken `<img>` tags) when no image data is present. Defaults to `false` to leave the Satori and Remotion render paths unaffected.

**Sample brand for built-in templates** — a dedicated factory in `src/lib/preview-sample.ts` decouples the preview from the user's actively selected cooking brand:

```ts
export function buildBragfastSampleBrand(): Brand {
  return {
    name: "brag.fast",
    logoBase64: "/logo-icon.svg",   // URL is valid for browser <img src>
    website: "brag.fast",
    colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
  };
}
```

> ⚠️ **`logoBase64` naming caveat:** The field is named for Satori, which requires actual base64-encoded PNG data. The browser `<img src>` accepts both URLs and base64 strings, so a URL works safely here. **Never pass a URL string into the Satori render path** — it will fail silently or produce broken images in generated output.

**Per-tile brand selection** (inside `RecipeStep`):

```ts
// Module-level constant — buildBragfastSampleBrand() returns a plain object literal,
// no computation, no reason to useMemo. Move to module scope for zero cost.
const BRAGFAST_BRAND = buildBragfastSampleBrand();

// Per tile:
const previewBrand = t.isDefault ? BRAGFAST_BRAND : (userBrand ?? BRAGFAST_BRAND);
```

The brand used for the preview is intentionally independent of the brand selected for the actual cook. The picker shows each template with a consistent identity, not a preview of what the final output will look like with a specific brand combination.

**Consumer integration** (cook-page level):

```ts
// Cook-page: derive primary brand for preview from Convex brands list
const userBrandsRaw = useQuery(api.brands.listByUser, { userId });
const primaryBrand: Brand | undefined = userBrandsRaw?.[0]
  ? {
      name: userBrandsRaw[0].name,
      logoBase64: userBrandsRaw[0].logo_url ?? "",
      website: userBrandsRaw[0].website ?? "",
      colors: userBrandsRaw[0].colors,
      font_family: userBrandsRaw[0].font_family,
    }
  : undefined;

// Pass to RecipeStep — independent of state.brandId (cooking brand)
<RecipeStep templates={templates} selectedId={...} onSelect={...} userBrand={primaryBrand} />
```

## Why This Matters

**Correctness by construction.** A pre-generated thumbnail is a snapshot that drifts from the live template. Because `CanvasRenderer` is the same code path used in production rendering, the preview is definitionally correct — template changes reflect immediately in every picker tile on next render, with no cache flush, background job, or storage write.

**Zero infrastructure overhead.** Pre-generation would require: a storage path per template per format, a regeneration trigger with clear invalidation semantics, and special casing for custom user templates that exist in Convex but may have no pre-generated asset. The browser-mount approach is stateless — none of those surfaces exist.

**Parity for custom templates.** User-created templates stored in Convex get identical live previews automatically. No special case is needed because the same `CanvasRenderer` + `CanvasTemplateConfig` path is used regardless of template source.

**Note on font fidelity.** Browser font metrics differ slightly from Satori's. For pixel-exact typographic accuracy (WYSIWYG proof), a server-rendered thumbnail is more faithful. For layout and color differentiation in a picker, browser rendering is entirely sufficient.

## When to Apply

- You need to render a visual preview of a template defined by `CanvasTemplateConfig`
- The preview must stay in sync with the template definition without manual invalidation
- The rendering component uses only standard React (no Satori-only APIs, no `"use node"` imports, no server-only font loaders called at render time)
- You are rendering in a DOM context where `ResizeObserver` is available (client component, not RSC, not a Remotion composition)

**Do NOT apply** when the rendered output will be passed to Satori, saved to R2, or used in any automated pipeline — browser-rendered content is not a production artifact.

## Examples

**Before — every tile showed the same placeholder:**

```tsx
// RecipeStep thumbnail (before)
<div className="aspect-video w-full overflow-hidden">
  <div className="border-2 border-dashed border-brand/20 flex items-center justify-center h-full">
    <span className="text-[7px] text-brand/30">No preview</span>
  </div>
</div>
```

Five built-in templates and all custom templates showed an identical dashed box. No visual differentiation was possible without rendering a full cook.

**After — each tile is a live scaled render of the actual template:**

```tsx
// RecipeStep thumbnail (after)
<div className="aspect-video w-full mb-1 overflow-hidden border border-brand/10 bg-surface">
  <TemplatePreview config={t.config} brand={previewBrand} />
</div>
```

Each tile reflects the actual layout, color scheme, and object arrangement of its template — live, with no server roundtrip.

## Related

- `docs/solutions/best-practices/semantic-color-roles-2026-04-13.md` — any `CanvasRenderer` invocation (including live thumbnails) must use `resolveTextColor()` for correct text color resolution. Both docs reference `src/lib/templates/canvas-renderer.tsx`.
- `src/components/editor/motion-preview.tsx` — video preset preview uses the same `transform: scale()` pattern with Remotion's `<Player>` component. Related prior art in the codebase.
- `src/app/api/v1/templates/[id]/preview/route.ts` — the server-side Satori JPEG endpoint, which is the alternative approach that was not chosen for the picker.
