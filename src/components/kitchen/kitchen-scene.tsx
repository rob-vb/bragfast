"use client";

/**
 * KitchenScene — Animated NES pixel art kitchen banner.
 *
 * Built entirely in CSS (no image assets). Box-shadow pixel art technique:
 * a 1×1px div casts coloured box-shadows to "paint" each pixel block.
 *
 * States:
 *   idle    — kitchen at rest, no flames
 *   cooking — stove flames flicker, steam rises
 *   done    — steam burst + "ORDER UP!" text
 *   error   — flames out, red X on stove
 */

export interface KitchenSceneProps {
  status: "idle" | "cooking" | "done" | "error";
}

// ─── Color palette ─────────────────────────────────────────────────────────

const C = {
  brand: "#4A3326",
  gold: "#F8AF3C",
  surface: "#FFF8F0",
  wallCream: "#FFF0D0",
  stoveDark: "#4A4A4A",
  stoveMid: "#7A7A7A",
  stoveLight: "#AAAAAA",
  counterTop: "#A07850",
  counterFace: "#7A5830",
  counterBase: "#4A3326",
  shelfBrown: "#7A5028",
  potBody: "#8A8A8A",
  potDark: "#5A5A5A",
  knob: "#1A1A1A",
  flameRed: "#DD2200",
  flameOrange: "#FF6600",
  flameYellow: "#FFD000",
  steam: "#DDDDCC",
  windowSky: "#88BBDD",
  windowFrame: "#7A5028",
  windowGlass: "#AADDFF",
  errorRed: "#CC1100",
} as const;

// ─── Box-shadow pixel builder ───────────────────────────────────────────────
// Creates a CSS box-shadow string where each "pixel" is a S×S block.
// The originating div must be 1×1px. boxShadow offsets start at col*S, row*S.

type Pixel = [col: number, row: number, color: string];

function buildShadow(pixels: Pixel[], S: number): string {
  return pixels
    .map(([c, r, color]) => `${c * S}px ${r * S}px 0 ${S - 1}px ${color}`)
    .join(", ");
}

// ─── Pixel art definitions (at S=1, position in "pixel" units) ────────────

/** Stove: 8 col × 7 row */
function stovePixels(): Pixel[] {
  const out: Pixel[] = [];
  // Body fill
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 8; c++) {
      const isEdge = c === 0 || c === 7 || r === 0 || r === 6;
      out.push([c, r, isEdge ? C.stoveDark : C.stoveMid]);
    }
  }
  // Top highlight strip
  for (let c = 1; c < 7; c++) out.push([c, 0, C.stoveLight]);
  // Left burner (cols 1-3, rows 1-3)
  out.push([1, 2, C.stoveDark], [2, 1, C.stoveDark], [3, 1, C.stoveDark]);
  out.push([2, 2, C.knob], [3, 2, C.stoveDark]);
  out.push([1, 3, C.stoveDark], [2, 3, C.stoveDark], [3, 3, C.stoveDark]);
  // Right burner (cols 4-6, rows 1-3)
  out.push([4, 2, C.stoveDark], [5, 1, C.stoveDark], [6, 1, C.stoveDark]);
  out.push([5, 2, C.knob], [6, 2, C.stoveDark]);
  out.push([4, 3, C.stoveDark], [5, 3, C.stoveDark], [6, 3, C.stoveDark]);
  // Knobs (row 5)
  out.push([1, 5, C.knob], [3, 5, C.knob], [5, 5, C.knob]);
  return out;
}

/** Counter: W col × 3 row */
function counterPixels(w: number): Pixel[] {
  const out: Pixel[] = [];
  for (let c = 0; c < w; c++) {
    out.push([c, 0, C.counterTop]);
    out.push([c, 1, C.counterFace]);
    out.push([c, 2, C.counterBase]);
  }
  return out;
}

/** Shelf: W col × 2 row */
function shelfPixels(w: number): Pixel[] {
  const out: Pixel[] = [];
  for (let c = 0; c < w; c++) {
    out.push([c, 0, C.shelfBrown]);
    out.push([c, 1, C.counterBase]);
  }
  return out;
}

/** Pot: 4 col × 4 row */
function potPixels(): Pixel[] {
  return [
    // Handle
    [1, 0, C.potDark], [2, 0, C.potDark],
    // Body
    [0, 1, C.potDark], [1, 1, C.potBody], [2, 1, C.potBody], [3, 1, C.potDark],
    [0, 2, C.potDark], [1, 2, C.potBody], [2, 2, C.potBody], [3, 2, C.potDark],
    // Base
    [0, 3, C.potDark], [1, 3, C.potDark], [2, 3, C.potDark], [3, 3, C.potDark],
  ];
}

/** Window: 6 col × 6 row */
function windowPixels(): Pixel[] {
  const out: Pixel[] = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const isFrame = c === 0 || c === 5 || r === 0 || r === 5;
      const isCross = c === 2 || r === 2;
      out.push([
        c, r,
        isFrame || isCross ? C.windowFrame : C.windowGlass,
      ]);
    }
  }
  return out;
}

