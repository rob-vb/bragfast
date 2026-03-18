# brag.fast Design System

## Colors

| Token        | Value     | Usage                              |
| ------------ | --------- | ---------------------------------- |
| `--color-brand`   | `#4A3326` | Primary text, borders, shadows     |
| `--color-gold`    | `#F8AF3C` | CTAs, active states, accents       |
| `--color-surface` | `#FFF8F0` | Page backgrounds, cards            |
| `white`      | `#FFFFFF` | Card backgrounds, inputs           |
| `destructive`| oklch     | Error states, danger zone          |

Tailwind classes: `text-brand`, `bg-gold`, `bg-surface`, `border-brand`.

## Typography

| Font              | Variable              | Usage                                 |
| ----------------- | --------------------- | ------------------------------------- |
| Press Start 2P    | `--font-press-start`  | Headings, labels, badges, CTA buttons |
| Geist Sans        | `--font-geist-sans`   | Body text, descriptions, form inputs  |
| Geist Mono        | `--font-geist-mono`   | Code blocks, IDs, monospace data      |

**Minimum text size:** 10px for Press Start 2P (never below 10px for readable text).
Sub-10px only in decorative mockup elements that aren't meant to be read.

## Shadow Scale

| Size | Value                                    | Usage                        |
| ---- | ---------------------------------------- | ---------------------------- |
| sm   | `shadow-[2px_2px_0_var(--color-brand)]`  | Active/pressed states, small UI |
| md   | `shadow-[3px_3px_0_var(--color-brand)]`  | Default buttons, nav tabs    |
| lg   | `shadow-[4px_4px_0_var(--color-brand)]`  | Cards, tables, hero elements |
| xl   | `shadow-[6px_6px_0_var(--color-brand)]`  | NES dialog cards (auth, errors, onboarding) |

Hover: shadow shrinks (lg → sm). Active: translate + shadow-none.

## Borders

- Default: `border-2 border-brand`
- Emphasis (NES cards): `border-[3px] border-brand`
- Radius: **0** for pixel-art elements. Default shadcn radius for form inputs.

## Component Patterns

### NES Card (dialog-style)
```
border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]
├── Header bar: bg-brand text-gold px-4 py-3
│   └── "▸ Title" in Press Start 2P text-xs
└── Body: p-5/p-6 bg-white
```
Used for: auth forms, error states, onboarding checklist, mobile editor gate.

### PixelCard
```
border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)]
```
Used for: stat cards, content sections, list items.

### PixelButton
```
font-press-start text-xs px-4 py-2 border-2 border-brand
├── primary: bg-gold shadow-md
├── danger: bg-red-500 text-white
└── ghost: bg-transparent hover:bg-gold/20
```

### PixelTable
```
border-2 border-brand shadow-lg overflow-hidden
├── thead: border-b-2 bg-gold/20, th: press-start text-[10px] uppercase
└── tbody: divide-y divide-brand/10
```

### PixelEmptyState
```
border-2 border-brand bg-white p-8 shadow-lg text-center
├── Pixel art icon (CSS grid)
├── Title: press-start text-xs
├── Description: geist-sans text-sm text-brand/60
└── CTA button(s)
```

### PixelSkeleton
```
border-2 border-dashed border-brand/30 bg-surface animate-pixel-skeleton
```

### PixelError
NES card pattern with "▸ Error" header + retry button.

## Spacing

Tailwind default 4px scale. No custom spacing tokens.

## Interaction States

- **Hover (buttons):** shadow shrinks, slight translate
- **Active:** `translate-x-[2px] translate-y-[2px] shadow-none`
- **Focus:** `outline-2 outline-offset-2 outline-gold` (pixel-art style)
- **Loading:** `animate-pixel-skeleton` (shimmer gradient)

## Accessibility

- Minimum touch target: 44x44px for mobile interactive elements
- Minimum readable text: 10px (Press Start 2P), 12px (Geist Sans)
- ARIA landmarks on layout: `role="banner"`, `role="main"`, `aria-label` on navs
- Decorative text uses `aria-hidden="true"`

## Dark Mode

Not implemented. The `.dark` CSS block has been removed.
Design intentionally for light mode only — revisit if needed later.
