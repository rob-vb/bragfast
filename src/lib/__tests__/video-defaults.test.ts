import { describe, it, expect } from "vitest";
import { getDefaultVideoTemplate, DEFAULT_VIDEO_TEMPLATES, isDefaultVideoTemplate } from "../video/defaults";

describe("getDefaultVideoTemplate", () => {
  it("should return product-update template", () => {
    const tmpl = getDefaultVideoTemplate("product-update");
    expect(tmpl).toBeDefined();
    expect(tmpl!.fps).toBe(30);
    expect(tmpl!.scenes).toHaveLength(4);
    expect(tmpl!.scenes[0].type).toBe("intro");
    expect(tmpl!.scenes[3].type).toBe("cta");
  });

  it("should return null for unknown template", () => {
    expect(getDefaultVideoTemplate("nonexistent")).toBeNull();
  });

  it("should list all default template names", () => {
    expect(Object.keys(DEFAULT_VIDEO_TEMPLATES)).toContain("product-update");
  });
});

describe("isDefaultVideoTemplate", () => {
  it("should return true for known templates", () => {
    expect(isDefaultVideoTemplate("product-update")).toBe(true);
  });

  it("should return false for unknown names", () => {
    expect(isDefaultVideoTemplate("nonexistent")).toBe(false);
  });
});
