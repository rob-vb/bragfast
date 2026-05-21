import type { CanvasTemplateConfig } from "./canvas-types";
import type { ObjectDataMap } from "./canvas-renderer";
import type { OnBrowserDownload } from "@remotion/renderer";

export interface BrandColors {
  background: string;
  text: string;
  primary: string;
}

export interface Brand {
  name: string;
  logoBase64: string;
  website: string;
  colors: BrandColors;
  font_family?: string;
}

export type AnimationPreset =
  | "showcase"
  | "3d-tilt-angles"
  | "simple-fade";

export interface LocalRenderSlide {
  objectData: ObjectDataMap;
  templateConfig: CanvasTemplateConfig;
  backgroundImageBase64?: string;
  srcMap?: Record<string, string>;
}

export interface LocalRenderFormat {
  name: "landscape" | "square" | "portrait";
  slides: LocalRenderSlide[];
}

export interface LocalRenderRequest {
  formats: LocalRenderFormat[];
  brand: Brand;
}

export interface ImageRenderResult {
  formats: Record<string, { slides: Buffer[]; dimensions: string }>;
}

export interface VideoRenderResult {
  buffer: Buffer;
  compositionId: string;
}

export interface LocalVideoRenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  remotionEntryPoint: string;
  onBrowserDownload?: OnBrowserDownload;
  onProgress?: (progress: { renderedFrames: number; totalFrames: number }) => void;
}
