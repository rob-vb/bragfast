# Homepage & Pricing Page Optimization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand homepage and pricing page to showcase all Bragfast USPs with dedicated feature sections, mockup components, and an auth-aware nav.

**Architecture:** Modify two existing pages (`src/app/page.tsx`, `src/app/pricing/page.tsx`), one shared component (`landing-nav.tsx`), one data file (`pricing-data.tsx`), and create two new mockup components (`AIAnalysisMockup`, `BrandKitMockup`) following the same pattern as `EditorMockup`.

**Tech Stack:** Next.js (React 19), Tailwind CSS 4, Lucide icons, better-auth client, CSS keyframe animations.

**Spec:** `docs/superpowers/specs/2026-03-16-homepage-pricing-optimization-design.md`

---

## Chunk 1: New Mockup Components

### Task 1: AIAnalysisMockup component

**Files:**
- Create: `src/components/landing/ai-analysis-mockup.tsx`
- Create: `src/components/landing/ai-analysis-mockup.css`

- [ ] **Step 1: Create the CSS animation file**

Create `src/components/landing/ai-analysis-mockup.css` with a 10s loop matching the EditorMockup pattern. Phases: title fades in (0-10%), pills appear one by one (10-35%), summary fades in (35-50%), buttons appear (50-60%), hold (60-90%), reset (90-100%).

```css
/* AI Analysis mockup animation — elements appear sequentially */
/* Full loop: 10s */

@keyframes ai-title {
  0% { opacity: 0; transform: translateY(-6px); }
  8% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes ai-pill-1 {
  0%, 10% { opacity: 0; transform: scale(0.8); }
  16% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes ai-pill-2 {
  0%, 16% { opacity: 0; transform: scale(0.8); }
  22% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes ai-pill-3 {
  0%, 22% { opacity: 0; transform: scale(0.8); }
  28% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes ai-summary {
  0%, 35% { opacity: 0; }
  42% { opacity: 1; }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes ai-buttons {
  0%, 50% { opacity: 0; transform: translateY(4px); }
  58% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ai-analysis-mockup [style*="animation"] {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 2: Create the component file**

Create `src/components/landing/ai-analysis-mockup.tsx`:

```tsx
"use client";

import "./ai-analysis-mockup.css";

const LOOP = "10s infinite both";

