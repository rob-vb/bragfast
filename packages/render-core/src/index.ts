// Public API -- exports added in Plans 03-05.
export const RENDER_CORE_VERSION = "0.1.0";

export type {
  AnimationPreset,
  Brand,
  BrandColors,
  ImageRenderResult,
  LocalRenderFormat,
  LocalRenderRequest,
  LocalRenderSlide,
  LocalVideoRenderRequest,
  VideoRenderResult,
} from "./types";
export type {
  CanvasTemplateConfig,
  FormatKey,
  FormatLayout,
  TemplateObject,
} from "./canvas-types";
export type { FontConfig } from "./fonts";
export type { ObjectDataMap } from "./canvas-renderer";

export { FORMAT_DIMENSIONS } from "./canvas-types";
export { CANVAS_DEFAULTS, getCanvasDefaultConfig } from "./canvas-defaults";
export { CanvasRenderer, renderObject } from "./canvas-renderer";
export { loadFonts, loadFontsForFamily, loadFontsForObjects } from "./fonts";
export { renderImage } from "./image";
export { renderVideo } from "./video";
export { applySignatureDefaults, injectStaticImages, normalizeDataUri } from "./pure-helpers";
