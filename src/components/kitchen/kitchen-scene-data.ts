/**
 * High-resolution NES-style kitchen pixel data.
 * 240 cols × 120 rows at 2px/cell = 480×240px base.
 *
 * 4× the detail of the original 120×60 grid while maintaining
 * the same display dimensions. Rendered via <canvas> for performance.
 */

// ── Palette ─────────────────────────────────────────────────────────────────

export const P = {
  // Brand
  brand: "#4A3326",
  gold: "#F8AF3C",
  cream: "#FFF8F0",

  // Kitchen walls
  wall: "#F0DEB8",
  wallTile: "#E8D4AA",
  wallLine: "#D0C090",
  wallDark: "#C0B080",
  wallLight: "#F5E8C8",

  // Counter
  counterTop: "#B8956A",
  counterTopLight: "#D0B088",
  counterHighlight: "#E0C8A0",
  counterFace: "#8B6B42",
  counterShadow: "#6A4E2E",
  counterEdge: "#A07848",

  // Cabinets
  cabFace: "#A07848",
  cabPanel: "#8B6B42",
  cabPanelLight: "#B89060",
  cabPanelInner: "#937550",
  cabKnob: "#333333",
  cabShadow: "#6A4E2E",
  cabEdge: "#7A5A38",

  // Stove / Oven
  stoveBody: "#5C5C5C",
  stoveTop: "#707070",
  stoveHighlight: "#8A8A8A",
  stoveDark: "#3A3A3A",
  stoveVeryDark: "#2A2A2A",
  burnerRing: "#444444",
  knob: "#222222",
  knobDot: "#555555",
  ovenDoor: "#4A4A4A",
  ovenFrame: "#555555",
  ovenGlass: "#2A2A2A",
  ovenHandle: "#999999",
  ovenHandleHi: "#BBBBBB",
  ovenInner: "#1A1A1A",
  ovenRack: "#666666",

  // Flames
  flameCore: "#FFE040",
  flameMid: "#FF8C00",
  flameOuter: "#E03000",

  // Fridge
  fridgeBody: "#C8C0B0",
  fridgeLight: "#D8D0C4",
  fridgeHi: "#E4DCD0",
  fridgeMid: "#B8B0A0",
  fridgeDark: "#A0988C",
  fridgeVDark: "#908880",
  fridgeHandle: "#909090",
  fridgeHandleHi: "#AAAAAA",
  fridgePanelLine: "#B0A898",

  // Range hood
  hoodBody: "#6A4E2E",
  hoodDark: "#5A3E1E",
  hoodLight: "#7A5E3E",
  hoodEdge: "#8B6B42",
  hoodUnder: "#4A3326",

  // Shelf / rail
  shelfWood: "#8B6B42",
  shelfTop: "#A07848",
  shelfShadow: "#6A4E2E",
  shelfLight: "#B08858",
  rail: "#888888",
  railLight: "#AAAAAA",
  railDark: "#666666",

  // Utensils
  panBody: "#5A5A5A",
  panDark: "#3A3A3A",
  panLight: "#7A7A7A",
  panHandle: "#8B6B42",
  ladle: "#7A7A7A",
  ladleDark: "#5A5A5A",

  // Pot on stove
  potBody: "#7A7A7A",
  potDark: "#555555",
  potRim: "#999999",
  potLid: "#8A8A8A",
  potLidKnob: "#666666",

  // Ticket
  ticketWhite: "#FFFFFF",
  ticketShadow: "#E0D8CC",

  // Floor
  floorA: "#C4A472",
  floorB: "#B89462",
  floorDark: "#9A7A52",
  floorLight: "#D0B080",

  // Steam
  steamLight: "rgba(255,255,255,0.7)",
  steamFade: "rgba(255,255,255,0.3)",

  // Error
  errorRed: "#CC1100",
  errorDark: "#880000",

  // Items on shelves
  plateWhite: "#F0EDE8",
  plateEdge: "#D8D2C8",
  bowlWhite: "#F4F0E8",
  bowlInner: "#E8E4DC",
  cupWhite: "#F8F4F0",
  cupHandle: "#D8D0C8",
  bottleGreen: "#446644",
  bottleDkGreen: "#2E4E2E",
  bottleBlue: "#4466AA",
  bottleLtBlue: "#6688CC",
  bottleRed: "#AA3333",
  jarGold: "#D4A030",
  jarBody: "#E8C060",
  jarLid: "#AA8844",
  bookBrown: "#7A5A38",
  bookRed: "#CC4444",
  bookBlue: "#4466AA",
  bookGreen: "#448844",

  // Sink
  sinkBasin: "#C0C4CC",
  sinkDark: "#9099A0",
  faucet: "#AAAAAA",
  faucetDark: "#888888",

  // Misc
  towelRed: "#CC4444",
  towelStripe: "#DD6666",
} as const;

