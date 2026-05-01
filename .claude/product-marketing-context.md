# Product Marketing Context

*Last updated: 2026-04-30*

## Product Overview
**One-liner:** Building in public, automated.
**What it does:** brag.fast watches what you ship — merged PRs on GitHub, revenue on Stripe, traffic on PostHog or GA, milestones you set yourself — and turns each win into a draft social post. Copy is written in your voice by AI. Visuals are generated, branded, and ready to post. You approve from your phone or browser; the post goes out through Buffer or Postiz. The user stays in build mode; the marketing happens in the background.
**Product category:** Build-in-public automation for solopreneurs.
**Product type:** SaaS (consumer subscription).
**Business model:** Monthly subscription with three tiers, priced on connected sources and posts per month. A "post" is one approved share, regardless of how many platforms or formats it renders into.

| Plan | Price | Sources | Posts/mo | Platforms per post | Formats per post | Video | Active goals | History |
|---|---|---|---|---|---|---|---|---|
| On the House (Free) | $0 | 1 (GitHub) | 30 lifetime | 1 | 1 (square) | No | 1 | 30 days |
| Toast | $12/mo | 1 (GitHub) | 30/mo | 1 (X or LinkedIn) | 1 (square) | No | 1 | 30 days |
| Full Plate | $29/mo | 3 (GitHub + Stripe + 1 of PostHog/GA) | 100/mo | 2 (X + LinkedIn) | 3 (square + landscape + portrait) | No | 5 | 1 year |
| Buffet | $79/mo | Unlimited | 500/mo | 2 (X + LinkedIn) | All | Yes (1 per post) | Unlimited | Forever (annual recap) |

Credits are NOT the consumer-facing pricing unit. Credits remain only on deprioritized API/MCP surfaces, which are no longer part of the public narrative.

## Positioning
brag.fast is **the build-in-public system for solopreneurs**. The product spine is: **trigger → generate → finish → hand off**. Every feature serves the loop.

This is not an image generator with integrations bolted on. It's a trigger graph that knows what's happening across the user's entire stack and produces one coherent draft post per moment. Rendering is the output stage; the trigger graph plus voice model plus history feed are the product.

The product is built around three moats that compound with use: the trigger graph as designed architecture, a per-user voice model trained on every approval, and an event history feed that becomes the user's institutional memory of their own building-in-public life.

## Target Audience
**ICP:** Solopreneurs and indie hackers who already believe building in public works, ship code on GitHub, run measurable side projects (revenue / traffic / users), and don't post enough — habit problem, not motivation problem.

**Specifically the user who says:**
- "I know I should post about this but I forget"
- "By the time I think about writing a post I'm already onto the next thing"
- "I love building, I hate marketing"

**Primary use cases:**
- "I just merged a PR and want a post about it without writing the post"
- "I just hit my MRR milestone — auto-celebrate it"
- "I want my GitHub activity to become my social presence with no extra effort"
- "I want to see my goals tracked and my progress posted when I hit them"

**Decision-makers:** The solopreneur themselves. No procurement, no committee, no IT review. One person, one card.

