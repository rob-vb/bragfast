# Hero Animation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero's video placeholder with an auto-looping animated terminal sequence showing curl → 202 → webhook 200 → 3 fanned output images.

**Architecture:** Single `"use client"` component (`HeroAnimation`) dropped into the existing server-rendered `page.tsx`. All animation via CSS keyframes — no JS animation libraries. Pre-rendered demo images from `/public/demo/`.

**Tech Stack:** React, Next.js App Router, Tailwind CSS, CSS keyframes, Next/Image

**Spec:** `docs/superpowers/specs/2026-03-12-hero-animation-design.md`

---

## Chunk 1: CSS Keyframes + Component

### Task 1: Create the keyframes CSS

**Files:**
- Create: `src/components/landing/hero-animation.css`

The full loop is 8.6s. Keyframe percentages for each phase:

| Phase | Start % | End % | Time |
|-------|---------|-------|------|
| Type line 1 | 0% | 15% | 0–1.3s |
| Type line 2 | 15% | 29% | 1.3–2.5s |
| 202 fade in | 29% | 38% | 2.5–3.3s |
| Processing pulse | 38% | 56% | 3.3–4.8s |
| 200 fade in | 56% | 62% | 4.8–5.3s |
| Image fan out | 62% | 73% | 5.3–6.3s |
| Hold | 73% | 96% | 6.3–8.3s |
| Fade out | 96% | 100% | 8.3–8.6s |

- [ ] **Step 1: Create the keyframes file**

```css
/* src/components/landing/hero-animation.css */

/* Line 1: curl -X POST brag.fast/api/v1/cook \ (42 chars) */
@keyframes type-line1 {
  0% { width: 0; opacity: 1; }
  0.1% { opacity: 1; }
  15% { width: 42ch; opacity: 1; }
  96% { opacity: 1; }
  100% { opacity: 0; width: 42ch; }
}

/* Line 2:   -d '{ "title": "Dark mode is here" }' (39 chars) */
@keyframes type-line2 {
  0%, 15% { width: 0; opacity: 0; }
  15.1% { opacity: 1; }
  29% { width: 39ch; opacity: 1; }
  96% { opacity: 1; }
  100% { opacity: 0; width: 39ch; }
}

/* Blinking cursor — used on a ▌ span */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Cursor visibility — only visible during typing phases */
@keyframes cursor-visible {
  0% { opacity: 1; }
  29% { opacity: 1; }
  29.1% { opacity: 0; }
  100% { opacity: 0; }
}

/* 202 Accepted response */
@keyframes fade-202 {
  0%, 29% { opacity: 0; }
  38% { opacity: 1; }
  96% { opacity: 1; }
  100% { opacity: 0; }
}

/* Processing dots — pulses opacity */
@keyframes fade-processing {
  0%, 38% { opacity: 0; }
  42% { opacity: 1; }
  47% { opacity: 0.4; }
  51% { opacity: 1; }
  56% { opacity: 0; }
  100% { opacity: 0; }
}

/* 200 OK webhook */
@keyframes fade-200 {
  0%, 56% { opacity: 0; }
  62% { opacity: 1; }
  96% { opacity: 1; }
  100% { opacity: 0; }
}

/* Image fan: landscape (first) */
@keyframes fan-landscape {
  0%, 62% { opacity: 0; transform: translateY(20px) rotate(-6deg); }
  68% { opacity: 1; transform: translateY(0) rotate(-6deg); }
  96% { opacity: 1; transform: translateY(0) rotate(-6deg); }
  100% { opacity: 0; transform: translateY(20px) rotate(-6deg); }
}

/* Image fan: square (second, +150ms ≈ +1.7%) */
@keyframes fan-square {
  0%, 63.7% { opacity: 0; transform: translateY(20px) rotate(0deg); }
  69.7% { opacity: 1; transform: translateY(0) rotate(0deg); }
  96% { opacity: 1; transform: translateY(0) rotate(0deg); }
  100% { opacity: 0; transform: translateY(20px) rotate(0deg); }
}

/* Image fan: portrait (third, +300ms ≈ +3.5%) */
@keyframes fan-portrait {
  0%, 65.5% { opacity: 0; transform: translateY(20px) rotate(6deg); }
  71.5% { opacity: 1; transform: translateY(0) rotate(6deg); }
  96% { opacity: 1; transform: translateY(0) rotate(6deg); }
  100% { opacity: 0; transform: translateY(20px) rotate(6deg); }
}

/* Reduced motion: show final state statically */
@media (prefers-reduced-motion: reduce) {
  .hero-animation [style*="animation"] {
    animation: none !important;
    opacity: 1 !important;
  }
  .hero-animation .hero-typing {
    width: auto !important;
  }
  .hero-animation .hero-fan-img {
    transform: none !important;
  }
}
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/components/landing/hero-animation.css`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/hero-animation.css
git commit -m "feat: add hero animation keyframes"
```

### Task 2: Build the HeroAnimation component

**Files:**
- Create: `src/components/landing/hero-animation.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Image from "next/image";
import "./hero-animation.css";

