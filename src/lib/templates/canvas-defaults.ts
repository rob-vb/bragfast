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
            { id: "description", type: "text", name: "description", x: 64, y: 191, width: 1072, height: 60, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", textFit: false },
            { id: "image", type: "image", name: "image", x: 64, y: 302, width: 1072, height: 393, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", entrance: "none" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 271, width: 952, height: 220, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
            { id: "image", type: "image", name: "image", x: 64, y: 538, width: 952, height: 561, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 360, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        portrait: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 286, width: 952, height: 340, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
            { id: "image", type: "image", name: "image", x: 64, y: 720, width: 952, height: 1220, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorY: "top", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 731, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
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
            { id: "image", type: "image", name: "image", x: 429, y: 319, width: 343, height: 525, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorY: "top", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", entrance: "none" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 64, y: 272, width: 952, height: 200, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 340, y: 524, width: 401, height: 803, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 624, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        portrait: {
          objects: [
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 64, y: 277, width: 952, height: 376, opacity: 0.8, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "image", type: "image", name: "image", x: 215, y: 722, width: 650, height: 1358, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorY: "top", kenBurns: true },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 731, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
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
            { id: "title", type: "text", name: "title", x: 64, y: 179, width: 502, height: 162, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here" },
            { id: "image", type: "image", name: "image", x: 630, y: 64, width: 643, height: 547, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top", kenBurns: true },
            { id: "description", type: "text", name: "description", x: 64, y: 358, width: 502, height: 253, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 64, width: 418, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 55, y: 224, width: 433, height: 340, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here" },
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 1009, height: 890, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top", kenBurns: true },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 96, width: 406, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 578, y: 91, width: 1355, height: 1752, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover", anchorX: "left", anchorY: "top", kenBurns: true },
            { id: "title", type: "text", name: "title", x: 48, y: 325, width: 458, height: 601, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 48, y: 944, width: 458, height: 899, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 91, width: 431, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
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
            { id: "title", type: "text", name: "title", x: 64, y: 147, width: 586, height: 183, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "image", type: "image", name: "image", x: 730, y: 48, width: 390, height: 700, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover", kenBurns: true },
            { id: "description", type: "text", name: "description", x: 64, y: 338, width: 586, height: 283, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 418, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        square: {
          objects: [
            { id: "title", type: "text", name: "title", x: 59, y: 201, width: 429, height: 364, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "image", type: "image", name: "image", x: 570, y: 80, width: 460, height: 1100, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover", kenBurns: true },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 80, width: 406, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 542, y: 200, width: 661, height: 1534, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover", anchorX: "left", anchorY: "top", kenBurns: true },
            { id: "title", type: "text", name: "title", x: 48, y: 395, width: 458, height: 531, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", color: "#F8AF3C" },
            { id: "description", type: "text", name: "description", x: 48, y: 944, width: 458, height: 899, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 200, width: 431, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", anchorX: "left", entrance: "none" },
          ],
        },
      },
    },
  },
  "hero": {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 64, y: 393, width: 1072, height: 120, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", color: "#F8AF3C", textFit: true },
            { id: "description", type: "text", name: "description", x: 200, y: 530, width: 800, height: 80, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 367, y: 309, width: 466, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", entrance: "none" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 80, y: 720, width: 920, height: 135, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", color: "#F8AF3C", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 872, width: 800, height: 159, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 217, y: 634, width: 646, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", entrance: "none" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1920, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 76, y: 1422, width: 920, height: 134, opacity: 1, zIndex: 2, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", color: "#F8AF3C", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 1579, width: 800, height: 239, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 292, y: 1330, width: 497, height: 64, opacity: 1, zIndex: 4, objectFit: "contain", entrance: "none" },
          ],
        },
      },
    },
  },
  changelog: {
    name: "Changelog",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      formats: {
        landscape: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 24, width: 260, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 110, width: 1040, height: 56, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 32, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", color: "#F8AF3C" },
            { id: "features", type: "text", name: "features", x: 80, y: 196, width: 1040, height: 200, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 416, width: 1040, height: 180, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 631, width: 1040, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 48, width: 300, height: 56, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 148, width: 920, height: 64, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 36, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", color: "#F8AF3C" },
            { id: "features", type: "text", name: "features", x: 80, y: 244, width: 920, height: 320, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 584, width: 920, height: 380, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 1024, width: 920, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 64, width: 300, height: 56, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 192, width: 920, height: 64, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 36, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", color: "#F8AF3C" },
            { id: "features", type: "text", name: "features", x: 80, y: 296, width: 920, height: 640, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 960, width: 920, height: 820, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 1856, width: 920, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
      },
    },
  },

};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
