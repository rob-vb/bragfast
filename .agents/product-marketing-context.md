# Product Marketing Context

*Last updated: 2026-04-17*

## Product Overview
**One-liner:** brag.fast turns your software releases into branded social images and videos — fast.
**What it does:** Open the Cook page, drop in screenshots, pick a template, hit Cook — branded images or video come out in landscape, square, and portrait. Also usable via MCP in Claude Desktop/Code ("make release images for v2.1"), via REST API for CI/CD automation, or via GitHub App for hands-off release triggers. Video uses the same branded slides with animated transitions, rendered as MP4 at 30fps via Remotion + AWS Lambda.
**Product category:** Developer marketing tools / release announcement automation
**Product type:** SaaS (API-first)
**Business model:** Usage-based credits with monthly subscriptions. Credits: 1 per image per format, 5 per video per format. Plans:
- **On the House (Free):** 30 credits, no card required
- **Toast (Starter):** $12/mo, 200 credits, 3 brand kits, 30 req/min
- **Full Plate (Pro):** $29/mo, 800 credits, 10 brand kits, 60 req/min, priority support
- **Buffet (Scale):** $79/mo, 2,500 credits, unlimited brand kits, 120 req/min, priority support
Credits reset monthly, no rollover. All plans include video gen, custom templates, GitHub integration, AI analysis, webhooks, CDN hosting.

## Target Audience
**Target companies:** Software companies, open-source projects, indie hackers, startups, dev tool companies
**Decision-makers:** Developers, technical founders, DevRel, developer marketers
**Primary use case:** Automating the creation of branded social images and videos whenever a new software release ships
**Jobs to be done:**
- "I just shipped a release and need social images and video to announce it"
- "I want branded visuals for every GitHub release without manual design work"
- "I need consistent social content across landscape, square, and portrait formats"
- "I want a short branded video for my release without touching a video editor"
**Use cases (ordered by importance):**
- **Cook page (primary):** Visual UI at `/cook` — drop in screenshots, pick template + brand, hit Cook. Images or video out in seconds. Fastest path to first render, zero setup.
- **MCP in Claude Desktop / Claude Code (secondary):** Install once, then generate through conversation — "make release images for v2.1". No UI, no API calls. Especially easy setup in Claude Desktop.
- **REST API (for automation):** POST release data, receive branded images and/or video via webhook. For developers wiring brag.fast into CI/CD, bots, or their own tooling.
- **GitHub App (nice extra):** Publish release → images and video auto-generated (review or auto-approve). Low usage today — treat as bonus, not hero capability.
- **Template editor:** Visual canvas editor with drag positioning, Google Fonts, device frames, per-object video animations (entrance: fade-in, slide-up, bounce; exit: fade-out, slide-down, bounce; Ken Burns).

## Personas

| Persona | Role | Cares about | Challenge | Value we promise |
|---------|------|-------------|-----------|------------------|
| **Indie Hacker** (User + Buyer) | Solo founder / developer | Shipping fast, zero overhead | No design skills, no time for social content or video | Ship a release, images and video appear. Zero manual work. |
| **DevRel / Dev Marketer** (Champion) | Developer Relations / Developer Marketing | Consistent release content, audience engagement | Scaling social content (images + video) across frequent releases | Branded, multi-format images and video for every release |
| **Technical Founder** (Decision Maker) | CTO / Engineering Lead at startup | API-first tools, automation, team efficiency | Can't justify a designer or video editor for release content | One integration, whole team's releases get visual content |

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
- **Cook page speed:** upload screenshots, pick template, hit Cook → images or video out in seconds. No design tool, no learning curve.
- **MCP in Claude Desktop / Code:** install in one command, then generate through conversation. Uniquely easy AI-native entry point.
- **Video from the same pipeline:** same templates, same brand kit — get MP4s without touching a video editor.
- **Multi-format out of one action:** landscape, square, portrait in a single render.
- **API for automation:** POST endpoint for developers who want CI/CD or bot integration.
- **Visual template editor:** canvas-based drag positioning, Google Fonts, device frames, per-object video entrance/exit animations.
- **Branded:** custom templates, colors, logos, fonts.
- **GitHub App (bonus):** zero-config trigger on release publish for teams that want full hands-off.
**How we do it differently:** Built for the developer workflow — a fast UI when you want it, Claude when you're already there, API when you want to automate.
**Why that's better:** No context switching, no design skills needed, no manual work per release.
**Why customers choose us:** "I can post release visuals in under a minute without opening Figma."

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use Canva" | You can — but will you do it for every release? brag.fast runs automatically. |
| "The images won't match my brand" | Custom templates, brand colors, logos, and fonts ensure brand consistency. |
| "I don't release often enough to justify it" | Start with 30 free credits. If you release monthly, even Starter covers you. |
| "Video is too expensive in credits" | 5 credits per video per format. One video in all 3 formats = 15 credits. Starter gives you 800/mo. |

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
| Cook | Generate images/video (API endpoint is `/api/v1/cook`) |
| Credits | Usage units. Images: 1 credit per image per format. Video: 5 credits per video per format. |
| Brand kit | Saved brand configuration (colors, logo, fonts) |
| Formats | Output dimensions: landscape (16:9), square (1:1), portrait (4:5) |

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
