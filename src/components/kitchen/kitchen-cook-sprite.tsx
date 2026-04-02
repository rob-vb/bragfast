"use client";

import { useEffect, useReducer } from "react";

/**
 * NES-style cook character sprite, rendered as a small CSS grid.
 * 10 cols × 16 rows at the scene cell size.
 *
 * Animation states:
 *   idle  — subtle 2-frame bob
 *   walk  — 4-frame walk cycle (mirrored via scaleX for direction)
 *   action — arms-up stirring pose
 */

export type SpriteAnim = "idle" | "walk" | "action";

interface CookSpriteProps {
  /** Target X position in scene grid columns */
  targetX: number;
  /** Current animation state */
  anim: SpriteAnim;
  /** Cell size in px (must match scene) */
  cellSize: number;
  /** Multiplier to render sprite larger than scene cells (default 1.5) */
  spriteScale?: number;
  /** Which side the current station is on — controls facing during action anim */
  stationSide?: "left" | "right";
}

// ── Sprite palette ───────────────────────────────────────────────────────────

const S = {
  hat: "#FFFFFF",
  hatBand: "#F8AF3C",
  skin: "#FFD4A8",
  skinShadow: "#E8B888",
  eye: "#222222",
  mouth: "#CC6644",
  coat: "#FFFFFF",
  coatShadow: "#E0DCD4",
  coatButton: "#F8AF3C",
  apron: "#FFF8F0",
  pants: "#4A3326",
  pantsDark: "#362418",
  shoe: "#222222",
  _: null as string | null, // transparent
} as const;

const _ = S._;

// ── Sprite frames (10 wide × 16 tall, top-to-bottom) ────────────────────────

type Frame = (string | null)[];

// Idle frame A (standing, arms down)
const IDLE_A: Frame = [
  _, _, _, S.hat, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  _, _, S.skin, S.skin, S.skin, S.skin, S.skin, S.skin, _, _,
  _, _, S.skin, S.eye, S.skin, S.skin, S.eye, S.skin, _, _,
  _, _, S.skin, S.skin, S.mouth, S.mouth, S.skin, S.skin, _, _,
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coat, S.coat, S.coat, S.coatButton, S.coatButton, S.coat, S.coat, S.coat, _,
  S.skin, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin,
  _, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coatShadow, _,
  _, _, S.apron, S.apron, S.apron, S.apron, S.apron, S.apron, _, _,
  _, _, S.coatShadow, S.apron, S.apron, S.apron, S.apron, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, _, S.pants, S.pants, S.pantsDark, S.pantsDark, S.pants, S.pants, _, _,
  _, _, S.shoe, S.shoe, _, _, S.shoe, S.shoe, _, _,
  _, S.shoe, S.shoe, S.shoe, _, _, S.shoe, S.shoe, S.shoe, _,
];

// Idle frame B (slight bob — squished hat)
const IDLE_B: Frame = [
  _, _, _, _, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  _, _, S.skin, S.skin, S.skin, S.skin, S.skin, S.skin, _, _,
  _, _, S.skin, S.eye, S.skin, S.skin, S.eye, S.skin, _, _,
  _, _, S.skin, S.skin, S.mouth, S.mouth, S.skin, S.skin, _, _,
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coat, S.coat, S.coat, S.coatButton, S.coatButton, S.coat, S.coat, S.coat, _,
  S.skin, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin,
  _, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coatShadow, _,
  _, _, S.apron, S.apron, S.apron, S.apron, S.apron, S.apron, _, _,
  _, _, S.coatShadow, S.apron, S.apron, S.apron, S.apron, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, _, S.pants, S.pantsDark, S.pants, S.pants, S.pantsDark, S.pants, _, _,
  _, S.shoe, S.shoe, S.shoe, _, _, S.shoe, S.shoe, S.shoe, _,
  _, S.shoe, S.shoe, _, _, _, _, S.shoe, S.shoe, _,
];

// Walk frame A (left leg forward)
const WALK_A: Frame = [
  _, _, _, S.hat, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  _, _, S.skin, S.skin, S.skin, S.skin, S.skin, S.skin, _, _,
  _, _, S.skin, S.eye, S.skin, S.skin, S.eye, S.skin, _, _,
  _, _, S.skin, S.skin, S.mouth, S.mouth, S.skin, S.skin, _, _,
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coat, S.coat, S.coat, S.coatButton, S.coatButton, S.coat, S.coat, S.coat, _,
  _, S.skin, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, _, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coatShadow, S.skin, _,
  _, _, S.apron, S.apron, S.apron, S.apron, S.apron, S.apron, _, _,
  _, _, S.coatShadow, S.apron, S.apron, S.apron, S.apron, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, S.pants, S.pants, _, _, _, _, S.pants, S.pants, _,
  S.shoe, S.shoe, _, _, _, _, _, _, S.shoe, S.shoe,
  S.shoe, S.shoe, S.shoe, _, _, _, _, S.shoe, S.shoe, _,
];