/** Flame set A — tall (left + right burner) */
function flameAPixels(): Pixel[] {
  return [
    // Left burner flame
    [0, 2, C.flameRed],
    [0, 1, C.flameOrange],
    [0, 0, C.flameYellow],
    [1, 1, C.flameOrange],
    [1, 0, C.flameYellow],
    // Right burner flame (offset by 3)
    [3, 2, C.flameRed],
    [3, 1, C.flameOrange],
    [3, 0, C.flameYellow],
    [4, 1, C.flameOrange],
    [4, 0, C.flameYellow],
  ];
}

/** Flame set B — short (alternates with A) */
function flameBPixels(): Pixel[] {
  return [
    [0, 2, C.flameRed],
    [0, 1, C.flameOrange],
    [1, 2, C.flameOrange],
    [1, 1, C.flameYellow],
    [3, 2, C.flameRed],
    [3, 1, C.flameOrange],
    [4, 2, C.flameOrange],
    [4, 1, C.flameYellow],
  ];
}

/** Steam wisp: small rising dots */
function steamPixels(): Pixel[] {
  return [
    [0, 3, C.steam],
    [0, 1, C.steam],
    [1, 2, C.steam],
    [1, 0, C.steam],
  ];
}

/** Error X: 3 col × 3 row */
function errorXPixels(): Pixel[] {
  return [
    [0, 0, C.errorRed], [2, 0, C.errorRed],
    [1, 1, C.errorRed],
    [0, 2, C.errorRed], [2, 2, C.errorRed],
  ];
}

// ─── The pixel block size to use ───────────────────────────────────────────
// Scene is designed at S=6 (6px per pixel block).
// Media queries scale the scene wrapper via transform: scale().

const S = 6; // base pixel size

// ─── Scene layout in "pixel" units (at S=6) ────────────────────────────────
// Scene canvas: 60 cols × 18 rows = 360px × 108px (comfortably within 120px)

const SCENE_COLS = 60;
const SCENE_ROWS = 18;

// Stove: top-left, 8×7, starts at col 2, row (SCENE_ROWS - 7 - 3) = 8
const STOVE_COL = 2;
const STOVE_ROW = SCENE_ROWS - 7 - 3; // row 8

// Counter spans full width at bottom 3 rows
const COUNTER_COL = 0;
const COUNTER_ROW = SCENE_ROWS - 3;

// Flame origin: just above stove top, same col offset as burner
const FLAME_COL = STOVE_COL + 1;  // over left burner
const FLAME_ROW = STOVE_ROW - 3;  // 3 rows above stove

// Steam origin: above stove
const STEAM_COL = STOVE_COL + 1;
const STEAM_ROW = STOVE_ROW - 4;  // starts above flame

// Error X: above stove center
const ERR_COL = STOVE_COL + 2;
const ERR_ROW = STOVE_ROW - 4;

// Shelves: right side
const SHELF1_COL = 18;
const SHELF1_ROW = 3;
const SHELF2_COL = 18;
const SHELF2_ROW = 9;

// Pots on shelves — pot is 4 rows tall, base at row 3.
// To sit ON the shelf, pot origin row = SHELF_ROW - 3 (base touches shelf top).
const POT1_COL = SHELF1_COL + 1;
const POT1_ROW = SHELF1_ROW - 3;   // base row aligns with shelf top
const POT2_COL = SHELF2_COL + 2;
const POT2_ROW = SHELF2_ROW - 3;

// Window: far right
const WIN_COL = 38;
const WIN_ROW = 3;

// ─── Component ──────────────────────────────────────────────────────────────

