import { describe, it, expect } from "vitest";
import { derivePreviewTitle } from "../preview";

describe("derivePreviewTitle", () => {
  it("prefers explicit name", () => {
    expect(
      derivePreviewTitle({ output: "image", objectContent: { title: { text: "From obj" } } }, "Explicit")
    ).toBe("Explicit");
  });

  it("falls back to first objectContent text", () => {
    expect(
      derivePreviewTitle(
        { output: "image", objectContent: { title: { text: "First text" }, img: { image_url: "https://x/y.png" } } },
        null
      )
    ).toBe("First text");
  });

  it("ignores whitespace-only name", () => {
    expect(
      derivePreviewTitle({ output: "image", objectContent: { title: { text: "Obj" } } }, "   ")
    ).toBe("Obj");
  });

  it("ignores whitespace-only texts", () => {
    expect(
      derivePreviewTitle({ output: "image", objectContent: { a: { text: "   " }, b: { text: "Real" } } }, null)
    ).toBe("Real");
  });

  it("defaults to 'Untitled draft' when nothing usable", () => {
    expect(derivePreviewTitle({ output: "image" }, null)).toBe("Untitled draft");
  });

  it("returns default when only visual content", () => {
    expect(
      derivePreviewTitle({ output: "image", objectContent: { a: { image_url: "https://x/y.png" } } }, null)
    ).toBe("Untitled draft");
  });
});