### Segments deprioritized (do not address in copy or features)
- **Marathon runners / Strava athletes** — different product, different motion. Removed from positioning.
- **Dev tool companies / DevRel teams** — multi-stakeholder buying, different needs. Removed.
- **AI agent builders integrating brag.fast as a tool** — real but premature; agent-driven creative spend is too small in 2026. Infrastructure stays shipping; public narrative does not.
- **"Scared to build in public" users (the #4 segment)** — real TAM, different product entirely. Deferred indefinitely.

### Anti-persona
- Non-technical marketers looking for a full design suite
- Teams or agencies that need approval workflows and roles
- Anyone who wants to post manually from scratch
- Designers looking for a creative tool

## Personas

| Persona | Role | Cares about | Why they signed up | What we deliver |
|---|---|---|---|---|
| **The shipper who never posts** | Solo dev / founder | Building, momentum | "I never get around to posting" | Auto-drafted posts from PR merges, one-click approve |
| **The milestone hitter** | Solo SaaS founder / operator | Revenue & traffic growth | Wants milestones celebrated without doing it themselves | Goal hero card + auto-post when threshold hit |
| **The accountability seeker** | Indie hacker building toward a public goal | Public progress | Wants the watching-the-numbers feeling without the social-media-grind | Goal progress visible daily, posts as artifacts |

## Problems & Pain Points
**Core problem:** Solopreneurs know building in public works. Most don't do it. The blocker is not motivation — it's friction. Three layers, in order of severity:

1. **Habit / trigger problem (#3):** They forget. They're deep in code. The moment passes. By the time they think to post, they're three things deep into the next thing.
2. **Production problem (#2):** Even when they remember, sitting down to write copy and make a visual is a 20-minute context switch they don't have.
3. **Ideation problem (#1):** When they do sit down, they don't know which of their wins is post-worthy or how to frame it.

brag.fast removes all three in a single flow:
- Trigger fires automatically (no remembering required)
- Haiku writes the copy in the user's voice (no production work required)
- Confidence-gated suppression filters non-post-worthy events (no ideation overhead)

The user stays in build mode. The marketing happens in the background.

**Why alternatives fall short:**
- **Generic design tools (Canva, Figma)** — require the user to remember, open, design, and finish. Solves zero of the three friction layers.
- **Schedulers (Buffer, Typefully, Postiz, Hypefury)** — start *after* the user already has a post drafted. They don't help with trigger, production, or ideation.
- **Manual posting + willpower** — the status quo. Demonstrably doesn't work for this audience, which is why this product exists.
- **Doing nothing** — the real competitor. Wins go uncelebrated, audiences stay quiet, momentum is wasted.

**What it costs them:** Real wins go uncelebrated. The audience never grows. The builder never gets credit. Twelve months of shipping disappears with no public record of what they built.

**Emotional tension:** "I know I should post about this." / "Sitting down to write a tweet about a PR merge isn't how my brain works." / "I wish someone would just do it for me."

## Competitive Landscape

**Direct (today): no one.** No competitor currently sells "trigger-driven build-in-public automation for solopreneurs." This is the unobstructed runway through Q3 2026.

**Adjacent / likely future competitors:**
- **Typefully, Tweet Hunter, Hypefury, Buffer, Postiz** — own the posting/scheduling layer. They could ship a "GitHub trigger → AI-written post" feature in 6-8 weeks once they see this as a market. Probable timeline: late 2026 / early 2027. The moats (trigger graph, voice model, history feed) are designed to be defensible by then.
- **Bannerbear and similar template-fill image APIs** — solve a different problem (humans wiring up Zapier-style flows). Not aimed at solopreneurs, no trigger layer, no voice model.

**Indirect:**
- **Canva, Figma** — manual design tools, not in our motion.
- **Doing nothing** — the largest competitor by user count.

## Differentiation
**What's actually defensible (the three pillars):**
- **Trigger graph as architecture** — cross-source orchestration, deduplication, goal coordination. When competitors ship "GitHub → AI post," they'll ship a flat integration. brag.fast knows what's happening across the user's whole stack and produces one coherent post per moment.
- **Per-user voice model** — every approval, edit, and skip is training signal. After 50-100 approvals, drafts sound meaningfully more like the user than any generic AI baseline. Cannot be cloned without rebuilding the same training loop and waiting months per user. Switching cost = "I lose my trained voice."
- **History feed as institutional memory** — every event the system saw, what it decided, what posted, what didn't, why. After six months, leaving brag.fast means losing six months of the builder's narrative.

**Surface differentiators (worth saying, not moats):**
- **Trigger-driven, not manual** — the system fires whether or not the user remembers
- **Confidence-gated quality** — silence when nothing is post-worthy, draft only when something is
- **Per-platform copy** — X copy is short and dry, LinkedIn copy is longer and narrative, both from the same trigger
- **Goals as the retention surface** — solopreneurs come back daily to watch progress, not just to approve posts
- **Hand-off to existing tools** — Buffer / Postiz / clipboard. We don't compete with the schedulers; we feed them.

**What is NOT a differentiator (do not lead with these):**
- Multi-format rendering (commodity)
- Video output (commodity)
- Custom templates / brand kits (commodity)
- The food-themed plan names (memorability tool, not a moat)
- "AI-powered" anything (vague, banned)

**Why customers choose us:** "I ship and the posts happen. I just approve them."

## Objections
| Objection | Response |
|---|---|
| "I can just use Buffer / Typefully" | Those need you to write the post first. brag.fast writes the post automatically when you ship. Then it hands off to Buffer or Postiz to schedule. |
| "Will it sound like me?" | Yes, after a few approvals. The voice model trains on every post you approve. By post 10 it sounds like you on a tired day. |
| "What if it writes something embarrassing?" | A pre-render filter blocks PRs containing sensitive content (security, client names, internal stuff). Confidence gating skips PRs that aren't post-worthy. The PR title and description are always shown on the approval screen so you see what the AI read. |
| "I don't have a brand" | Skip it. Your first posts use a sample brand so you can see the product working. Add yours when you're ready. |
| "What if I don't have anything to post?" | The system stays quiet on non-post-worthy PRs (you'll see them in the skipped history with confidence scores). When the week is too quiet, the Sunday digest aggregates what you did do. |
| "I'm not sure I want to post automatically" | You don't. Drafts wait for your approval. Buffer/Postiz handles the schedule, not us. |

## Switching Dynamics
**Push:** "I shipped something great and never posted about it." / "By the time I think to write a post I'm already onto the next thing."
**Pull:** "Brag.fast watches what I ship and writes the post. I just approve."
**Habit barrier:** "I've been getting by without posting." / "I'll do it later." Later never comes — which is exactly why automation is the wedge.
**Anxiety:** "Will it sound like me?" / "Will it post something I don't want public?" Both are addressed by voice calibration on approvals and by safety layers (sensitive-content filter, confidence gating, PR content visible at approval).

## Customer Language
**How they describe the problem:**
- "I shipped something great and never posted about it"
- "I love building, I hate marketing"
- "I know I should post more but I just don't"
- "By the time I think about writing a post I'm already three things deep into the next thing"

**How they describe brag.fast:**
- "It watches my GitHub and drafts the post for me"
- "I just approve it and it's done"
- "I ship code and posts appear"
- "It tracks my goals and posts when I hit them"

**Words to use:** ship, build in public, brag, win, milestone, goal, draft, approve, trigger, automate.
**Words to avoid:** content creation platform, marketing suite, design tool, no-code, "AI-powered" (vague), agent, MCP, agent-native, agent-hub. The agent narrative is removed from public surfaces. Footer "Developers" link only.

**Tone note on the name:** brag.fast sounds close to "breakfast." Keep a *light* diner/food hint in plan names (On the House / Toast / Full Plate / Buffet). Headlines and body copy stay metaphor-light. The product is about showing off, not about kitchens.

**Glossary:**
| Term | Meaning |
|---|---|
| Source | A connected integration that fires triggers (GitHub, Stripe, PostHog, GA, custom webhook) |
| Trigger | An event from a source that may produce a draft post (e.g. PR merged, MRR milestone hit) |
| Draft | An auto-generated post (copy + visual) waiting for user approval |
| Post | An approved draft, counted against the monthly limit |
| Goal | A user-defined milestone (revenue, users, traffic, custom) tracked toward auto-post |
| History feed | The visible log of every trigger the system saw, what it decided, what posted, what skipped |
| Brand kit | Saved brand config (color, logo) — optional; brag.fast sample brand applied as default |

## Brand Voice
**Tone:** Casual, confident, a little dry. Builder-to-builder. The "show off in a cool way, not a bragging-douchebag way" line. The retro NES gaming aesthetic supports the "bragging should feel like a reward for shipping, not a marketing chore" framing.
**Style:** Short punchy sentences. Honest, specific, no AI slop. Don't overclaim. No "zero effort" — there's *some* effort (you approve, you set goals). We're honest about it. Light diner/food hints only in plan names.
**Personality:** Playful, direct, action-oriented, builder-friendly. The product is a reward for shipping — not another chore.
**What we never sound like:** Corporate marketer. SaaS landing page generator. "AI-powered platform" anything. Agent-hub buzzword soup.

## Proof Points
**Value themes:**
| Theme | Proof |
|---|---|
| Triggers fire automatically | Every merged PR, Stripe event, PostHog goal — drafted without user action |
| Voice gets more like you | Few-shot trained on every approval; visible in Settings → Voice |
| Quality over volume | Confidence gating skips non-post-worthy events; you only approve what's worth posting |
| History stays | Every trigger logged with reasoning; six months in, your build-in-public archive lives in brag.fast |
| Hands off to your scheduler | Buffer or Postiz handles the post; brag.fast handles everything before |

**Metrics targets at +90 days post-launch:**
| Metric | Target |
|---|---|
| Preview-to-signup conversion | 20% |
| 10-minute activation | 60% |
| Week-4 retention of activated cohorts | 40% |
| Approval rate per generated draft | 60% |

These are public-facing only once we have data to show. Pre-launch, leave them out.

## Goals
**Business goal:** Convert free-tier signups to paid (Toast / Full Plate / Buffet) by demonstrating the loop within the first 10 minutes of activation.
**Conversion action (top of funnel):** Paste a public GitHub repo URL on the homepage to see a watermarked sample render. No signup required. The CTA below it: "Sign up to make this yours."
**Free trial:** "On the House" — 30 lifetime posts, no card required, single-format square only, watermark-free output (the watermark is only on unauthenticated previews).
**Strategic bet:** become the default automation layer between solopreneur activity (GitHub, Stripe, PostHog, GA) and existing scheduling tools (Buffer, Postiz). Own the trigger-to-draft step. Hand off the scheduling step.

## What's deliberately NOT in this product
- **Native posting / scheduling** — Buffer, Postiz, Typefully own this. We integrate, we don't compete.
- **A "scared to post" private mode** (the #4 segment) — different product, different funnel.
- **Public agent / MCP / API marketing** — infrastructure stays running, narrative is removed.
- **Streak gamification** — Duolingo guilt is wrong tone for this audience.
- **Marathon / Strava / fitness segment** — adjacent, deferred.
- **Multi-stakeholder team workflows** — solo product, single owner, single approver.

## Hand-off rules between brag.fast and other tools

| Job | Who owns it |
|---|---|
| Detecting brag-worthy moments | brag.fast |
| Writing the copy | brag.fast (Haiku, voice-calibrated) |
| Generating the visual | brag.fast (branded, multi-format per tier) |
| User approval | brag.fast |
| Scheduling and posting | Buffer / Postiz |
| Analytics on post performance | The user's social platform / scheduler |

The boundary is intentional. Cross it only when there's a clear reason to. So far, there isn't.