// Walk frame B (right leg forward)
const WALK_B: Frame = [
  _, _, _, S.hat, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  _, _, S.skin, S.skin, S.skin, S.skin, S.skin, S.skin, _, _,
  _, _, S.skin, S.eye, S.skin, S.skin, S.eye, S.skin, _, _,
  _, _, S.skin, S.skin, S.mouth, S.mouth, S.skin, S.skin, _, _,
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coat, S.coat, S.coat, S.coatButton, S.coatButton, S.coat, S.coat, S.coat, _,
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin, _,
  _, S.skin, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coatShadow, _, _,
  _, _, S.apron, S.apron, S.apron, S.apron, S.apron, S.apron, _, _,
  _, _, S.coatShadow, S.apron, S.apron, S.apron, S.apron, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, S.pants, S.pants, _, _, _, _, S.pants, S.pants, _,
  _, S.shoe, S.shoe, _, _, _, _, S.shoe, S.shoe, S.shoe,
  _, S.shoe, S.shoe, S.shoe, _, _, _, _, S.shoe, S.shoe,
];

// Back-of-head frame: cook facing away from camera (toward shelf/fridge).
// Designed facing right; CSS scaleX(-1) flips for left-side stations.
const BACK: Frame = [
  // Hat (same from behind)
  _, _, _, S.hat, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  // Back of head — no eyes/mouth, slight shadow on sides
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  // Coat back (no buttons — that's the front)
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _,
  // Arms at sides
  S.skin, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin,
  _, S.coatShadow, S.coat, S.coat, S.coatShadow, S.coat, S.coat, S.coat, S.coatShadow, _,
  // Back — no apron visible
  _, _, S.coat, S.coat, S.coatShadow, S.coat, S.coat, S.coat, _, _,
  _, _, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, _, S.pants, S.pants, S.pantsDark, S.pantsDark, S.pants, S.pants, _, _,
  _, _, S.shoe, S.shoe, _, _, S.shoe, S.shoe, _, _,
  _, S.shoe, S.shoe, S.shoe, _, _, S.shoe, S.shoe, S.shoe, _,
];

// Back-of-head + right arm raised upward (reaching for shelf above).
// Flip CSS for left-side station.
const BACK_REACH: Frame = [
  // Hat
  _, _, _, S.hat, S.hat, S.hat, S.hat, _, _, _,
  _, _, S.hat, S.hat, S.hat, S.hat, S.hat, S.hat, _, _,
  _, _, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, S.hatBand, _, _,
  // Back of head
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  _, _, S.skinShadow, S.skin, S.skin, S.skin, S.skin, S.skin, S.skinShadow, _,
  // Coat — right arm (col 8-9) starting to raise
  _, _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin, _,
  _, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.skin, _,
  // Right arm up (col 8), left arm at side (col 0 = skin)
  S.skin, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, S.coat, _, _,
  _, S.coatShadow, S.coat, S.coat, S.coatShadow, S.coat, S.coat, S.coat, S.coatShadow, _,
  _, _, S.coat, S.coat, S.coatShadow, S.coat, S.coat, S.coat, _, _,
  _, _, S.coatShadow, S.coat, S.coat, S.coat, S.coat, S.coatShadow, _, _,
  _, _, S.pants, S.pants, S.pants, S.pants, S.pants, S.pants, _, _,
  _, _, S.pants, S.pants, S.pantsDark, S.pantsDark, S.pants, S.pants, _, _,
  _, _, S.shoe, S.shoe, _, _, S.shoe, S.shoe, _, _,
  _, S.shoe, S.shoe, S.shoe, _, _, S.shoe, S.shoe, S.shoe, _,
];

// Which camera-facing for each action frame:
//   "station" = face toward the object (profile, using stationSide)
//   "camera"  = face front (IDLE_A, no flip)
const ACTION_FACINGS = ["station", "station", "station", "camera"] as const;

const SPRITE_W = 10;
const SPRITE_H = 16;

