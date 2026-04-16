import { describe, it, expect } from "vitest";
import { findHeroImageId } from "../../remotion/VideoCanvasComposition";
import type { TemplateObject } from "../templates/canvas-types";

function img(overrides: Partial<TemplateObject> & { id: string; zIndex: number }): TemplateObject {
  return {
    type: "visual",
    name: overrides.id,
    x: 0, y: 0, width: 100, height: 100,
    opacity: 1,
    ...overrides,
  } as TemplateObject;
}

describe("findHeroImageId", () => {
  it("returns the single image as hero", () => {
    expect(findHeroImageId([img({ id: "img1", zIndex: 1 })])).toBe("img1");
  });

  it("returns highest zIndex image as hero", () => {
    const objects = [
      img({ id: "img-low", zIndex: 1 }),
      img({ id: "img-high", zIndex: 5 }),
    ];
    expect(findHeroImageId(objects)).toBe("img-high");
  });

  it("breaks zIndex tie by higher opacity", () => {
    const objects = [
      img({ id: "a", zIndex: 3, opacity: 0.5 }),
      img({ id: "b", zIndex: 3, opacity: 0.9 }),
    ];
    expect(findHeroImageId(objects)).toBe("b");
  });

  it("breaks zIndex + opacity tie by alphabetical id", () => {
    const objects = [
      img({ id: "beta", zIndex: 3, opacity: 1 }),
      img({ id: "alpha", zIndex: 3, opacity: 1 }),
    ];
    expect(findHeroImageId(objects)).toBe("alpha");
  });

  it("returns null for zero images", () => {
    expect(findHeroImageId([])).toBeNull();
  });

  it("excludes background images from hero selection", () => {
    const objects = [
      img({ id: "bg", zIndex: 10, background: true }),
      img({ id: "hero", zIndex: 2 }),
    ];
    expect(findHeroImageId(objects)).toBe("hero");
  });

  it("returns null when all images are background", () => {
    const objects = [
      img({ id: "bg1", zIndex: 1, background: true }),
      img({ id: "bg2", zIndex: 2, background: true }),
    ];
    expect(findHeroImageId(objects)).toBeNull();
  });

  it("ignores non-image objects", () => {
    const objects = [
      { id: "title", type: "text", name: "title", x: 0, y: 0, width: 100, height: 50, opacity: 1, zIndex: 10 } as TemplateObject,
      img({ id: "img", zIndex: 1 }),
    ];
    expect(findHeroImageId(objects)).toBe("img");
  });
});
