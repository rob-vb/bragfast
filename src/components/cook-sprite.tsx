"use client";

import Image from "next/image";

/**
 * Renders one chef pose from the `public/cook/chefs/` image set (18 PNGs, ~114×267 native, transparent BG).
 * Pose names map to specific chef_NN.png files — edit POSE_INDEX below to retarget any pose.
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

const POSE_INDEX: Record<ChefPose, number> = {
  idle: 0,
  walk: 4,
  cheer: 11,
  salad: 8,
  pot: 16,
  stir: 16,
  plate: 9,
  okSign: 9,
  thumbsUp: 11,
  pointUp: 14,
  thinking: 10,
  wave: 13,
};

const NATIVE_WIDTH = 114;
const NATIVE_HEIGHT = 267;

interface CookSpriteProps {
  pose: ChefPose;
  width?: number;
  className?: string;
}

// Default width matches NATIVE_WIDTH so the chef renders 1:1 — no upscale, no aliasing.
export function CookSprite({ pose, width = NATIVE_WIDTH, className = "" }: CookSpriteProps) {
  const idx = POSE_INDEX[pose];
  const src = `/cook/chefs/chef_${idx.toString().padStart(2, "0")}.png`;
  const height = Math.round((width * NATIVE_HEIGHT) / NATIVE_WIDTH);

  return (
    <Image
      src={src}
      alt={`Sous-Chef: ${pose}`}
      width={width}
      height={height}
      className={className}
      priority
      unoptimized={false}
    />
  );
}
