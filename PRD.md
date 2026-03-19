# brag.fast — Product Requirements Document (MVP)

*"Feed your audience."*

---

## What is brag.fast?

An API-first service for indie hackers and developers. POST your release details to the API and get back branded images in multiple aspect ratios. Connect the GitHub App to auto-generate images from releases, or call the API directly from any pipeline.

One API call. A full plate of visual content.

---

## The Problem

Indie hackers ship features constantly but announcing them is painful. Every release needs visual assets: correctly sized images for different platforms. Creating these manually means opening Figma or Canva, resizing, exporting, repeating. Most devs skip it entirely and post plain text. Great features get zero visibility.

---

## The Solution

A developer POSTs release details (title, description, screenshot, template choice) to the brag.fast API and receives back:

- **Branded images in up to 3 aspect ratios** (landscape, square, portrait) for every slide

All using their stored brand colors, font, and logo. Zero design work. The user writes their own post copy — brag.fast only handles the visuals.

---

## Brand Identity

### Name & Domain

**brag.fast** — "brag fast" naturally evokes "breakfast." This double meaning is the brand: brag about your features, fast. Serve your audience something fresh every day.

### Taglines

- **Primary:** "Feed your audience."
- **Secondary:** "The most important meal of your launch." / "Serve your features fresh." / "Ship it. Brag it."

### Brand Voice

Warm, slightly playful, developer-friendly. Breakfast diner energy: welcoming, quick service, no pretension. The breakfast metaphor shows up in small moments, never forced.

- Dashboard greeting: "What are we serving today?"
- Empty state: "Your griddle is cold. Ship something and come back."
- After generating: "Served hot. Go feed your audience."
- API docs intro: "One API call. A full plate of visual content."
- Usage stats: "Meals served this month"
- Error state: "Something burned. Try again."
- Trial depleted: "Your plate is empty. Pick a plan to keep serving."

### Logo Concept

**Primary:** A fried egg where the yolk is a play button (triangle). Connects breakfast + media generation. Works at any size, distinct silhouette, recognizable as a favicon.

**Alternatives:**

- Toast popping from a toaster, where the toast is a social media card
- Coffee cup from above, coffee surface showing a play button ripple
- Breakfast plate with food items arranged as social platform icons

### Color Palette (brag.fast brand)

| Role | Color | Hex |
|------|-------|-----|
| Primary accent | Egg yolk orange | `#FFAA00` |
| Background | Warm cream | `#FFF8F0` |
| Text | Deep charcoal | `#1A1A1A` |
| Secondary | Crispy brown | `#8B4513` |
| Highlight | Butter yellow | `#FFE066` |

This is brag.fast's own brand palette. Users set their own brand colors via the Brand Kit.

### Typography

Rounded, friendly sans-serif (Plus Jakarta Sans, Nunito, or General Sans). Monospace for code in docs.

---

## Target User

Indie hackers and small dev teams who ship frequently, care about marketing their work, but don't want to spend time on design. Comfortable wiring up APIs and automation flows.

---

## Core API

### Brand Kit Setup (one-time)

```
POST /v1/brand
{
  "name": "Hoppa",
  "logo_url": "https://...",
  "website": "https://hoppa.app",
  "colors": {
    "background": "#FFF8F0",
    "text": "#1A1A1A",
    "primary": "#FF6B35"
  },
  "font": "Plus Jakarta Sans"
}
→ { "brand_id": "br_abc123" }
```

| Field | Required? | What it does |
|-------|-----------|-------------|
| `name` | Yes | Product name shown on images |
| `logo_url` | Yes | Logo image. Fetched and cached as base64 at brand creation/update time — not fetched on every render. |
| `website` | Yes | URL shown on images |
| `colors.background` | Yes | Flat card background |
| `colors.text` | Yes | Title, description text |
| `colors.primary` | Yes | Accents, browser frame highlights, CTA elements |
| `font` | No | Any Google Font name. Defaults to `Inter` |

The font is fetched from Google Fonts CDN, converted to ArrayBuffer, and passed to Satori for rendering. Fonts are cached on the server after first fetch.

### Generate Release Assets

```
POST /v1/release
{
  "brand_id": "br_abc123",
  "template": "classic",
  "slides": [
    {
      "title": "Workout Streaks",
      "description": "Never break the chain",
      "image_url": "https://..."
    },
    {
      "title": "Milestone Badges",
      "description": "Earn badges at 7, 30, and 100 days",
      "image_url": "https://..."
    },
    {
      "title": "Try Hoppa",
      "description": "hoppa.app"
    }
  ],
  "formats": ["landscape", "square"]
}
```

