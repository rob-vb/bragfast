---
date: 2026-04-22
topic: homepage-redesign-sous-chef
---

# Homepage redesign around Sous-Chef

## Problem Frame

The current homepage (`src/app/page.tsx`) positions brag.fast as a visual generator with three equally-weighted cooking paths (Web, MCP, API). Image/video generation is increasingly commoditized; the durable differentiator is the **Sous-Chef agent** — an autopilot that watches connected integrations (GitHub PR merges, GitHub stars, Stripe, PostHog and GA4 soon) and drafts brag posts for the user to finish.

The homepage currently makes no mention of Sous-Chef, integrations, or goals. It also carries copy and CTAs written before the agent existed. Visitors cannot tell from the landing page that the product has autopilot at all.

The redesign must elevate the agent story without abandoning the two other core audiences: developers who want to cook manually in the web app, and developers who wire brag.fast into their own AI agent (MCP) or CI/CD (REST API). Bannerbear-style audience-specific sections are the structural reference; Linear / Raycast / Tailark provide mood only. Brand voice (NES-retro diner) stays.

## Requirements

**Hero (S1 — refresh copy, keep structure)**
- R1. Hero keeps split-grid layout, left column (headline + subheadline + primary CTA + microcopy), right column (`<HeroSocialStack />`). No structural change.
- R2. Headline stays "Show off your wins. Fast." with gold "Fast." accent.
- R3. Subheadline rewritten to name Sous-Chef while leading with wins. Working draft (final pass during R31 copy work): "Turn any win into branded images and video: a release, an MRR record, a stars milestone. You can do it yourself, or Sous-Chef drafts it for you." Must follow `BRAND_VOICE.md` rule banning em dashes (`—` or ` -- `); commas, colons, and short sentences only.
- R4. Primary CTA stays "Start bragging — free" → `/signup`. Microcopy "30 credits. No card required." stays.

**Audience sections (replace S2 "Three Ways to Cook")**
- R5. Remove the current S2 "Three Ways to Cook" three-card section entirely (lines 91–177 of `src/app/page.tsx`).
- R6. Add four vertically-stacked audience sections in this order, Bannerbear-style (alternating text-left/media-right, each full-width section with `border-b-2 border-brand` separator):
  1. **Sous-Chef (Agent)** — primary placement
  2. **Cook it yourself (Web app)**
  3. **Your AI as cook (MCP)** — absorbs the current S4 MCP setup block
  4. **Full control (REST API)**
- R7. Each audience section has: small eyebrow label (Press Start 2P 8–10px, gold accent), H2 headline, body paragraph, one inline CTA button, and one media/mock on the opposite side.

**Sous-Chef section (R6 section 1)**
- R8. Headline frames the agent outcome, not the mechanism. Proposed: "Your agent spots the win. You hit post." Subcopy covers: scans integrations, drafts automatically, user only needs to add a screenshot if relevant and cook.
- R9. Embed a new screen recording of the draft → cook → generate flow via `<LazyVideo>` (reuse the component from `src/components/landing/lazy-video.tsx`). Recording file lives in `public/demo/`. Frame it in a browser-chrome mock using the pattern currently in `src/app/page.tsx` around the Cook Demo block. Section must remain legible if the video never plays (see deferred poster-frame question).
- R10. Show an "Integrations" strip below the recording as **four pixel-bordered tiles** (`border-2 border-brand` + hard-offset shadow, one logo + label per tile). Order and status:
  - GitHub PR merges — Live
  - GitHub stars milestones — Live
  - Stripe milestones — Live
  - PostHog + GA4 — "Coming soon" badge (grouped in a single tile; admin currently supports both but homepage defers announcement)
- R10a. Section must be legible without the video playing. Requirements for the static state: (a) `<LazyVideo>` poster frame shows a representative still — ideally the drafts list with one agent-drafted card visible — not a black frame; (b) section H2 + subcopy + the integrations tiles must convey the Sous-Chef story on their own (what triggers a draft, who drafts it, what the user does next).
- R11. CTA: "Connect your first integration" → `/signup` (post-signup path leads to `/admin/sous-chef`).

