import type { VideoTemplateConfig } from "./types";

export const DEFAULT_VIDEO_TEMPLATES: Record<string, VideoTemplateConfig> = {
  "product-update": {
    fps: 30,
    transition: "fade",
    transition_duration: 0.5,
    scenes: [
      { type: "intro", duration: 3 },
      { type: "feature", duration: 4, device: "browser" },
      { type: "feature", duration: 4, device: "browser", transition: "slide-from-left" },
      { type: "cta", duration: 3 },
    ],
  },
};

export function getDefaultVideoTemplate(
  name: string
): VideoTemplateConfig | null {
  return DEFAULT_VIDEO_TEMPLATES[name] ?? null;
}

export function isDefaultVideoTemplate(name: string): boolean {
  return name in DEFAULT_VIDEO_TEMPLATES;
}