export function KitchenScene({ status }: KitchenSceneProps) {
  const showFlames = status === "cooking" || status === "done";
  const showSteam = status === "cooking" || status === "done";
  const showDone = status === "done";
  const showError = status === "error";

  // Pre-compute shadows
  const stoveShadow = buildShadow(stovePixels(), S);
  const counterShadow = buildShadow(counterPixels(SCENE_COLS), S);
  const shelf1Shadow = buildShadow(shelfPixels(10), S);
  const shelf2Shadow = buildShadow(shelfPixels(10), S);
  const pot1Shadow = buildShadow(potPixels(), S);
  const pot2Shadow = buildShadow(potPixels(), S);
  const windowShadow = buildShadow(windowPixels(), S);
  const flameAShadow = buildShadow(flameAPixels(), S);
  const flameBShadow = buildShadow(flameBPixels(), S);
  const steamShadow = buildShadow(steamPixels(), S);
  const errorXShadow = buildShadow(errorXPixels(), S);

  const sceneW = SCENE_COLS * S;  // 360px
  const sceneH = SCENE_ROWS * S;  // 108px

  return (
    <>
      <style>{`
        @keyframes ks-flicker-a {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ks-flicker-b {
          0%, 49% { opacity: 0; }
          50%, 100% { opacity: 1; }
        }
        @keyframes ks-steam-1 {
          0%   { opacity: 0; transform: translateY(0); }
          15%  { opacity: 0.85; }
          80%  { opacity: 0.3; }
          100% { opacity: 0; transform: translateY(-${4 * S}px); }
        }
        @keyframes ks-steam-2 {
          0%   { opacity: 0; transform: translateY(0); }
          15%  { opacity: 0.7; }
          80%  { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-${3 * S}px); }
        }
        @keyframes ks-order-up {
          0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.85); }
          12%  { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
          20%  { transform: translate(-50%, -50%) scale(1); }
          75%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -52%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ks-anim { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="w-full overflow-hidden border-b-2 border-brand select-none"
        style={{
          background: C.wallCream,
          height: "clamp(80px, 10.5vw, 120px)",
        }}
      >
        {/* Outer wrapper: centres the scene and scales for breakpoints */}
        <div
          className="flex items-end justify-center h-full"
          style={{ paddingBottom: 0 }}
        >
          {/*
            Scale the 360px scene down to fit smaller viewports.
            At 768px viewport, scale = 0.67 → scene appears 241px wide.
            At 1024px+, scale = 1.0.
          */}
          <style>{`
            .ks-scene-wrap {
              transform-origin: bottom center;
              transform: scale(1);
            }
            @media (max-width: 767px) {
              .ks-scene-wrap { transform: scale(0.67); }
            }
            @media (min-width: 768px) and (max-width: 1023px) {
              .ks-scene-wrap { transform: scale(0.83); }
            }
          `}</style>

          <div
            className="ks-scene-wrap relative"
            style={{ width: sceneW, height: sceneH }}
          >
            {/* ── Wall background ── */}
            <div
              className="absolute inset-0"
              style={{ background: C.wallCream }}
            />

            {/* ── Counter (bottom strip) ── */}
            <Dot
              col={COUNTER_COL}
              row={COUNTER_ROW}
              shadow={counterShadow}
              S={S}
            />

            {/* ── Stove body ── */}
            <Dot col={STOVE_COL} row={STOVE_ROW} shadow={stoveShadow} S={S} />

            {/* ── Flames ── */}
            {showFlames && (
              <>
                <Dot
                  col={FLAME_COL}
                  row={FLAME_ROW}
                  shadow={flameAShadow}
                  S={S}
                  className="ks-anim"
                  style={{ animation: "ks-flicker-a 0.35s steps(1) infinite" }}
                />
                <Dot
                  col={FLAME_COL}
                  row={FLAME_ROW}
                  shadow={flameBShadow}
                  S={S}
                  className="ks-anim"
                  style={{ animation: "ks-flicker-b 0.35s steps(1) infinite" }}
                />
              </>
            )}

            {/* ── Steam wisps ── */}
            {showSteam && (
              <>
                <Dot
                  col={STEAM_COL}
                  row={STEAM_ROW}
                  shadow={steamShadow}
                  S={S}
                  className="ks-anim"
                  style={{ animation: "ks-steam-1 1.8s ease-out infinite" }}
                />
                <Dot
                  col={STEAM_COL + 3}
                  row={STEAM_ROW}
                  shadow={steamShadow}
                  S={S}
                  className="ks-anim"
                  style={{
                    animation: "ks-steam-2 1.8s ease-out 0.7s infinite",
                  }}
                />
              </>
            )}

            {/* ── Error X ── */}
            {showError && (
              <Dot
                col={ERR_COL}
                row={ERR_ROW}
                shadow={errorXShadow}
                S={S}
              />
            )}

            {/* ── Shelf 1 ── */}
            <Dot
              col={SHELF1_COL}
              row={SHELF1_ROW}
              shadow={shelf1Shadow}
              S={S}
            />
            {/* ── Pot on shelf 1 ── */}
            <Dot col={POT1_COL} row={POT1_ROW} shadow={pot1Shadow} S={S} />

            {/* ── Shelf 2 ── */}
            <Dot
              col={SHELF2_COL}
              row={SHELF2_ROW}
              shadow={shelf2Shadow}
              S={S}
            />
            {/* ── Pot on shelf 2 ── */}
            <Dot col={POT2_COL} row={POT2_ROW} shadow={pot2Shadow} S={S} />

            {/* ── Window ── */}
            <Dot col={WIN_COL} row={WIN_ROW} shadow={windowShadow} S={S} />

            {/* ── ORDER UP! overlay ── */}
            {showDone && (
              <div
                className="ks-anim absolute"
                style={{
                  top: "45%",
                  left: "50%",
                  zIndex: 20,
                  fontFamily: "var(--font-press-start, 'Courier New', monospace)",
                  fontSize: 10,
                  color: C.gold,
                  background: C.brand,
                  border: `2px solid ${C.gold}`,
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                  animation: "ks-order-up 2.8s ease-out forwards",
                }}
              >
                ORDER UP!
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Dot: a 1×1 div that paints pixels via box-shadow ──────────────────────

interface DotProps {
  col: number;
  row: number;
  shadow: string;
  S: number;
  className?: string;
  style?: React.CSSProperties;
}

function Dot({ col, row, shadow, S, className = "", style }: DotProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top: row * S,
        left: col * S,
        width: 1,
        height: 1,
        boxShadow: shadow,
        ...style,
      }}
    />
  );
}
