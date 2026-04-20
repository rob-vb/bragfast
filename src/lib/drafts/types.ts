import type { FormatKey } from "@/lib/templates/canvas-types";
import type { AnimationPreset } from "@/lib/types";

export type DraftSource = "agent" | "user";
export type DraftOutput = "image" | "video";

export interface DraftColors {
  background: string;
  text: string;
  primary: string;
}

export interface DraftObjectContent {
  text?: string;
  image_url?: string;
  video_url?: string;
}

export interface DraftVideo {
  duration?: number;
  preset?: AnimationPreset;
}

export interface DraftConfig {
  output: DraftOutput;
  templateId?: string;
  brandId?: string;
  colors?: DraftColors;
  formats?: FormatKey[];
  objectContent?: Record<string, DraftObjectContent>;
  video?: DraftVideo;
  notes?: string;
}

export interface Draft {
  id: string;
  name: string | null;
  source: DraftSource;
  created_at: string;
  config: DraftConfig;
}

export interface DraftPreview {
  id: string;
  name: string | null;
  source: DraftSource;
  created_at: string;
  preview: {
    title: string;
    output: DraftOutput;
    templateId?: string;
  };
}