| Field | Required? | What it does |
|-------|-----------|-------------|
| `brand_id` | Yes | Stored brand kit |
| `template` | No | `classic`, `split`, or `hero`. Defaults to `classic` |
| `slides` | Yes | Array of 1-5 slides |
| `slides[].title` | Yes | Headline text on image |
| `slides[].description` | No | Secondary text |
| `slides[].image_url` | No | Screenshot/image to embed |
| `formats` | No | Array of `landscape`, `square`, `portrait`. Defaults to all three |

### Credit Cost

| Action | Cost |
|--------|------|
| 1 image (1 slide in 1 aspect ratio) | 1 credit |

Example: 3 slides, 2 formats = 3 × 2 = **6 credits**

The user controls their spend by choosing which formats to generate.

### Response

```json
{
  "release_id": "rel_xyz789",
  "images": {
    "landscape": {
      "slides": [
        "https://cdn.brag.fast/.../landscape-1.png",
        "https://cdn.brag.fast/.../landscape-2.png",
        "https://cdn.brag.fast/.../landscape-3.png"
      ],
      "dimensions": "1200x675"
    },
    "square": {
      "slides": [
        "https://cdn.brag.fast/.../square-1.png",
        "https://cdn.brag.fast/.../square-2.png",
        "https://cdn.brag.fast/.../square-3.png"
      ],
      "dimensions": "1080x1080"
    }
  },
  "credits_used": 6,
  "credits_remaining": 794,
  "created_at": "2026-03-05T14:30:00Z"
}
```

Images return in ~3-5 seconds.

---

## Output Formats

The API returns each slide rendered in the requested aspect ratios. No platform logic — the user decides where to post each format.

| Format | Dimensions | Typical use |
|--------|-----------|-------------|
| Landscape | 1200x675 | X, LinkedIn, blog headers, OG images |
| Square | 1080x1080 | Instagram feed, Facebook, general purpose |
| Portrait | 1080x1350 | Instagram stories, Reels covers, TikTok |

---

## Image Templates

Three templates, each adapts to all three aspect ratios. User's brand colors (`background`, `text`, `primary`), font, and logo are applied to all.

### Template 1: "Classic" — Text top, image bottom

```
Landscape (1200x675)         Square (1080x1080)        Portrait (1080x1350)
┌──────────────────────┐    ┌────────────────┐         ┌────────────────┐
│ [logo] Product Name  │    │ [logo]         │         │ [logo]         │
│                      │    │                │         │                │
│ TITLE                │    │ TITLE          │         │ TITLE          │
│ description          │    │ description    │         │ description    │
│ ┌──────────────────┐ │    │                │         │                │
│ │  screenshot      │ │    │ ┌────────────┐ │         │                │
│ │  in frame        │ │    │ │ screenshot │ │         │ ┌────────────┐ │
│ └──────────────────┘ │    │ │ in frame   │ │         │ │            │ │
└──────────────────────┘    │ │            │ │         │ │ screenshot │ │
                            │ └────────────┘ │         │ │ in frame   │ │
                            └────────────────┘         │ │            │ │
                                                       │ └────────────┘ │
                                                       └────────────────┘
```

### Template 2: "Split" — Text and image side by side

```
Landscape (1200x675)         Square (1080x1080)        Portrait (1080x1350)
┌──────────────────────┐    ┌────────────────┐         ┌────────────────┐
│ [logo]               │    │ [logo]         │         │ [logo]         │
│                      │    │                │         │                │
│ TITLE     ┌────────┐ │    │ TITLE          │         │ TITLE          │
│           │screen- │ │    │ description    │         │ description    │
│ descr.    │ shot   │ │    │                │         │                │
│           │in frame│ │    │ ┌────────────┐ │         │ ┌────────────┐ │
│           └────────┘ │    │ │ screenshot │ │         │ │            │ │
└──────────────────────┘    │ │ in frame   │ │         │ │ screenshot │ │
                            │ │            │ │         │ │ in frame   │ │
                            │ └────────────┘ │         │ │            │ │
                            └────────────────┘         │ └────────────┘ │
                                                       └────────────────┘
```

Split uses side-by-side layout on landscape. On square/portrait it stacks with different spacing than Classic.

### Template 3: "Hero" — Image fills background, text overlaid

