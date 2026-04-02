/**
 * Detailed NES-style kitchen pixel data for the 3D kitchen scene.
 * 120 cols × 60 rows at 4px/cell = 480×240px base.
 *
 * Same rect/dot pattern as kitchen-scene.tsx but with more detail:
 * bigger fridge, oven with fire chamber, shelves, cook character positions.
 */

// ── Palette (extends kitchen-scene palette) ──────────────────────────────────

export const P = {
  // Brand
  brand: "#4A3326",
  gold: "#F8AF3C",
  cream: "#FFF8F0",
  // Kitchen walls
  wall: "#F5E6C8",
  wallTile: "#EDD9B5",
  wallLine: "#D4C4A0",
  wallDark: "#C8B898",
  // Counter
  counterTop: "#B8956A",
  counterTopLight: "#CBAA82",
  counterFace: "#8B6B42",
  counterShadow: "#6A4E2E",
  counterEdge: "#A07848",
  // Stove / Oven
  stoveBody: "#5C5C5C",
  stoveTop: "#787878",
  stoveHighlight: "#9A9A9A",
  stoveDark: "#3A3A3A",
  burnerRing: "#444444",
  knob: "#222222",
  ovenDoor: "#4A4A4A",
  ovenGlass: "#2A2A2A",
  ovenHandle: "#888888",
  ovenInner: "#1A1A1A",
  ovenRack: "#666666",
  // Flames
  flameCore: "#FFE040",
  flameMid: "#FF8C00",
  flameOuter: "#E03000",
  // Fridge
  fridgeBody: "#D8D0C0",
  fridgeLight: "#E8E0D4",
  fridgeDark: "#B0A890",
  fridgeHandle: "#888888",
  fridgeInner: "#E0E8F0",
  // Shelf / rail
  shelfWood: "#8B6B42",
  shelfShadow: "#6A4E2E",
  shelfLight: "#A08058",
  rail: "#888888",
  railDark: "#666666",
  // Utensils
  panBody: "#6A6A6A",
  panDark: "#4A4A4A",
  panHandle: "#8B6B42",
  ladle: "#7A7A7A",
  // Pot on stove
  potBody: "#7A7A7A",
  potDark: "#555555",
  potRim: "#999999",
  potLid: "#8A8A8A",
  // Ticket
  ticketWhite: "#FFFFFF",
  ticketShadow: "#E0D8CC",
  // Floor
  floorA: "#C4A472",
  floorB: "#B89462",
  floorDark: "#9A7A52",
  // Steam
  steamLight: "rgba(255,255,255,0.7)",
  steamFade: "rgba(255,255,255,0.3)",
  // Error
  errorRed: "#CC1100",
  errorDark: "#880000",
  // Extras
  sky: "#88BBDD",
  skyLight: "#A8D0E8",
  plantGreen: "#4A8844",
  plantDark: "#2E6628",
  plantPot: "#AA6633",
  plateWhite: "#F0EDE8",
  plateEdge: "#D8D2C8",
  bottleGreen: "#446644",
  bottleBlue: "#4466AA",
  jarLid: "#AA8844",
  towelRed: "#CC4444",
  towelStripe: "#DD6666",
  sinkBasin: "#C0C4CC",
  sinkDark: "#9099A0",
  faucet: "#AAAAAA",
} as const;

// ── Grid config ──────────────────────────────────────────────────────────────

export const COLS = 120;
export const ROWS = 60;
export const CELL = 4;

// ── Position constants for cook sprite targeting ─────────────────────────────

export const POSITIONS = {
  FRIDGE: 8,
  SINK: 24,
  OVEN: 42,
  CENTER: 58,
  SHELVES: 92,
  WINDOW: 108,
} as const;

// ── Grid helpers ─────────────────────────────────────────────────────────────

export type Grid = (string | null)[][];

export function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function rect(g: Grid, x: number, y: number, w: number, h: number, c: string) {
  for (let r = y; r < y + h && r < ROWS; r++)
    for (let col = x; col < x + w && col < COLS; col++)
      if (r >= 0 && col >= 0) g[r][col] = c;
}

export function dot(g: Grid, x: number, y: number, c: string) {
  if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = c;
}

// ── Build the scene ──────────────────────────────────────────────────────────

