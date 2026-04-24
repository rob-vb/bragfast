---
date: 2026-04-22
topic: homepage-redesign-sous-chef
origin: docs/brainstorms/2026-04-22-homepage-redesign-sous-chef-requirements.md
destination: docs/plans/2026-04-22-003-feat-homepage-redesign-sous-chef-plan.md
status: draft
---

# Plan: Homepage redesign around Sous-Chef

## Context

Current homepage (`src/app/page.tsx`) positions brag.fast as a visual generator with three equally-weighted paths (Web, MCP, API) and never mentions Sous-Chef. The agent is the durable differentiator; image/video gen is commoditizing. This plan executes the requirements doc at `docs/brainstorms/2026-04-22-homepage-redesign-sous-chef-requirements.md` (R1-R32) to elevate Sous-Chef to the first of four equal-weight audience sections while preserving the NES-retro diner brand, the hero structure, and the renderer-first positioning.

Single-file work anchored in `src/app/page.tsx` plus a minor prop addition to `src/components/landing/lazy-video.tsx`. No new primitives, no admin changes, no pricing-table structural changes, no dark mode, no social proof.

## Origin Document Carryforward

- **Problem frame:** see origin §Problem Frame. Renderer-first, agent-enhanced — Sous-Chef is the front feature under the existing "show off your wins" identity.
- **Requirements:** R1-R32, grouped Hero / Audience sections / Sous-Chef / Cook-it-yourself / MCP / REST API / Aux / Pricing-FAQ-CTA / Metadata / Copy pass.
- **Key decisions preserved:** 4 audience sections at peer weight (Sous-Chef first); hero structure unchanged; MCP audience section absorbs the existing installer; integration tiles label PostHog+GA4 "Coming soon" as a product decision; signup-bonus strip removed from pricing; no measurement plan; no social proof; trust messaging lives in FAQ only.
- **Outstanding Questions:** all `Resolve Before Planning` items empty; `Deferred to Planning` resolved in §Deferred Questions Resolved below.

## Scope

**In:**
- Full rewrite of `src/app/page.tsx` section composition and copy
- Add `poster?: string` prop to `src/components/landing/lazy-video.tsx`
- Add one FAQ entry (R26) and refresh tone on existing six (R27) — no factual changes needed (plans/MCP clients verified)
- Update `metadata.description` (R28); keep title (R29) and JSON-LD (R30)
- Capture one new screen recording → `public/demo/sous-chef_drafts_compressed.mp4` + poster still `public/demo/sous-chef_drafts_poster.jpg` (user-supplied; plan is legible without it per R10a)

**Out:**
- `<LandingNav>`, footer chrome, pricing plan data, `/pricing`, `/docs`, `/demo`, `/support`, `/terms`, `/privacy`, any admin UI, PostHog/GA4 launch polish, new mock components, testimonials/logo strips, dark mode.

## Deferred Questions Resolved

Answering the `Deferred to Planning` questions from the origin doc so implementation does not stall:

1. **R18 — MCP section CTA:** Use **"Read MCP docs" → `/docs`**. "Copy install URL" duplicates the component's own UX; omitting breaks section parity with the three other audience sections that each have one CTA. `/docs` exists.
2. **R20 — REST API code sample:** Use a **multi-line `curl`** snippet with the real `POST /api/v1/cook/image` body shape (template, brand, data) already seen in `src/lib/pipeline/render.ts` and `src/app/docs`. No decorative pseudo-code.
3. **R26 — Sous-Chef FAQ wording:** Draft in §Copy Pass below.
4. **R31 — Full copy audit:** Complete per-section budgets in §Copy Pass (H2 ≤ 25 chars, eyebrow ≤ 12 chars, body 20-45 words, CTA ≤ 28 chars).
5. **R6/R7 — Mobile stacking:** Alternating text-left/media-right collapses to single column **below `md:` (768px)**, media always stacks below text (consistent reading order). Integration tiles (R10): `grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6` — 2×2 on mobile, 1×4 on desktop. No horizontal scroll.
6. **R9/R13 — Visual distinction between the two LazyVideo embeds:** (a) Sous-Chef recording's browser-chrome tab reads `brag.fast/admin/sous-chef`; Cook Demo reads `brag.fast/admin/kitchen`. (b) Different poster frames (drafts-list still vs. cook-demo first frame). (c) Different eyebrow colors are NOT used — keep eyebrow visually identical to preserve section rhythm; the tab title + poster + surrounding copy differentiate.
7. **R11/R14/R18/R21 — Authed-visit behavior:** Mirror `<LandingNav>` pattern — client-side `authClient.getSession()`, tri-state `null | false | true`, CTAs swap hrefs when `true`:
   - Sous-Chef CTA → `/admin/sous-chef` (was `/signup`)
   - Cook-it-yourself CTA → `/admin/kitchen` (was `/signup`)
   - MCP CTA → `/docs` (unchanged either way)
   - REST API CTA → `/docs` (unchanged either way)
   - Hero CTA + Final CTA → `/admin` when authed (was `/signup`), matching existing nav behavior
   - While `loggedIn === null`, render the signup href as placeholder (server-rendered default) to avoid layout shift.

## Implementation Units

Work flows top-down through the file. Each unit lists the line range to touch **before** edits (from the current file). All edits land in `src/app/page.tsx` unless noted.

### U1. Convert `page.tsx` to client-aware for auth-sensitive CTAs

**File:** `src/app/page.tsx` (entire file)

The page is currently a Server Component with `export const metadata` + JSON-LD. To support auth-aware CTAs per §Deferred Q7, extract the interactive CTAs into a small client component and keep the outer page server-rendered so metadata + JSON-LD work unchanged.

**Approach:** Create `src/components/landing/cta-link.tsx` (new):
```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function CtaLink({
  signedOutHref,
  signedInHref,
  children,
  className,
}: {
  signedOutHref: string;
  signedInHref: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    authClient.getSession().then((r) => setLoggedIn(!!r.data?.user));
  }, []);
  const href = loggedIn ? signedInHref : signedOutHref;
  return <Link href={href} className={className}>{children}</Link>;
}
```

Use `<CtaLink signedOutHref="/signup" signedInHref="/admin/sous-chef" ...>` in each audience CTA. Hero + Final CTA → `signedInHref="/admin"`. MCP + REST API CTAs stay plain `<Link href="/docs">`.

**Rationale:** Mirrors `src/components/landing/landing-nav.tsx:8-16` tri-state pattern without re-importing auth logic into page.tsx. Keeps page a server component so metadata/JSON-LD continue to work.

**Test scenarios (manual in dev):**
- Logged-out visit: hero CTA goes to `/signup`, Sous-Chef CTA → `/signup`, Cook-it-yourself CTA → `/signup`
- Logged-in visit: hero CTA → `/admin`, Sous-Chef → `/admin/sous-chef`, Cook-it-yourself → `/admin/kitchen`
- MCP + REST API CTAs always → `/docs` regardless of auth
- No visible layout shift during the auth resolution (href swap only)

### U2. Hero: refresh copy only (R1-R4)

**File:** `src/app/page.tsx` L51-88

**Keep:** split-grid `md:grid-cols-[1.1fr_1fr]`, decorative pixel grid bg, `<HeroSocialStack />` right column, headline "Show off your wins. Fast." with gold "Fast.", primary CTA "Start bragging, free" → `/signup` (was "Start bragging — free" — drop em-dash, use comma per BRAND_VOICE.md), microcopy "30 credits. No card required."

**Replace:** subheadline (currently L69 with two em-dashes). New copy:

> Turn any win into branded images and video: a release, an MRR record, a stars milestone. You can do it yourself, or Sous-Chef drafts it for you.

