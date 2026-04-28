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

describe("carousel-slide template", () => {
  it("registers in all 3 formats", () => {
    const cfg = getCanvasDefaultConfig("carousel-slide");
    expect(cfg).not.toBeNull();
    expect(cfg!.formats.landscape.objects.length).toBeGreaterThan(0);
    expect(cfg!.formats.square.objects.length).toBeGreaterThan(0);
    expect(cfg!.formats.portrait.objects.length).toBeGreaterThan(0);
  });

  it.each(["landscape", "square", "portrait"] as FormatKey[])(
    "carries signature_avatar + signature_name + signature_title in %s",
    (format) => {
      const objIds = layoutFor("carousel-slide", format).objects.map((o) => o.id);
      expect(objIds).toContain("signature_avatar");
      expect(objIds).toContain("signature_name");
      expect(objIds).toContain("signature_title");
    },
  );

  it("exposes hook/content/outro role objects: eyebrow, badge, heading, body, cta_text", () => {
    const objIds = layoutFor("carousel-slide", "portrait").objects.map((o) => o.id);
    expect(objIds).toContain("eyebrow");
    expect(objIds).toContain("badge");
    expect(objIds).toContain("heading");
    expect(objIds).toContain("body");
    expect(objIds).toContain("cta_text");
  });

  it("heading carries accentMarkup with primary accent role", () => {
    const heading = layoutFor("carousel-slide", "portrait").objects.find((o) => o.id === "heading")!;
    expect(heading.accentMarkup).toBe(true);
    expect(heading.accentColorRole).toBe("primary");
  });

  it("badge renders as outline ring asset with primary-colored numeral", () => {
    const objs = layoutFor("carousel-slide", "portrait").objects;
    const badge = objs.find((o) => o.id === "badge")!;
    const ring = objs.find((o) => o.id === "badge_ring")!;
    expect(badge.colorRole).toBe("primary");
    expect(ring.src).toBe("/templates/carousel/badge-ring.png");
  });

  it("cta_text is a pill with primary fill, padding, and large radius", () => {
    const cta = layoutFor("carousel-slide", "portrait").objects.find((o) => o.id === "cta_text")!;
    expect(cta.backgroundColorRole).toBe("primary");
    expect(cta.paddingX).toBeGreaterThan(0);
    expect(cta.paddingY).toBeGreaterThan(0);
    expect(cta.borderRadius).toBeGreaterThanOrEqual(999);
  });

  it("dropped slugs no longer resolve", () => {
    expect(getCanvasDefaultConfig("carousel-cover")).toBeNull();
    expect(getCanvasDefaultConfig("carousel-content-text")).toBeNull();
    expect(getCanvasDefaultConfig("carousel-content-image")).toBeNull();
    expect(getCanvasDefaultConfig("carousel-outro")).toBeNull();
  });
});

describe("applySignatureDefaults", () => {
  it("fills signature_avatar from brand.logoBase64 when slide has no override", () => {
    const layout = layoutFor("carousel-slide", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {};
    applySignatureDefaults(dataMap, layout, brand);
    expect(dataMap.signature_avatar?.imageBase64).toBe("data:image/png;base64,FAKE");
    expect(dataMap.signature_name?.text).toBe("Acme Corp");
    // No brand source for title — left absent
    expect(dataMap.signature_title).toBeUndefined();
  });

  it("preserves slide override when present", () => {
    const layout = layoutFor("carousel-slide", "portrait");
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
    const layout = layoutFor("carousel-slide", "portrait");
    const dataMap: Record<string, { text?: string; imageBase64?: string }> = {};
    applySignatureDefaults(dataMap, layout, { ...brand, logoBase64: "" });
    expect(dataMap.signature_avatar).toBeUndefined();
    expect(dataMap.signature_name?.text).toBe("Acme Corp");
  });
});
