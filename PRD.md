# brag.fast — Product Requirements Document (MVP)

*"Feed your audience."*

---

## What is brag.fast?

An API-first service for indie hackers and developers. POST your release details to the API and get back branded images in multiple aspect ratios and a short animated video. Designed to plug directly into n8n, Zapier, CI/CD pipelines, or any automation flow.

One API call. A full plate of visual content.

---

## The Problem

Indie hackers ship features constantly but announcing them is painful. Every release needs visual assets: correctly sized images for different platforms, maybe a short video clip. Creating these manually means opening Figma or Canva, resizing, exporting, repeating. Most devs skip it entirely and post plain text. Great features get zero visibility.

---

## The Solution

A developer POSTs release details (title, description, screenshot, template choice) to the brag.fast API and receives back:

- **Branded images in up to 3 aspect ratios** (landscape, square, portrait) for every slide
- **A short animated video** stitching all slides together with motion

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

**Primary:** A fried egg where the yolk is a play button (triangle). Connects breakfast + video/media generation. Works at any size, distinct silhouette, recognizable as a favicon.

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
| `logo_url` | Yes | Logo image |
| `website` | Yes | URL shown on images |
| `colors.background` | Yes | Flat card background |
| `colors.text` | Yes | Title, description text |
| `colors.primary` | Yes | Accents, browser frame highlights, CTA elements |
| `font` | No | Any Google Font name. Defaults to `Inter` |

The font is fetched from Google Fonts CDN, converted to ArrayBuffer, and passed to Satori for rendering. Fonts are cached on the server after first fetch to avoid repeated lookups.

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
  "formats": ["landscape", "square"],
  "video": true,
  "video_format": "landscape",
  "webhook_url": "https://..."
}
```

| Field | Required? | What it does |
|-------|-----------|-------------|
| `brand_id` | Yes | Stored brand kit |
| `template` | No | `classic`, `split`, or `hero`. Defaults to `classic` |
| `slides` | Yes | Array of 1-5 slides |
| `slides[].title` | Yes | Headline text on image/video |
| `slides[].description` | No | Secondary text |
| `slides[].image_url` | No | Screenshot/image to embed |
| `formats` | No | Array of `landscape`, `square`, `portrait`. Defaults to all three |
| `video` | No | `true` or `false`. Defaults to `false` |
| `video_format` | No | `landscape`, `square`, or `portrait`. Defaults to `landscape` |
| `webhook_url` | No | Video delivery callback |

### Credit Cost Per Request

| Action | Cost |
|--------|------|
| 1 image (1 slide in 1 aspect ratio) | 1 credit |
| 1 video render | 3 credits |

Example: 2 slides, 2 formats, plus video = (2 × 2) + 3 = **7 credits**

The user controls their spend by choosing which formats to generate and whether to include video.

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
  "video": {
    "status": "rendering",
    "estimated_seconds": 20
  },
  "credits_used": 7,
  "credits_remaining": 793,
  "created_at": "2026-03-05T14:30:00Z"
}
```

Video delivered async via webhook:

```json
{
  "release_id": "rel_xyz789",
  "event": "video.ready",
  "video": {
    "url": "https://cdn.brag.fast/.../clip.mp4",
    "duration_seconds": 9,
    "dimensions": "1200x675",
    "format": "landscape"
  }
}
```

Images return in ~3-5 seconds. Video arrives via webhook 15-30 seconds later.

---

## Output Formats

The API returns each slide rendered in the requested aspect ratios. No platform logic — the user decides where to post each format.

| Format | Dimensions | Typical use |
|--------|-----------|-------------|
| Landscape | 1200x675 | X, LinkedIn, blog headers, OG images |
| Square | 1080x1080 | Instagram feed, Facebook, general purpose |
| Portrait | 1080x1350 | Instagram stories, Reels covers, TikTok |

Video is rendered in one format chosen by the user via `video_format`.

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

## Video Templates

Three animation styles. All use the same layout logic as image templates but with motion between slides. Each slide gets ~3 seconds. Ends with a branded outro frame (logo + product name + website).

### Video Template 1: "Slide"
Each slide's content slides in from right, previous exits left. Clean, professional.

### Video Template 2: "Stack"
Each slide is a card that drops in and stacks on top of the previous. Slight rotation/tilt for depth. Playful energy.

### Video Template 3: "Zoom"
Content scales up from center to full size per slide. More dramatic, good for launches.

