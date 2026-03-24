# Product Marketing Context

*Last updated: 2026-03-24*

## Product Overview
**One-liner:** brag.fast auto-generates branded social media images from your software releases.
**What it does:** One API call or GitHub integration turns your release notes into polished social images in landscape, square, and portrait formats. AI reads your changelog, picks the highlights, and renders branded visuals — ready to post immediately.
**Product category:** Developer marketing tools / release announcement automation
**Product type:** SaaS (API-first)
**Business model:** Usage-based credits with monthly subscriptions. 30 free credits (no card required), then Starter ($29/mo, 1,500 credits), Pro ($69/mo, 5,000 credits), Scale ($139/mo, 15,000 credits). 1 credit = 1 image in 1 format. Credits reset monthly, no rollover.

## Target Audience
**Target companies:** Software companies, open-source projects, indie hackers, startups, dev tool companies
**Decision-makers:** Developers, technical founders, DevRel, developer marketers
**Primary use case:** Automating the creation of branded social images whenever a new software release ships
**Jobs to be done:**
- "I just shipped a release and need social images to announce it"
- "I want branded visuals for every GitHub release without manual design work"
- "I need consistent social content across landscape, square, and portrait formats"
**Use cases:**
- API-driven: POST release data, receive branded images via webhook
- GitHub App: Publish a release, images auto-generated (review or auto-approve)
- Template editor: Customize visual templates with brand colors, logos, fonts

## Personas

| Persona | Role | Cares about | Challenge | Value we promise |
|---------|------|-------------|-----------|------------------|
| **Indie Hacker** (User + Buyer) | Solo founder / developer | Shipping fast, zero overhead | No design skills, no time for social content | Ship a release, images appear — zero manual work |
| **DevRel / Dev Marketer** (Champion) | Developer Relations / Developer Marketing | Consistent release content, audience engagement | Scaling social content across frequent releases | Branded, multi-format images for every release automatically |
| **Technical Founder** (Decision Maker) | CTO / Engineering Lead at startup | API-first tools, automation, team efficiency | Can't justify a designer for release graphics | One integration, whole team's releases get visual content |

## Problems & Pain Points
**Core problem:** Developers ship features but don't create social content to announce them — either because it's tedious, they lack design skills, or the process is too manual to sustain.
**Why alternatives fall short:**
- Generic design tools (Canva, Figma) require manual effort for every release
- Hiring a designer doesn't scale for frequent releases
- DIY scripts are fragile and produce inconsistent results
- Most tools aren't built for the developer workflow (CLI/API/GitHub)
**What it costs them:** Releases go unannounced, audience doesn't know what's new, marketing momentum dies between launches.
**Emotional tension:** "I know I should be posting about my releases, but I never get around to it."

## Competitive Landscape
**Direct:** Bannerbear ($49/mo for 1,000 images) — general-purpose image/video generation API with template designer, Zapier/Airtable integrations. Falls short because it's a generic template-filling tool: no AI changelog parsing, no GitHub-native trigger, no release-specific workflow. You still design templates manually and wire up data yourself.
**Secondary:** Canva, Figma — general design tools that require manual work per release
**Indirect:** Not announcing releases at all (the "do nothing" competitor)

## Differentiation
**Key differentiators:**
- API-first: one POST request generates all formats
- GitHub-native: zero-config integration that triggers on release publish
- AI-powered: Claude reads changelogs and extracts highlights automatically
- Multi-format: landscape, square, portrait in one call
- Branded: custom templates, colors, logos, fonts
**How we do it differently:** Built for the developer workflow — not a design tool you open, but an API you call or a GitHub App you install.
**Why that's better:** No context switching, no design skills needed, no manual work per release.
**Why customers choose us:** "I can just ship my release and the social images appear."

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use Canva" | You can — but will you do it for every release? brag.fast runs automatically. |
| "The images won't match my brand" | Custom templates, brand colors, logos, and fonts ensure brand consistency. |
| "I don't release often enough to justify it" | Start with 30 free credits. If you release monthly, even Starter covers you. |

**Anti-persona:** Non-technical marketers who want a drag-and-drop design tool. Teams that don't publish software releases. Companies that already have a dedicated design team producing release content.

## Switching Dynamics
**Push:** "I keep meaning to make social images for my releases but never do" / "Canva takes too long for every release"
**Pull:** Automated, branded, multi-format images from a single API call or GitHub release
**Habit:** "I've been getting by without release images" / "We already have a Canva workflow"
**Anxiety:** "Will the auto-generated images look good enough?" / "What if the AI misreads my changelog?"

## Customer Language
**How they describe the problem:**
- "I never get around to making social images for my releases"
- "I don't have design skills"
- "I want to automate my release announcements"
**How they describe us:**
- "It turns my releases into social images"
- "I just push a release and the images appear"
**Words to use:** ship, release, branded, auto-generate, social images, API, GitHub, formats
**Words to avoid:** content creation platform, marketing suite, design tool, no-code
**Glossary:**
| Term | Meaning |
|------|---------|
| Cook | Generate images (API endpoint is `/api/v1/cook`) |
| Credits | Usage units — 1 credit = 1 image in 1 format |
| Brand kit | Saved brand configuration (colors, logo, fonts) |
| Formats | Output dimensions: landscape (16:9), square (1:1), portrait (4:5) |
| Slides | Individual images in a multi-image release |

## Brand Voice
**Tone:** Casual, playful, confident
**Style:** Short punchy sentences. Food/cooking metaphors throughout ("show what you've been cooking," "feed your audience," "ship a release, we plate it," "ready to serve"). Technical but accessible — speaks developer without jargon overload.
**Personality:** Playful, developer-native, action-oriented, no-nonsense, slightly cheeky

## Proof Points
**Metrics:** (to be added as available)
**Customers:** (to be added)
**Testimonials:** (to be added)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Zero effort | GitHub App + auto-approve = no manual work |
| Brand consistency | Custom templates, colors, logos, fonts |
| Developer-native | REST API, webhook delivery, GitHub integration |
| Speed | Images generated in seconds, async with webhook notification |

## Goals
**Business goal:** Grow paid subscriptions by converting free trial users
**Conversion action:** "Get 30 Free Credits" (free trial signup, no card required)
**Current metrics:** (to be added)
