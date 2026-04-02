"use client";

/**
 * KitchenScene — NES-style pixel art kitchen banner.
 *
 * Full-width diner kitchen rendered with CSS grid pixel art.
 * Each cell in the grid is a colored square — no images needed.
 *
 * States:
 *   idle    — kitchen at rest
 *   cooking — stove flames flicker, steam rises, pan sizzles
 *   done    — "ORDER UP!" ticket drops from rail
 *   error   — flames out, red X
 */

export interface KitchenSceneProps {
  status: "idle" | "cooking" | "done" | "error";
}

// 8-bit palette tuned to brag.fast brand
const P = {
  // Brand
  brand: "#4A3326",
  gold: "#F8AF3C",
  cream: "#FFF8F0",
  // Kitchen
  wall: "#F5E6C8",
  wallTile: "#EDD9B5",
  wallLine: "#D4C4A0",
  // Counter
  counterTop: "#B8956A",
  counterTopLight: "#CBAA82",
  counterFace: "#8B6B42",
  counterShadow: "#6A4E2E",
  // Stove
  stoveBody: "#5C5C5C",
  stoveTop: "#787878",
  stoveHighlight: "#9A9A9A",
  stoveDark: "#3A3A3A",
  burnerRing: "#444444",
  knob: "#222222",
  // Oven
  ovenDoor: "#4A4A4A",
  ovenGlass: "#2A2A2A",
  ovenHandle: "#888888",
  // Flames
  flameCore: "#FFE040",
  flameMid: "#FF8C00",
  flameOuter: "#E03000",
  // Fridge
  fridgeBody: "#D8D0C0",
  fridgeLight: "#E8E0D4",
  fridgeDark: "#B0A890",
  fridgeHandle: "#888888",
  // Shelf / rail
  shelfWood: "#8B6B42",
  shelfShadow: "#6A4E2E",
  rail: "#888888",
  railDark: "#666666",
  // Utensils (hanging)
  panBody: "#6A6A6A",
  panDark: "#4A4A4A",
  panHandle: "#8B6B42",
  ladle: "#7A7A7A",
  // Pot on stove
  potBody: "#7A7A7A",
  potDark: "#555555",
  potRim: "#999999",
  // Ticket
  ticketWhite: "#FFFFFF",
  ticketShadow: "#E0D8CC",
  // Floor
  floorA: "#C4A472",
  floorB: "#B89462",
  // Steam
  steamLight: "rgba(255,255,255,0.7)",
  steamFade: "rgba(255,255,255,0.3)",
  // Error
  errorRed: "#CC1100",
  errorDark: "#880000",
} as const;

// Grid dimensions: 80 cols × 20 rows — renders at 5px/cell = 400×100 base
const COLS = 80;
const ROWS = 20;
const CELL = 5;

// Build a 2D grid (row-major), initialized to transparent
type Grid = (string | null)[][];

function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rect(g: Grid, x: number, y: number, w: number, h: number, c: string) {
  for (let r = y; r < y + h && r < ROWS; r++)
    for (let col = x; col < x + w && col < COLS; col++)
      if (r >= 0 && col >= 0) g[r][col] = c;
}

function dot(g: Grid, x: number, y: number, c: string) {
  if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = c;
}

