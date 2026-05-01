# brag.fast

Build-in-public posts on autopilot.

brag.fast watches your GitHub repos, drafts a build-in-public post for every
merged PR, and queues it for review. You approve, edit, or skip. Approved
drafts go out to the channels you've connected (X, Buffer, Postiz).

The pitch: stop letting good shipping work go un-bragged because the
write-it-up tax is too high.

## How it works

1. Install the **brag.fast** GitHub App on the repos you care about.
2. Pick which repos send drafts (per-repo toggle on the Sous-Chef page).
3. Every merged PR triggers a draft, written by Haiku in your brand voice.
4. Drafts land in your kitchen. Approve to publish, edit to tweak,
   skip if it's not a brag-worthy ship.

That's it. No prompts to write, no copy to draft, no posting workflow to
remember.

## Getting started

- Sign up at [brag.fast](https://brag.fast).
- Connect a posting channel (X, Buffer key, or Postiz).
- Install the GitHub App, scope it to the repos you want covered.
- Wait for your next PR merge.

## Status

Pre-launch. Repositioning the surface from "image rendering API" to the
post-drafting product described above. Code-level capability still
includes image and video rendering — surfaced inside the kitchen, not as
a public API.

## Repo orientation

- `src/app/` — Next.js 16 App Router. Marketing pages, admin (kitchen),
  auth flows.
- `convex/` — schema + queries/mutations + scheduled drafting.
- `src/lib/pipeline/` — image and video render pipelines (Satori +
  Sharp; Remotion Lambda).
- `src/lib/github/` — GitHub App webhook handling and PR-merge → draft.
- `docs/` — PRD, sessions log, decisions ledger, conventions.

## Local dev

```bash
npm install
npm run dev      # Next.js
npm run build    # Convex codegen + Next.js build
npx vitest run   # tests
```

See `CLAUDE.md` for the full stack rundown and `DESIGN.md` / `BRAND_VOICE.md`
for the visual and copy system.
