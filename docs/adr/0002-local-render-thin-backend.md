# Local render, thin backend

Rendering moves off the server and onto the user's machine: the CLI renders images with Satori/Sharp and video with Remotion's local (headless-Chrome) renderer. There is no Remotion Lambda and no server-side render pipeline. The hosted backend is reduced to storing templates/brands/drafts, handling auth and billing, and proxying scheduling. A rendered file is uploaded to R2 **only at schedule-time**, because a posting Provider needs a public URL — never at render-time.

## Considered options

- **Keep server render (current pipeline)** — central control and a thin client, but per-render compute cost (Lambda for video) and the server is on the critical path for every preview.
- **Local render (chosen)** — zero server render cost, instant local iteration, and it fits a CLI tool that already runs Node on the user's machine. The existing CanvasRenderer/Satori logic is relocated into the CLI package rather than rewritten.

## Consequences

- The existing `src/lib/pipeline/render*` server code is repurposed into a shared render core the CLI imports; the cook API routes are no longer the render path.
- First run is heavy: Remotion downloads a headless Chrome, Sharp ships native binaries, and fonts must bundle into the CLI package.
- Video render cost/latency becomes the user's CPU time, not our bill.
- Cross-aspect-ratio auto-derive (author one format, derive the rest) uses an anchor + shorter-side-scale strategy, with per-format manual nudge as the quality safety net.
