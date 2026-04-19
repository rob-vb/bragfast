# Product Marketing Context

*Last updated: 2026-04-19*

## Product Overview
**One-liner:** brag.fast turns any win into branded social images and videos — for you, or for your AI agent.
**What it does:** Drop in data (screenshots, stats, a screen recording, a release note), pick a template and brand, hit render — out comes a branded image and/or MP4 video in landscape, square, and portrait. Usable by humans via the web app, by AI agents via MCP (Claude Desktop / Claude Code), by any app or CI/CD pipeline via REST API, and by GitHub repos via the GitHub App. Same pipeline, same outputs, whether a person or an agent calls it.
**Product category:** Social content generation / agent-native creative layer
**Product type:** SaaS (API-first, agent-native)
**Business model:** Usage-based credits with monthly subscriptions. Credits: 1 per image per format, 5 per video per format. Plans:
- **On the House (Free):** 30 credits, no card required
- **Toast (Starter):** $12/mo, 200 credits, 3 brand kits, 30 req/min
- **Full Plate (Pro):** $29/mo, 800 credits, 10 brand kits, 60 req/min, priority support
- **Buffet (Scale):** $79/mo, 2,500 credits, unlimited brand kits, 120 req/min, priority support
Credits reset monthly, no rollover. All plans include video generation, custom templates, GitHub integration, AI analysis, webhooks, CDN hosting.

## Positioning
brag.fast is the **visual layer for brag-worthy moments** — and an **agent-native platform** for generating them. Think Salesforce's agent hub, but for branded social content: agents, APIs, and MCP clients plug in to produce images and video on demand. Humans use the same platform through the web app.

Two equally valid entry points:
1. **Humans** who want branded posts without opening a design tool.
2. **Agents** that need to generate visual content as part of a larger workflow (release announcements, milestone posts, weekly recaps, creator tools).

## Target Audience
**Broad thesis:** anyone who wants to show off on social media in a cool, non-arrogant way, and either (a) doesn't want to design it manually, or (b) wants an agent to do it for them.

**Target segments (ordered by current focus):**
- **Indie hackers & solo builders** — release announcements, MRR milestones, user-count screenshots, launch-day numbers
- **Software teams & dev tool companies** — consistent branded release content across frequent shipments
- **Creators & athletes** — runners with Strava PRs, fitness milestones, training logs, race finishes
- **SaaS founders & operators** — revenue milestones, user-growth graphs, investor-update snippets
- **AI-agent builders** — anyone building workflows that need to emit branded visuals (social agents, marketing automations, newsletter generators)

**Decision-makers:** Founders, solo builders, DevRel, developer marketers, agent/app developers integrating brag.fast as a tool.

**Primary use cases:**
- "I just shipped a release and need social images and a video to announce it"
- "I hit a new MRR record — I want a branded graphic for Twitter/LinkedIn"
- "I just PR'd my marathon — give me a cool shareable from my Strava stats"
- "I'm building an agent that posts weekly updates and needs to generate visuals"
- "I want branded visuals for every GitHub release with zero manual work"
- "I want consistent social content across landscape, square, and portrait formats"

**Entry points (ordered by importance):**
- **Web app (primary):** drop in the inputs, pick template + brand, render. Fastest path to first result, zero setup.
- **MCP for agents (strategic):** install once in Claude Desktop or Claude Code, then generate through conversation. Uniquely easy AI-native entry point — and the foundation of the agent-hub positioning.
- **REST API (for automation and custom agents):** POST data, receive branded images and/or video. For any agent, bot, CI/CD pipeline, or app outside the Claude ecosystem.
- **GitHub App (bonus):** release published → images/video auto-generated. Low usage today, treat as a niceity, not a hero capability.
- **Template editor:** visual canvas editor with drag positioning, Google Fonts, device frames, per-object video animations.

## Personas

| Persona | Role | Cares about | Challenge | Value we promise |
|---------|------|-------------|-----------|------------------|
| **Indie Hacker** | Solo founder / developer | Shipping fast, low overhead | No design skills, no time for social content | Drop inputs, get branded images and video |
| **Creator / Athlete** | Runner, hobbyist, personal-brand builder | Sharing milestones, looking good on socials | Tools like Canva take too long, results look generic | Point-and-render: paste stats, get a shareable |
| **SaaS Founder** | Founder / operator | MRR growth, public narrative | Wants to post milestones consistently without becoming a designer | Branded milestone posts in under a minute |
| **DevRel / Dev Marketer** | Developer Relations | Consistent release content, engagement | Scaling social across frequent releases | Branded, multi-format images and video for every release |
| **Agent Builder** | Engineer integrating brag.fast into an AI workflow | A reliable tool call that returns a branded image/video | Image/video generation inside agent flows is fiddly | One MCP or API integration, predictable branded output |

## Problems & Pain Points
**Core problem:** People have brag-worthy moments — a shipped release, a revenue milestone, a marathon time, a 10k-user screenshot — and know they *should* post about it. But building a branded visual for every one is tedious, and most tools assume a human opening a design canvas. Meanwhile, AI agents that want to produce visual content as part of a workflow have no clean, branded, multi-format way to do it.

**Why alternatives fall short:**
- Generic design tools (Canva, Figma) require manual effort per post and aren't callable by agents
- Hiring a designer doesn't scale and doesn't fit agent workflows
- Image/video generation APIs (Bannerbear and similar) are template-fill tools for humans wiring up Zapier, not a clean agent-callable surface
- DIY scripts are fragile and produce inconsistent results

