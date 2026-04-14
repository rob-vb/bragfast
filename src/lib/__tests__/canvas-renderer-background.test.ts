import { describe, it, expect } from "vitest";
import { CanvasRenderer } from "@/lib/templates/canvas-renderer";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = { type: any; props: Record<string, any> };

const baseConfig: CanvasTemplateConfig = {
  version: 2,
  colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
  formats: {
    landscape: { objects: [] },
    square: { objects: [] },
    portrait: { objects: [] },
  },
};

const brand: Brand = {
  name: "Test",
  logoBase64: "",
  website: "",
  colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
};

function render(config: CanvasTemplateConfig, extraProps?: { backgroundImageBase64?: string }) {
  return CanvasRenderer({
    config,
    format: "landscape",
    objectData: {},
    brand,
    ...extraProps,
  }) as El;
}

function getChildren(el: El): El[] {
  const c = el.props.children;
  if (!c) return [];
  return Array.isArray(c) ? c.flat().filter(Boolean) : [c].filter(Boolean);
}

describe("CanvasRenderer background", () => {
  it("uses solid color when no background config", () => {
    const el = render(baseConfig);
    expect(el.props.style.background).toBe("#FFF8F0");
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(0);
  });

  it("uses solid color for explicit { mode: 'color' }", () => {
    const config: CanvasTemplateConfig = { ...baseConfig, background: { mode: "color" } };
    const el = render(config);
    expect(el.props.style.background).toBe("#FFF8F0");
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(0);
  });

  it("uses mesh gradient CSS when background is mesh_gradient", () => {
    const config: CanvasTemplateConfig = {
      ...baseConfig,
      background: {
        mode: "mesh_gradient",
        colors: ["#FF0000", "#00FF00", "#0000FF"],
        positions: [
          { x: 20, y: 30 },
          { x: 70, y: 20 },
          { x: 40, y: 80 },
        ],
      },
    };
    const el = render(config);
    expect(el.props.style.background).toContain("radial-gradient");
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(0);
  });

  it("renders img child when background is image", () => {
    const config: CanvasTemplateConfig = {
      ...baseConfig,
      background: { mode: "image", imageUrl: "https://example.com/bg.jpg" },
    };
    const el = render(config);
    expect(el.props.style.background).toBe("white");
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].props.src).toBe("https://example.com/bg.jpg");
    expect(imgs[0].props.style.objectFit).toBe("cover");
  });

  it("prefers backgroundImageBase64 over imageUrl", () => {
    const config: CanvasTemplateConfig = {
      ...baseConfig,
      background: { mode: "image", imageUrl: "https://example.com/bg.jpg" },
    };
    const el = render(config, { backgroundImageBase64: "data:image/png;base64,abc" });
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].props.src).toBe("data:image/png;base64,abc");
  });

  it("renders img when backgroundImageBase64 provided without image mode", () => {
    const el = render(baseConfig, { backgroundImageBase64: "data:image/png;base64,xyz" });
    const children = getChildren(el);
    const imgs = children.filter((c) => c.type === "img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].props.src).toBe("data:image/png;base64,xyz");
  });
});