**CTA label change:** `"Start bragging — free"` → `"Start bragging, free"` (L76). Wrap in `<CtaLink>` per U1.

### U3. Remove S2 "Three Ways to Cook" (R5)

**File:** `src/app/page.tsx` L90-177

Delete the entire `<section>` including its preceding whitespace. Downstream four audience sections replace this block.

### U4. Add S2b Sous-Chef audience section (R6 §1, R7-R11, R10a)

**File:** `src/app/page.tsx` — insert immediately after the hero (where S2 used to be)

**Structure** (alternating pattern: text-left, media-right on `md:`, stacked below):

```tsx
<section className="border-b-2 border-brand bg-surface">
  <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24">
    <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-center">
      <div>
        <div className="font-[family-name:var(--font-press-start)] text-[9px] uppercase tracking-wider text-gold mb-4">Sous-Chef</div>
        <h2 className="font-[family-name:var(--font-press-start)] text-2xl md:text-3xl leading-[1.4] mb-6">Your agent spots the win. You hit post.</h2>
        <p className="text-brand/80 text-base md:text-lg leading-relaxed mb-8">
          {/* R8 subcopy — see Copy Pass */}
        </p>
        <CtaLink signedOutHref="/signup" signedInHref="/admin/sous-chef" className="inline-block ...">
          Connect your first integration
        </CtaLink>
      </div>
      <div>
        {/* browser-chrome frame wrapping <LazyVideo src="/demo/sous-chef_drafts_compressed.mp4" poster="/demo/sous-chef_drafts_poster.jpg" /> */}
        {/* reuse the chrome pattern from S3 L200-240 — url bar shows "brag.fast/admin/sous-chef" */}
      </div>
    </div>
    {/* Integration tiles — R10 */}
    <div className="mt-12 md:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {/* 4 tiles: GitHub PR merges, GitHub stars, Stripe milestones, PostHog + GA4 (Coming soon badge) */}
    </div>
  </div>
</section>
```

**Integration tile component** (inline in this section, not a new reusable; 4 uses):
```tsx
<div className="border-2 border-brand bg-white p-5 md:p-6 shadow-[4px_4px_0_var(--color-brand)] flex flex-col items-start gap-3">
  {/* logo: use simple-icons SVG or inline SVG, 32px */}
  <div className="font-[family-name:var(--font-press-start)] text-[11px] leading-[1.5]">GitHub PR merges</div>
  <span className="font-[family-name:var(--font-press-start)] text-[8px] uppercase px-2 py-1 border border-brand bg-gold/30">Live</span>
</div>
```
PostHog+GA4 tile shows both logos side-by-side and badge text "Coming soon" instead of "Live".

**R10a static legibility:** `<LazyVideo>` gets a `poster` prop (see U10). Poster file = drafts-list still. Section reads legibly even if the video never plays because: H2 names agent outcome, subcopy names triggers + user action, integration tiles show the 4 sources by name.

### U5. Add S2c "Cook it yourself" section (R6 §2, R12-R14)

**File:** `src/app/page.tsx` — insert after Sous-Chef section

**Approach:** Lift the existing S3 block (L179-242) content (the cook-demo video + format pills + surrounding copy) into this new section. Keep `id="kitchen"` on the section for the nav anchor. Alternate layout (media-left, text-right on `md:`) to create visual rhythm vs. Sous-Chef.

**Eyebrow:** "Web app"
**H2:** "Cook it yourself."
**Subcopy:** R12 — see Copy Pass.
**CTA:** "Make your first post" → `<CtaLink signedOutHref="/signup" signedInHref="/admin/kitchen">`.
**Media:** `<LazyVideo src="/demo/bragfast_cook_demo.mp4" poster="/demo/..." />` in browser-chrome frame; url bar "brag.fast/admin/kitchen".
**Format pills:** keep the `16:9 / 1:1 / 4:5 / MP4` pattern from current S3.
**Background:** `bg-white` to alternate against Sous-Chef's `bg-surface`.