const FRAMES: Record<string, Frame[]> = {
  idle: [IDLE_A, IDLE_B],
  walk: [WALK_A, WALK_B, WALK_A, WALK_B],
  // turn away → arm up → arm down → face camera
  action: [BACK, BACK_REACH, BACK, IDLE_A],
};

const ANIM_SPEED: Record<string, number> = {
  idle: 800,
  walk: 200,
  action: 450,
};

// ── Sprite reducer (all state changes happen in dispatch, not effects) ───────

interface SpriteState {
  currentX: number;
  facingLeft: boolean;
  isWalking: boolean;
  frameIdx: number;
}

type SpriteAction =
  | { type: "WALK_STEP"; targetX: number; stepSize: number }
  | { type: "ARRIVE" }
  | { type: "START_WALK"; targetX: number }
  | { type: "NEXT_FRAME"; frameCount: number };

function spriteReducer(state: SpriteState, action: SpriteAction): SpriteState {
  switch (action.type) {
    case "START_WALK":
      return {
        ...state,
        isWalking: true,
        facingLeft: action.targetX < state.currentX,
      };
    case "WALK_STEP": {
      const diff = action.targetX - state.currentX;
      if (Math.abs(diff) <= action.stepSize) {
        return { ...state, currentX: action.targetX };
      }
      return {
        ...state,
        currentX: state.currentX + (diff > 0 ? action.stepSize : -action.stepSize),
      };
    }
    case "ARRIVE":
      return { ...state, isWalking: false };
    case "NEXT_FRAME":
      return { ...state, frameIdx: (state.frameIdx + 1) % action.frameCount };
    default:
      return state;
  }
}

export function KitchenCookSprite({ targetX, anim, cellSize, spriteScale = 1.5, stationSide = "right" }: CookSpriteProps) {
  const [state, dispatch] = useReducer(spriteReducer, {
    currentX: targetX,
    facingLeft: false,
    isWalking: false,
    frameIdx: 0,
  });

  // Walk to target when it changes
  useEffect(() => {
    if (targetX === state.currentX) {
      return;
    }

    dispatch({ type: "START_WALK", targetX });

    const stepSize = 2;
    const stepInterval = 60;

    const iv = setInterval(() => {
      dispatch({ type: "WALK_STEP", targetX, stepSize });
    }, stepInterval);

    return () => clearInterval(iv);
  }, [targetX]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect arrival (currentX reached targetX while walking)
  useEffect(() => {
    if (state.isWalking && state.currentX === targetX) {
      const tid = setTimeout(() => dispatch({ type: "ARRIVE" }), 200);
      return () => clearTimeout(tid);
    }
  }, [state.currentX, state.isWalking, targetX]);

  // Frame animation loop
  const activeAnim = state.isWalking ? "walk" : anim;
  const frames = FRAMES[activeAnim] ?? FRAMES.idle;
  const speed = ANIM_SPEED[activeAnim] ?? 800;

  useEffect(() => {
    const iv = setInterval(() => {
      dispatch({ type: "NEXT_FRAME", frameCount: frames.length });
    }, speed);
    return () => clearInterval(iv);
  }, [activeAnim, frames.length, speed]);

  const frameIdx = state.frameIdx % frames.length;
  const frame = frames[frameIdx];

  // Determine horizontal flip.
  // During action: frames tagged "station" face toward the object; "camera" = front.
  let flipX = state.facingLeft;
  if (activeAnim === "action") {
    const tag = ACTION_FACINGS[frameIdx % ACTION_FACINGS.length];
    flipX = tag === "station" ? stationSide === "left" : false;
  }

  // Position: cook stands on the floor. Anchor point is bottom-center.
  const sc = cellSize * spriteScale;
  const spriteW = SPRITE_W * sc;
  const spriteH = SPRITE_H * sc;
  const feetRow = 54;
  const spriteTopPx = feetRow * cellSize - spriteH;
  const spriteCenterX = state.currentX * cellSize - spriteW / 2;

  return (
    <div
      className="ks3-anim"
      style={{
        position: "absolute",
        left: spriteCenterX,
        top: spriteTopPx,
        width: spriteW,
        height: spriteH,
        zIndex: 15,
        imageRendering: "pixelated",
        transform: flipX ? "scaleX(-1)" : "none",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SPRITE_W}, ${sc}px)`,
          gridTemplateRows: `repeat(${SPRITE_H}, ${sc}px)`,
        }}
      >
        {frame.map((color, i) => (
          <div
            key={i}
            style={color ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
