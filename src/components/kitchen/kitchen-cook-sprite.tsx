"use client";

import { useEffect, useReducer } from "react";

/**
 * NES-style cook character sprite, rendered as a small CSS grid.
 * 14 cols × 22 rows — higher detail version with shaded hat, visible
 * facial features, coat collar, apron, and better proportions.
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
  /** Multiplier to render sprite larger than scene cells (default auto) */
  spriteScale?: number;
  /** Which side the current station is on — controls facing during action anim */
  stationSide?: "left" | "right";
}

// ── Sprite palette ───────────────────────────────────────────────────────────

const S = {
  hat: "#FFFFFF",
  hatShade: "#E8E4DC",
  hatBand: "#F8AF3C",
  skin: "#FFD4A8",
  skinShadow: "#E8B888",
  eye: "#222222",
  nose: "#D8A070",
  mouth: "#CC6644",
  coat: "#FFFFFF",
  coatShadow: "#E0DCD4",
  coatDark: "#D0CCC4",
  coatButton: "#F8AF3C",
  apron: "#FFF8F0",
  apronShadow: "#E8E0D4",
  pants: "#4A3326",
  pantsDark: "#362418",
  shoe: "#222222",
  _: null as string | null,
} as const;

const _ = S._;
const H = S.hat;
const Hs = S.hatShade;
const Hb = S.hatBand;
const K = S.skin;
const Ks = S.skinShadow;
const E = S.eye;
const N = S.nose;
const M = S.mouth;
const C = S.coat;
const Cd = S.coatShadow;
const Cx = S.coatDark;
const Cb = S.coatButton;
const A = S.apron;
const As = S.apronShadow;
const P = S.pants;
const Pd = S.pantsDark;
const Sh = S.shoe;

// ── Sprite frames (14 wide × 22 tall, top-to-bottom) ───────────────────────

type Frame = (string | null)[];

const SPRITE_W = 14;
const SPRITE_H = 22;

// Idle frame A (standing, arms at sides)
const IDLE_A: Frame = [
  // Hat (rows 0-3): fluffy chef hat with side shading
  _, _, _, _, _, H, H, H, H, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  // Hat band (row 4)
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  // Face (rows 5-9) — smile: mouth corners lifted
  _, _, _, K, K, K, K, K, K, K, K, _, _, _,
  _, _, K, K, E, K, K, K, K, E, K, K, _, _,
  _, _, K, K, K, K, N, N, K, K, K, K, _, _,
  _, _, _, K, K, K, M, M, K, K, K, _, _, _,
  _, _, _, _, K, Ks,K, K, Ks,K, _, _, _, _,
  // Coat (rows 10-14)
  _, _, _, _, C, C, C, C, C, C, _, _, _, _,
  _, _, _, C, C, C, Cb,Cb,C, C, C, _, _, _,
  _, _, C, C, C, C, C, C, C, C, C, C, _, _,
  _, K, C, Cd,C, C, C, C, C, C, Cd,C, K, _,
  K, K, Cd,C, C, C, C, C, C, C, C, Cd,K, K,
  // Apron (rows 15-17)
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, _, As,A, A, A, A, A, A, As,_, _, _,
  // Pants (rows 18-19)
  _, _, _, P, P, P, P, P, P, P, P, _, _, _,
  _, _, _, P, P, Pd,_, _, Pd,P, P, _, _, _,
  // Shoes (rows 20-21)
  _, _, Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,_, _,
  _, Sh,Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,Sh,_,
];

