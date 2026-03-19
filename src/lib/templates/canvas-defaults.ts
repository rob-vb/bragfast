import type { CanvasTemplateConfig } from "./canvas-types";

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  "standard-browser": {
    name: "Standard Browser",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 102, width: 1072, height: 89, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 191, width: 1072, height: 60, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 64, y: 302, width: 1072, height: 393, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", color: "#F8AF3C", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 271, width: 952, height: 220, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 64, y: 538, width: 952, height: 561, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 360, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 286, width: 952, height: 340, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 64, y: 720, width: 952, height: 1220, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 731, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "standard-mobile": {
    name: "Standard Mobile",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 109, width: 1072, height: 89, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 64, y: 198, width: 1072, height: 60, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 429, y: 319, width: 343, height: 525, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 64, y: 272, width: 952, height: 200, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 340, y: 524, width: 401, height: 803, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 360, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 64, y: 277, width: 952, height: 376, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 215, y: 722, width: 650, height: 1358, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 731, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "split-browser": {
    name: "Split Browser",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 263, width: 502, height: 67, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here with a long title" },
            { id: "image", type: "image", name: "image", x: 630, y: 64, width: 643, height: 547, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top" },
            { id: "description", type: "text", name: "description", x: 64, y: 338, width: 502, height: 273, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 190, width: 418, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 59, y: 378, width: 433, height: 186, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here with a long title" },
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 1009, height: 890, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 305, width: 406, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 578, y: 91, width: 1355, height: 1752, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top" },
            { id: "title", type: "text", name: "title", x: 48, y: 726, width: 458, height: 200, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here with a long title" },
            { id: "description", type: "text", name: "description", x: 48, y: 944, width: 458, height: 899, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 672, width: 431, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "split-mobile": {
    name: "Split Mobile",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 263, width: 586, height: 67, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "image", type: "image", name: "image", x: 730, y: 48, width: 390, height: 700, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { id: "description", type: "text", name: "description", x: 64, y: 338, width: 586, height: 283, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 175, width: 418, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 59, y: 379, width: 429, height: 186, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "image", type: "image", name: "image", x: 570, y: 80, width: 460, height: 1100, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 293, width: 406, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 542, y: 200, width: 661, height: 1534, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover", anchorX: "left", anchorY: "top" },
            { id: "title", type: "text", name: "title", x: 48, y: 726, width: 458, height: 200, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 48, y: 944, width: 458, height: 899, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 662, width: 431, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  hero: {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 64, y: 393, width: 1072, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", textFit: true, color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 200, y: 530, width: 800, height: 80, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 367, y: 309, width: 466, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 80, y: 720, width: 920, height: 135, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", textFit: true, color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 140, y: 872, width: 800, height: 159, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 217, y: 634, width: 646, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1920, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 76, y: 1422, width: 920, height: 134, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", textFit: true, color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 140, y: 1579, width: 800, height: 239, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 292, y: 1330, width: 497, height: 64, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