**Cook it yourself section (R6 section 2)**
- R12. Headline: "Cook it yourself." Subcopy: drop screenshots/stats/recording → template → branded output in all three formats in under a minute. Keep the `16:9 / 1:1 / 4:5 / MP4` format pills from the current S3 block.
- R13. Media: reuse `/demo/bragfast_cook_demo.mp4` via `<LazyVideo>` inside the existing browser-chrome mock. This section effectively takes over the current S3 Cook Demo content.
- R14. CTA: "Make your first post" → `/signup`.

**Your AI as cook (MCP) section (R6 section 3)**
- R15. Headline frames MCP-as-autopilot-you-control. Proposed: "Your AI in the kitchen." Subcopy: works in Claude Desktop, Claude Code, any HTTP MCP client — ask, it renders.
- R16. Fold the existing `<McpInstallInstructions />` component into this section (currently rendered standalone in S4 at lines 245–267). Remove the standalone S4 section.
- R17. Keep the `https://mcp.brag.fast/mcp` URL display and the client picker UX from `<McpInstallInstructions />`.
- R18. CTA: a single action. Drop the duplicated "Install MCP" anchor pattern (anchor-to-self is a no-op once `<McpInstallInstructions />` is inlined in this section). See Outstanding Questions for the choice between "Read MCP docs" → `/docs`, "Copy install URL" (duplicates component UX), or omitting the CTA entirely.

**Full control (REST API) section (R6 section 4)**
- R19. Headline: "Wire it into anything." Subcopy: CI/CD, bots, your own app. POST data, get branded visuals back.
- R20. Media: code sample block in the current S2 API card's style (`POST /api/v1/cook/image` with a small JSON body peek). Consider a fuller multi-line curl snippet than the current one-liner.
- R21. CTA: "Read the docs" → `/docs`.

**Auxiliary sections (keep, refresh copy)**
- R22. Keep S5 Before/After section. Refresh headline and supporting copy only; component `<BeforeAfter />` unchanged.
- R23. Keep S6 Templates + Brand Kits split section. Refresh copy; components `<LazyVideo>` (template editor) and `<BrandKitMockup />` unchanged.

**Pricing, FAQ, CTA, Footer (targeted edits)**
- R24. Remove the "Sign-up bonus" strip from inside the pricing card (lines 344–353). The pricing card keeps its header, plan rows, and "Start with 30 Free Credits" CTA.
- R25. Remove the secondary "Install MCP" button from the final CTA block (lines 470–475). The final CTA block keeps only the "Start for free" primary button.
- R26. Add one FAQ entry about Sous-Chef: how it sees wins (connected integrations + webhooks + rolling scans), that the user approves every draft, and that integrations are opt-in.
- R27. Review all seven FAQ entries (the six existing plus the new Sous-Chef entry from R26) for tone consistency with the agent-forward narrative. No factual changes needed on the existing six (plan names, credit math, MCP clients all verified accurate).

**Metadata and SEO**
- R28. Update `metadata.description` (line 15) to name Sous-Chef and integrations explicitly, replacing the generic "AI agent" phrasing. Target ~155 chars.
- R29. Keep `metadata.title` as-is ("brag.fast | Show off your wins. Fast.") unless a stronger alternative is written during planning.
- R30. Keep the existing `SoftwareApplication` JSON-LD block.

**Copy pass (global)**
- R31. Rewrite all body copy on the homepage to: (a) name Sous-Chef where the agent story applies, (b) reference the real integrations (GitHub, Stripe) instead of generic "wins", (c) stay on diner voice per `BRAND_VOICE.md` (no em dashes, no SaaS jargon like "streamline/leverage/workflow", keep vocab: cook/plate/kitchen/recipe/menu/ingredients/Sous-Chef).
- R32. Remove any copy implying that wins are magically detected without the user connecting something first. Keep the trust/approval message that the user approves every post.

