import type { CanvasTemplateConfig, TemplateObject } from "./canvas-types";

export type CandidateSlot = {
  id: string;
  type: "text" | "visual" | "logo";
  maxLines?: number;
};

export function extractCandidateSlots(
  config: CanvasTemplateConfig,
  format: "landscape" | "square" | "portrait",
): CandidateSlot[] {
  const objs = config.formats[format]?.objects ?? [];
  return objs
    .filter((o: TemplateObject) => o.type === "text" || o.type === "visual")
    .map((o: TemplateObject) => ({
      id: o.id,
      type: o.type as "text" | "visual" | "logo",
      maxLines: o.type === "text" ? (o as unknown as { maxLines?: number }).maxLines : undefined,
    }));
}
