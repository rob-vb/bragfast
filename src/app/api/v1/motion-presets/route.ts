import { authenticate } from "@/lib/auth/authenticate";
import type { AnimationPreset } from "@/lib/types";

type MotionPresetMeta = {
  slug: AnimationPreset;
  name: string;
  description: string;
  best_for: string[];
};

const MOTION_PRESET_METADATA: MotionPresetMeta[] = [
  {
    slug: "showcase",
    name: "Showcase",
    description: "3D-rise hero with delayed text reveal. The default.",
    best_for: ["standard-browser", "standard-mobile"],
  },
  {
    slug: "kinetic",
    name: "Kinetic",
    description: "Fast slide-up stagger with a snappy spring.",
    best_for: ["split-mobile"],
  },
  {
    slug: "minimal",
    name: "Minimal",
    description: "Slow opacity fade, no movement. Works on any layout.",
    best_for: ["video-text-only"],
  },
  {
    slug: "bounce-pop",
    name: "Bounce Pop",
    description: "Overshoot spring scale on every object. Playful.",
    best_for: ["video-text-only", "hero"],
  },
  {
    slug: "ken-burns",
    name: "Ken Burns",
    description: "Slow zoom and pan on hero image with soft text fade.",
    best_for: ["hero", "video-full-bleed"],
  },
  {
    slug: "cinematic",
    name: "Cinematic",
    description: "Horizontal drift on image, late title. Film-style pacing.",
    best_for: ["split-browser", "video-full-bleed"],
  },
];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ presets: MOTION_PRESET_METADATA });
}
