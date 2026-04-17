# showcase-nes — Design System

Derived from `/DESIGN.md` (brag.fast). NES-retro, diner-warm, zero radius, hard-offset shadows.

## Style Prompt

A warm cream canvas hosts a single browser-mockup device wearing a hard brown 8px offset shadow. A Press Start 2P headline sits beneath it in espresso brown. A gold swipe underscores the title. Nothing is rounded. Nothing is soft. Motion is decisive: rises, pops, snaps. Every edge is sharp; every shadow lands in one frame. The mood is "retro arcade meets diner order-ticket" — precise, pixelated, and unmistakably brag.fast.

## Colors

| Token        | Hex        | Role                                    |
| ------------ | ---------- | --------------------------------------- |
| `--brand`    | `#4A3326`  | Primary text, borders, hard shadows     |
| `--gold`     | `#F8AF3C`  | Accent underline, pulsing dot           |
| `--surface`  | `#FFF8F0`  | Canvas background                       |
| `--white`    | `#FFFFFF`  | Browser body, device interior           |
| `--brand-80` | `#4A3326CC` | Subtitle ink (80% brand)               |

## Typography

| Family            | Role                        | Min size |
| ----------------- | --------------------------- | -------- |
| Press Start 2P    | Headline, URL bar, label    | 10px     |
| Geist Sans        | Subtitle, body              | 18px     |

## What NOT to Do

- No `border-radius` anywhere. Edges are square.
- No soft box-shadow. Only hard offsets (`Npx Npx 0 var(--brand)`).
- No linear gradients on the surface. Solid fills only.
- No generic fonts (Inter, Roboto, system-ui). Press Start 2P + Geist only.
- No #333, #3b82f6, or blue accents. Gold is the only accent.

## Motion Signature

- Entrances: power3.out for rises, back.out(1.7) for dot pops, expo.out for clip-path reveals.
- Shadow always **snaps** (duration 0, tl.set) — never tweens.
- One underline swipe per scene, L→R, scaleX 0→1, 0.4s, power2.out, transform-origin left.
- Ambient bob: 2px amplitude, sine.inOut, repeat count calculated, never `-1`.
