import type { HyperframeFormat } from "../pipeline/render-hyperframe";

export type HyperframeTemplateMeta = {
  id: string;
  name: string;
  description: string;
  formats: HyperframeFormat[];
  defaultDurationSeconds: number;
};

export const HYPERFRAMES_TEMPLATES: Record<string, HyperframeTemplateMeta> = {
  milestone: {
    id: "milestone",
    name: "Milestone",
    description: "Big-number milestone announcement (e.g. $1,000 MRR).",
    formats: ["landscape", "square", "portrait"],
    defaultDurationSeconds: 8,
  },
  changelog: {
    id: "changelog",
    name: "Changelog",
    description: "1–5 features shipped this week, animated list.",
    formats: ["landscape", "square", "portrait"],
    defaultDurationSeconds: 10,
  },
};

export function isHyperframesTemplate(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(HYPERFRAMES_TEMPLATES, id);
}

export function getHyperframesTemplate(id: string): HyperframeTemplateMeta | null {
  return HYPERFRAMES_TEMPLATES[id] ?? null;
}
