# Product Marketing Context

*Last updated: 2026-03-19*

## Product Overview
**One-liner:** Auto-generate branded social images for your launches
**What it does:** brag.fast takes release details via one API call or GitHub integration and outputs branded images in landscape (16:9), square (1:1), and portrait (4:5) — ready for social media in seconds. AI reads your changelog, categorizes changes, and generates smart summaries.
**Product category:** Social media image automation / release marketing
**Product type:** SaaS (API-first)
**Business model:** Credit-based monthly plans. 1 credit = 1 image in 1 format. Free trial (10 credits, no card), Starter $29/mo (800), Pro $109/mo (8,000), Scale $219/mo (40,000).

## Target Audience
**Target companies:** Solo developers, indie hackers, small dev teams, startups
**Decision-makers:** Founders, developers, DevRel, product managers
**Primary use case:** Automatically generating branded social images when shipping product updates
**Jobs to be done:**
- "I shipped something — now I need social images to announce it"
- "I want branded release graphics without opening a design tool"
- "I want my GitHub releases to automatically generate social images"
**Use cases:**
- CI/CD pipeline integration (POST from build scripts)
- GitHub release tagging → auto-generated images
- No-code template editor for non-technical users
- Brand kit enforcement across a team

## Problems & Pain Points
**Core problem:** Making social images for product updates is tedious — most indie hackers skip it entirely or cobble something together in Figma/Canva every time.
**Why alternatives fall short:**
- Canva/Figma: Manual, slow, breaks developer workflow
- Bannerbear: Not developer-first, no GitHub integration, no AI changelog analysis
- Doing nothing: Invisible launches, no audience engagement
**What it costs them:** Launches go unannounced. Audience doesn't know what you shipped. Time wasted context-switching into design tools.
**Emotional tension:** "I know I should share updates but making images is a chore I keep skipping."

## Competitive Landscape
**Direct:** Bannerbear — falls short because it's a design tool with an API bolted on, not developer-first. No GitHub integration or AI analysis.
**Secondary:** Canva, Figma — falls short because they're manual, break dev workflow, require design skills.
**Indirect:** Not sharing updates at all — falls short because invisible launches mean no audience growth.

## Differentiation
**Key differentiators:**
- API-first (not a design tool with an API afterthought)
- GitHub integration built-in (tag a release → get images)
- AI changelog analysis (auto-categorizes features/fixes/breaking changes)
- No-code template editor as fallback
- Credit-based transparent pricing
**How we do it differently:** Sits inside the developer workflow (CI/CD, GitHub) rather than pulling them into a design tool.
**Why that's better:** Zero friction — ship code, get images. No context switching.
**Why customers choose us:** Speed, automation, brand consistency without design skills.

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use Canva" | You can — but you won't. Every release. Bragfast runs automatically so you actually share every update. |
| "What if I run out of credits?" | API returns 429. Upgrade instantly, or pick a plan matching your release cadence. No surprise charges. |
| "Will the images look good?" | Brand kit enforces your colors/logo/fonts. Templates are designed for social. Preview before publishing. |

**Anti-persona:** Designers who want pixel-perfect control. Agencies needing complex multi-asset campaigns. Enterprise teams with existing DAM workflows.

## Switching Dynamics
**Push:** Frustration with manual image creation. Skipping launches because it's too much work. Inconsistent branding across releases.
**Pull:** Automation (set it and forget it). GitHub integration. AI-powered. Seconds not minutes.
**Habit:** "I've always just used Canva" or "I just don't share updates."
**Anxiety:** "Will the output quality be good enough?" "Is it worth adding another tool?"

## Customer Language
**How they describe the problem:**
- "I never get around to making social images for my releases"
- "I spend 30 minutes in Canva every time I ship something"
- "My launch posts look different every time — no brand consistency"
**How they describe us:**
- "It just makes the images for me when I push a release"
- "One API call and I'm done"
**Words to use:** ship, launch, release, branded, automated, fast, credits, cook
**Words to avoid:** enterprise, workflow management, asset management, DAM, creative suite
**Glossary:**
| Term | Meaning |
|------|---------|
| Cook | A render job — generating images from a release |
| Brand kit | Logo + colors + fonts configuration |
| Slide | One image within a release (a release can have multiple slides) |
| Credit | 1 image in 1 format |

## Brand Voice
**Tone:** Playful, approachable, developer-friendly
**Style:** Cooking/restaurant metaphor throughout (cook, plate, recipe, ingredients, kitchen, chef, menu). Direct and concise. Food puns welcome.
**Personality:** Fun, fast, no-nonsense, indie, retro

## Proof Points
**Metrics:** (early stage — to be added)
**Customers:** (early stage — to be added)
**Testimonials:** (early stage — to be added)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | Seconds, not minutes. One API call. |
| Automation | GitHub integration, AI analysis, hands-free mode |
| Consistency | Brand kits enforce colors/logo/fonts every time |
| Developer-first | API docs, curl examples, CI/CD integration |

## Goals
**Business goal:** Acquire early indie hacker customers, validate product-market fit
**Conversion action:** Sign up for free trial (10 credits, no card)
**Current metrics:** Pre-launch / early stage