// Idle frame B (slight bob — hat squished, body shifted 1px down feel)
const IDLE_B: Frame = [
  _, _, _, _, _, _, H, H, _, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  _, _, _, K, K, K, K, K, K, K, K, _, _, _,
  _, _, K, K, E, K, K, K, K, E, K, K, _, _,
  _, _, K, K, K, K, N, N, K, K, K, K, _, _,
  _, _, _, K, K, K, M, M, K, K, K, _, _, _,
  _, _, _, _, K, Ks,K, K, Ks,K, _, _, _, _,
  _, _, _, _, C, C, C, C, C, C, _, _, _, _,
  _, _, _, C, C, C, Cb,Cb,C, C, C, _, _, _,
  _, _, C, C, C, C, C, C, C, C, C, C, _, _,
  _, K, C, Cd,C, C, C, C, C, C, Cd,C, K, _,
  K, K, Cd,C, C, C, C, C, C, C, C, Cd,K, K,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, _, As,A, A, A, A, A, A, As,_, _, _,
  _, _, _, P, P, P, P, P, P, P, P, _, _, _,
  _, _, _, P, Pd,P, _, _, P, Pd,P, _, _, _,
  _, _, Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,_, _,
  _, _, Sh,Sh,_, _, _, _, _, _, Sh,Sh,_, _,
];

// Walk frame A (left leg forward, right arm forward)
const WALK_A: Frame = [
  _, _, _, _, _, H, H, H, H, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  _, _, _, K, K, K, K, K, K, K, K, _, _, _,
  _, _, K, K, E, K, K, K, K, E, K, K, _, _,
  _, _, K, K, K, K, N, N, K, K, K, K, _, _,
  _, _, _, K, K, K, M, M, K, K, K, _, _, _,
  _, _, _, _, K, Ks,K, K, Ks,K, _, _, _, _,
  _, _, _, _, C, C, C, C, C, C, _, _, _, _,
  _, _, _, C, C, C, Cb,Cb,C, C, C, _, _, _,
  _, _, K, C, C, C, C, C, C, C, C, C, _, _,
  _, _, _, Cd,C, C, C, C, C, C, Cd,C, K, _,
  _, _, Cd,C, C, C, C, C, C, C, C, Cd,K, K,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, _, As,A, A, A, A, A, A, As,_, _, _,
  _, _, P, P, P, _, _, _, _, P, P, P, _, _,
  _, P, P, _, _, _, _, _, _, _, _, P, P, _,
  Sh,Sh,Sh,_, _, _, _, _, _, _, _, _,Sh,Sh,
  Sh,Sh,_, _, _, _, _, _, _, _, _, _, Sh,Sh,
];

// Walk frame B (right leg forward, left arm forward)
const WALK_B: Frame = [
  _, _, _, _, _, H, H, H, H, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  _, _, _, K, K, K, K, K, K, K, K, _, _, _,
  _, _, K, K, E, K, K, K, K, E, K, K, _, _,
  _, _, K, K, K, K, N, N, K, K, K, K, _, _,
  _, _, _, K, K, K, M, M, K, K, K, _, _, _,
  _, _, _, _, K, Ks,K, K, Ks,K, _, _, _, _,
  _, _, _, _, C, C, C, C, C, C, _, _, _, _,
  _, _, _, C, C, C, Cb,Cb,C, C, C, _, _, _,
  _, _, _, C, C, C, C, C, C, C, C, K, _, _,
  _, K, Cd,C, C, C, C, C, C, C, Cd,_, _, _,
  K, K, Cd,C, C, C, C, C, C, C, C, Cd,_, _,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, Cd,A, A, A, A, A, A, A, A, Cd,_, _,
  _, _, _, As,A, A, A, A, A, A, As,_, _, _,
  _, _, P, P, P, _, _, _, _, P, P, P, _, _,
  _, P, P, _, _, _, _, _, _, _, _, P, P, _,
  Sh,Sh,_, _, _, _, _, _, _, _, _, _,Sh,Sh,
  Sh,Sh,Sh,_, _, _, _, _, _, _, _, Sh,Sh,_,
];