### U6. Add S2d "Your AI as cook" (MCP) section (R6 §3, R15-R18)

**File:** `src/app/page.tsx` — insert after Cook-it-yourself

Alternate layout (text-left, media-right). Keep `id="mcp"` on the section for the existing `#mcp` anchor (currently referenced at L144 and L471; L144 disappears with S2 removal, L471 disappears with U8, but the anchor is free for future footer/nav use — retain for portability).

**Eyebrow:** "MCP"
**H2:** "Your AI in the kitchen."
**Subcopy:** R15 — see Copy Pass.
**Media column:** `<McpInstallInstructions />` — renders its own bordered card, fits the media slot cleanly without extra chrome.
**CTA:** "Read MCP docs" → `<Link href="/docs">` (plain, no auth swap per §Deferred Q7).
**Background:** `bg-surface` to alternate.

### U7. Add S2e "Full control" (REST API) section (R6 §4, R19-R21)

**File:** `src/app/page.tsx` — insert after MCP section

Alternate layout (media-left, text-right).

**Eyebrow:** "REST API"
**H2:** "Wire it into anything."
**Subcopy:** R19 — see Copy Pass.
**Media column:** `<pre>` block styled like the current S2 API card (`bg-brand text-surface p-5 border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] text-xs md:text-sm font-mono overflow-x-auto`) with a multi-line curl snippet:
```bash
curl https://brag.fast/api/v1/cook/image \
  -H "Authorization: Bearer $BRAGFAST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "standard-browser",
    "brand": "brand_abc123",
    "data": {
      "headline": "v2.0 shipped",
      "subhead": "30% faster renders"
    }
  }'
```
**CTA:** "Read the docs" → `<Link href="/docs">`.
**Background:** `bg-white`.

### U8. Remove standalone S4 MCP section

**File:** `src/app/page.tsx` L244-267

Delete entire section. Its content lives inside U6 now. Note: the `#mcp` anchor ID migrates to U6.

### U9. Remove S3 Cook Demo standalone block

**File:** `src/app/page.tsx` L179-242

Delete entire section after confirming its content is replicated in U5. The `id="kitchen"` anchor migrates to U5.

### U10. LazyVideo poster prop

**File:** `src/components/landing/lazy-video.tsx`

Add `poster?: string` to the props interface and pass it to the `<video>` element. No behavior change when undefined (existing callers unaffected).

```tsx
type Props = { src: string; className?: string; poster?: string };
// in <video ... poster={poster} />
```

**Test scenarios:**
- Existing callers (cook demo, template editor video) render unchanged (no poster = black pre-load frame as before)
- New Sous-Chef caller renders poster image before video loads, transitions to video on intersection

### U11. Pricing: remove signup-bonus strip (R24)

**File:** `src/app/page.tsx` L344-353

Delete only the signup-bonus strip. Pricing card header, plan rows, and "Start with 30 Free Credits" CTA remain. The primary CTA on the pricing card should also wrap in `<CtaLink signedOutHref="/signup" signedInHref="/admin/billing">` for auth consistency.

### U12. FAQ: add Sous-Chef entry + tone pass (R26-R27)

**File:** `src/app/page.tsx` L19-44

Append one entry to the `FAQ` array. Draft (R26):

```ts
{
  q: "How does Sous-Chef know what to post?",
  a: "You connect the integrations you want: GitHub for merges and stars, Stripe for revenue milestones, more coming. Sous-Chef scans them on a schedule, drafts a post when it spots a win, and waits for you to cook it. You approve every post. Disconnect any integration any time.",
},
```

Tone pass on existing six entries: scan each for em-dashes (L26 has one) and generic SaaS verbs. Fixes only — no factual changes (plan names + credit math + MCP clients verified in `src/lib/plans.ts`).

