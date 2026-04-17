# showcase-nes — Test Findings

## Render

- **Output:** `out.mp4`, 695 KB, 1080×1080, h264, 30 fps, 8.000s exact.
- **Command:** `npx hyperframes render --output out.mp4 --quality standard`
- **Workers:** 7 (auto, M4 10 cores), ~20s wall-clock on first render (font fetch + compile).
- **Lint:** 0 errors, 0 warnings.
- **Validate:** no console errors, 16 text elements pass WCAG AA.
- **Animation map:** `node .../animation-map.mjs` errored — missing `@hyperframes/producer` dep, not shipped with the skill. Not blocking. Visual QA via ffmpeg frame sampling (`frames/t*.jpg`) covered the same ground.

## Visual verdict

Hero frame (t ≈ 6.0s) nails bragfast brand language:
- Cream canvas (`#FFF8F0`), zero border-radius anywhere.
- Browser device with hard `8px 8px 0 #4A3326` offset shadow that *snaps* in at 0.9s — not a tween, exactly the bragfast NES card feel.
- Traffic dots as squares, brand brown. Pop staggered 80ms (`back.out(1.7)`) — reads as retro cursor blink.
- Title "SHIP A RELEASE" reveals L→R via `clip-path` + expo.out (Press Start 2P, 40px).
- Gold `#F8AF3C` underline swipes in after title lands.
- Subtitle "One API call. Nine formats." rises Geist-style.
- 3 screenshots cross-fade with parallax swap. Matches a "device showing product" story.

## What HyperFrames did well (vs current Remotion `showcase`)

1. **Clip-path reveals** — trivial in CSS, awkward in Remotion (requires per-frame interpolate on inset values).
2. **"Snap" frame-accurate events** via `tl.set()` — Remotion can do this but requires `interpolate` with step easing; GSAP timeline is more direct.
3. **Back.out / expo.out / sine.inOut** — single-word easing names; Remotion requires `Easing.bezier(...)`.
4. **Parallax swap** with `fromTo` + staggered tweens — readable timeline code, ~6 lines per swap.
5. **Font embedding** — compiler fetches + inlines Google Fonts deterministically. No `delayRender`/`continueRender` dance.

## Integration friction (for next branch)

| Concern | Observation |
|---|---|
| **Chrome dep** | `npx hyperframes render` spawns system Chrome per worker. 7 workers = 7 Chrome instances. Not viable inside existing Remotion Lambda. Needs own compute. |
| **Memory** | Doctor flagged 0.3 GB free of 16 GB on this machine — renders still completed. Production container would want ≥ 4 GB per worker. |
| **FFmpeg dep** | Required at runtime. Lambda layer or container base image must carry it. |
| **Dynamic HTML gen** | Bragfast slide data is `ObjectDataMap` keyed by template object IDs. For prod, we'd need an HTML generator that produces `index.html` from `TemplateObject[]` + `ObjectDataMap` + brand. Not hard — straight template literal — but is a new codegen layer. |
| **Asset plumbing** | HyperFrames expects local `./assets/*.jpg`. Bragfast pipeline holds image URLs or base64 blobs. Would need to write assets to a temp dir per render, then point HTML at them. |
| **Preset selection** | `AnimationPreset` is `'showcase' \| '3d-tilt-angles' \| 'simple-fade'`. Add `'hyperframes-nes'` (or similar slugs for other HyperFrames templates). `render-video.ts` branches: if preset is a HyperFrames slug, skip `renderVideo()` Lambda call entirely, run local/sidecar HyperFrames render instead. |
| **Non-blocking 404s** | 6 resource 404 warnings during render (likely favicon + meta). Did not affect output. Worth silencing before prod. |
| **Deployment target** | Remotion runs on Lambda. HyperFrames needs long-lived container (Chrome startup + ffmpeg encode). Candidates: Fly.io machine, ECS task, Convex `"use node"` is **not** viable (no Chrome, 10s timeout cap on actions). |

## Recommendation

Parallel pipeline works. Next steps, in order:

1. **Codegen** — write `src/lib/hyperframes/generate-html.ts` that takes `(config, format, slides, brand)` and emits `index.html` + `assets/*`. Reuse `ObjectDataMap` + `TemplateObject` types.
2. **Render worker** — standalone Node script or Fly machine that watches a job queue, pulls HTML + assets, runs `hyperframes render`, uploads MP4 to R2, pokes Convex. Not in the Next.js runtime, not in Convex.
3. **Preset registration** — add `'hyperframes-nes'` to `AnimationPreset` union (`src/lib/types.ts:40`). Add to `VALID_ANIMATION_PRESETS` (`:130`). Add metadata entry (`motion-presets/route.ts:10`).
4. **Dispatcher** — in `render-video.ts:86`, branch on preset prefix: `if (preset?.startsWith('hyperframes-')) { dispatchToHyperFramesWorker(...) } else { renderVideo(...) /* existing Lambda path */ }`.
5. **Remotion Studio preview** — `Root.tsx` won't show HyperFrames presets; provide a separate `hyperframes preview` workflow or embed a static MP4 preview.

## Files Produced

```
hyperframes/showcase-nes/
  DESIGN.md          # style prompt + palette + what-not-to-do
  index.html         # 1080x1080 single-comp, 8s, 30fps
  hyperframes.json   # project config (from init)
  meta.json          # project meta (from init)
  CLAUDE.md          # skill-usage contract (from init, untouched)
  AGENTS.md          # same (from init, untouched)
  assets/
    bragfast-logo.png
    screen-1.jpg     # copied from public/demo/standard-browser-inter-landscape.jpg
    screen-2.jpg     # copied from public/demo/split-browser-inter-landscape.jpg
    screen-3.jpg     # copied from public/demo/split-mobile-inter-landscape.jpg
  out.mp4            # 695 KB render
  frames/            # ffmpeg-extracted key-frame JPGs for QA
  NOTES.md           # this file
```

Root `package.json` gained `hyperframes` as devDependency. No changes under `src/`, `convex/`, or `src/remotion/`.