function buildScene(): Grid {
  const g = createGrid();

  // ── Back wall ──
  rect(g, 0, 0, COLS, 38, P.wall);
  // Tile lines (horizontal every 6 rows)
  for (let r = 5; r < 38; r += 6)
    for (let c = 0; c < COLS; c++) dot(g, c, r, P.wallLine);
  // Vertical tile lines, offset per band
  for (let r = 0; r < 38; r++)
    for (let c = (r % 2 === 0 ? 0 : 5); c < COLS; c += 10)
      dot(g, c, r, P.wallTile);

  // ── Floor (checkered) ──
  for (let r = 42; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      g[r][c] = (c + r) % 2 === 0 ? P.floorA : P.floorB;
  // Floor shadow under counter
  for (let c = 0; c < COLS; c++) dot(g, c, 42, P.floorDark);

  // ── Counter (full width) ──
  rect(g, 0, 38, COLS, 1, P.counterTopLight);
  rect(g, 0, 39, COLS, 1, P.counterTop);
  rect(g, 0, 40, COLS, 2, P.counterFace);

  // ── Fridge (far left) ──
  const fx = 2;
  rect(g, fx, 8, 14, 30, P.fridgeBody);
  rect(g, fx, 8, 14, 1, P.fridgeLight);          // top edge
  rect(g, fx, 8, 1, 30, P.fridgeLight);           // left edge
  rect(g, fx + 13, 8, 1, 30, P.fridgeDark);       // right edge
  // Door split
  for (let r = 8; r < 38; r++) dot(g, fx + 7, r, P.fridgeDark);
  // Handle
  rect(g, fx + 11, 14, 1, 6, P.fridgeHandle);
  rect(g, fx + 11, 26, 1, 6, P.fridgeHandle);
  // Freezer/fridge divider
  rect(g, fx + 1, 22, 12, 1, P.fridgeDark);
  // Top of fridge detail
  rect(g, fx + 1, 8, 12, 1, P.fridgeLight);

  // ── Sink (between fridge and stove) ──
  const skx = 20;
  // Basin
  rect(g, skx, 35, 10, 3, P.sinkBasin);
  rect(g, skx + 1, 36, 8, 2, P.sinkDark);
  // Faucet
  rect(g, skx + 4, 30, 2, 5, P.faucet);
  rect(g, skx + 3, 30, 4, 1, P.faucet);
  dot(g, skx + 3, 31, P.rail);
  // Faucet spout
  rect(g, skx + 6, 31, 2, 1, P.faucet);
  dot(g, skx + 7, 32, P.faucet);

  // ── Stove / Oven (center-left) ──
  const sx = 34;
  // Stove body
  rect(g, sx, 14, 18, 24, P.stoveBody);
  rect(g, sx, 14, 18, 1, P.stoveHighlight);       // top surface
  rect(g, sx, 14, 1, 24, P.stoveHighlight);        // left edge
  rect(g, sx + 17, 14, 1, 24, P.stoveDark);        // right edge
  rect(g, sx, 37, 18, 1, P.stoveDark);             // bottom edge

  // Stovetop surface
  rect(g, sx + 1, 14, 16, 2, P.stoveTop);
  // Burner rings (2 burners)
  for (const bx of [sx + 3, sx + 11]) {
    rect(g, bx, 14, 4, 1, P.burnerRing);
    dot(g, bx - 1, 14, P.stoveBody);
    dot(g, bx + 4, 14, P.stoveBody);
  }
  // Knobs row
  for (const kx of [sx + 3, sx + 6, sx + 10, sx + 13]) {
    dot(g, kx, 17, P.knob);
    dot(g, kx, 18, P.stoveDark);
  }

  // Oven door
  rect(g, sx + 2, 20, 14, 16, P.ovenDoor);
  rect(g, sx + 3, 21, 12, 1, P.ovenHandle);
  // Oven glass window
  rect(g, sx + 4, 23, 10, 10, P.ovenGlass);
  // Inner glow area (where fire will show)
  rect(g, sx + 5, 24, 8, 8, P.ovenInner);
  // Oven rack lines
  for (let c = sx + 5; c < sx + 13; c += 2) {
    dot(g, c, 27, P.ovenRack);
    dot(g, c, 30, P.ovenRack);
  }

  // ── Pot on stove ──
  const px = sx + 3;
  rect(g, px, 11, 4, 1, P.potLid);
  rect(g, px - 1, 12, 6, 1, P.potRim);
  rect(g, px - 1, 13, 6, 1, P.potBody);
  dot(g, px - 1, 12, P.potDark);
  dot(g, px + 4, 12, P.potDark);

  // ── Hanging utensil rail ──
  rect(g, 56, 2, 26, 1, P.rail);
  // Rail brackets
  for (const bx of [57, 68, 80]) {
    dot(g, bx, 0, P.railDark);
    dot(g, bx, 1, P.railDark);
  }
  // Hanging pan
  rect(g, 59, 3, 1, 2, P.panHandle);
  rect(g, 57, 5, 5, 1, P.panBody);
  rect(g, 56, 6, 7, 2, P.panBody);
  dot(g, 56, 6, P.panDark);
  dot(g, 62, 6, P.panDark);
  // Hanging ladle
  dot(g, 66, 3, P.ladle);
  dot(g, 66, 4, P.ladle);
  dot(g, 66, 5, P.ladle);
  rect(g, 65, 6, 3, 1, P.ladle);
  rect(g, 64, 7, 3, 2, P.ladle);
  // Hanging spatula
  dot(g, 72, 3, P.panHandle);
  dot(g, 72, 4, P.panHandle);
  dot(g, 72, 5, P.panHandle);
  rect(g, 71, 6, 3, 1, P.stoveHighlight);
  rect(g, 71, 7, 3, 1, P.stoveHighlight);
  // Towel on rail
  rect(g, 76, 3, 3, 5, P.towelRed);
  dot(g, 77, 4, P.towelStripe);
  dot(g, 77, 6, P.towelStripe);

  // ── Upper shelf (right side) ──
  rect(g, 84, 10, 20, 1, P.shelfWood);
  rect(g, 84, 11, 20, 1, P.shelfShadow);
  // Jar 1 (gold, seasoning)
  rect(g, 86, 6, 4, 4, P.gold);
  rect(g, 86, 6, 4, 1, P.jarLid);
  dot(g, 87, 8, P.cream); // label
  dot(g, 88, 8, P.cream);
  // Bottle (green)
  rect(g, 92, 5, 3, 5, P.bottleGreen);
  dot(g, 93, 5, P.plantDark);
  // Bottle (blue)
  rect(g, 97, 6, 3, 4, P.bottleBlue);
  dot(g, 98, 6, P.sky);
  // Small jar
  rect(g, 101, 7, 2, 3, P.counterFace);
  dot(g, 101, 7, P.counterTop);

  // ── Lower shelf ──
  rect(g, 84, 20, 20, 1, P.shelfWood);
  rect(g, 84, 21, 20, 1, P.shelfShadow);
  // Stacked plates
  rect(g, 86, 17, 5, 3, P.plateWhite);
  dot(g, 86, 17, P.plateEdge);
  dot(g, 90, 17, P.plateEdge);
  rect(g, 86, 19, 5, 1, P.plateEdge);
  // Cup
  rect(g, 93, 17, 3, 3, P.cream);
  dot(g, 92, 18, P.shelfWood); // handle
  // Another jar
  rect(g, 98, 17, 3, 3, P.fridgeBody);
  dot(g, 99, 17, P.fridgeLight);

  // ── Third shelf (lower) ──
  rect(g, 84, 30, 20, 1, P.shelfWood);
  rect(g, 84, 31, 20, 1, P.shelfShadow);
  // Bowls
  rect(g, 86, 27, 4, 3, P.plateWhite);
  rect(g, 87, 27, 2, 1, P.plateEdge);
  // Spice bottles
  rect(g, 92, 27, 2, 3, P.towelRed);
  rect(g, 95, 27, 2, 3, P.gold);
  rect(g, 98, 28, 2, 2, P.bottleGreen);

  // ── Ticket / order window area ──
  rect(g, 56, 14, 22, 1, P.railDark);
  rect(g, 56, 15, 22, 1, P.shelfWood);
  // "ORDER" text area (just colored blocks to suggest a menu board)
  rect(g, 58, 16, 18, 6, P.brand);
  rect(g, 59, 17, 16, 4, P.stoveDark);
  // Hanging tickets
  for (const tx of [60, 64, 68, 72]) {
    rect(g, tx, 22, 2, 4, P.ticketWhite);
    dot(g, tx, 22, P.ticketShadow);
  }

  // ── Window (far right) ──
  rect(g, 106, 4, 12, 16, P.shelfWood); // frame
  rect(g, 107, 5, 10, 14, P.sky);       // sky
  // Window cross
  for (let r = 5; r < 19; r++) dot(g, 112, r, P.shelfWood);
  for (let c = 107; c < 117; c++) dot(g, c, 12, P.shelfWood);
  // Clouds
  rect(g, 108, 7, 3, 1, P.cream);
  rect(g, 114, 9, 2, 1, P.cream);
  // Curtain accents
  rect(g, 107, 5, 1, 3, P.cream);
  rect(g, 116, 5, 1, 3, P.cream);

  // ── Small plant on counter ──
  // Pot
  rect(g, 110, 35, 4, 3, P.plantPot);
  dot(g, 110, 35, P.counterShadow);
  // Leaves
  dot(g, 111, 34, P.plantGreen);
  dot(g, 112, 34, P.plantGreen);
  dot(g, 110, 33, P.plantGreen);
  dot(g, 113, 33, P.plantGreen);
  dot(g, 111, 32, P.plantDark);
  dot(g, 112, 32, P.plantDark);

  return g;
}

// Pre-compute at module level
export const BASE_SCENE = buildScene();
