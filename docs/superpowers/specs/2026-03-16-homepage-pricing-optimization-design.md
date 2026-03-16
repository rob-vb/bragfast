# Homepage & Pricing Page Optimization — Design Spec

## Goal
Showcase Bragfast's USPs so visitors (both devs and non-technical stakeholders) immediately understand what the product does and why it matters.

## Constraints
- No video features (not in MVP)
- Keep retro/gaming aesthetic (pixel font headings, bold 2px borders, drop shadows)
- Keep existing food/cooking brand voice in all copy
- No new pages or component library — just expand existing pages
- Reuse existing components where possible (EditorMockup, HeroAnimation)

## Homepage Changes

### Current State
Homepage already has 3 alternating full-width sections: (1) REST API with curl mockup, (2) GitHub integration with 3-step flow diagram, (3) Template editor with EditorMockup. These are NOT a grid — they're already alternating left/right sections.

### Hero — unchanged
Keep "Show what you've been cooking" + terminal animation.

### Feature Sections — expand from 3 to 5, reorder, refresh copy

Reorder to match USP priority: API → Editor → GitHub → AI Analysis → Brand Kits.

#### Section 1: REST API (text left, visual right) — EXISTS, refresh copy
- **Headline:** "Developers, POST and receive" (keep existing — on-brand)
- **Copy:** Refresh to speak to both audiences. Devs: one API call. Stakeholders: automated branded visuals from any CI/CD pipeline.
- **Visual:** Keep existing curl mockup. Add output preview below it (3 format thumbnails: landscape/square/portrait) to show what comes back.
- **CTA:** "Read the Docs" (keep existing)

#### Section 2: Template Editor (visual left, text right) — EXISTS, move to position 2, refresh copy
- **Headline:** "Cook up your own templates" (food metaphor)
- **Copy:** No design skills needed. Drag objects, set colors, preview live. Every render uses your recipe automatically.
- **Visual:** Existing EditorMockup component (unchanged).

#### Section 3: GitHub Integration (text left, visual right) — EXISTS, move to position 3, refresh copy
- **Headline:** "Ship a release, we plate it" (keep existing — on-brand)
- **Copy:** Keep existing copy, it's solid. Emphasize zero-config and auto-approve options.
- **Visual:** Keep existing 3-step flow diagram (already retro style with steps + tags).

#### Section 4: AI Analysis (visual left, text right) — NEW
- **Headline:** "AI picks the best ingredients"
- **Copy:** Bragfast reads your changelog, categorizes changes (features, fixes, breaking), and generates a smart summary. Review before serving or let it run fully automated.
- **Visual:** New component — `AIAnalysisMockup`. Shows a stylized release card with:
  - Release title ("v2.4.0") at top
  - 3 category pills: "3 New Features" (gold bg), "5 Bug Fixes" (white bg), "1 Breaking Change" (brand bg, surface text)
  - 2-line AI summary text
  - Two action buttons: "Approve" (gold) and "Dismiss" (outline)
  - Retro style: 2px borders, drop shadow, pixel font for labels

#### Section 5: Brand Kits (text left, visual right) — NEW
- **Headline:** "Season everything to taste"
- **Copy:** Upload your logo, set your colors and fonts. Every image comes out on-brand, every time. No more off-brand release graphics cobbled together in Figma.
- **Visual:** New component — `BrandKitMockup`. Shows a stylized brand config panel:
  - Logo placeholder (square with border)
  - 4 color swatches in a row (brand-like hex circles)
  - Font name display ("Inter Bold")
  - Arrow or connector to a small output preview showing the brand applied
  - Retro style matching other mockups

### Footer — unchanged
### Pricing section — unchanged
### CTA section — unchanged

## Pricing Page Changes

### Hero — minor tweak
Sharpen subheading to give product context for direct-landing visitors. Keep food metaphor.

### New: Feature Showcase ("Everything on the menu")
Insert between hero and pricing cards. 3×2 grid of 6 feature cards.

Data lives inline in `src/app/pricing/page.tsx` (simple array, not worth a separate file for 6 items).

Cards:
1. **API Access** — Icon: `Terminal`. "One API call, three formats. Branded images in seconds."
2. **Template Editor** — Icon: `Palette`. "Design your own templates with the visual editor."
3. **GitHub Integration** — Icon: `GitBranch`. "Auto-generate visuals when you publish a release."
4. **AI Analysis** — Icon: `Sparkles`. "Smart changelog summaries and categorization."
5. **Brand Kits** — Icon: `Paintbrush`. "Your logo, colors, and fonts on every image."
6. **Multiple Formats** — Icon: `LayoutGrid`. "Landscape, square, and portrait in one render."

Each card: Lucide icon (24px) + Press Start 2P title (10px) + Geist Sans one-liner. Border-2, drop shadow, white bg.

### Pricing Cards — unchanged

### Feature Comparison Table — expand
Add new rows to `FEATURES` in `src/lib/pricing-data.tsx`:
- `{ name: "AI analysis", starter: false, pro: true, scale: true }`
- `{ name: "GitHub repos", starter: "1", pro: "5", scale: "Unlimited" }`
- `{ name: "Custom fonts", starter: false, pro: "5", scale: "Unlimited" }`

Note: "Brand kits" and "Webhooks" already exist in the table — don't duplicate.

### Credit Calculator — unchanged

### FAQ — expand
Add 2 new questions:
- "How does the GitHub integration work?" — Connect GitHub App → configure repos → releases auto-trigger renders → review or auto-approve.
- "What does AI analysis do?" — Reads your release notes, categorizes changes, generates a summary for your images. Available on Pro and Scale plans.

### Final CTA — unchanged

### Footer — add to match homepage
Add same footer component used on homepage (logo + tagline + Terms/Privacy links).

## New Components Needed
1. `AIAnalysisMockup` — for homepage section 4 (CSS-animated like EditorMockup)
2. `BrandKitMockup` — for homepage section 5 (CSS-animated like EditorMockup)

Note: GitHub flow diagram already exists. No new component needed for it.

## Out of Scope
- Video features / Remotion references
- New marketing pages
- Reusable component library
- Testimonials / social proof (future)
- HeroAnimation changes
