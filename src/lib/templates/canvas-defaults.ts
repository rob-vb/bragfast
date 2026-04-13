import type { CanvasTemplateConfig } from "./canvas-types";

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  "standard-browser": {
    name: "Standard Browser",
    config: {
      version: 2,
      colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 64, y: 302, width: 1072, height: 603, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 64, y: 102, width: 1072, height: 89, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 191, width: 1072, height: 60, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top", textFit: false },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 64, y: 438, width: 952, height: 700, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 360, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 271, width: 952, height: 220, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 64, y: 473, width: 952, height: 915, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 36, width: 731, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 100, width: 952, height: 100, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here", textFit: false },
            { id: "description", type: "text", name: "description", x: 64, y: 216, width: 952, height: 200, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top", textFit: false },
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
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 449, y: 279, width: 303, height: 605, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 24, width: 411, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
            { id: "title", type: "text", name: "title", x: 64, y: 109, width: 1072, height: 89, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 198, width: 1072, height: 60, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "center", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 340, y: 524, width: 401, height: 803, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 624, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 142, width: 952, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 272, width: 952, height: 200, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 288, y: 539, width: 505, height: 1050, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 36, width: 731, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 100, width: 952, height: 100, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 90, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 216, width: 952, height: 240, opacity: 0.8, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
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
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 630, y: 64, width: 643, height: 547, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 64, width: 418, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 179, width: 502, height: 162, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 64, y: 358, width: 502, height: 253, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 1009, height: 890, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 96, width: 406, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 55, y: 224, width: 433, height: 340, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 589, y: 64, width: 1041, height: 1222, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 64, width: 400, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 48, y: 228, width: 474, height: 420, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary", previewText: "Text goes here" },
            { id: "description", type: "text", name: "description", x: 48, y: 664, width: 400, height: 630, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
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
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 730, y: 48, width: 390, height: 700, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 48, width: 418, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 64, y: 147, width: 586, height: 183, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 64, y: 338, width: 586, height: 283, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 570, y: 80, width: 460, height: 1100, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 80, width: 406, height: 64, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 59, y: 201, width: 429, height: 364, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 59, y: 585, width: 429, height: 401, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 707, y: 140, width: 550, height: 1070, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "contain", anchorX: "left", anchorY: "top" },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 140, width: 400, height: 54, opacity: 1, zIndex: 2, objectFit: "contain", anchorX: "left" },
            { id: "title", type: "text", name: "title", x: 48, y: 278, width: 553, height: 370, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 72, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "bottom", colorRole: "primary" },
            { id: "description", type: "text", name: "description", x: 48, y: 664, width: 400, height: 630, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 32, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
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
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 64, y: 393, width: 1072, height: 120, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 200, y: 530, width: 800, height: 80, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 367, y: 309, width: 466, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 80, y: 720, width: 920, height: 135, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 872, width: 800, height: 159, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 217, y: 634, width: 646, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1350, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { id: "title", type: "text", name: "title", x: 76, y: 960, width: 920, height: 134, opacity: 1, zIndex: 3, fontFamily: "Plus Jakarta Sans", fontSize: 80, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "bottom", colorRole: "primary", textFit: true },
            { id: "description", type: "text", name: "description", x: 140, y: 1110, width: 800, height: 190, opacity: 1, zIndex: 4, fontFamily: "Plus Jakarta Sans", fontSize: 48, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "center", verticalAlign: "top" },
            { id: "logo", type: "logo", name: "logo", x: 292, y: 880, width: 497, height: 64, opacity: 1, zIndex: 2, objectFit: "contain" },
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
      animation_preset: "showcase",
      formats: {
        landscape: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 24, width: 260, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 110, width: 1040, height: 56, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 32, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary" },
            { id: "features", type: "text", name: "features", x: 80, y: 196, width: 1040, height: 200, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 416, width: 1040, height: 180, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 631, width: 1040, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
        square: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 48, width: 300, height: 56, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 148, width: 920, height: 64, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 36, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary" },
            { id: "features", type: "text", name: "features", x: 80, y: 244, width: 920, height: 320, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 584, width: 920, height: 380, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 1024, width: 920, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
        portrait: {
          objects: [
            { id: "logo", type: "logo", name: "logo", x: 80, y: 48, width: 300, height: 56, opacity: 1, zIndex: 4, objectFit: "contain" },
            { id: "version", type: "text", name: "version", x: 80, y: 148, width: 920, height: 64, opacity: 1, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 36, fontWeight: 700, letterSpacing: 0, lineHeight: 1.2, textAlign: "left", verticalAlign: "top", colorRole: "primary" },
            { id: "features", type: "text", name: "features", x: 80, y: 244, width: 920, height: 440, opacity: 1, zIndex: 3, fontFamily: "Geist", fontSize: 36, fontWeight: 600, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "fixes", type: "text", name: "fixes", x: 80, y: 704, width: 920, height: 560, opacity: 0.7, zIndex: 3, fontFamily: "Geist", fontSize: 30, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5, textAlign: "left", verticalAlign: "top" },
            { id: "branding", type: "text", name: "branding", x: 80, y: 1298, width: 920, height: 28, opacity: 0.5, zIndex: 2, fontFamily: "Press Start 2P", fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.2, textAlign: "right", verticalAlign: "top" },
          ],
        },
      },
    },
  },

};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