## Success Criteria

- Sous-Chef section H2 names the integration trigger + agent outcome in plain language; the four integration tiles are visible above the fold of that section on desktop.
- Each audience (DIY developer, agent-over-MCP developer, API developer) sees a section targeted at them with a clear CTA — none feels demoted to a footnote.
- The Sous-Chef section renders a legible static state when the recording never plays: poster frame is a meaningful still, and H2 + subcopy + integration tiles convey the story alone.
- The draft-to-generate screen recording loads lazily like the other `<LazyVideo>` embeds.
- "Install MCP" disappears from the footer CTA and from S2 (because S2 is gone). The only MCP install UI on the homepage is inside the "Your AI as cook" section.
- The sign-up bonus strip is gone from the pricing card; the bonus claim survives in the hero microcopy.
- The page still visually reads as the brag.fast NES-retro diner — no dark mode, no sans-serif headings, no rounded corners.
- No copy contains em dashes or banned vocab (enterprise, workflow, streamline, leverage, synergy).

## Scope Boundaries

- Not redesigning `<LandingNav>` or the footer chrome. Footer link list and "Feed your audience" tagline stay.
- Not redesigning the pricing table itself beyond removing the sign-up bonus strip. Plan data, order, "Popular" badge all unchanged.
- Not building new mock components. Reuse `<HeroSocialStack>`, `<BrandKitMockup>`, `<LazyVideo>`, `<McpInstallInstructions>`, `<BeforeAfter>`.
- Not touching `/pricing`, `/docs`, `/demo`, `/support`, `/terms`, `/privacy` pages. Copy consistency across these pages is out of scope for this redesign.
- Not designing new admin UI, not changing `/admin/sous-chef`, not shipping PostHog/GA4 out of "coming soon".
- Not moving Sous-Chef into the hero right column. `<HeroSocialStack />` stays there.
- Not adding testimonials, "Trusted by" logo strips, or social proof sections.
- Not building dark mode. Light mode only per `DESIGN.md`.

## Key Decisions

- **Positioning: renderer-first, agent-enhanced** — brag.fast's identity stays anchored in the "show off your wins" render story; Sous-Chef is the new front-section feature under that umbrella, not a repositioning. Reviewers flagged this as a hedge vs. an agent-first pivot; user chose to keep the hedge and evolve incrementally.
- **Sous-Chef leads but does not dominate**: the agent is the first audience section at peer visual weight with DIY/MCP/API. Decision driven by the user's note that manual generation is equally important, modeled on Bannerbear's per-audience sections.
- **Hero copy changes, hero structure doesn't**: the user explicitly wants to keep the hero's split layout and `<HeroSocialStack />`. Only the subheadline copy is rewritten. Accepted trade-off: hero will not be the load-bearing surface for the Sous-Chef story; the Sous-Chef section carries it.
- **Four audience sections, not three**: keep MCP and REST API as separate audience sections rather than merging into one "plug into your stack" block. User wants each developer persona addressed in its own frame.
- **MCP section absorbs existing install instructions**: reduces redundancy (today S2 card links down to S4 with the same "Install MCP" language). The new MCP audience section contains the installer inline; S4 is deleted.
- **Integration tiles show Coming Soon for PostHog + GA4 despite admin supporting them**: explicit product decision to defer public announcement until polish lands. This is not a mirror of admin reality; admin already allows connecting both. Homepage pacing drives the choice.
- **Integration strip treatment = four pixel-bordered tiles with logos**: resolved before recording capture so the recording's aspect ratio can be planned around the space the tiles leave.
- **Screen recording is the Sous-Chef section's hero media, but not load-bearing**: section must be legible without the video playing (R10a). The recording is proof-by-demo, not the primary explainer.
- **Sign-up bonus strip removed from pricing card**: redundant with the hero microcopy; the pricing card's own "Start with 30 Free Credits" CTA carries the bonus claim at the decision moment. Reviewers flagged this as an unforced trade; user kept the removal.
- **No measurement plan in this redesign**: ship and eyeball. Review in retrospect. Accepted risk: no learning mechanism for the positioning bet.
- **No social proof added**: testimonials, logos, and named-customer strips stay out of scope. Accepted risk: cold-traffic page continues without trust signals. Revisit when assets exist.
- **Trust/approval messaging lives in FAQ only**: the Sous-Chef section does not carry a trust microcopy line; the new Sous-Chef FAQ entry covers read-access, approval, and disconnect. Accepted trade-off: cautious visitors must scroll to find trust language.

