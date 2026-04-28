import type { FormatKey, CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { ObjectDataMap } from "@/lib/templates/canvas-renderer";
import type { Brand, AnimationPreset } from "@/lib/types";
import type { DraftObjectContent } from "@/lib/drafts/types";

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
      // Explicit empty string ("") = deliberate hide (e.g. carousel eyebrow/cta with no
      // default copy). Undefined = no previewText set → fall back to "Sample text" so
      // legacy templates (description, etc.) keep showing placeholder copy.
      if (obj.previewText === "") continue;
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

/** Populate an ObjectDataMap from a draft's object content, falling back to template previewText
 *  when content is missing. Used by DraftPreview to render actual draft text inline. */
export function buildDraftObjectData(
  config: CanvasTemplateConfig,
  objectContent: Record<string, DraftObjectContent> | undefined,
  format: FormatKey,
): ObjectDataMap {
  const layout = config.formats[format] ?? config.formats.landscape;
  const slide: ObjectDataMap = {};
  for (const obj of layout.objects) {
    const content = objectContent?.[obj.id];
    if (obj.type === "text") {
      slide[obj.id] = { text: content?.text ?? obj.previewText ?? "" };
    } else if (content?.image_url) {
      // CanvasRenderer accepts URLs in imageBase64 (client render path uses <img src>).
      slide[obj.id] = { imageBase64: content.image_url };
    } else if (content?.video_url) {
      slide[obj.id] = { videoUrl: content.video_url };
    }
  }
  return slide;
}

/** brag.fast-branded sample Brand for default-template previews and as fallback when the user has no brands yet.
 *  `logoBase64` is a public URL (browser <img src> accepts it). Not safe for Satori server render. */
export function buildBragfastSampleBrand(): Brand {
  return {
    name: "brag.fast",
    logoBase64: "/logo-icon.svg",
    website: "brag.fast",
    colors: {
      background: "#FFF8F0",
      text: "#1A1A1A",
      primary: "#F8AF3C",
    },
  };
}