### U13. Final CTA: remove Install MCP secondary button (R25)

**File:** `src/app/page.tsx` L470-475

Delete the secondary `<Link>` to `#mcp`. Keep the primary "Start for free" CTA; wrap it in `<CtaLink signedOutHref="/signup" signedInHref="/admin">`.

### U14. Metadata description (R28)

**File:** `src/app/page.tsx` L15

Replace the current description. Draft (target ~155 chars):

> brag.fast turns your wins into branded images and video. Ship a release, hit an MRR milestone, gain stars, Sous-Chef drafts the post for you.

Count: ~148 chars. No em-dashes.

### U15. JSON-LD (R30)

No change. Confirm block still parses after section edits.

### U16. Copy Pass (R31-R32)

Full new/rewritten copy with budget compliance:

| Section | Element | Budget | Copy |
|---|---|---|---|
| Hero | Subheadline | 20-45 words | "Turn any win into branded images and video: a release, an MRR record, a stars milestone. You can do it yourself, or Sous-Chef drafts it for you." (26 words) |
| Hero | CTA | ≤28 chars | "Start bragging, free" (20) |
| Sous-Chef | Eyebrow | ≤12 chars | "Sous-Chef" (9) |
| Sous-Chef | H2 | ≤45 chars (Press Start 2P wraps poorly past this) | "Your agent spots the win. You hit post." (40) |
| Sous-Chef | Subcopy | 20-45 words | "Sous-Chef watches your connected integrations. When a PR merges, a milestone hits, or stars jump, it drafts a post with your brand, waiting for you to add a screenshot if you want and hit cook." (34 words) |
| Sous-Chef | CTA | ≤28 chars | "Connect your first integration" (30, tight, acceptable) — alt: "Connect an integration" (22) |
| Cook it yourself | Eyebrow | ≤12 chars | "Web app" (7) |
| Cook it yourself | H2 | ≤45 chars | "Cook it yourself." (17) |
| Cook it yourself | Subcopy | 20-45 words | "Drop a screenshot, a stat, or a screen recording. Pick a template. Get landscape, square, portrait, and video back, on brand, in under a minute." (26 words) |
| Cook it yourself | CTA | ≤28 chars | "Make your first post" (20) |
| MCP | Eyebrow | ≤12 chars | "MCP" (3) |
| MCP | H2 | ≤45 chars | "Your AI in the kitchen." (23) |
| MCP | Subcopy | 20-45 words | "Works in Claude Desktop, Claude Code, Cursor, any HTTP MCP client. Your agent calls brag.fast, gets a branded image or video back, and keeps working." (25 words) |
| MCP | CTA | ≤28 chars | "Read MCP docs" (13) |
| REST API | Eyebrow | ≤12 chars | "REST API" (8) |
| REST API | H2 | ≤45 chars | "Wire it into anything." (22) |
| REST API | Subcopy | 20-45 words | "Send your data to one endpoint. Get branded visuals back in every format. Drop it into CI, a bot, your own app, whatever you're building." (27 words) |
| REST API | CTA | ≤28 chars | "Read the docs" (13) |
| Metadata | Description | ~155 chars | (U14 copy above, 148 chars) |

**Banned-vocab sweep:** no `enterprise`, `workflow`, `streamline`, `leverage`, `synergy`, `seamlessly`, `robust`. Final grep pass after edits land.

**Em-dash sweep:** zero `—` or ` -- ` in the finished file. Final grep pass after edits land.

## File Paths Summary

Modified:
- `src/app/page.tsx` — sections, copy, metadata (primary work)
- `src/components/landing/lazy-video.tsx` — add `poster` prop

New:
- `src/components/landing/cta-link.tsx` — tiny auth-aware link wrapper
- `public/demo/sous-chef_drafts_compressed.mp4` — user-captured (blocking for full fidelity but plan is legible without it)
- `public/demo/sous-chef_drafts_poster.jpg` — poster still (extracted from first frame or drafts-list screenshot)