```
Landscape (1200x675)         Square (1080x1080)        Portrait (1080x1350)
┌──────────────────────┐    ┌────────────────┐         ┌────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓ TITLE ▓▓▓▓▓▓▓▓▓▓▓▓│    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│         │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓ description ▓▓▓▓▓▓▓│    │▓▓ TITLE ▓▓▓▓▓▓│         │▓▓ TITLE ▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓ [logo]│    │▓▓ descr. ▓▓▓▓▓│         │▓▓ descr. ▓▓▓▓▓│
└──────────────────────┘    │▓▓▓▓▓▓▓▓ [logo]│         │▓▓▓▓▓▓▓▓ [logo]│
                            └────────────────┘         └────────────────┘
```

Screenshot as full bleed background. Overlay using `primary` color at ~70% opacity. Text in `background` color (inverted). No browser frame.

### When there's no image

If a slide has no `image_url`, all templates render a text-only layout: title + description centered on `background` color with `text` color. Logo in corner.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | API routes + dashboard in one project, Turbopack stable |
| Database | Convex | Brand kits, releases, usage tracking |
| Auth | Better Auth | API key management, user accounts |
| Image Gen | Satori + Sharp | JSX → SVG → PNG, supports embedded images via base64, custom Google Fonts |
| Storage | Cloudflare R2 | S3-compatible, cheap, global CDN |
| Payments | Stripe | Subscription billing |

### Architecture Flow

```
POST /v1/release
    → Validate input + check API key
    → Calculate credit cost (slides × formats)
    → Check credits: trial balance or monthly plan allowance
    → Load brand kit (colors, font, logo — logo already cached as base64)
    → Fetch + cache Google Font (if not already cached)
    → Fetch screenshot(s) → convert to base64
    → Generate images:
        → For each slide × requested formats = Satori (with font) → Sharp → PNG
        → Upload all to R2
    → Decrement credits
    → Return image URLs (~3-5s)
```

---

## Dashboard (Minimal MVP)

### Pages

1. **Home / "Kitchen"** — Stats (credits used, credits remaining), recent releases, quick actions
2. **Brand Kit / "Menu"** — Create/edit brand kits (logo, colors, Google Font picker, website URL)
3. **Releases / "Order History"** — All generated releases with asset download links
4. **API Keys / "Keys to the Kitchen"** — Create, revoke, rotate API keys
5. **Billing** — Stripe customer portal, current plan, credit usage, upgrade prompts

Warm cream background, charcoal text, egg-yolk orange accents. Minimal and spacious.

---

## Pricing

### Credit Cost

| Action | Cost |
|--------|------|
| 1 image (1 slide in 1 aspect ratio) | 1 credit |

### Plans

| Plan | Price | Credits | Brand Kits | Rate Limit |
|------|-------|---------|------------|------------|
| Trial | Free (no card) | 10 (one-time) | 1 | 10/min |
| Starter | $29/mo | 1,500 | 3 | 30/min |
| Pro | $69/mo | 5,000 | 10 | 60/min |
| Scale | $139/mo | 15,000 | Unlimited | 120/min |

### Usage Examples

**1 slide, all 3 formats:** 3 credits
**3 slides, all 3 formats:** 9 credits
**3 slides, 1 format:** 3 credits
**5 slides, 2 formats:** 10 credits

### Trial Details

- No credit card required, just create an account
- 10 credits to use the full product (all templates, all formats)
- Credits don't expire but don't refill
- Once depleted: "Your plate is empty. Pick a plan to keep serving."

### Paid Plans

- Monthly subscription via Stripe
- Credits reset each billing cycle
- Growth and Scale have flexible credit selectors (dropdown to choose tier)
- Overage: hard limit, API returns 429 with upgrade prompt
- All plans include all templates and all formats

---

## GitHub Integration

### GitHub App

Install the brag.fast GitHub App, select repos, and configure per-repo settings. Every time a release is published, brag.fast automatically:

1. Receives the webhook from GitHub
2. AI analyzes the changelog and picks key highlights
3. Generates branded images using your brand kit and template
4. Holds images for review — or auto-approves if configured

### Per-Repo Configuration

- Brand kit selection
- Template choice
- Output formats (landscape, square, portrait)
- Tag filters (only trigger on matching tags)
- Skip pre-releases toggle
- Auto-approve toggle (skip review, generate and publish immediately)
- Max slides per release

### Review Flow

When auto-approve is off, generated images land in a "Pending Reviews" queue in the dashboard. Users can:

- **Approve** — publish the images
- **Edit** — modify AI-suggested content before generating
- **Dismiss** — skip the release