User picks one video format for output:

| Format | Dimensions |
|--------|-----------|
| `landscape` | 1200x675 |
| `square` | 1080x1080 |
| `portrait` | 1080x1350 |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | API routes + dashboard in one project, Turbopack stable |
| Database | Convex | Real-time, brand kits, releases, usage tracking |
| Auth | Better Auth | API key management, user accounts |
| Image Gen | Satori + Sharp | JSX → SVG → PNG, supports embedded images via base64, custom Google Fonts |
| Video Gen | Remotion | React-based video, renders to MP4 server-side |
| Storage | Cloudflare R2 | S3-compatible, cheap, global CDN |
| Jobs/Queue | Convex scheduled functions | Video rendering queue |
| API Hosting | Vercel | API routes + dashboard |
| Video Rendering | Hetzner VPS | CPU-heavy Remotion rendering |
| Payments | Stripe | Subscription billing |

### Architecture Flow

```
POST /v1/release
    → Validate input + check API key
    → Calculate credit cost (images + video)
    → Check credits: trial balance or monthly plan allowance
    → Store release record in Convex
    → Load brand kit (colors, font, logo)
    → Fetch + cache Google Font (if not already cached)
    → Fetch screenshot(s) + logo → convert to base64
    → Generate images:
        → For each slide × requested formats = Satori (with font) → Sharp → PNG
        → Upload all to R2
    → If video requested:
        → Queue video render: all slides → Remotion on Hetzner → MP4
        → Upload to R2 → fire webhook
    → Decrement credits
    → Return image URLs immediately (~3-5s)
    → Video arrives via webhook (~15-30s later)
```

---

## Dashboard (Minimal MVP)

### Pages

1. **Home / "Kitchen"** — Stats (credits used, credits remaining), recent releases, quick actions
2. **Brand Kit / "Menu"** — Create/edit brand kits (logo, colors, font picker, website URL)
3. **Releases / "Order History"** — All generated releases with asset download links
4. **API Keys / "Keys to the Kitchen"** — Create, revoke, rotate API keys
5. **Billing** — Stripe customer portal, current plan, credit usage, upgrade prompts

Warm cream background, charcoal text, egg-yolk orange accents. Minimal and spacious. Brand kit page includes a Google Font search/picker with live preview.

---

## Pricing

### Credit Costs

| Action | Cost |
|--------|------|
| 1 image (1 slide in 1 aspect ratio) | 1 credit |
| 1 video render | 3 credits |

### Plans

| Plan | Price | Credits | Per credit | Brand Kits |
|------|-------|---------|-----------|------------|
| Trial | Free (no card) | 30 (one-time) | - | 1 |
| Starter | $39/mo | 800 | $0.049 | 1 |
| Growth | $79/mo | 2,000 / 3,000 / 4,000 | $0.040 - $0.035 | 5 |
| Scale | $149/mo | 5,000 / 7,500 / 10,000 | $0.030 - $0.025 | Unlimited |

### Usage Examples

**1 slide, all 3 formats, no video:** 3 credits
**1 slide, all 3 formats, with video:** 6 credits
**3 slides, all 3 formats, with video:** 12 credits
**1 slide, 1 format, no video:** 1 credit

### Trial Details

- No credit card required, just create an account
- 30 credits to use the full product (images + video, all templates)
- Credits don't expire but don't refill
- Once depleted: "Your plate is empty. Pick a plan to keep serving."

### Paid Plans

- Monthly subscription via Stripe
- Credits reset each billing cycle
- Growth and Scale have flexible credit selectors (dropdown to choose tier)
- Overage: hard limit, API returns 429 with upgrade prompt
- All plans include all templates, all formats, video, webhook support

---

## Automation Integrations

### n8n / Zapier

- **Zapier Action:** "Generate Release Assets" → POST /v1/release
- **Zapier Trigger:** "Release Assets Ready" → webhook when video completes
- **n8n:** HTTP Request node works natively with the API

### Example n8n Flow

1. GitHub Webhook (new release tag) →
2. HTTP Request to brag.fast /v1/release →
3. Webhook Wait (video completion) →
4. Post to X (landscape image) →
5. Post to LinkedIn (landscape image) →
6. Post to Instagram (square images as carousel) →
7. Slack notification with all asset links

### GitHub Action

