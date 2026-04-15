import type { FormatKey, CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { ObjectDataMap } from "@/lib/templates/canvas-renderer";
import type { Brand, AnimationPreset } from "@/lib/types";

// Per-preset default durations (mirrors render-video.ts logic)
const PREVIEW_DEFAULT_DURATIONS: Partial<Record<AnimationPreset, number>> = {
  "3d-tilt-angles": 12,
};
const DEFAULT_PREVIEW_DURATION = 8;

export function getPreviewDuration(preset?: AnimationPreset): number {
  if (preset && PREVIEW_DEFAULT_DURATIONS[preset] !== undefined) {
    return PREVIEW_DEFAULT_DURATIONS[preset]!;
  }
  return DEFAULT_PREVIEW_DURATION;
}

export function buildSampleSlide(config: CanvasTemplateConfig, format: FormatKey): ObjectDataMap {
  const layout = config.formats[format] ?? config.formats.landscape;
  const slide: ObjectDataMap = {};
  for (const obj of layout.objects) {
    if (obj.type === "text") {
      slide[obj.id] = { text: obj.previewText ?? "Sample text" };
    }
    // visual and logo: leave empty; visual objects with obj.src render their static image
  }
  return slide;
}

export function buildSampleBrand(config: CanvasTemplateConfig): Brand {
  return {
    name: "Preview",
    logoBase64: "",
    website: "",
    colors: config.colors,
  };
}
