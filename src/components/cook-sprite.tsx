"use client";

/**
 * Renders one chef pose from the `public/cook/chefs/` image set (18 PNGs, each ~114×267, transparent BG).
 * Pose names map to specific chef_NN.png files — mapping is editable in one place below.
 */

export type ChefPose =
  | "idle"
  | "walk"
  | "cheer"
  | "salad"
  | "pot"
  | "stir"
  | "plate"
  | "okSign"
  | "thumbsUp"
  | "pointUp"
  | "thinking"
  | "wave";

// Index into public/cook/chefs/chef_NN.png
const POSE_INDEX: Record<ChefPose, number> = {
  idle: 0,       // arms crossed
  walk: 4,       // mid-walk
  cheer: 11,     // thumbs up (used as cheer too)
  salad: 8,      // basket of veggies
  pot: 16,       // stirring pot (used for cooking / GitHub step)
  stir: 16,      // stirring pot
  plate: 9,      // chef's kiss with heart (used for revenue / Stripe)
  okSign: 9,     // chef's kiss
  thumbsUp: 11,  // thumbs up
  pointUp: 14,   // pointing
  thinking: 10,  // gesturing / explaining
  wave: 13,      // open-arms greeting
};

const NATIVE_WIDTH = 114;
const NATIVE_HEIGHT = 267;

interface CookSpriteProps {
  pose: ChefPose;
  width?: number;
  className?: string;
}

export function CookSprite({ pose, width = 180, className = "" }: CookSpriteProps) {
  const idx = POSE_INDEX[pose];
  const src = `/cook/chefs/chef_${idx.toString().padStart(2, "0")}.png`;
  const height = Math.round((width * NATIVE_HEIGHT) / NATIVE_WIDTH);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- transparent PNG, no Next image optimizer needed
    <img
      src={src}
      alt={`Sous-Chef: ${pose}`}
      width={width}
      height={height}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
