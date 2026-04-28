import { describe, it, expect } from "vitest";
import { applySignatureDefaults } from "@/lib/pipeline/signature";
import { getCanvasDefaultConfig } from "@/lib/templates/canvas-defaults";
import type { Brand } from "@/lib/types";
import type { FormatKey } from "@/lib/templates/canvas-types";

const brand: Brand = {
  name: "Acme Corp",
  logoBase64: "data:image/png;base64,FAKE",
  website: "",
  colors: { background: "#FFF", text: "#000", primary: "#F00" },
};

function layoutFor(templateId: string, format: FormatKey) {
  const cfg = getCanvasDefaultConfig(templateId)!;
  return cfg.formats[format] ?? cfg.formats.landscape;
}

describe("carousel templates registry", () => {
  it.each([
    ["carousel-cover"],
    ["carousel-content-text"],
    ["carousel-content-image"],
    ["carousel-outro"],
  ])("registers %s with all 3 formats", (id) => {
    const cfg = getCanvasDefaultConfig(id);
    expect(cfg).not.toBeNull();
    expect(cfg!.formats.landscape.objects.length).toBeGreaterThan(0);
    expect(cfg!.formats.square.objects.length).toBeGreaterThan(0);
    expect(cfg!.formats.portrait.objects.length).toBeGreaterThan(0);
  });

  it("each carousel template has signature_avatar + signature_name + signature_title in portrait", () => {
    const ids = ["carousel-cover", "carousel-content-text", "carousel-content-image", "carousel-outro"];
    for (const id of ids) {
      const objIds = layoutFor(id, "portrait").objects.map((o) => o.id);
      expect(objIds).toContain("signature_avatar");
      expect(objIds).toContain("signature_name");
      expect(objIds).toContain("signature_title");
    }
  });

  it("cover and outro carry accentMarkup on the title", () => {
    const cover = layoutFor("carousel-cover", "portrait").objects.find((o) => o.id === "title")!;
    const outro = layoutFor("carousel-outro", "portrait").objects.find((o) => o.id === "title")!;
    expect(cover.accentMarkup).toBe(true);
    expect(outro.accentMarkup).toBe(true);
  });

  it("content templates carry accentMarkup on heading and a badge with bg fill", () => {
    for (const id of ["carousel-content-text", "carousel-content-image"]) {
      const objs = layoutFor(id, "portrait").objects;
      const heading = objs.find((o) => o.id === "heading")!;
      const badge = objs.find((o) => o.id === "badge")!;
      expect(heading.accentMarkup).toBe(true);
      expect(badge.backgroundColorRole).toBe("primary");
    }
  });

  it("content-image carries side_image visual", () => {
    const objs = layoutFor("carousel-content-image", "portrait").objects;
    const side = objs.find((o) => o.id === "side_image")!;
    expect(side.type).toBe("visual");
  });
});

describe("applySignatureDefaults", () => {
  it("fills signature_avatar from brand.logoBase64 when slide has no override", () => {
    const layout = layoutFor("carousel-cover", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {};
    applySignatureDefaults(dataMap, layout, brand);
    expect(dataMap.signature_avatar?.imageBase64).toBe("data:image/png;base64,FAKE");
    expect(dataMap.signature_name?.text).toBe("Acme Corp");
    // No brand source for title — left absent
    expect(dataMap.signature_title).toBeUndefined();
  });

  it("preserves slide override when present", () => {
    const layout = layoutFor("carousel-cover", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {
      signature_name: { text: "Custom Author" },
      signature_avatar: { imageBase64: "data:image/png;base64,SLIDE" },
    };
    applySignatureDefaults(dataMap, layout, brand);
    expect(dataMap.signature_name?.text).toBe("Custom Author");
    expect(dataMap.signature_avatar?.imageBase64).toBe("data:image/png;base64,SLIDE");
  });

  it("is a no-op when layout has no signature objects (existing templates)", () => {
    const layout = layoutFor("standard-browser", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {};
    applySignatureDefaults(dataMap, layout, brand);
    expect(dataMap.signature_avatar).toBeUndefined();
    expect(dataMap.signature_name).toBeUndefined();
  });

  it("skips avatar when brand has no logoBase64", () => {
    const layout = layoutFor("carousel-cover", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {};
    applySignatureDefaults(dataMap, layout, { ...brand, logoBase64: "" });
    expect(dataMap.signature_avatar).toBeUndefined();
    expect(dataMap.signature_name?.text).toBe("Acme Corp");
  });
});
