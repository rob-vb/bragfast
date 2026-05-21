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

export interface DraftPreview {
  id: string;
  name: string | null;
  source: "agent" | "user";
  created_at: string;
  preview: {
    title: string;
    output: DraftOutput;
    templateId?: string;
  };
}

export interface DraftDetail {
  id: string;
  name: string | null;
  source: "agent" | "user";
  created_at: string;
  config: DraftConfig;
}

export interface DraftConfig {
  output: DraftOutput;
  templateId?: string;
  brandId?: string;
  format?: FormatKey;
  colors?: DraftColors;
  formats?: FormatKey[];
  objectContent?: Record<string, DraftObjectContent>;
  video?: DraftVideo;
  notes?: string;
  caption?: string;
}

export interface BrandRecord {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  font_family?: string;
  colors: DraftColors;
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  name: string;
  logoBase64: string;
  website: string;
  font_family?: string;
  colors: DraftColors;
}

// Phase 5: render job types
export type FormatRenderState =
  | { phase: "idle" }
  | { phase: "pending" }
  | { phase: "done"; url: string }
  | { phase: "failed"; error: string };

export interface RenderStatusResponse {
  id: string;
  formats: Record<"landscape" | "square" | "portrait", FormatRenderState>;
}

export type VideoRenderPhase =
  | "idle"
  | "flushing"
  | "chrome-download"
  | "rendering"
  | "done"
  | "failed";

export interface VideoRenderStatusResponse {
  id: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url?: string;
  error?: string;
}

export type EditorView =
  | { screen: "home" }
  | { screen: "editor"; draftId: string | null; config: DraftConfig };
