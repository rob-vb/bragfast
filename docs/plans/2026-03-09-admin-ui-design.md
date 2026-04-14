# Admin UI Design

## Visual Language

**Style:** Pixel arcade diner — sharp corners, chunky borders, 8-bit energy.

**Fonts:**
- Press Start 2P — headings, labels, stat numbers, nav tabs
- Geist — body text, table data, form inputs (readability)

**Colors:**
- `#F8AF3C` — accent orange (buttons, active states, highlights)
- `#4A3326` — text brown (headings, body, borders)
- `#FFF8F0` — cream background

**UI Primitives:**
- No border-radius anywhere — sharp corners only
- 2px solid `#4A3326` borders on cards/buttons
- Offset box-shadows (`4px 4px 0 #4A3326`) for depth — pixel drop shadow
- Buttons: solid border + offset shadow, active state shifts shadow to 2px 2px
- Status badges: pixel pills with hard edges (green/yellow/red + brown border)
- Hover: shadow shifts, subtle background tint

## Layout

```
┌──────────────────────────────────────────────────┐
│  🍳 BRAGFAST    Kitchen  Brands  History  Keys   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Page content (full width, max-w, centered)      │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Fixed top bar with pixel-style tab buttons
- Active tab: `#F8AF3C` background, `#4A3326` text
- Inactive tabs: transparent, `#4A3326` text, hover tint
- Logo left, nav tabs right of logo
- Content area: max-width container, centered, padded

## Route Structure

```
/admin              → Kitchen (home)
/admin/brands       → Brand list
/admin/brands/new   → Create brand
/admin/brands/[id]  → Edit brand
/admin/history      → Release history
/admin/keys         → API key management
```

All under `(admin)` route group with shared layout. Layout checks Better Auth session — no session redirects to `/login`.

## Pages

### Kitchen (Home) — `/admin`

**Stat row** (4 cards, horizontal):
- Credits Remaining
- Credits Used (this month)
- Total Releases
- Images Generated

Each card: pixel border, number in Press Start 2P (large), label in Geist (small).

**Recent Orders** table below:
- Columns: ID, template, status, images count, credits, date
- Last 10 releases
- Status as pixel badge (green=completed, yellow=pending, red=failed)
- Rows clickable → navigate to history detail

### Brands — `/admin/brands`

**Grid** of brand cards (2-3 per row):
- Brand name (Press Start 2P)
- Color swatches (3 small squares)
- Font name
- Logo thumbnail (if set)
- Pixel border, hover lifts shadow

**"+ New Brand"** button top-right.

**Create/Edit** pages (`/admin/brands/new`, `/admin/brands/[id]`):
- Form fields: name, logo URL, website, font, background color, text color, primary color
- Pixel-styled inputs with brown borders
- Save/cancel buttons

### History — `/admin/history`

**Full-width table:**
- Columns: release ID, template, slide count, formats, status, credits used, date
- Status pixel badges
- Filter row: status filter (all/completed/pending/failed)
- Click row → expand inline or navigate to detail showing generated image thumbnails

### API Keys — `/admin/keys`

**Table:**
- Columns: key name, prefix (`bf_...`), created date, revoke button
- Revoke requires confirmation (inline pixel alert)

**"Generate Key"** button:
- On create: shows full key ONCE in a highlighted pixel-bordered alert box
- Copy button alongside
- Warning text: "Save this key — you won't see it again"

## Auth Guard

Admin layout wraps all pages. Checks Better Auth session server-side. No session → redirect to `/login`. User data (ID, name) available to all child pages.

## Data Flow

All data fetched from existing `/api/v1/*` endpoints (brands, releases, api-keys). Admin is a consumer of the existing API — no new backend routes needed. Convex queries used directly where appropriate (e.g. userProfiles for credit balance).