// ── Grid config ─────────────────────────────────────────────────────────────

export const COLS = 240;
export const ROWS = 120;
export const CELL = 2;

// ── Position constants for cook sprite targeting ────────────────────────────

export const POSITIONS = {
  FRIDGE: 20,
  SINK: 50,
  OVEN: 88,
  CENTER: 130,
  SHELVES: 200,
} as const;

// ── Grid helpers ────────────────────────────────────────────────────────────

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

// ── Cabinet door helper ─────────────────────────────────────────────────────

function cabinetDoor(g: Grid, x: number, y: number, w: number, h: number) {
  // Outer frame
  rect(g, x, y, w, h, P.cabFace);
  // Top/left highlight
  for (let c = x; c < x + w; c++) dot(g, c, y, P.cabPanelLight);
  for (let r = y; r < y + h; r++) dot(g, x, r, P.cabPanelLight);
  // Bottom/right shadow
  for (let c = x; c < x + w; c++) dot(g, c, y + h - 1, P.cabShadow);
  for (let r = y; r < y + h; r++) dot(g, x + w - 1, r, P.cabShadow);
  // Inner recessed panel
  const inset = 3;
  rect(g, x + inset, y + inset, w - inset * 2, h - inset * 2, P.cabPanel);
  // Panel highlight (top-left inner)
  for (let c = x + inset; c < x + w - inset; c++) dot(g, c, y + inset, P.cabPanelInner);
  for (let r = y + inset; r < y + h - inset; r++) dot(g, x + inset, r, P.cabPanelInner);
  // Knob
  const kx = x + Math.floor(w / 2);
  const ky = y + Math.floor(h / 2);
  dot(g, kx, ky, P.cabKnob);
  dot(g, kx + 1, ky, P.cabKnob);
}

// ── Build the scene ─────────────────────────────────────────────────────────

