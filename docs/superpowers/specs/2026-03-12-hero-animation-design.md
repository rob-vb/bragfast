# Hero Animation: Animated API Sequence

## Overview

Replace the right-side video placeholder in the landing hero with an auto-looping animated sequence that shows a `curl` request typing out, receiving a 202 → webhook 200, then fanning out 3 output images. Pure CSS animations, pre-rendered demo images, no API calls.

## Animation Sequence

| Phase | Duration | What happens |
|-------|----------|-------------|
| 1. Type request | ~2.5s | Each line types out sequentially (line 1, then line 2) |
| 2. 202 Accepted | ~0.8s | Response fades in |
| 3. Processing | ~1.5s | Pulsing dots: `Generating images...` |
| 4. 200 OK webhook | ~0.5s | Webhook response fades in |
| 5. Images fan out | ~1.0s | 3 images cascade in with staggered delays |
| 6. Hold | ~2.0s | Final state visible |
| 7. Reset | ~0.3s | Fade out, restart loop |

**Total loop: ~8.6s**

## Component Structure

```
<HeroAnimation />  — single React client component ("use client")
├── Terminal chrome wrapper (bg-brand, dot controls, "terminal" label)
├── Code lines (curl command, 202 response, processing, 200 response)
│   └── Each line is a separate element with its own animation
└── Image fan container (relative, explicit height)
    ├── Landscape (-6° rotation, left)
    ├── Square (0° rotation, center)
    └── Portrait (+6° rotation, right)
```

**File:** `src/components/landing/hero-animation.tsx`

## Terminal Chrome

- Background: `bg-brand` (`#4A3326`) — matches the existing code block in the "How it works" section
- Wrapped in site's pixel-art border: `border-2 border-brand shadow-[6px_6px_0_var(--color-brand)]`
- Title bar with square dot controls in brand colors (gold, surface/30, surface/30)
- Label: "terminal" in monospace
- Blinking cursor `▌` after the currently-typing line

## Code Content

Each line is a separate `<span>` element for independent typing animation:

```
Line 1: curl -X POST brag.fast/api/v1/cook \
Line 2:   -d '{ "title": "Dark mode is here" }'
Line 3: (blank)
Line 4: ← 202 Accepted  { cook_id: "cook_a1b2c3" }
Line 5: (blank)
Line 6: Generating images...
Line 7: (blank)
Line 8: ← 200 OK (webhook)  3 images ready
```

- Font: `var(--font-geist-mono)`
- Syntax coloring: command orange (`#ff9f6b`), strings green (`#6bff6b`), 202 gold (`#F8AF3C`), 200 green
- Lines 1-2: typed with `steps()` + `width` animation (each line is a single `<span>` with `overflow: hidden; white-space: nowrap; width` in `ch` units)
- Lines 4, 6, 8: fade in (no typing effect — they're "responses")

## Image Fan

**Exact files:**
- `/demo/standard-browser-inter-landscape.jpg`
- `/demo/standard-browser-inter-square.jpg`
- `/demo/standard-browser-inter-portrait.jpg`

**Rendered display dimensions:**
- Landscape: `width={180} height={101}`
- Square: `width={100} height={100}`
- Portrait: `width={75} height={140}`

**Container:** `position: relative; height: 140px` — explicit height prevents collapse from absolutely-positioned children.

**Layout:**
- Landscape: `left: 5%`, `rotate(-6deg)`, z-index 1
- Square: `left: 50%; translateX(-50%)`, no rotation, z-index 2
- Portrait: `right: 5%`, `rotate(6deg)`, z-index 3
- All bottom-aligned within the container

**Styling:** `border-2 border-brand shadow-[3px_3px_0_var(--color-brand)]`

**Entrance:** `translateY(20px) + opacity: 0` → `translateY(0) + opacity: 1`, staggered 150ms apart

## Animation Approach

**CSS keyframes only.** No framer-motion, no JS animation libraries.

**Looping strategy:** Each animated element gets its own `animation` with `duration: 8.6s` (full loop length) and `iteration-count: infinite`. Elements are visible only during their portion of the loop and return to `opacity: 0` at loop end. No master animation on a parent container.

Example pattern for a single element:
```css
@keyframes line1-type {
  0%, 2% { width: 0; opacity: 1; }       /* start typing at 0s */
  15% { width: 42ch; opacity: 1; }        /* finish typing ~1.3s */
  90% { opacity: 1; }                     /* stay visible */
  95%, 100% { opacity: 0; }               /* fade out for reset */
}

.line1 {
  animation: line1-type 8.6s infinite;
  font-family: var(--font-geist-mono);
  overflow: hidden;
  white-space: nowrap;
}
```

**Typing effect:** CSS `steps(N)` where N = character count of that line. Each typed line is a single `<span>` with `overflow: hidden; white-space: nowrap` and a `ch`-based max width. Line 1 types first, line 2 starts after line 1 finishes (via keyframe percentages, not `animation-delay`).

**Cursor:** A `▌` pseudo-element or `<span>` that follows the typing position. Use `animation` to move it to the end of the currently-typing line.

## Integration

- Replace the `{/* Right: video placeholder in browser chrome */}` block in `src/app/page.tsx` (lines 99-111) with `<HeroAnimation />`
- `page.tsx` remains a Server Component; `<HeroAnimation />` is a Client Component imported into it — this is standard Next.js App Router composition
- The component is self-contained — no props needed

## Responsive Behavior

- **Desktop (md+):** Full animation with fanned images at specified dimensions
- **Mobile:** Terminal block scales down via container width. Image fan dimensions scale proportionally (e.g., 70% of desktop sizes). Hide image fan on screens below `sm` if it doesn't fit.

## Accessibility

- `prefers-reduced-motion: reduce` → use `animation-play-state: paused` at the final frame (code + images visible, no movement)
- Terminal block gets `aria-hidden="true"` (decorative)
- Alt text on images: "Example landscape/square/portrait social image generated by bragfast"

## Performance

- Demo images already exist in `/public/demo/`, served statically
- No JS animation runtime — CSS only
- `"use client"` needed only for `HeroAnimation`, not the whole page
- Images lazy-loaded (below fold on mobile, visible on desktop but not LCP)

## Out of Scope

- Cycling through different template/font combos per loop (future enhancement)
- Interactive elements (clicking, hovering to pause)
- Real API calls
