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
    best_for: ["standard-browser", "standard-mobile", "hero", "video-full-bleed"],
  },
  {
    slug: "3d-tilt-angles",
    name: "3D Tilt",
    description: "Hero screenshot rotates through multiple 3D angles before settling face-on.",
    best_for: ["standard-browser", "standard-mobile", "hero"],
  },
];

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ presets: MOTION_PRESET_METADATA });
}