function buildScene(): Grid {
  const g = createGrid();

  // ════════════════════════════════════════════════════════════════════════════
  // BACK WALL — warm beige tiles with grout grid
  // ════════════════════════════════════════════════════════════════════════════
  rect(g, 0, 0, COLS, 76, P.wall);

  // Horizontal grout lines every 10 rows
  for (let r = 9; r < 76; r += 10) {
    for (let c = 0; c < COLS; c++) {
      dot(g, c, r, P.wallLine);
    }
  }

  // Vertical grout lines every 16 cols, brick-offset per band
  for (let band = 0; band < 8; band++) {
    const rStart = band * 10;
    const rEnd = Math.min(rStart + 9, 75);
    const offset = band % 2 === 0 ? 0 : 8;
    for (let c = offset; c < COLS; c += 16) {
      for (let r = rStart; r < rEnd; r++) {
        dot(g, c, r, P.wallLine);
      }
    }
  }

  // Subtle tile highlight — lighter dot in top-left of each tile
  for (let band = 0; band < 8; band++) {
    const rStart = band * 10;
    const offset = band % 2 === 0 ? 0 : 8;
    for (let c = offset + 1; c < COLS; c += 16) {
      if (rStart + 1 < 76) dot(g, c, rStart + 1, P.wallLight);
      if (rStart + 1 < 76) dot(g, c + 1, rStart + 1, P.wallLight);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FLOOR — checkered pattern
  // ════════════════════════════════════════════════════════════════════════════
  for (let r = 97; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Diamond check: offset every other row by 2 for diamond feel
      const shifted = c + (r % 2 === 0 ? 0 : 2);
      g[r][c] = (Math.floor(shifted / 4) + Math.floor(r / 4)) % 2 === 0 ? P.floorA : P.floorB;
    }
  }
  // Shadow line under cabinets
  for (let c = 0; c < COLS; c++) {
    dot(g, c, 97, P.floorDark);
    dot(g, c, 98, P.floorDark);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COUNTER TOP — wooden surface, full width
  // ════════════════════════════════════════════════════════════════════════════
  rect(g, 0, 75, COLS, 1, P.counterHighlight);  // top highlight
  rect(g, 0, 76, COLS, 2, P.counterTop);         // surface
  rect(g, 0, 78, COLS, 1, P.counterTopLight);     // front bevel
  rect(g, 0, 79, COLS, 1, P.counterEdge);         // front edge

  // ════════════════════════════════════════════════════════════════════════════
  // CABINETS — wooden panel doors below counter
  // ════════════════════════════════════════════════════════════════════════════

  // Cabinet back face fills the area between counter and floor
  rect(g, 0, 80, COLS, 17, P.cabFace);
  // Bottom edge
  rect(g, 0, 96, COLS, 1, P.cabShadow);

  // Cabinet doors: between fridge and oven
  cabinetDoor(g, 38, 81, 14, 15);
  cabinetDoor(g, 53, 81, 14, 15);

  // Cabinet doors: right of oven
  cabinetDoor(g, 112, 81, 16, 15);
  cabinetDoor(g, 129, 81, 16, 15);
  cabinetDoor(g, 146, 81, 16, 15);
  cabinetDoor(g, 163, 81, 16, 15);

  // Cabinet doors: under shelves
  cabinetDoor(g, 180, 81, 16, 15);
  cabinetDoor(g, 197, 81, 16, 15);
  cabinetDoor(g, 214, 81, 16, 15);

  // ════════════════════════════════════════════════════════════════════════════
  // FRIDGE — double door, tall standing unit (left side)
  // ════════════════════════════════════════════════════════════════════════════
  const fx = 4;
  const fy = 14;
  const fw = 30;
  const fh = 83; // extends below counter to floor line

  // Main body
  rect(g, fx, fy, fw, fh, P.fridgeBody);

  // Top highlight
  rect(g, fx, fy, fw, 2, P.fridgeHi);
  // Left edge highlight
  for (let r = fy; r < fy + fh; r++) {
    dot(g, fx, r, P.fridgeLight);
    dot(g, fx + 1, r, P.fridgeLight);
  }
  // Right edge shadow
  for (let r = fy; r < fy + fh; r++) {
    dot(g, fx + fw - 1, r, P.fridgeVDark);
    dot(g, fx + fw - 2, r, P.fridgeDark);
  }
  // Bottom edge
  rect(g, fx, fy + fh - 1, fw, 1, P.fridgeVDark);

  // Door split (center vertical line)
  const fSplit = fx + 15;
  for (let r = fy + 2; r < fy + fh - 1; r++) {
    dot(g, fSplit, r, P.fridgeDark);
    dot(g, fSplit - 1, r, P.fridgeMid);
  }

  // Freezer/fridge horizontal divider
  const fDiv = fy + 32;
  rect(g, fx + 2, fDiv, fw - 4, 2, P.fridgeDark);
  rect(g, fx + 2, fDiv + 2, fw - 4, 1, P.fridgeMid);

  // Left door panel inset (freezer section)
  rect(g, fx + 4, fy + 5, 10, 24, P.fridgeMid);
  rect(g, fx + 5, fy + 6, 8, 22, P.fridgeBody);
  // Left door panel inset (fridge section)
  rect(g, fx + 4, fDiv + 5, 10, fh - 40, P.fridgeMid);
  rect(g, fx + 5, fDiv + 6, 8, fh - 42, P.fridgeBody);

  // Right door panel inset (freezer section)
  rect(g, fx + 17, fy + 5, 10, 24, P.fridgeMid);
  rect(g, fx + 18, fy + 6, 8, 22, P.fridgeBody);
  // Right door panel inset (fridge section)
  rect(g, fx + 17, fDiv + 5, 10, fh - 40, P.fridgeMid);
  rect(g, fx + 18, fDiv + 6, 8, fh - 42, P.fridgeBody);

  // Handles (near center split, vertical bars)
  // Left door handle (right side of left door)
  rect(g, fSplit - 3, fy + 12, 1, 10, P.fridgeHandle);
  rect(g, fSplit - 4, fy + 12, 1, 10, P.fridgeHandleHi);
  rect(g, fSplit - 3, fDiv + 12, 1, 10, P.fridgeHandle);
  rect(g, fSplit - 4, fDiv + 12, 1, 10, P.fridgeHandleHi);
  // Right door handle (left side of right door)
  rect(g, fSplit + 2, fy + 12, 1, 10, P.fridgeHandle);
  rect(g, fSplit + 3, fy + 12, 1, 10, P.fridgeHandleHi);
  rect(g, fSplit + 2, fDiv + 12, 1, 10, P.fridgeHandle);
  rect(g, fSplit + 3, fDiv + 12, 1, 10, P.fridgeHandleHi);

  // ════════════════════════════════════════════════════════════════════════════
  // SINK — between fridge and oven, on counter
  // ════════════════════════════════════════════════════════════════════════════
  const skx = 42;
  // Basin (recessed in counter)
  rect(g, skx, 70, 16, 6, P.sinkBasin);
  rect(g, skx + 2, 72, 12, 4, P.sinkDark);
  // Drain dot
  dot(g, skx + 8, 74, P.faucetDark);
  // Faucet — tall curved shape
  rect(g, skx + 6, 60, 3, 10, P.faucet);
  rect(g, skx + 5, 60, 5, 2, P.faucetDark); // base
  // Spout arm
  rect(g, skx + 9, 62, 4, 2, P.faucet);
  rect(g, skx + 12, 63, 2, 2, P.faucetDark);
  // Knobs
  dot(g, skx + 4, 63, P.faucetDark);
  dot(g, skx + 4, 64, P.faucet);

  // ════════════════════════════════════════════════════════════════════════════
  // OVEN / STOVE — 2-part: stovetop + oven door (center-left)
  // ════════════════════════════════════════════════════════════════════════════
  const sx = 68;
  const sy = 34;  // shorter — starts lower
  const sw = 40;
  const sh = 63;  // extends below counter to floor

  // Main body
  rect(g, sx, sy, sw, sh, P.stoveBody);
  // Top highlight
  rect(g, sx, sy, sw, 2, P.stoveHighlight);
  // Left edge highlight
  for (let r = sy; r < sy + sh; r++) dot(g, sx, r, P.stoveHighlight);
  // Right edge shadow
  for (let r = sy; r < sy + sh; r++) {
    dot(g, sx + sw - 1, r, P.stoveDark);
    dot(g, sx + sw - 2, r, P.stoveDark);
  }
  // Bottom edge
  rect(g, sx, sy + sh - 1, sw, 1, P.stoveVeryDark);

  // ── Stovetop surface (top part) ──
  rect(g, sx + 2, sy + 2, sw - 4, 6, P.stoveTop);

  // Burner rings (2 large burners)
  for (const bx of [sx + 8, sx + 24]) {
    for (let dx = -3; dx <= 3; dx++) {
      dot(g, bx + dx, sy + 3, P.burnerRing);
      dot(g, bx + dx, sy + 7, P.burnerRing);
    }
    for (let dy = 0; dy <= 4; dy++) {
      dot(g, bx - 3, sy + 3 + dy, P.burnerRing);
      dot(g, bx + 3, sy + 3 + dy, P.burnerRing);
    }
    dot(g, bx - 1, sy + 5, P.stoveVeryDark);
    dot(g, bx + 1, sy + 5, P.stoveVeryDark);
    dot(g, bx, sy + 4, P.stoveVeryDark);
    dot(g, bx, sy + 6, P.stoveVeryDark);
  }

  // Knobs integrated into stovetop band
  for (const kx of [sx + 6, sx + 13, sx + 27, sx + 34]) {
    dot(g, kx, sy + 9, P.knob);
    dot(g, kx + 1, sy + 9, P.knobDot);
  }

  // ── Oven door (bottom part) ──
  const odx = sx + 4;
  const ody = sy + 12;
  const odw = sw - 8;
  const odh = sh - 14;

  // Door frame
  rect(g, odx, ody, odw, odh, P.ovenDoor);
  rect(g, odx, ody, odw, 1, P.ovenFrame);
  rect(g, odx, ody, 1, odh, P.ovenFrame);
  rect(g, odx + odw - 1, ody, 1, odh, P.stoveDark);
  rect(g, odx, ody + odh - 1, odw, 1, P.stoveDark);

  // Handle bar across top
  rect(g, odx + 2, ody + 3, odw - 4, 2, P.ovenHandle);
  rect(g, odx + 2, ody + 3, odw - 4, 1, P.ovenHandleHi);

  // Glass window
  const gx = odx + 4;
  const gy = ody + 8;
  const gw = odw - 8;
  const gh = odh - 12;
  rect(g, gx, gy, gw, gh, P.ovenGlass);
  rect(g, gx + 2, gy + 2, gw - 4, gh - 4, P.ovenInner);
  // Single oven rack
  for (let c = gx + 3; c < gx + gw - 3; c += 2) {
    dot(g, c, gy + Math.floor(gh * 0.45), P.ovenRack);
  }

  // ── Pot on stove top ──
  const px = sx + 7;
  const py = sy - 1;
  dot(g, px + 3, py - 3, P.potLidKnob);
  dot(g, px + 4, py - 3, P.potLidKnob);
  rect(g, px + 1, py - 2, 6, 1, P.potLid);
  rect(g, px, py - 1, 8, 1, P.potLid);
  rect(g, px - 1, py, 10, 1, P.potRim);
  rect(g, px - 1, py + 1, 10, 2, P.potBody);
  dot(g, px - 1, py + 1, P.potDark);
  dot(g, px + 8, py + 1, P.potDark);

  // ════════════════════════════════════════════════════════════════════════════
  // RANGE HOOD — dark wooden hood mounted above counter (right of oven)
  // ════════════════════════════════════════════════════════════════════════════
  const hx = 112;
  const hy = 28;
  const hw = 48;
  const hh = 14;

  // Main hood body
  rect(g, hx, hy, hw, hh, P.hoodBody);
  // Top edge
  rect(g, hx, hy, hw, 2, P.hoodEdge);
  // Left edge highlight
  for (let r = hy; r < hy + hh; r++) dot(g, hx, r, P.hoodLight);
  // Right edge shadow
  for (let r = hy; r < hy + hh; r++) dot(g, hx + hw - 1, r, P.hoodDark);
  // Bottom lip (protruding)
  rect(g, hx - 2, hy + hh, hw + 4, 2, P.hoodEdge);
  rect(g, hx - 2, hy + hh + 2, hw + 4, 1, P.hoodDark);
  // Underside shadow
  rect(g, hx - 1, hy + hh + 3, hw + 2, 1, P.hoodUnder);
  // Front face detail — subtle horizontal lines for wood grain
  for (let r = hy + 4; r < hy + hh; r += 3) {
    for (let c = hx + 2; c < hx + hw - 2; c += 4) {
      dot(g, c, r, P.hoodDark);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HANGING UTENSIL RAIL — ceiling-mounted metal rod with tools
  // ════════════════════════════════════════════════════════════════════════════
  const rlx = 104;
  const rlw = 60;

  // Rail rod
  rect(g, rlx, 5, rlw, 1, P.rail);
  rect(g, rlx, 6, rlw, 1, P.railDark);
  // Brackets (support from ceiling)
  for (const bx of [rlx + 2, rlx + 20, rlx + 40, rlx + 58]) {
    dot(g, bx, 2, P.railDark);
    dot(g, bx, 3, P.railDark);
    dot(g, bx, 4, P.rail);
  }

  // ── Hanging pan (large, flat bottom) ──
  const panX = rlx + 6;
  // Handle (hook)
  dot(g, panX + 2, 7, P.railDark);
  dot(g, panX + 2, 8, P.panHandle);
  dot(g, panX + 2, 9, P.panHandle);
  // Pan body
  rect(g, panX - 1, 10, 7, 2, P.panBody);
  rect(g, panX - 2, 12, 9, 3, P.panBody);
  rect(g, panX - 3, 15, 11, 1, P.panDark);
  // Rim highlights
  dot(g, panX - 2, 12, P.panLight);
  dot(g, panX + 6, 12, P.panDark);

  // ── Hanging ladle ──
  const ladX = rlx + 20;
  dot(g, ladX, 7, P.railDark);
  dot(g, ladX, 8, P.ladle);
  dot(g, ladX, 9, P.ladle);
  dot(g, ladX, 10, P.ladle);
  dot(g, ladX, 11, P.ladle);
  // Bowl of ladle
  rect(g, ladX - 2, 12, 5, 2, P.ladle);
  rect(g, ladX - 2, 14, 4, 1, P.ladleDark);
  dot(g, ladX - 1, 12, P.ladleDark);

  // ── Hanging spatula ──
  const spatX = rlx + 32;
  dot(g, spatX, 7, P.railDark);
  dot(g, spatX, 8, P.panHandle);
  dot(g, spatX, 9, P.panHandle);
  dot(g, spatX, 10, P.panHandle);
  dot(g, spatX, 11, P.panHandle);
  // Flat blade
  rect(g, spatX - 1, 12, 3, 3, P.stoveHighlight);
  rect(g, spatX - 1, 15, 3, 1, P.panLight);
  // Slots
  dot(g, spatX, 13, P.rail);

  // ── Hanging towel (red) ──
  const twX = rlx + 44;
  dot(g, twX + 1, 7, P.railDark);
  rect(g, twX, 8, 4, 8, P.towelRed);
  // Stripe
  for (let r = 9; r < 16; r += 2) {
    dot(g, twX + 1, r, P.towelStripe);
    dot(g, twX + 2, r, P.towelStripe);
  }
  // Drape effect (slight taper)
  dot(g, twX, 14, P.towelRed);
  dot(g, twX + 3, 14, P.towelRed);

  // ── Small hanging pot ──
  const spX = rlx + 52;
  dot(g, spX + 1, 7, P.railDark);
  dot(g, spX + 1, 8, P.panHandle);
  // Pot body
  rect(g, spX, 9, 4, 3, P.panBody);
  rect(g, spX, 12, 4, 1, P.panDark);
  dot(g, spX, 9, P.panLight);

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER TICKETS — hanging under range hood
  // ════════════════════════════════════════════════════════════════════════════
  // Ticket rail
  rect(g, hx + 4, hy + hh + 4, hw - 8, 1, P.railDark);

  // Individual tickets
  for (const tx of [hx + 8, hx + 16, hx + 24, hx + 32]) {
    rect(g, tx, hy + hh + 5, 4, 8, P.ticketWhite);
    dot(g, tx, hy + hh + 5, P.ticketShadow);
    // Text lines (tiny marks suggesting text)
    dot(g, tx + 1, hy + hh + 7, P.ticketShadow);
    dot(g, tx + 2, hy + hh + 7, P.ticketShadow);
    dot(g, tx + 1, hy + hh + 9, P.ticketShadow);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SHELVES — right side, three tiers with items
  // ════════════════════════════════════════════════════════════════════════════
  const slx = 172; // shelf left x
  const slw = 60;  // shelf width

  // ── Upper shelf (row 20) ──
  rect(g, slx, 20, slw, 2, P.shelfWood);
  rect(g, slx, 20, slw, 1, P.shelfTop);
  rect(g, slx, 22, slw, 1, P.shelfShadow);

  // Items on upper shelf:
  // Tall green bottle
  rect(g, slx + 4, 13, 4, 7, P.bottleGreen);
  rect(g, slx + 5, 11, 2, 2, P.bottleGreen); // neck
  dot(g, slx + 5, 13, P.bottleDkGreen);
  // Gold jar
  rect(g, slx + 12, 14, 6, 6, P.jarBody);
  rect(g, slx + 12, 14, 6, 2, P.jarLid);
  dot(g, slx + 14, 17, P.cream); // label
  dot(g, slx + 15, 17, P.cream);
  // Red book (lying flat)
  rect(g, slx + 22, 17, 8, 3, P.bookRed);
  rect(g, slx + 22, 17, 1, 3, P.bottleRed);
  // Blue bottle
  rect(g, slx + 34, 14, 4, 6, P.bottleBlue);
  rect(g, slx + 35, 12, 2, 2, P.bottleBlue); // neck
  dot(g, slx + 35, 14, P.bottleLtBlue);
  // Brown box/book
  rect(g, slx + 42, 14, 6, 6, P.bookBrown);
  rect(g, slx + 42, 14, 1, 6, P.cabShadow);
  dot(g, slx + 44, 16, P.cream); // label
  dot(g, slx + 45, 16, P.cream);
  // Small green box
  rect(g, slx + 52, 16, 4, 4, P.bookGreen);
  dot(g, slx + 53, 17, P.bottleGreen);

  // ── Middle shelf (row 44) ──
  rect(g, slx, 44, slw, 2, P.shelfWood);
  rect(g, slx, 44, slw, 1, P.shelfTop);
  rect(g, slx, 46, slw, 1, P.shelfShadow);

  // Items on middle shelf:
  // Stacked bowls
  rect(g, slx + 4, 38, 8, 3, P.bowlWhite);
  rect(g, slx + 5, 39, 6, 1, P.bowlInner);
  rect(g, slx + 4, 41, 8, 3, P.plateWhite);
  dot(g, slx + 4, 41, P.plateEdge);
  dot(g, slx + 11, 41, P.plateEdge);
  // Cup with handle
  rect(g, slx + 16, 39, 4, 5, P.cupWhite);
  dot(g, slx + 15, 40, P.cupHandle); // handle
  dot(g, slx + 15, 41, P.cupHandle);
  dot(g, slx + 15, 42, P.cupHandle);
  // Another cup
  rect(g, slx + 24, 39, 4, 5, P.cupWhite);
  dot(g, slx + 23, 41, P.cupHandle);
  // Small jar
  rect(g, slx + 32, 39, 4, 5, P.fridgeBody);
  rect(g, slx + 32, 39, 4, 1, P.jarLid);
  dot(g, slx + 33, 41, P.cream);
  // Plate standing up
  rect(g, slx + 40, 38, 2, 6, P.plateWhite);
  dot(g, slx + 40, 38, P.plateEdge);
  rect(g, slx + 43, 38, 2, 6, P.plateWhite);
  dot(g, slx + 43, 38, P.plateEdge);
  // Spice jar red
  rect(g, slx + 50, 40, 3, 4, P.bottleRed);
  rect(g, slx + 50, 40, 3, 1, P.jarLid);
  // Spice jar gold
  rect(g, slx + 55, 40, 3, 4, P.jarGold);
  rect(g, slx + 55, 40, 3, 1, P.jarLid);

  // ── Lower shelf (row 66) ──
  rect(g, slx, 66, slw, 2, P.shelfWood);
  rect(g, slx, 66, slw, 1, P.shelfTop);
  rect(g, slx, 68, slw, 1, P.shelfShadow);

  // Items on lower shelf:
  // Large mixing bowl
  rect(g, slx + 4, 60, 10, 4, P.bowlWhite);
  rect(g, slx + 5, 61, 8, 2, P.bowlInner);
  rect(g, slx + 4, 64, 10, 2, P.plateEdge);
  // Green bottle
  rect(g, slx + 18, 60, 4, 6, P.bottleGreen);
  rect(g, slx + 19, 58, 2, 2, P.bottleDkGreen);
  // Red bottle
  rect(g, slx + 26, 61, 3, 5, P.bottleRed);
  rect(g, slx + 26, 61, 3, 1, P.jarLid);
  // Gold spice jar
  rect(g, slx + 33, 62, 4, 4, P.jarBody);
  rect(g, slx + 33, 62, 4, 1, P.jarLid);
  // Blue bottle (small)
  rect(g, slx + 41, 62, 3, 4, P.bottleBlue);
  dot(g, slx + 42, 61, P.bottleLtBlue); // cap
  // Stacked plates
  for (let i = 0; i < 3; i++) {
    rect(g, slx + 48, 63 - i, 8, 1, P.plateWhite);
    dot(g, slx + 48, 63 - i, P.plateEdge);
    dot(g, slx + 55, 63 - i, P.plateEdge);
  }
  rect(g, slx + 48, 64, 8, 2, P.plateEdge);

  // ════════════════════════════════════════════════════════════════════════════
  // SMALL STOVE / COOKTOP — on counter right of main oven
  // ════════════════════════════════════════════════════════════════════════════
  const stx = 154;
  // Body sitting on counter
  rect(g, stx, 60, 20, 16, P.stoveBody);
  rect(g, stx, 60, 20, 2, P.stoveHighlight); // top surface
  rect(g, stx, 60, 1, 16, P.stoveHighlight); // left edge
  rect(g, stx + 19, 60, 1, 16, P.stoveDark); // right edge
  rect(g, stx, 75, 20, 1, P.stoveDark); // bottom edge

  // Burner rings (2 small burners)
  for (const bx of [stx + 5, stx + 13]) {
    dot(g, bx - 2, 62, P.burnerRing);
    dot(g, bx + 2, 62, P.burnerRing);
    dot(g, bx, 60, P.burnerRing);
    dot(g, bx, 64, P.burnerRing);
    dot(g, bx - 1, 61, P.burnerRing);
    dot(g, bx + 1, 61, P.burnerRing);
    dot(g, bx - 1, 63, P.burnerRing);
    dot(g, bx + 1, 63, P.burnerRing);
  }

  // Knobs
  for (const kx of [stx + 4, stx + 8, stx + 12, stx + 16]) {
    dot(g, kx, 66, P.knob);
    dot(g, kx, 67, P.stoveDark);
  }

  // Small oven door
  rect(g, stx + 3, 69, 14, 6, P.ovenDoor);
  rect(g, stx + 4, 69, 12, 1, P.ovenHandle);
  rect(g, stx + 5, 71, 10, 3, P.ovenGlass);
  rect(g, stx + 6, 72, 8, 1, P.ovenInner);

  return g;
}

// Pre-compute at module level
export const BASE_SCENE = buildScene();
