export interface RepoContext {
  tag: string | null;
  sha: string | null;
  name: string | null;
  version: string | null;
}

export type FormatKey = "landscape" | "square" | "portrait";
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
  preset?: string;
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
  caption?: string;
}