// Back-of-head frame (facing away from camera)
const BACK: Frame = [
  _, _, _, _, _, H, H, H, H, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  // Back of head — no eyes, shadow on edges
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, _, Ks,K, K, K, K, K, K, Ks,_, _, _,
  _, _, _, _, K, K, K, K, K, K, _, _, _, _,
  // Coat back (no buttons)
  _, _, _, _, C, C, C, C, C, C, _, _, _, _,
  _, _, _, C, C, C, C, C, C, C, C, _, _, _,
  _, _, C, C, C, C, C, C, C, C, C, C, _, _,
  _, K, C, Cx,C, C, C, C, C, C, Cx,C, K, _,
  K, K, Cd,C, C, Cd,C, C, C, Cd,C, Cd,K, K,
  _, _, Cd,C, C, C, C, C, C, C, C, Cd,_, _,
  _, _, Cx,C, C, Cd,C, C, C, Cd,C, Cx,_, _,
  _, _, _, Cd,C, C, C, C, C, C, Cd,_, _, _,
  _, _, _, P, P, P, P, P, P, P, P, _, _, _,
  _, _, _, P, P, Pd,_, _, Pd,P, P, _, _, _,
  _, _, Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,_, _,
  _, Sh,Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,Sh,_,
];

// Back-of-head + arm raised (reaching for shelf above)
const BACK_REACH: Frame = [
  _, _, _, _, _, H, H, H, H, _, _, _, _, _,
  _, _, _, H, H, H, H, H, H, H, H, _, _, _,
  _, _, H, H, H, H, H, H, H, H, H, H, _, _,
  _, _, Hs, H, H, H, H, H, H, H, H, Hs, _, _,
  _, _, Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb,Hb, _, _,
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, Ks,K, K, K, K, K, K, K, K, Ks,_, _,
  _, _, _, Ks,K, K, K, K, K, K, Ks,_, _, _,
  _, _, _, _, K, K, K, K, K, K, _, _, _, _,
  // Coat — right arm starting to raise
  _, _, _, _, C, C, C, C, C, C, K, _, _, _,
  _, _, _, C, C, C, C, C, C, C, C, K, _, _,
  _, _, C, C, C, C, C, C, C, C, C, _, _, _,
  _, K, C, Cx,C, C, C, C, C, C, Cx,C, _, _,
  K, K, Cd,C, C, C, C, C, C, C, C, Cd,_, _,
  _, _, Cd,C, C, C, C, C, C, C, C, Cd,_, _,
  _, _, Cx,C, C, Cd,C, C, C, Cd,C, Cx,_, _,
  _, _, _, Cd,C, C, C, C, C, C, Cd,_, _, _,
  _, _, _, P, P, P, P, P, P, P, P, _, _, _,
  _, _, _, P, P, Pd,_, _, Pd,P, P, _, _, _,
  _, _, Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,_, _,
  _, Sh,Sh,Sh,Sh,_, _, _, _, Sh,Sh,Sh,Sh,_,
];

// Frame facing direction metadata
const ACTION_FACINGS = ["station", "station", "station", "camera"] as const;

const FRAMES: Record<string, Frame[]> = {
  idle: [IDLE_A, IDLE_B],
  walk: [WALK_A, WALK_B, WALK_A, WALK_B],
  action: [BACK, BACK_REACH, BACK, IDLE_A],
};

const ANIM_SPEED: Record<string, number> = {
  idle: 800,
  walk: 200,
  action: 450,
};

// ── Sprite reducer ──────────────────────────────────────────────────────────

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

export function KitchenCookSprite({ targetX, anim, cellSize, spriteScale = cellSize >= 4 ? 1.5 : 2.5, stationSide = "right" }: CookSpriteProps) {
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

    const stepSize = 4;
    const stepInterval = 60;

    const iv = setInterval(() => {
      dispatch({ type: "WALK_STEP", targetX, stepSize });
    }, stepInterval);

    return () => clearInterval(iv);
  }, [targetX]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect arrival
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

  // Determine horizontal flip
  let flipX = state.facingLeft;
  if (activeAnim === "action") {
    const tag = ACTION_FACINGS[frameIdx % ACTION_FACINGS.length];
    flipX = tag === "station" ? stationSide === "left" : false;
  }

  // Position: cook stands on the floor. Anchor = bottom-center.
  const sc = cellSize * spriteScale;
  const spriteW = SPRITE_W * sc;
  const spriteH = SPRITE_H * sc;
  const feetRow = cellSize >= 4 ? 54 : 108;
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
