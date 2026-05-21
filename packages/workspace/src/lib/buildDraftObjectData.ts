import type {
  CanvasTemplateConfig,
  FormatKey,
  ObjectDataMap,
} from "@bragfast/render-core/browser";
import type { Brand, DraftConfig, DraftObjectContent } from "../types";

export function buildSampleSlide(config: CanvasTemplateConfig, format: FormatKey): ObjectDataMap {
  const layout = config.formats[format] ?? config.formats.landscape;
  const slide: ObjectDataMap = {};

  for (const obj of layout.objects) {
    if (obj.type !== "text") continue;
    if (obj.previewText === "") continue;
    slide[obj.id] = { text: obj.previewText ?? "Sample text" };
  }

  return slide;
}

export function buildDraftObjectData(
  config: CanvasTemplateConfig,
  objectContent: Record<string, DraftObjectContent> | undefined,
  format: FormatKey,
  options?: { placeholderForEmpty?: boolean },
): ObjectDataMap {
  const layout = config.formats[format] ?? config.formats.landscape;
  const slide: ObjectDataMap = {};
  const placeholderForEmpty = options?.placeholderForEmpty ?? false;

  for (const obj of layout.objects) {
    const content = objectContent?.[obj.id];

    if (obj.type === "text") {
      const userText = content?.text;
      let entry: ObjectDataMap[string] | undefined;
      if (userText) {
        entry = { text: userText };
      } else if (obj.previewText !== "") {
        entry = {
          text: obj.previewText ?? (placeholderForEmpty ? "Sample text" : ""),
        };
      }
      if (!entry) continue;
      if (content?.font_family) entry.fontFamily = content.font_family;
      if (content?.font_weight) entry.fontWeight = content.font_weight;
      slide[obj.id] = entry;
      continue;
    }

    if (content?.image_url) {
      slide[obj.id] = { imageBase64: content.image_url };
    } else if (content?.video_url) {
      slide[obj.id] = { videoUrl: content.video_url };
    }
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

export function buildBragfastSampleBrand(config?: DraftConfig): Brand {
  return {
    name: "brag.fast",
    logoBase64: "/logo-icon.svg",
    website: "brag.fast",
    colors: config?.colors ?? {
      background: "#F7F6F2",
      text: "#1A1A1A",
      primary: "#1F3D3A",
    },
  };
}