export function AIAnalysisMockup() {
  return (
    <div aria-hidden="true" className="ai-analysis-mockup">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Release Review
          </span>
          <span className="w-10" />
        </div>

        <div className="p-4 md:p-5 flex flex-col gap-3">
          {/* Release title */}
          <div style={{ animation: `ai-title ${LOOP}`, opacity: 0 }}>
            <span className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-brand">
              v2.4.0
            </span>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-gold"
              style={{ animation: `ai-pill-1 ${LOOP}`, opacity: 0 }}
            >
              3 New Features
            </span>
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-white"
              style={{ animation: `ai-pill-2 ${LOOP}`, opacity: 0 }}
            >
              5 Bug Fixes
            </span>
            <span
              className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-2 py-1 border-2 border-brand bg-brand text-surface"
              style={{ animation: `ai-pill-3 ${LOOP}`, opacity: 0 }}
            >
              1 Breaking Change
            </span>
          </div>

          {/* AI summary */}
          <div
            className="border-t border-brand/10 pt-3"
            style={{ animation: `ai-summary ${LOOP}`, opacity: 0 }}
          >
            <p className="font-[family-name:var(--font-geist-sans)] text-xs md:text-sm text-brand/70 leading-relaxed">
              Adds dark mode, redesigned settings page, and bulk export. Fixes auth timeout and 5 UI bugs. Breaking: API v1 endpoints deprecated.
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="flex gap-2 pt-1"
            style={{ animation: `ai-buttons ${LOOP}`, opacity: 0 }}
          >
            <span className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-3 py-1.5 border-2 border-brand bg-gold">
              Approve
            </span>
            <span className="font-[family-name:var(--font-press-start)] text-[7px] md:text-[8px] px-3 py-1.5 border-2 border-brand bg-white text-brand/60">
              Dismiss
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev` and temporarily import into homepage to verify it looks correct. Remove temp import after.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/ai-analysis-mockup.tsx src/components/landing/ai-analysis-mockup.css
git commit -m "feat: add AIAnalysisMockup landing component"
```

---

### Task 2: BrandKitMockup component

**Files:**
- Create: `src/components/landing/brand-kit-mockup.tsx`
- Create: `src/components/landing/brand-kit-mockup.css`

- [ ] **Step 1: Create the CSS animation file**

Create `src/components/landing/brand-kit-mockup.css`. 10s loop. Phases: logo appears (0-10%), swatches pop in (10-28%), font appears (28-38%), arrow + output preview (38-55%), hold (55-90%), reset (90-100%).

```css
/* Brand kit mockup animation — config builds up then shows output */
/* Full loop: 10s */

@keyframes brand-logo {
  0% { opacity: 0; transform: scale(0.8); }
  8% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-swatch-1 {
  0%, 10% { opacity: 0; transform: scale(0); }
  14% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-swatch-2 {
  0%, 14% { opacity: 0; transform: scale(0); }
  18% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-swatch-3 {
  0%, 18% { opacity: 0; transform: scale(0); }
  22% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-swatch-4 {
  0%, 22% { opacity: 0; transform: scale(0); }
  26% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-font {
  0%, 28% { opacity: 0; transform: translateX(-6px); }
  36% { opacity: 1; transform: translateX(0); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@keyframes brand-output {
  0%, 42% { opacity: 0; transform: translateY(6px); }
  52% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; }
  95%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .brand-kit-mockup [style*="animation"] {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 2: Create the component file**

Create `src/components/landing/brand-kit-mockup.tsx`:

```tsx
"use client";

import "./brand-kit-mockup.css";

const LOOP = "10s infinite both";

const SWATCHES = [
  { color: "#4A3326", anim: "brand-swatch-1" },
  { color: "#F8AF3C", anim: "brand-swatch-2" },
  { color: "#FFF8F0", anim: "brand-swatch-3" },
  { color: "#2D5A3D", anim: "brand-swatch-4" },
];

export function BrandKitMockup() {
  return (
    <div aria-hidden="true" className="brand-kit-mockup">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Brand Kit
          </span>
          <span className="w-10" />
        </div>

        <div className="p-4 md:p-5">
          {/* Config panel */}
          <div className="flex flex-col gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 md:w-12 md:h-12 border-2 border-brand/30 bg-surface/50 flex items-center justify-center"
                style={{ animation: `brand-logo ${LOOP}`, opacity: 0 }}
              >
                <span className="font-[family-name:var(--font-press-start)] text-[6px] text-brand/30">
                  LOGO
                </span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase">
                  Logo
                </span>
              </div>
            </div>

            {/* Color swatches */}
            <div>
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase block mb-1.5">
                Colors
              </span>
              <div className="flex gap-2">
                {SWATCHES.map((s) => (
                  <div
                    key={s.color}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-brand/30"
                    style={{
                      backgroundColor: s.color,
                      animation: `${s.anim} ${LOOP}`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Font */}
            <div
              style={{ animation: `brand-font ${LOOP}`, opacity: 0 }}
            >
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase block mb-1">
                Font
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand font-bold">
                Inter Bold
              </span>
            </div>
          </div>

          {/* Arrow + output preview */}
          <div
            className="mt-4 pt-3 border-t-2 border-brand/10"
            style={{ animation: `brand-output ${LOOP}`, opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-[family-name:var(--font-press-start)] text-brand/30 text-xs">
                &darr;
              </span>
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40">
                Output
              </span>
            </div>
            <div className="border-2 border-brand/20 bg-[#4A3326] p-2 flex items-center gap-2">
              <div className="w-5 h-5 border border-[#FFF8F0]/30 bg-[#FFF8F0]/10 flex items-center justify-center">
                <span className="font-[family-name:var(--font-press-start)] text-[4px] text-[#FFF8F0]/50">
                  L
                </span>
              </div>
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-[#F8AF3C]">
                Dark mode is here
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev` and temporarily import into homepage to verify. Remove temp import after.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/brand-kit-mockup.tsx src/components/landing/brand-kit-mockup.css
git commit -m "feat: add BrandKitMockup landing component"
```

---

## Chunk 2: Homepage Updates

### Task 3: Reorder and expand homepage feature sections

**Files:**
- Modify: `src/app/page.tsx`

This task modifies the features `<section>` (lines 106-230). The hero, pricing, CTA, and footer sections stay untouched.

- [ ] **Step 1: Add imports for new components**

At top of `src/app/page.tsx`, add:

```tsx
import { AIAnalysisMockup } from "@/components/landing/ai-analysis-mockup";
import { BrandKitMockup } from "@/components/landing/brand-kit-mockup";
```

- [ ] **Step 2: Refresh Section 1 (REST API) copy**

In the S2 features section, Row 1 (lines 113-157), update the `<p>` copy (line 119-121) to:

```tsx
<p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
  One API call, three formats. Automate branded release visuals from any CI/CD pipeline — your team sees results without touching a design tool.
</p>
```

Keep headline, curl mockup, and CTA button unchanged.

- [ ] **Step 3: Add output preview thumbnails below curl mockup**

After the closing `</pre>` of the curl code block (line 155), still inside the dark terminal container div, add:

```tsx
<div className="flex items-center gap-2 px-4 pb-3 pt-1">
  <span className="font-[family-name:var(--font-geist-mono)] text-[8px] text-surface/40">
    Output:
  </span>
  {["16:9", "1:1", "4:5"].map((fmt) => (
    <span
      key={fmt}
      className="font-[family-name:var(--font-press-start)] text-[6px] text-surface/60 border border-surface/20 px-1.5 py-0.5"
    >
      {fmt}
    </span>
  ))}
</div>
```

- [ ] **Step 4: Reorder — move Template Editor to position 2**

Move Row 3 (Template Editor, lines 215-228) to position 2 (after REST API row). Flip layout to visual-left/text-right using `order-` classes:

```tsx
{/* Row 2: Template Editor — visual left, text right */}
<div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
  <div className="order-2 md:order-1">
    <EditorMockup />
  </div>
  <div className="order-1 md:order-2">
    <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
      Cook up your own templates
    </h2>
    <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
      No design skills needed. Drag objects, set colors, preview live. Every render uses your recipe automatically.
    </p>
  </div>
</div>
```

- [ ] **Step 5: Reorder — move GitHub Integration to position 3**

Move Row 2 (GitHub Integration, lines 159-213) to position 3. Flip to text-left/visual-right by removing the `order-` classes:

```tsx
{/* Row 3: GitHub Integration — text left, visual right */}
<div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
  <div>
    <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
      Ship a release, we plate it
    </h2>
    <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed mb-6">
      Connect our GitHub App to your repos. Every time you tag a release, AI reads your changelog and generates branded images — approve them yourself or let it run hands-free.
    </p>
    <Link
      href="/signup"
      className="inline-block font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
    >
      Connect GitHub
    </Link>
  </div>
  <div>
    {/* GitHub webhook flow — keep existing diagram */}
    <div className="border-2 border-brand bg-white p-6 shadow-[4px_4px_0_var(--color-brand)]">
      <div className="flex flex-col gap-3">
        {[
          { step: "01", label: "You publish a release on GitHub", bg: "bg-white" },
          { step: "02", label: "AI reads your changelog, picks the highlights", bg: "bg-gold" },
          { step: "03", label: "Branded images, ready to serve", bg: "bg-white" },
        ].map((item, i) => (
          <div key={item.step}>
            <div className={`flex items-center gap-3 border-2 border-brand px-4 py-3 ${item.bg}`}>
              <span className="font-[family-name:var(--font-press-start)] text-[9px] text-brand/40">
                {item.step}
              </span>
              <p className="font-[family-name:var(--font-press-start)] text-[9px]">
                {item.label}
              </p>
            </div>
            {i < 2 && (
              <div className="flex justify-center py-1">
                <span className="font-[family-name:var(--font-press-start)] text-brand/30 text-xs">
                  &darr;
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-brand/10">
        <span className="font-[family-name:var(--font-press-start)] text-[8px] px-2 py-1 border border-brand/30 text-brand/60">
          Zero config
        </span>
        <span className="font-[family-name:var(--font-press-start)] text-[8px] px-2 py-1 border border-brand/30 text-brand/60">
          Review or auto-approve
        </span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Add Section 4 — AI Analysis (NEW)**

After the GitHub section, add:

```tsx
{/* Row 4: AI Analysis — visual left, text right */}
<div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
  <div className="order-2 md:order-1">
    <AIAnalysisMockup />
  </div>
  <div className="order-1 md:order-2">
    <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
      AI picks the best ingredients
    </h2>
    <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
      Bragfast reads your changelog, categorizes changes — features, fixes, breaking — and generates a smart summary. Review before serving or let it run fully automated.
    </p>
  </div>
</div>
```

- [ ] **Step 7: Add Section 5 — Brand Kits (NEW)**

After the AI Analysis section, add:

```tsx
{/* Row 5: Brand Kits — text left, visual right */}
<div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
  <div>
    <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-lg mb-4">
      Season everything to taste
    </h2>
    <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 leading-relaxed">
      Upload your logo, set your colors and fonts. Every image comes out on-brand, every time. No more off-brand release graphics cobbled together in Figma.
    </p>
  </div>
  <BrandKitMockup />
</div>
```

- [ ] **Step 8: Verify homepage renders correctly**

Run: `npm run dev`, open `http://localhost:3000`. Verify:
- 5 sections in correct order: API → Editor → GitHub → AI → Brand Kits
- Alternating layouts (text-left/visual-right, then flip, etc.)
- All animations working
- Responsive on mobile

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: expand homepage to 5 feature sections with new mockups"
```

---

## Chunk 3: Auth-Aware Nav

### Task 4: Make LandingNav session-aware

**Files:**
- Modify: `src/components/landing/landing-nav.tsx`

- [ ] **Step 1: Add session state**

Add import and state at top of `LandingNav`:

```tsx
import { authClient } from "@/lib/auth-client";

// Inside the component, after the existing useState:
const [loggedIn, setLoggedIn] = useState(false);

useEffect(() => {
  authClient.getSession().then((res) => {
    if (res.data?.user) setLoggedIn(true);
  });
}, []);
```

- [ ] **Step 2: Update desktop nav CTA**

Replace the desktop "Sign in" Link (lines 63-68) with:

```tsx
<Link
  href={loggedIn ? "/dashboard" : "/login"}
  className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
>
  {loggedIn ? "Dashboard" : "Sign in"}
</Link>
```

- [ ] **Step 3: Update mobile nav CTA**

Replace the mobile "Sign in" Link (lines 149-155) with:

```tsx
<Link
  href={loggedIn ? "/dashboard" : "/login"}
  onClick={() => setOpen(false)}
  className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] transition-all"
>
  {loggedIn ? "Dashboard" : "Sign in"}
</Link>
```

- [ ] **Step 4: Verify behavior**

Run: `npm run dev`.
- Visit homepage while logged out → "Sign in" → links to `/login`
- Log in, revisit homepage → "Dashboard" → links to `/dashboard`
- Test on mobile menu too

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/landing-nav.tsx
git commit -m "feat: show Dashboard button in nav when user is logged in"
```

---

## Chunk 4: Pricing Page Updates

### Task 5: Expand pricing page

**Files:**
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/lib/pricing-data.tsx`

- [ ] **Step 1: Add product context line to pricing hero**

In `src/app/pricing/page.tsx`, inside the hero section `<div className="mx-auto max-w-3xl text-center">` (line 47), add a new `<p>` between the `<h1>` and the existing credits `<p>`:

```tsx
<p className="font-[family-name:var(--font-geist-sans)] text-sm md:text-base text-brand/60 mb-3">
  Auto-generate branded social images from your releases — via API or GitHub.
</p>
```

- [ ] **Step 2: Add feature showcase section**

After the hero `</section>` closing tag (line 58) and before the pricing cards section (line 60), add:

```tsx
{/* Feature Showcase */}
<section className="px-4 pb-12 md:pb-16 md:px-8">
  <div className="mx-auto max-w-4xl">
    <h2 className="font-[family-name:var(--font-press-start)] text-sm md:text-base text-center mb-8">
      Everything on the menu
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {[
        { icon: Terminal, title: "API Access", desc: "One API call, three formats. Branded images in seconds." },
        { icon: Palette, title: "Template Editor", desc: "Design your own templates with the visual editor." },
        { icon: GitBranch, title: "GitHub Integration", desc: "Auto-generate visuals when you publish a release." },
        { icon: Sparkles, title: "AI Analysis", desc: "Smart changelog summaries and categorization." },
        { icon: Paintbrush, title: "Brand Kits", desc: "Your logo, colors, and fonts on every image." },
        { icon: LayoutGrid, title: "Multiple Formats", desc: "Landscape, square, and portrait in one render." },
      ].map((feature) => (
        <div
          key={feature.title}
          className="border-2 border-brand bg-white p-4 shadow-[3px_3px_0_var(--color-brand)]"
        >
          <feature.icon className="h-6 w-6 text-brand mb-2" />
          <h3 className="font-[family-name:var(--font-press-start)] text-[10px] mb-1.5">
            {feature.title}
          </h3>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 leading-relaxed">
            {feature.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add Lucide imports**

At top of `src/app/pricing/page.tsx`, add:

```tsx
import { Terminal, Palette, GitBranch, Sparkles, Paintbrush, LayoutGrid } from "lucide-react";
```

- [ ] **Step 4: Expand comparison table data**

In `src/lib/pricing-data.tsx`, add new rows after the appropriate existing rows:

After `{ name: "Brand kits", ... }` (line 12), add:
```tsx
{ name: "Custom fonts", starter: false, pro: "5", scale: "Unlimited" },
```

After `{ name: "GitHub integration", ... }` (line 14, now shifted), add:
```tsx
{ name: "GitHub repos", starter: "1", pro: "5", scale: "Unlimited" },
{ name: "AI analysis", starter: false, pro: true, scale: true },
```

- [ ] **Step 5: Add FAQ entries**

In `src/app/pricing/page.tsx`, add two entries to the `FAQS` array (before the last item about refunds):

```tsx
{
  q: "How does the GitHub integration work?",
  a: "Install the Bragfast GitHub App, choose which repos to connect, and configure your template. Every time you publish a release, we auto-generate branded images. Review them first or let it run fully automated.",
},
{
  q: "What does AI analysis do?",
  a: "When a release comes in via GitHub, our AI reads the changelog, categorizes changes into features, bug fixes, and breaking changes, and generates a summary for your images. Available on Pro and Scale plans.",
},
```

- [ ] **Step 6: Add footer to pricing page**

At the end of `PricingPage()`, before the closing `</div>`, add the same footer as the homepage:

```tsx
{/* Footer */}
<footer className="py-8 border-t-2 border-brand bg-surface">
  <div className="mx-auto max-w-5xl px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/logo.svg"
        alt="brag.fast"
        width={80}
        height={20}
        className="h-5 w-auto"
      />
    </Link>
    <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60">
      Feed your audience
    </p>
    <div className="flex items-center gap-4">
      <Link
        href="/terms"
        className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
      >
        Terms
      </Link>
      <Link
        href="/privacy"
        className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 hover:text-brand/80 transition-colors"
      >
        Privacy
      </Link>
    </div>
  </div>
</footer>
```

Also add the `Image` import at the top if not already present:

```tsx
import Image from "next/image";
```

- [ ] **Step 7: Verify pricing page**

Run: `npm run dev`, open `http://localhost:3000/pricing`. Verify:
- Product context line appears in hero
- 6 feature cards in 3×2 grid
- Comparison table has 3 new rows in correct positions
- 2 new FAQ entries appear
- Footer matches homepage footer
- Responsive on mobile

- [ ] **Step 8: Commit**

```bash
git add src/app/pricing/page.tsx src/lib/pricing-data.tsx
git commit -m "feat: expand pricing page with feature showcase, table rows, FAQ, and footer"
```

---

## Chunk 5: Final Verification

### Task 6: Build check and lint

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Visual check — homepage**

Open `http://localhost:3000`. Walk through all 5 feature sections. Check mobile responsive view. Verify animations loop correctly.

- [ ] **Step 4: Visual check — pricing page**

Open `http://localhost:3000/pricing`. Verify feature showcase grid, expanded table, new FAQs, footer.

- [ ] **Step 5: Fix any issues found, commit**

If fixes needed:
```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
