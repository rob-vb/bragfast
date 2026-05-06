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
  font_family?: string;
  font_weight?: number;
}

export interface DraftVideo {
  duration?: number;
  preset?: AnimationPreset;
}

export type DraftPlatform =
  | "x"
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "threads"
  | "facebook"
  | "youtube";

export interface DraftPlatformCopy {
  title: string;
  description: string;
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
  /**
   * Platform-specific copy variants generated at draft time. The image render
   * uses `objectContent.title/description` as the canonical visual; this map
   * carries the per-platform post text, edited in the approve modal.
   */
  copyByPlatform?: Partial<Record<DraftPlatform, DraftPlatformCopy>>;
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