## Dependencies / Assumptions

- New screen recording for the Sous-Chef draft-to-generate flow is on the user's todo (self-captured). Filename convention: `public/demo/sous-chef_drafts_compressed.mp4` to match the existing `bragfast_cook_demo.mp4` / `template_editor_compressed.mp4` pattern. Section must ship legibly without the recording playing (static poster frame + copy carries the story).
- **Correction on integration status (verified 2026-04-22):** `src/components/admin/sous-chef-client.tsx` has no `comingSoon` / `PROVIDER_COMING_SOON` flag. All non-GitHub providers (Stripe, PostHog, GA4) render identically via `IntegrationBlock` with a Connect button and a Connected/Off badge. Backends at `convex/integrations/{stripe,posthog,ga4}.ts` are all wired to goals and drafts. PostHog + GA4 are technically live in admin today. The R10 decision to label them "Coming soon" on the homepage is therefore a **product decision about polish/readiness**, not a mirror of admin reality. See Outstanding Questions.
- Plan names and credit amounts in `src/lib/plans.ts` verified — no FAQ factual updates required.
- No new design primitives needed. All sections reuse the existing `border-2 border-brand` + inline `shadow-[Npx_Npx_0_var(--color-brand)]` pattern from `src/components/admin/pixel-*.tsx`.

## Outstanding Questions

### Resolve Before Planning

_All resolved via Key Decisions._

### Deferred to Planning

- [Affects R18][User decision] MCP audience section CTA: "Read MCP docs" → `/docs`, "Copy install URL" (redundant with `<McpInstallInstructions />`), or omit. Narrow; resolve during copy drafting.
- [Affects R20][Technical] REST API section code sample: multi-line curl vs. JavaScript `fetch` — pick based on `/docs` tone. Include the real POST body shape, not decorative pseudo-code (AI-slop risk).
- [Affects R26][Technical] Exact FAQ wording for the new Sous-Chef entry — draft during copy pass.
- [Affects R31][Technical] Full homepage copy audit — draft all new/rewritten strings during planning so they can be reviewed together in one diff. Add per-section budgets (H2 ≤ 25 chars for Press Start 2P headline size, eyebrow ≤ 12 chars, body 20-45 words, CTA ≤ 28 chars) and one on-voice reference line per audience section to prevent generic SaaS drift (especially R19 REST API and R15 MCP subcopy, which are the highest AI-slop risk sections).
- [Affects R6, R7][Technical] Mobile stacking rule for alternating text-left/media-right sections, breakpoint where alternation collapses to single column, and integration-strip responsive behavior (2x2 grid vs. horizontal scroll vs. stacked list).
- [Affects R9, R13][Technical] Visual distinction between the two `<LazyVideo>` embeds so they don't read as the same demo. Options: different eyebrow colors, different browser-chrome tab title / URL bar, different aspect ratios, or a visible UI element unique to each recording (e.g., the drafts list as the opening frame of the Sous-Chef recording). Resolve before recording capture.
- [Affects R11, R14, R18, R21][Technical] Authenticated-visit behavior. The homepage currently ships the same view regardless of session. Decide: (a) keep identical for authed users, (b) swap audience-section CTAs to `/admin/sous-chef`, `/admin/kitchen`, `/admin/keys` respectively when session present. Check `<LandingNav>` for existing `authClient.getSession()` pattern.

## Next Steps

-> `/ce:plan` for structured implementation planning
