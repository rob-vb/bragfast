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

/** Map short default names to their v2 canvas key */
const V2_ALIASES: Record<string, string> = {
  classic: "classic_v2",
  split: "split_v2",
  hero: "hero_v2",
};

/** Resolve a template name to its config (prefer v2 canvas configs for default names) */
export function getDefaultConfig(name: string): TemplateConfig | CanvasTemplateConfig | null {
  const v2Key = V2_ALIASES[name] ?? name;
  const canvasConfig = getCanvasDefaultConfig(v2Key);
  if (canvasConfig) return canvasConfig;
  return DEFAULT_TEMPLATES[name]?.config ?? null;
}
