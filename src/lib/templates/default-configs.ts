import type { TemplateConfig } from "./config-types";
import type { CanvasTemplateConfig } from "./canvas-types";
import { getCanvasDefaultConfig } from "./canvas-defaults";

export const DEFAULT_TEMPLATES: Record<string, { name: string; config: TemplateConfig }> = {
  classic: {
    name: "Classic",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "logo", alignment: "left" },
        { type: "image", alignment: "center", device: "browser", display: "inline" },
        { type: "title", alignment: "left", fontSize: "large" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
  split: {
    name: "Split",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "logo", alignment: "left" },
        { type: "title", alignment: "left", fontSize: "large", split: "left" },
        { type: "image", alignment: "center", device: "browser", display: "inline", split: "right" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
  hero: {
    name: "Hero",
    config: {
      background: "brand",
      spacing: "normal",
      blocks: [
        { type: "image", alignment: "center", device: "none", display: "fullBleed" },
        { type: "title", alignment: "left", fontSize: "large" },
        { type: "description", alignment: "left", fontSize: "medium" },
      ],
    },
  },
};

/** Resolve a template name to its config (checks v2 canvas configs first, then legacy) */
export function getDefaultConfig(name: string): TemplateConfig | CanvasTemplateConfig | null {
  const canvasConfig = getCanvasDefaultConfig(name);
  if (canvasConfig) return canvasConfig;
  return DEFAULT_TEMPLATES[name]?.config ?? null;
}