```yaml
- name: Brag about this release
  run: |
    curl -X POST https://api.brag.fast/v1/release \
      -H "Authorization: Bearer ${{ secrets.BRAGFAST_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{
        "brand_id": "br_abc123",
        "template": "classic",
        "slides": [
          {
            "title": "${{ github.event.release.name }}",
            "description": "${{ github.event.release.body }}"
          }
        ],
        "formats": ["landscape", "square"],
        "video": true,
        "video_format": "landscape",
        "webhook_url": "${{ secrets.WEBHOOK_URL }}"
      }'
```

---

## Build Phases

### Phase 1: Visual Engine Prototype (Week 1)

No auth, no database, no storage, no billing. Just a local Next.js 16 app with API routes that accept JSON and return images. Prove the templates look good before building infrastructure.

- [ ] Next.js 16 project setup with Turbopack
- [ ] `POST /v1/release` endpoint (no auth, accepts JSON, returns local file URLs)
- [ ] Satori + Sharp pipeline working (JSX → SVG → PNG)
- [ ] Google Font loading working (fetch from CDN, convert to ArrayBuffer)
- [ ] Placeholder brand kit hardcoded in config (logo, colors, font, name)
- [ ] Placeholder screenshot image for testing
- [ ] **3 image templates built and working:**
  - [ ] Classic (text top, image bottom)
  - [ ] Split (side by side on landscape, stacked on square/portrait)
  - [ ] Hero (full bleed image, overlay, inverted text)
- [ ] **Each template renders in 3 aspect ratios:**
  - [ ] Landscape (1200x675)
  - [ ] Square (1080x1080)
  - [ ] Portrait (1080x1350)
- [ ] Multi-slide support (1-5 slides per request)
- [ ] Images saved locally to `/public/output/` and URLs returned in response
- [ ] No-image fallback working (text-only slides)
- [ ] `formats` field working (user picks which aspect ratios to generate)

**End result:** curl the endpoint with slide data, get back images locally, visually validate all 9 template/format combinations look right.

### Phase 2: Infrastructure + Full Image API (Week 2-3)

- [ ] Convex schema (brands, releases, assets, api_keys, credits)
- [ ] Better Auth setup + API key generation
- [ ] Brand kit CRUD endpoints (replace hardcoded config)
- [ ] Google Font caching layer (fetch once, cache on server)
- [ ] Image pipeline connected to Cloudflare R2 (upload + CDN URLs)
- [ ] Credit calculation and enforcement
- [ ] `POST /v1/release` returns CDN URLs instead of local files
- [ ] `GET /v1/release/:id` endpoint

### Phase 3: Video + Async (Week 4-5)

- [ ] Remotion project setup on Hetzner VPS
- [ ] 3 video animation templates (Slide, Stack, Zoom)
- [ ] Multi-slide stitching with ~3s per slide + outro frame
- [ ] Job queue: Convex schedules render → Hetzner processes → uploads to R2
- [ ] Webhook delivery when video is ready
- [ ] Retry logic for failed renders

### Phase 4: Dashboard + Billing (Week 6-7)

- [ ] Dashboard UI (brand kit form with Google Font picker, release history, API key management)
- [ ] Stripe integration (3 paid plans with flexible credit tiers)
- [ ] Trial credit system (30 credits on signup, decrement on use)
- [ ] Credit usage tracking + upgrade prompts
- [ ] Landing page on brag.fast

### Phase 5: Launch (Week 7-8)

- [ ] API documentation site
- [ ] n8n template workflow (downloadable JSON)
- [ ] GitHub Action example in docs
- [ ] Product Hunt launch
- [ ] Post on X, Indie Hackers, r/SideProject
- [ ] Meta-launch: generate brag.fast's own launch assets using brag.fast

### Phase 6: Post-Launch (Week 9+)

- [ ] Zapier app submission
- [ ] Additional templates
- [ ] Custom template builder (premium tier)
- [ ] GitHub App (auto-trigger on releases, zero config)

---

## Competitive Positioning

| Competitor | What they do | brag.fast difference |
|-----------|-------------|---------------------|
| Bannerbear | Generic image generation, you design templates | Zero design needed, pre-built templates, includes video |
| Clipcat | Turns existing video into clips | Generates video from text + images, no input video needed |
| Buffer/Hootsuite | Scheduling + posting | brag.fast is visual asset creation, not scheduling |
| Canva | Design tool | Manual, not API-first, no automation |

**One-line positioning:** "Bannerbear for indie hackers who don't want to design templates, with video included."

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