const LOOP = "8.6s infinite both";

export function HeroAnimation() {
  return (
    <div aria-hidden="true" className="hero-animation">
      {/* Terminal chrome */}
      <div className="border-2 border-brand bg-brand shadow-[6px_6px_0_var(--color-brand)]">
        {/* Title bar */}
        <div className="border-b-2 border-surface/20 px-3 py-1.5 flex items-center gap-1.5">
          <span className="block h-2 w-2 border border-surface/30 bg-gold" />
          <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
          <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-surface/40 ml-2">
            terminal
          </span>
        </div>

        {/* Code content */}
        <div className="relative p-3 md:p-4 font-[family-name:var(--font-geist-mono)] text-[10px] md:text-xs leading-relaxed min-h-[140px]">
          {/* Line 1: curl command */}
          <div
            className="hero-typing overflow-hidden whitespace-nowrap"
            style={{ animation: `type-line1 ${LOOP}`, width: 0, opacity: 0, animationTimingFunction: "steps(42, end)" }}
          >
            <span className="text-[#ff9f6b]">curl</span>
            <span className="text-surface/90"> -X POST brag.fast/api/v1/cook \</span>
          </div>

          {/* Line 2: payload */}
          <div
            className="hero-typing overflow-hidden whitespace-nowrap"
            style={{ animation: `type-line2 ${LOOP}`, width: 0, opacity: 0, animationTimingFunction: "steps(39, end)" }}
          >
            <span className="text-surface/90">{"  -d '"}</span>
            <span className="text-[#6bff6b]">{`{ "title": "Dark mode is here" }`}</span>
            <span className="text-surface/90">{"'"}</span>
          </div>

          {/* Blinking cursor — visible only during typing phases */}
          <span
            className="inline-block text-surface/80"
            style={{
              animation: `cursor-blink 0.8s steps(1) infinite, cursor-visible ${LOOP}`,
              opacity: 0,
            }}
          >
            ▌
          </span>

          {/* Blank line */}
          <div className="h-4" />

          {/* 202 response */}
          <div style={{ animation: `fade-202 ${LOOP}`, opacity: 0 }}>
            <span className="text-gold">← 202 Accepted</span>
            <span className="text-surface/60">{`  { cook_id: "cook_a1b2c3" }`}</span>
          </div>

          {/* Blank line */}
          <div className="h-4" />

          {/* Processing */}
          <div style={{ animation: `fade-processing ${LOOP}`, opacity: 0 }}>
            <span className="text-surface/50">Generating images...</span>
          </div>

          {/* Blank line */}
          <div className="h-4" />

          {/* 200 webhook */}
          <div style={{ animation: `fade-200 ${LOOP}`, opacity: 0 }}>
            <span className="text-[#6bff6b]">← 200 OK</span>
            <span className="text-surface/60"> (webhook)  3 images ready</span>
          </div>
        </div>
      </div>

      {/* Image fan — hidden below sm to avoid overflow on very small screens */}
      <div className="relative h-[140px] mt-4 hidden sm:block overflow-hidden">
        {/* Landscape */}
        <div
          className="hero-fan-img absolute bottom-0 left-[5%] border-2 border-brand shadow-[3px_3px_0_var(--color-brand)]"
          style={{ animation: `fan-landscape ${LOOP}`, opacity: 0, zIndex: 1 }}
        >
          <Image
            src="/demo/standard-browser-inter-landscape.jpg"
            alt="Example landscape social image generated by bragfast"
            width={180}
            height={101}
            className="block"
          />
        </div>

        {/* Square */}
        <div
          className="hero-fan-img absolute bottom-0 left-1/2 -translate-x-1/2 border-2 border-brand shadow-[3px_3px_0_var(--color-brand)]"
          style={{ animation: `fan-square ${LOOP}`, opacity: 0, zIndex: 2 }}
        >
          <Image
            src="/demo/standard-browser-inter-square.jpg"
            alt="Example square social image generated by bragfast"
            width={100}
            height={100}
            className="block"
          />
        </div>

        {/* Portrait */}
        <div
          className="hero-fan-img absolute bottom-0 right-[5%] border-2 border-brand shadow-[3px_3px_0_var(--color-brand)]"
          style={{ animation: `fan-portrait ${LOOP}`, opacity: 0, zIndex: 3 }}
        >
          <Image
            src="/demo/standard-browser-inter-portrait.jpg"
            alt="Example portrait social image generated by bragfast"
            width={75}
            height={140}
            className="block"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/components/landing/hero-animation.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/hero-animation.tsx
git commit -m "feat: add HeroAnimation component"
```

---

## Chunk 2: Integration + Accessibility + Polish

### Task 3: Integrate into page.tsx

**Files:**
- Modify: `src/app/page.tsx:1-5` (add import)
- Modify: `src/app/page.tsx:99-111` (replace placeholder)

- [ ] **Step 1: Add import**

At the top of `page.tsx`, add:
```tsx
import { HeroAnimation } from "@/components/landing/hero-animation";
```

- [ ] **Step 2: Replace the video placeholder**

Replace lines 99-111 (the `{/* Right: video placeholder in browser chrome */}` block) with:
```tsx
          {/* Right: animated API demo */}
          <HeroAnimation />
```

- [ ] **Step 3: Verify it builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds, no type errors

- [ ] **Step 4: Verify visually**

Run: `npx next dev`
Open `http://localhost:3000` and confirm:
- Terminal chrome renders with brown bg matching the "How it works" code block
- Curl types out line by line
- 202 fades in after typing
- Processing pulses
- 200 fades in
- 3 images fan out with stagger
- Loop resets and replays

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate HeroAnimation into landing hero"
```

### Task 4: Verify accessibility + responsiveness

Reduced motion CSS is already included in the keyframes file (scoped to `.hero-animation` class). Image fan is hidden below `sm` breakpoint and has `overflow-hidden` on the container to prevent portrait image overflow.

- [ ] **Step 1: Test reduced motion**

In Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → set to "reduce".
Expected: All content visible, no movement. Window control dots unaffected.

- [ ] **Step 2: Test at mobile breakpoints**

Check at 375px width: terminal should render, image fan should be hidden.
Check at 640px (sm): image fan should appear.
Check at 768px (md): full layout with larger text.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add src/components/landing/hero-animation.tsx src/components/landing/hero-animation.css
git commit -m "fix: accessibility and responsive adjustments for hero animation"
```

### Task 6: Final visual polish pass

- [ ] **Step 1: Compare with existing code block**

Open the page and scroll between the hero animation and the "Developers, POST and receive" code block. Confirm:
- Same brown background color
- Same border/shadow treatment
- Window controls match

- [ ] **Step 2: Check animation timing**

Watch 3 full loops. Confirm:
- No jarring transitions
- Hold phase feels long enough to read the output
- Reset is clean (no flash of content)

- [ ] **Step 3: Fix any issues found, commit**

```bash
git add src/components/landing/hero-animation.tsx src/components/landing/hero-animation.css
git commit -m "fix: hero animation polish"
```