Unchanged (reuse only):
- `src/components/landing/social-card.tsx` (HeroSocialStack)
- `src/components/landing/mcp-install-instructions.tsx`
- `src/components/landing/before-after.tsx`
- `src/components/landing/brand-kit-mockup.tsx`
- `src/components/landing/landing-nav.tsx`

## Execution Order

1. U10 (LazyVideo poster prop) — isolated, no page.tsx dependency
2. U1 (CtaLink component) — blocker for U2, U4, U5, U11, U13
3. U14 (metadata) — cheap, do early
4. U2 (hero copy + CTA wrap)
5. U3, U8, U9 (delete S2, old S4, old S3) — as one pass so the file is small before additions
6. U4, U5, U6, U7 (add 4 audience sections in order)
7. U11 (pricing strip removal + CTA wrap)
8. U13 (final CTA simplification)
9. U12 (FAQ)
10. U16 (copy budget verification sweep + banned-vocab grep + em-dash grep)
11. U15 (confirm JSON-LD still parses)
12. User captures `sous-chef_drafts_compressed.mp4` + poster — land asset commit separately when ready

## Verification

**Local dev:**
- `npm run dev`, load `/` — logged out
- Inspect each of 4 audience sections: eyebrow, H2, subcopy, CTA, media present and correctly alternating on desktop
- Resize to <768px: alternation collapses, text always above media, integration tiles wrap 2×2
- Click each audience CTA → correct signup/docs destination
- Log in via `/login`, reload `/` — hero CTA, Sous-Chef CTA, Cook-it-yourself CTA, Final CTA, Pricing CTA all go to `/admin/*` destinations
- MCP + REST API CTAs go to `/docs` in both states
- Open FAQ, expand Sous-Chef entry, tone and facts check
- Pricing card: no signup-bonus strip, existing 30-free-credits CTA present
- Final CTA: single button only
- Sous-Chef LazyVideo: poster visible before scroll into view, video plays after

**Content checks (grep in `src/app/page.tsx`):**
- `rg '—|--' src/app/page.tsx` returns zero matches
- `rg -i 'enterprise|workflow|streamline|leverage|synergy|seamlessly|robust' src/app/page.tsx` returns zero matches
- `rg 'brag\.fast' src/app/page.tsx` — confirm product name spelling (never "bragfast" in prose per auto-memory)

**Visual fidelity:**
- Press Start 2P headings render, hard-offset shadows present, zero border-radius everywhere, light mode only
- Section backgrounds alternate `bg-surface` / `bg-white`
- Integration tiles show pixel borders + shadow offset, logos legible at mobile width
- Sous-Chef integration tiles "Coming soon" badge visually distinct from "Live" badges

**Build:**
- `npm run lint` clean
- `npm run build` succeeds (metadata + JSON-LD parse)
- No new `npx vitest run` coverage (pure UI/copy — no test additions required; existing tests unchanged)

**Document:**
- When execution finishes, move this plan to `docs/plans/2026-04-22-003-feat-homepage-redesign-sous-chef-plan.md` and flip `status: active`.

## Risks

- **Recording capture blocks full launch fidelity** — mitigated by R10a: section ships legibly with poster + copy alone. Record asset lands as a follow-up commit.
- **Auth-aware CTA flash** — `<CtaLink>` briefly shows signup href before session resolves. Matches existing `<LandingNav>` behavior; no visible layout shift (href-only change).
- **MCP section media weight** — `<McpInstallInstructions />` is a tall component; the media column will be taller than the text column. Acceptable — sets the MCP section's rhythm as "installer-first" which matches the audience's intent.
- **Four equal-weight sections → long page** — accepted trade-off per origin doc Key Decisions. Templates + Brand Kits and Before/After remain below to keep the renderer story present.