---

## Build Phases

### Phase 1: Visual Engine Prototype (Week 1)

No auth, no database, no storage, no billing. Just a local Next.js 16 app with API routes that accept JSON and return images. Prove the templates look good before building infrastructure.

- [x] Next.js 16 project setup with Turbopack
- [x] `POST /v1/release` endpoint (no auth, accepts JSON, returns local file URLs)
- [x] Satori + Sharp pipeline working (JSX → SVG → PNG)
- [x] Google Font loading working (fetch from CDN, convert to ArrayBuffer)
- [x] Placeholder brand kit hardcoded in config (logo, colors, font, name)
- [x] Placeholder screenshot image for testing
- [x] **3 image templates built and working:**
  - [x] Classic (text top, image bottom)
  - [x] Split (side by side on landscape, stacked on square/portrait)
  - [x] Hero (full bleed image, overlay, inverted text)
- [x] **Each template renders in 3 aspect ratios:**
  - [x] Landscape (1200x675)
  - [x] Square (1080x1080)
  - [x] Portrait (1080x1350)
- [x] Multi-slide support (1-5 slides per request)
- [x] Images saved locally to `/public/output/` and URLs returned in response
- [x] No-image fallback working (text-only slides)
- [x] `formats` field working (user picks which aspect ratios to generate)

**End result:** curl the endpoint with slide data, get back images locally, visually validate all 9 template/format combinations look right.

### Phase 2: Infrastructure + Full Image API (Week 2-3)

- [x] Convex schema (brands, releases, assets, api_keys, credits)
- [x] Better Auth setup + API key generation
- [x] Brand kit CRUD endpoints (replace hardcoded config)
- [x] Google Font caching layer (fetch once, cache on server)
- [x] Image pipeline connected to Cloudflare R2 (upload + CDN URLs)
- [x] Credit calculation and enforcement
- [x] `POST /v1/release` returns CDN URLs instead of local files
- [x] `GET /v1/release/:id` endpoint

### Phase 3: Dashboard + Billing (Week 4-5)

- [ ] Dashboard UI (brand kit form with Google Font picker, release history, API key management)
- [ ] Stripe integration (3 paid plans with flexible credit tiers)
- [x] Trial credit system (10 credits on signup, decrement on use)
- [ ] Credit usage tracking + upgrade prompts
- [ ] Landing page on brag.fast
- [ ] Developer docs site (reference: https://developers.bannerbear.com — clean sidebar nav, endpoint docs with request/response examples, code snippets)

### Phase 4: Launch (Week 5-6)

- [x] GitHub App integration (auto-trigger on releases)
- [ ] Product Hunt launch
- [ ] Post on X, Indie Hackers, r/SideProject
- [ ] Meta-launch: generate brag.fast's own launch assets using brag.fast

---

## Backlog (Post-MVP)

- [ ] **Video generation** — Remotion-based animated videos from slides (Slide, Stack, Zoom animation styles), async rendering via Hetzner VPS, webhook delivery, 3 credits per video render
- [ ] Additional image templates
- [ ] Custom template builder (premium tier)
- [ ] n8n / Zapier integration (HTTP Request works natively with the API)

---

## Competitive Positioning

| Competitor | What they do | brag.fast difference |
|-----------|-------------|---------------------|
| Bannerbear | Generic image generation, you design templates | Zero design needed, pre-built templates |
| Buffer/Hootsuite | Scheduling + posting | brag.fast is visual asset creation, not scheduling |
| Canva | Design tool | Manual, not API-first, no automation |

**One-line positioning:** "Bannerbear for indie hackers who don't want to design templates."

---

## Success Metrics (First 90 Days)

| Metric | Target |
|--------|--------|
| Trial signups | 100 |
| Trial → paid conversion | 10% |
| Paying customers | 10 |
| Total credits consumed | 5,000+ |
| MRR | €500 |
| Viral moment | 1 brag.fast-generated post gets 100+ engagement |

---

## Marketing Ideas

- **"The Morning Drop" newsletter:** Weekly email showcasing the best brag.fast-generated assets from the community
- **Meta-launch:** Generate all of brag.fast's own launch assets using brag.fast
- **Breakfast merch:** Stickers with the egg-play-button logo
- **"What's cooking" changelog:** Public changelog using breakfast metaphors
- **X content series:** "Breakfast of champions" — showcase indie hacker releases made with brag.fast
- **Community collabs:** Bonus trial credits for WIP.co, IndieHackers, Buildspace members