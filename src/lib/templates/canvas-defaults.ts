import type { CanvasTemplateConfig } from "./canvas-types";

function textObj(id: string, type: "title" | "description" | "productName", overrides: Record<string, unknown> = {}) {
  return {
    id,
    type,
    name: id,
    opacity: 1,
    zIndex: 0,
    fontFamily: "Plus Jakarta Sans",
    fontWeight: type === "title" ? 700 : 400,
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
    ...overrides,
  };
}

export const CANVAS_DEFAULTS: Record<string, { name: string; config: CanvasTemplateConfig }> = {
  classic_v2: {
    name: "Classic",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("logo", "productName"), x: 40, y: 24, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 40, y: 88, width: 1120, height: 380, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 40, y: 488, width: 1120, height: 80, fontSize: 36, zIndex: 2 },
            { ...textObj("description", "description"), x: 40, y: 576, width: 1120, height: 60, fontSize: 18, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 720, width: 984, height: 120, fontSize: 48, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 856, width: 984, height: 80, fontSize: 22, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 750, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 876, width: 984, height: 150, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 1044, width: 984, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
      },
    },
  },
  split_v2: {
    name: "Split",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { ...textObj("logo", "productName"), x: 40, y: 24, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { ...textObj("title", "title"), x: 40, y: 200, width: 540, height: 200, fontSize: 36, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 620, y: 88, width: 540, height: 480, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("description", "description"), x: 40, y: 580, width: 540, height: 60, fontSize: 18, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { ...textObj("title", "title"), x: 48, y: 200, width: 480, height: 300, fontSize: 42, zIndex: 2 },
            { id: "image", type: "image", name: "image", x: 556, y: 96, width: 476, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("description", "description"), x: 48, y: 880, width: 984, height: 80, fontSize: 22, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { ...textObj("logo", "productName"), x: 48, y: 32, width: 200, height: 48, fontSize: 14, zIndex: 4 },
            { id: "image", type: "image", name: "image", x: 48, y: 96, width: 984, height: 600, opacity: 1, zIndex: 1, device: "browser", objectFit: "cover" },
            { ...textObj("title", "title"), x: 48, y: 726, width: 984, height: 200, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description"), x: 48, y: 944, width: 984, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
      },
    },
  },
  hero_v2: {
    name: "Hero",
    config: {
      version: 2,
      colors: { background: "#1a1a2e", text: "#ffffff", primary: "#e94560" },
      formats: {
        landscape: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1200, height: 675, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 100, y: 400, width: 1000, height: 120, fontSize: 48, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 200, y: 530, width: 800, height: 80, fontSize: 20, zIndex: 3 },
          ],
        },
        square: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1080, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 80, y: 720, width: 920, height: 160, fontSize: 56, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 140, y: 900, width: 800, height: 100, fontSize: 24, zIndex: 3 },
          ],
        },
        portrait: {
          objects: [
            { id: "image", type: "image", name: "image", x: 0, y: 0, width: 1080, height: 1350, opacity: 0.6, zIndex: 0, device: "none", objectFit: "cover" },
            { ...textObj("title", "title", { textAlign: "center" }), x: 80, y: 950, width: 920, height: 160, fontSize: 60, zIndex: 2 },
            { ...textObj("description", "description", { textAlign: "center" }), x: 140, y: 1130, width: 800, height: 100, fontSize: 26, zIndex: 3 },
          ],
        },
      },
    },
  },
};

export function getCanvasDefaultConfig(name: string): CanvasTemplateConfig | null {
  return CANVAS_DEFAULTS[name]?.config ?? null;
}
