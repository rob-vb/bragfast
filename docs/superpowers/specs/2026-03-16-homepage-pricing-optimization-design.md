# Homepage & Pricing Page Optimization — Design Spec

## Goal
Showcase Bragfast's USPs so visitors (both devs and non-technical stakeholders) immediately understand what the product does and why it matters.

## Constraints
- No video features (not in MVP)
- Keep retro/gaming aesthetic (pixel font headings, bold 2px borders, drop shadows)
- No new pages or component library — just expand existing pages
- Reuse existing components where possible (EditorMockup, HeroAnimation)

## Homepage Changes

### Hero — unchanged
Keep "Show what you've been cooking" + terminal animation.

### Replace 3-feature grid with 5 full-width alternating sections

Each section: full-width, alternating text/visual sides (left-right, right-left pattern). Consistent layout component.

#### Section 1: REST API (text left, visual right)
- **Headline:** "Ship it with a single API call"
- **Copy:** One API call → multiple branded images. Devs love the simplicity, stakeholders love the automation.
- **Visual:** Enhanced terminal mockup showing request in, multiple format outputs out. Reuse image fan concept from hero.

#### Section 2: Template Editor (visual left, text right)
- **Headline:** "Design once, render forever"
- **Copy:** No design skills needed. Drag, customize, preview. Every render uses your template.
- **Visual:** Existing EditorMockup component (polish if needed).

#### Section 3: GitHub Integration (text left, visual right)
- **Headline:** "Push a release, get visuals"
- **Copy:** Connect repo → publish release → get branded images automatically. Zero manual work.
- **Visual:** Flow diagram mockup: GitHub release → Bragfast webhook → rendered outputs → status update. Retro style.

#### Section 4: AI Analysis (visual left, text right)
- **Headline:** "AI reads your changelog so you don't have to"
- **Copy:** Analyzes release notes, categorizes changes, generates smart summaries. Review or fully automate.
- **Visual:** Mockup of release with AI-generated summary — categories (New Features, Bug Fixes, Breaking Changes) + pending_review approval UI.

#### Section 5: Brand Kits (text left, visual right)
- **Headline:** "Your brand, every time"
- **Copy:** Upload logo, set colors + fonts. Every image matches brand identity automatically.
- **Visual:** Brand kit config mockup (logo + color swatches + font name) next to output examples.

### Pricing section — unchanged
### CTA section — unchanged

## Pricing Page Changes

### Hero — minor tweak
Sharpen subheading to give product context for direct-landing visitors.

### New: Feature Showcase ("Everything you need")
Insert between hero and pricing cards. Grid of 5-6 feature cards:
- API access
- Template editor
- GitHub integration
- AI analysis
- Brand kits
- Multiple output formats

Each card: icon + bold title + one-liner. Retro style (bold borders, drop shadows). Not full mockups — concise cards.

### Pricing Cards — unchanged

### Feature Comparison Table — expand
Add rows:
- AI analysis
- GitHub repos connected
- Custom font uploads
- Brand kit count
- Webhook support

Tell the upgrade story: why Pro > Starter, why Scale > Pro.

### Credit Calculator — unchanged

### FAQ — expand
Add questions addressing new features:
- "How does the GitHub integration work?"
- "What does AI analysis do?"
Review existing 6 for relevance.

### Final CTA — unchanged

## Visual Mockups Needed (new components)
1. GitHub flow diagram (Section 3)
2. AI analysis mockup (Section 4)
3. Brand kit mockup (Section 5)
4. Feature card grid (pricing page)

## Out of Scope
- Video features / Remotion references
- New marketing pages
- Reusable component library
- Testimonials / social proof (future)
