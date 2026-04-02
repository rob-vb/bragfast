import { describe, it, expect } from "vitest";
import {
  generateMeshGradientCSS,
  randomizeMeshPositions,
  resolveBackground,
} from "../templates/mesh-gradient";
import type { CanvasTemplateConfig } from "../templates/canvas-types";

const baseConfig: CanvasTemplateConfig = {
  version: 2,
  colors: { background: "#ffffff", text: "#000000", primary: "#ff0000" },
  formats: {
    landscape: { objects: [] },
    square: { objects: [] },
    portrait: { objects: [] },
  },
};

const colors = { background: "#ffffff", text: "#000000", primary: "#ff0000" };

describe("generateMeshGradientCSS", () => {
  it("returns string with 3 radial-gradient calls and base color", () => {
    const result = generateMeshGradientCSS(
      ["#1a1a2e", "#c4956a", "#e8d5c4"],
      [{ x: 20, y: 30 }, { x: 80, y: 70 }, { x: 50, y: 90 }],
    );
    const matches = result.match(/radial-gradient/g);
    expect(matches).toHaveLength(3);
    expect(result).toContain("#1a1a2e");
  });

  it("with identical colors still produces valid gradient string", () => {
    const result = generateMeshGradientCSS(
      ["#aaa", "#aaa", "#aaa"],
      [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 90, y: 90 }],
    );
    expect(result.match(/radial-gradient/g)).toHaveLength(3);
    expect(result).toContain("#aaa");
  });
});

describe("resolveBackground", () => {
  it("with undefined background returns css = colors.background", () => {
    const result = resolveBackground(baseConfig, colors);
    expect(result).toEqual({ css: "#ffffff", imageUrl: undefined });
  });

  it("with mode color returns same as undefined", () => {
    const config = { ...baseConfig, background: { mode: "color" } as const };
    const result = resolveBackground(config, colors);
    expect(result).toEqual({ css: "#ffffff", imageUrl: undefined });
  });

  it("with mesh_gradient returns CSS containing radial-gradient", () => {
    const config: CanvasTemplateConfig = {
      ...baseConfig,
      background: {
        mode: "mesh_gradient",
        colors: ["#1a1a2e", "#c4956a", "#e8d5c4"],
        positions: [{ x: 20, y: 30 }, { x: 80, y: 70 }, { x: 50, y: 90 }],
      },
    };
    const result = resolveBackground(config, colors);
    expect(result.css).toContain("radial-gradient");
    expect(result.imageUrl).toBeUndefined();
  });

  it("with image mode returns imageUrl", () => {
    const config: CanvasTemplateConfig = {
      ...baseConfig,
      background: { mode: "image", imageUrl: "https://example.com/bg.jpg" },
    };
    const result = resolveBackground(config, colors);
    expect(result).toEqual({ css: undefined, imageUrl: "https://example.com/bg.jpg" });
  });
});

describe("randomizeMeshPositions", () => {
  it("returns 3 items each with x and y between 0-100", () => {
    const positions = randomizeMeshPositions();
    expect(positions).toHaveLength(3);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("called twice produces different results", () => {
    let different = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const a = randomizeMeshPositions();
      const b = randomizeMeshPositions();
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });
});
