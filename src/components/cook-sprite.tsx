"use client";

import Image from "next/image";

/**
 * Renders one chef pose from the `public/cook/chefs/` image set.
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

const POSE_DIMENSIONS: Record<number, { width: number; height: number }> = {
  0: { width: 114, height: 267 },
  1: { width: 123, height: 264 },
  2: { width: 117, height: 264 },
  3: { width: 127, height: 264 },
  4: { width: 137, height: 259 },
  5: { width: 135, height: 264 },
  6: { width: 132, height: 261 },
  7: { width: 124, height: 264 },
  8: { width: 125, height: 264 },
  9: { width: 141, height: 281 },
  10: { width: 151, height: 271 },
  11: { width: 162, height: 271 },
  12: { width: 184, height: 268 },
  13: { width: 168, height: 265 },
  14: { width: 199, height: 264 },
  15: { width: 202, height: 258 },
  16: { width: 184, height: 259 },
  17: { width: 161, height: 259 },
};

const DEFAULT_WIDTH = 114;

interface CookSpriteProps {
  pose: ChefPose;
  width?: number;
  className?: string;
}

// Default width keeps the chef visually consistent in the sidebar.
export function CookSprite({ pose, width = DEFAULT_WIDTH, className = "" }: CookSpriteProps) {
  const idx = POSE_INDEX[pose];
  const asset = {
    src: `/cook/chefs/chef_${idx.toString().padStart(2, "0")}.png`,
    ...POSE_DIMENSIONS[idx],
  };
  const height = Math.round((width * asset.height) / asset.width);

  return (
    <Image
      src={asset.src}
      alt={`Sous-Chef: ${pose}`}
      width={width}
      height={height}
      className={className}
      priority
      unoptimized={false}
    />
  );
}
