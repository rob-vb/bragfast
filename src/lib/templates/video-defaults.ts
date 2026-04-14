import type { CanvasTemplateConfig } from "./canvas-types";

// Two video-native layouts. Unlike CANVAS_DEFAULTS, these are compositions that
// don't make sense as static images — their value comes from motion. They are
// seeded into the `videoTemplates` Convex table by `seedVideoDefaults`.

export const VIDEO_DEFAULTS: Record<
  string,
  { name: string; config: CanvasTemplateConfig }
> = {
  "video-text-only": {
    name: "Text Only",
    config: {
      version: 2,
      colors: { background: "#0F0F0F", text: "#FFFFFF", primary: "#F8AF3C" },
      animation_preset: "bounce-pop",
      formats: {
        landscape: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 490, y: 48, width: 220, height: 48, opacity: 0.9, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 96, y: 230, width: 1008, height: 140, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 96, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 160, y: 400, width: 880, height: 140, opacity: 0.85, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 40, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", previewText: "Supporting copy that breathes", textFit: false },
          ],
        },
        square: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 430, y: 72, width: 220, height: 48, opacity: 0.9, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 80, y: 380, width: 920, height: 200, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 96, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 120, y: 620, width: 840, height: 180, opacity: 0.85, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", previewText: "Supporting copy that breathes", textFit: false },
          ],
        },
        portrait: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 430, y: 96, width: 220, height: 48, opacity: 0.9, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 80, y: 480, width: 920, height: 240, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 108, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, textAlign: "center", verticalAlign: "center", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 120, y: 780, width: 840, height: 240, opacity: 0.85, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 44, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", previewText: "Supporting copy that breathes", textFit: false },
          ],
        },
      },
    },
  },

  "video-full-bleed": {
    name: "Full Bleed",
    config: {
      version: 2,
      colors: { background: "#0F0F0F", text: "#FFFFFF", primary: "#F8AF3C" },
      animation_preset: "cinematic",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 1, zIndex: 1, imageFrame: "none", objectFit: "cover" },
            { id: "scrim", type: "image", name: "scrim", x: 0, y: 405, width: 1200, height: 270, opacity: 0.55, zIndex: 2, imageFrame: "none", objectFit: "cover", background: true },
            { id: "title", type: "text", name: "title", x: 64, y: 500, width: 1072, height: 80, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 64, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 64, y: 590, width: 1072, height: 50, opacity: 0.9, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 28, fontWeight: 400, letterSpacing: 0, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", previewText: "Short supporting copy", textFit: false },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 1, zIndex: 1, imageFrame: "none", objectFit: "cover" },
            { id: "scrim", type: "image", name: "scrim", x: 0, y: 700, width: 1080, height: 380, opacity: 0.55, zIndex: 2, imageFrame: "none", objectFit: "cover", background: true },
            { id: "title", type: "text", name: "title", x: 64, y: 820, width: 952, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 64, y: 950, width: 952, height: 60, opacity: 0.9, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", previewText: "Short supporting copy", textFit: false },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1350, opacity: 1, zIndex: 1, imageFrame: "none", objectFit: "cover" },
            { id: "scrim", type: "image", name: "scrim", x: 0, y: 900, width: 1080, height: 450, opacity: 0.55, zIndex: 2, imageFrame: "none", objectFit: "cover", background: true },
            { id: "title", type: "text", name: "title", x: 64, y: 1050, width: 952, height: 140, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 88, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Your headline", textFit: true },
            { id: "description", type: "text", name: "description", x: 64, y: 1200, width: 952, height: 70, opacity: 0.9, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 34, fontWeight: 400, letterSpacing: 0, lineHeight: 1.4, textAlign: "left", verticalAlign: "top", previewText: "Short supporting copy", textFit: false },
          ],
        },
      },
    },
  },
};

export function getVideoDefaultConfig(name: string): CanvasTemplateConfig | null {
  return VIDEO_DEFAULTS[name]?.config ?? null;
}

export const VIDEO_DEFAULT_SLUGS = Object.keys(VIDEO_DEFAULTS);
