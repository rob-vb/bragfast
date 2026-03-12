import type { CanvasTemplateConfig } from "./canvas-types";

function textObj(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "text" as const,
    name: id,
    opacity: 1,
    zIndex: 0,
    fontFamily: "Plus Jakarta Sans",
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
    ...overrides,
  };
}

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  "standard-browser": {
    name: "Standard Browser",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("title", { textAlign: "center", verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 102, width: 1072, height: 89, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { textAlign: "center", opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 191, width: 1072, height: 60, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 64, y: 302, width: 1072, height: 525, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 38, width: 411, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { ...textObj("title", { fontWeight: 700 }), x: 64, y: 142, width: 952, height: 120, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 251, width: 952, height: 199, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 64, y: 540, width: 952, height: 700, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 43, width: 360, height: 77, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("title", { verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 179, width: 952, height: 120, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 310, width: 952, height: 256, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 64, y: 722, width: 952, height: 1358, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 65, width: 731, height: 94, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "standard-mobile": {
    name: "Standard Mobile",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("title", { textAlign: "center", verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 102, width: 1072, height: 89, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { textAlign: "center", opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 191, width: 1072, height: 60, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 300, y: 302, width: 600, height: 525, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 395, y: 38, width: 411, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { ...textObj("title", { fontWeight: 700 }), x: 64, y: 142, width: 952, height: 120, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 251, width: 952, height: 199, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 215, y: 540, width: 650, height: 700, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 43, width: 360, height: 77, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("title", { verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 179, width: 952, height: 120, fontSize: 90, zIndex: 2 },
            { ...textObj("description", { opacity: 0.8, lineHeight: 1.5 }), x: 64, y: 310, width: 952, height: 256, fontSize: 48, zIndex: 3 },
            { id: "image", type: "image", name: "image", x: 215, y: 722, width: 650, height: 1358, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 65, width: 731, height: 94, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "split-browser": {
    name: "Split Browser",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 263, width: 502, height: 67, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 630, y: 64, width: 580, height: 547, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { ...textObj("description", { lineHeight: 1.5 }), x: 64, y: 338, width: 502, height: 153, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 199, width: 418, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 59, y: 379, width: 429, height: 186, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 524, height: 890, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { ...textObj("description", { lineHeight: 1.5 }), x: 59, y: 585, width: 429, height: 401, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 311, width: 406, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 578, y: 91, width: 602, height: 1752, opacity: 1, zIndex: 1, imageFrame: "browser", imageFrameColor: "#E8E8E8", objectFit: "cover" },
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 48, y: 726, width: 458, height: 200, zIndex: 2 },
            { ...textObj("description", { lineHeight: 1.5 }), x: 48, y: 944, width: 458, height: 899, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 672, width: 431, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  "split-mobile": {
    name: "Split Mobile",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 64, y: 263, width: 502, height: 67, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 770, y: 64, width: 300, height: 547, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { ...textObj("description", { lineHeight: 1.5 }), x: 64, y: 338, width: 502, height: 153, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 64, y: 199, width: 418, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 59, y: 379, width: 429, height: 186, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 590, y: 96, width: 420, height: 890, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { ...textObj("description", { lineHeight: 1.5 }), x: 59, y: 585, width: 429, height: 401, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 59, y: 311, width: 406, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 578, y: 91, width: 602, height: 1752, opacity: 1, zIndex: 1, imageFrame: "mobile", imageFrameColor: "#1A1A1A", objectFit: "cover" },
            { ...textObj("title", { fontSize: 72, verticalAlign: "bottom", fontWeight: 700 }), x: 48, y: 726, width: 458, height: 200, zIndex: 2 },
            { ...textObj("description", { lineHeight: 1.5 }), x: 48, y: 944, width: 458, height: 899, fontSize: 24, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 48, y: 672, width: 431, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
  hero: {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { ...textObj("title", { textAlign: "center", verticalAlign: "bottom", textFit: true, fontSize: 80, fontWeight: 700 }), x: 64, y: 393, width: 1072, height: 120, zIndex: 2 },
            { ...textObj("description", { textAlign: "center", fontSize: 48 }), x: 200, y: 530, width: 800, height: 80, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 367, y: 341, width: 466, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { ...textObj("title", { textAlign: "center", verticalAlign: "bottom", textFit: true, fontSize: 80, fontWeight: 700 }), x: 80, y: 720, width: 920, height: 135, zIndex: 2 },
            { ...textObj("description", { textAlign: "center", fontSize: 48 }), x: 140, y: 872, width: 800, height: 100, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 217, y: 694, width: 646, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1920, opacity: 0.6, zIndex: 0, imageFrame: "none", objectFit: "cover" },
            { ...textObj("title", { textAlign: "center", verticalAlign: "bottom", textFit: true, fontSize: 80, fontWeight: 700 }), x: 76, y: 1474, width: 920, height: 134, zIndex: 2 },
            { ...textObj("description", { textAlign: "center", fontSize: 48 }), x: 140, y: 1636, width: 800, height: 100, zIndex: 3 },
            { id: "logo", type: "logo", name: "logo", x: 292, y: 1441, width: 497, height: 48, opacity: 1, zIndex: 4, objectFit: "contain" },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