**What it costs them:** Wins go unposted, audiences stay quiet, agents can't emit visual output, and brand consistency suffers.

**Emotional tension:** "I should be posting about this, but I'm not going to open Canva again." / "I want my agent to just produce the image."

## Competitive Landscape
**Direct:** Bannerbear ($49/mo for 1,000 images) — general-purpose image/video generation API with template designer. Falls short for our audience: no AI-native agent surface (no MCP), no conversational entry point, template-heavy setup, not positioned for the "show off" use case.
**Secondary:** Canva, Figma — general design tools. Manual, not agent-callable, not multi-format-in-one-shot.
**Indirect:** Not posting at all (the "do nothing" competitor).

## Differentiation
**Key differentiators:**
- **Agent-native from day one:** MCP for Claude Desktop / Claude Code, plus REST API — a first-class tool call for any agent, not an afterthought.
- **Platform positioning:** brag.fast is a layer that agents, APIs, and apps connect to, not just a human design tool with an API bolted on.
- **Broad brag-worthy input support:** releases, milestones, stats, screenshots, screen recordings — not just software changelogs.
- **Speed:** branded image or video in under a minute, zero design tool.
- **Video from the same pipeline:** same templates, same brand kit — MP4 out without touching a video editor.
- **Multi-format out of one action:** landscape, square, portrait in a single render.
- **Visual template editor:** drag positioning, Google Fonts, device frames, per-object video entrance/exit animations.
- **Branded:** custom templates, colors, logos, fonts.
- **GitHub App (bonus):** zero-config release trigger for teams that want full hands-off.

**How we do it differently:** The same render pipeline is exposed equally to a person in a web app, an AI agent in Claude, and a script in CI. One platform, many callers.

**Why customers choose us:** "Any win I have, I can turn into a good-looking post in under a minute — or my agent can do it for me."

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use Canva" | You can — but will you, every time? brag.fast renders in under a minute. And Canva can't be called by an agent. |
| "The images won't match my brand" | Custom templates, brand colors, logos, and fonts. Every render follows the layout you built. |
| "I don't post often enough to justify it" | Start with 30 free credits. Most users find more brag-worthy moments than they expected. |
| "Video is too expensive in credits" | 5 credits per video per format. One video in all 3 formats = 15 credits. Toast gives you 200/mo. |
| "Why would an agent need this?" | Agents that post, summarize, or announce need visual output. brag.fast is the branded image/video layer they can call. |

**Anti-persona:** Non-technical marketers looking for a full drag-and-drop design suite. Teams that don't post to social. Designers who want a creative tool, not a generate-and-ship pipeline.

## Switching Dynamics
**Push:** "I keep meaning to post about my wins but never get around to it" / "I'm building an agent and need branded visuals and there's nothing clean for that"
**Pull:** Automated, branded, multi-format images and video from a single call — human or agent.
**Habit:** "I've been getting by without posting" / "We already have a Canva workflow"
**Anxiety:** "Will the output look on-brand?" / "Will the AI misread my inputs?"

## Customer Language
**How they describe the problem:**
- "I never get around to making a post about this"
- "I don't have design skills"
- "I want my agent to just produce the image"
- "I hit a milestone and want something to share"
**How they describe us:**
- "It turns my wins into branded posts"
- "I paste stuff in, it gives me a shareable"
- "My agent calls it and gets back an image"

**Words to use:** show off, win, milestone, brag, ship, release, branded, agent, MCP, API, formats, post.
**Words to avoid:** content creation platform, marketing suite, design tool, no-code, "AI-powered" (vague).

**Tone note on the name:** "brag.fast" sounds close to "breakfast" — we keep a *light* diner/food hint in plan names (On the House / Toast / Full Plate / Buffet) but avoid leaning hard on cooking metaphors in headlines, body copy, or CTAs. The product is about showing off, not about kitchens.

**Glossary:**
| Term | Meaning |
|------|---------|
| Cook | Internal/API term for a render (endpoint is `/api/v1/cook`). Not a customer-facing metaphor anymore. |
| Credits | Usage units. Images: 1 credit per image per format. Video: 5 credits per video per format. |
| Brand kit | Saved brand configuration (colors, logo, fonts) |
| Formats | Output dimensions: landscape (16:9), square (1:1), portrait (4:5) |

## Brand Voice
**Tone:** Casual, confident, a little cheeky. Fun without being arrogant — the "show off in a cool way, not a bragging-douchebag way" line.
**Style:** Short punchy sentences. Honest, specific, no AI slop. No overclaiming ("zero effort" is off the table — there's *some* work, we're honest about it). Light diner/food hints only in plan names; headlines and body copy stay metaphor-light.
**Personality:** Playful, direct, action-oriented, builder-friendly, no-nonsense.

## Proof Points
**Metrics:** (to be added as available)
**Customers:** (to be added)
**Testimonials:** (to be added)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | Branded visuals in under a minute |
| Brand consistency | Custom templates, colors, logos, fonts |
| Agent-native | MCP for Claude Desktop / Code, REST API, webhooks |
| Breadth of input | Releases, milestones, stats, screenshots, screen recordings |
| Multi-format | Landscape, square, portrait in one render |

## Goals
**Business goal:** Grow paid subscriptions by converting free-trial users across both human and agent-driven workflows.
**Conversion action:** "Get 30 Free Credits" (free trial signup, no card required).
**Strategic bet:** become the default visual layer that agents call when they need branded social content — while staying a great human tool.