function buildScene(): Grid {
  const g = createGrid();

  // ── Back wall ──
  rect(g, 0, 0, COLS, 14, P.wall);
  // Tile pattern on wall (horizontal lines every 4 rows)
  for (let r = 3; r < 14; r += 4)
    for (let c = 0; c < COLS; c++) dot(g, c, r, P.wallLine);
  // Vertical tile lines offset per row
  for (let r = 0; r < 14; r++)
    for (let c = (r % 2 === 0 ? 0 : 5); c < COLS; c += 10)
      dot(g, c, r, P.wallTile);

  // ── Floor ──
  for (let r = 16; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      g[r][c] = (c + r) % 2 === 0 ? P.floorA : P.floorB;

  // ── Counter runs full width ──
  rect(g, 0, 14, COLS, 1, P.counterTopLight);
  rect(g, 0, 15, COLS, 1, P.counterTop);
  rect(g, 0, 16, COLS, 1, P.counterFace);
  // Counter edge shadow
  for (let c = 0; c < COLS; c++) dot(g, c, 14, P.counterTopLight);

  // ── Fridge (far left) ──
  rect(g, 1, 4, 8, 10, P.fridgeBody);
  rect(g, 1, 4, 8, 1, P.fridgeLight); // top edge
  rect(g, 1, 4, 1, 10, P.fridgeLight); // left edge
  rect(g, 8, 4, 1, 10, P.fridgeDark); // right edge
  // Fridge handle
  rect(g, 7, 7, 1, 3, P.fridgeHandle);
  // Fridge line (door split)
  for (let r = 4; r < 14; r++) dot(g, 5, r, P.fridgeDark);

  // ── Stove (center-left) ──
  const sx = 14;
  // Stove body
  rect(g, sx, 6, 12, 8, P.stoveBody);
  rect(g, sx, 6, 12, 1, P.stoveHighlight); // top surface
  rect(g, sx, 6, 1, 8, P.stoveHighlight); // left edge
  rect(g, sx + 11, 6, 1, 8, P.stoveDark); // right edge
  rect(g, sx, 13, 12, 1, P.stoveDark); // bottom edge
  // Burner rings on stovetop (row 6)
  for (const bx of [sx + 2, sx + 7]) {
    dot(g, bx, 6, P.burnerRing);
    dot(g, bx + 1, 6, P.burnerRing);
    dot(g, bx + 2, 6, P.burnerRing);
  }
  // Oven door
  rect(g, sx + 2, 9, 8, 4, P.ovenDoor);
  rect(g, sx + 3, 10, 6, 2, P.ovenGlass);
  // Oven handle
  rect(g, sx + 3, 9, 6, 1, P.ovenHandle);
  // Knobs row
  for (const kx of [sx + 2, sx + 4, sx + 6, sx + 8]) {
    dot(g, kx, 7, P.knob);
  }

  // ── Pot on stove ──
  const px = sx + 2;
  rect(g, px, 4, 4, 1, P.potRim);
  rect(g, px, 5, 4, 1, P.potBody);
  dot(g, px, 4, P.potDark);
  dot(g, px + 3, 4, P.potDark);
  dot(g, px, 5, P.potDark);
  dot(g, px + 3, 5, P.potDark);

  // ── Hanging utensil rail ──
  rect(g, 30, 1, 18, 1, P.rail);
  // Rail brackets
  for (const bx of [31, 39, 47]) {
    dot(g, bx, 0, P.railDark);
    dot(g, bx, 1, P.railDark);
  }
  // Hanging pan
  dot(g, 33, 2, P.panHandle);
  dot(g, 33, 3, P.panHandle);
  rect(g, 32, 4, 3, 1, P.panBody);
  rect(g, 31, 5, 5, 2, P.panBody);
  dot(g, 31, 5, P.panDark);
  dot(g, 35, 5, P.panDark);
  // Hanging ladle
  dot(g, 37, 2, P.ladle);
  dot(g, 37, 3, P.ladle);
  dot(g, 37, 4, P.ladle);
  dot(g, 36, 5, P.ladle);
  dot(g, 37, 5, P.ladle);
  dot(g, 38, 5, P.ladle);
  // Hanging spatula
  dot(g, 41, 2, P.panHandle);
  dot(g, 41, 3, P.panHandle);
  dot(g, 41, 4, P.panHandle);
  dot(g, 40, 5, P.stoveHighlight);
  dot(g, 41, 5, P.stoveHighlight);
  dot(g, 42, 5, P.stoveHighlight);

  // ── Shelf (right side) with items ──
  rect(g, 54, 5, 14, 1, P.shelfWood);
  rect(g, 54, 6, 14, 1, P.shelfShadow);
  // Jar on shelf
  rect(g, 56, 2, 3, 3, P.gold);
  dot(g, 57, 2, P.cream); // label
  // Bottle on shelf
  rect(g, 61, 1, 2, 4, P.fridgeBody);
  dot(g, 61, 1, P.fridgeLight);
  dot(g, 62, 1, P.fridgeDark);
  // Small container
  rect(g, 65, 3, 2, 2, P.counterFace);
  dot(g, 65, 3, P.counterTop);

  // ── Second shelf (lower) ──
  rect(g, 54, 10, 14, 1, P.shelfWood);
  rect(g, 54, 11, 14, 1, P.shelfShadow);
  // Plates on lower shelf
  rect(g, 55, 8, 4, 2, P.cream);
  dot(g, 55, 8, P.wallLine);
  dot(g, 58, 8, P.wallLine);
  // Cup
  rect(g, 62, 8, 2, 2, P.cream);
  dot(g, 61, 9, P.shelfWood); // handle

  // ── Ticket rail (order window vibe) ──
  rect(g, 30, 8, 18, 1, P.railDark);
  // Hanging tickets (little white rectangles)
  for (const tx of [32, 36, 40, 44]) {
    rect(g, tx, 9, 2, 3, P.ticketWhite);
    dot(g, tx, 9, P.ticketShadow);
  }

  // ── Window (far right) ──
  rect(g, 72, 2, 7, 8, P.shelfWood); // frame
  rect(g, 73, 3, 5, 6, "#88BBDD"); // sky
  // Window cross
  for (let r = 3; r < 9; r++) dot(g, 75, r, P.shelfWood);
  for (let c = 73; c < 78; c++) dot(g, c, 6, P.shelfWood);
  // Curtain hints
  dot(g, 73, 3, P.cream);
  dot(g, 77, 3, P.cream);

  return g;
}

// Pre-compute the base scene once at module level
const BASE_SCENE = buildScene();

export function KitchenScene({ status }: KitchenSceneProps) {
  const showFlames = status === "cooking" || status === "done";
  const showSteam = status === "cooking" || status === "done";
  const showDone = status === "done";
  const showError = status === "error";

  const w = COLS * CELL;
  const h = ROWS * CELL;

  return (
    <>
      <style>{`
        .ks-wrap {
          overflow: hidden;
          border-bottom: 2px solid var(--color-brand, #4A3326);
          background: ${P.wall};
        }
        .ks-viewport {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          min-width: 100%;
          padding: 8px 0;
        }
        .ks-scene {
          position: relative;
          width: ${w}px;
          height: ${h}px;
          transform-origin: bottom center;
          image-rendering: pixelated;
        }
        @media (max-width: 767px) {
          .ks-scene { transform: scale(0.8); }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .ks-scene { transform: scale(0.9); }
        }
        @media (min-width: 1024px) {
          .ks-scene { transform: scale(1); }
        }
        @media (min-width: 1280px) {
          .ks-scene { transform: scale(1.15); }
        }
        /* Flame flicker: two frames alternate */
        @keyframes ks-flame-a {
          0%, 49.9% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes ks-flame-b {
          0%, 49.9% { opacity: 0; }
          50%, 100% { opacity: 1; }
        }
        /* Steam rise */
        @keyframes ks-rise {
          0%   { opacity: 0; transform: translateY(0); }
          10%  { opacity: 0.8; }
          70%  { opacity: 0.3; }
          100% { opacity: 0; transform: translateY(-${6 * CELL}px); }
        }
        /* Order up ticket drop */
        @keyframes ks-ticket-drop {
          0%   { opacity: 0; transform: translateY(-${3 * CELL}px); }
          15%  { opacity: 1; transform: translateY(${1 * CELL}px); }
          25%  { transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        /* Error pulse */
        @keyframes ks-err-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ks-anim { animation: none !important; }
        }
      `}</style>

      <div className="ks-wrap select-none" aria-hidden="true">
        <div className="ks-viewport">
          <div className="ks-scene">
            {/* Base scene: CSS grid of colored cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
                width: w,
                height: h,
                position: "absolute",
                inset: 0,
              }}
            >
              {BASE_SCENE.flat().map((color, i) => (
                <div
                  key={i}
                  style={color ? { backgroundColor: color } : undefined}
                />
              ))}
            </div>

            {/* ── Flames (two alternating frames) ── */}
            {showFlames && (
              <>
                <FlameLayer
                  frame="a"
                  offsets={[
                    // Left burner (above pot)
                    [16 * CELL, 3 * CELL],
                    [17 * CELL, 2 * CELL],
                    [18 * CELL, 3 * CELL],
                  ]}
                  colors={[P.flameOuter, P.flameCore, P.flameMid]}
                />
                <FlameLayer
                  frame="b"
                  offsets={[
                    [16 * CELL, 2 * CELL],
                    [17 * CELL, 3 * CELL],
                    [18 * CELL, 2 * CELL],
                  ]}
                  colors={[P.flameMid, P.flameOuter, P.flameCore]}
                />
                {/* Right burner flames */}
                <FlameLayer
                  frame="a"
                  offsets={[
                    [21 * CELL, 3 * CELL],
                    [22 * CELL, 2 * CELL],
                    [23 * CELL, 3 * CELL],
                  ]}
                  colors={[P.flameMid, P.flameCore, P.flameOuter]}
                />
                <FlameLayer
                  frame="b"
                  offsets={[
                    [21 * CELL, 2 * CELL],
                    [22 * CELL, 3 * CELL],
                    [23 * CELL, 2 * CELL],
                  ]}
                  colors={[P.flameCore, P.flameMid, P.flameOuter]}
                />
              </>
            )}

            {/* ── Steam wisps ── */}
            {showSteam && (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="ks-anim"
                    style={{
                      position: "absolute",
                      left: (17 + i * 2) * CELL,
                      top: 0,
                      width: CELL,
                      height: CELL,
                      borderRadius: "50%",
                      backgroundColor: P.steamLight,
                      animation: `ks-rise 2s ease-out ${i * 0.5}s infinite`,
                    }}
                  />
                ))}
              </>
            )}

            {/* ── ORDER UP! ── */}
            {showDone && (
              <div
                className="ks-anim"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "20%",
                  transform: "translateX(-50%)",
                  fontFamily:
                    "var(--font-press-start, 'Press Start 2P', monospace)",
                  fontSize: 10,
                  color: P.gold,
                  background: P.brand,
                  border: `2px solid ${P.gold}`,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                  zIndex: 20,
                  animation: "ks-ticket-drop 3s ease-out forwards",
                  boxShadow: `3px 3px 0 ${P.brand}`,
                }}
              >
                ORDER UP!
              </div>
            )}

            {/* ── Error X ── */}
            {showError && (
              <div
                className="ks-anim"
                style={{
                  position: "absolute",
                  left: 18 * CELL,
                  top: 1 * CELL,
                  width: 5 * CELL,
                  height: 5 * CELL,
                  zIndex: 20,
                  animation: "ks-err-pulse 1s ease-in-out infinite",
                }}
              >
                {/* Pixel X using positioned cells */}
                {[
                  [0, 0], [1, 1], [2, 2], [3, 3], [4, 4],
                  [4, 0], [3, 1], [1, 3], [0, 4],
                ].map(([x, y], i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: x * CELL,
                      top: y * CELL,
                      width: CELL,
                      height: CELL,
                      backgroundColor: i < 5 ? P.errorRed : P.errorDark,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Flame layer helper ──

function FlameLayer({
  frame,
  offsets,
  colors,
}: {
  frame: "a" | "b";
  offsets: [number, number][];
  colors: string[];
}) {
  return (
    <div
      className="ks-anim"
      style={{
        position: "absolute",
        inset: 0,
        animation: `ks-flame-${frame} 0.3s steps(1) infinite`,
        zIndex: 10,
      }}
    >
      {offsets.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: CELL,
            height: CELL * 2,
            backgroundColor: colors[i % colors.length],
          }}
        />
      ))}
    </div>
  );
}
