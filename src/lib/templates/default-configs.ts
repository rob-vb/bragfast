import type { CanvasTemplateConfig } from "./canvas-types";
import { getCanvasDefaultConfig } from "./canvas-defaults";

export function getDefaultConfig(name: string): CanvasTemplateConfig | null {
  return getCanvasDefaultConfig(name);
}
