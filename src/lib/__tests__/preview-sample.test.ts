import { describe, it, expect } from "vitest";
import { buildDraftObjectData } from "../preview-sample";
import { getCanvasDefaultConfig } from "../templates/canvas-defaults";
import type { CanvasTemplateConfig } from "../templates/canvas-types";

const baseConfig = getCanvasDefaultConfig("standard-browser")!;

describe("buildDraftObjectData", () => {
  it("uses draft text for text objects when provided", () => {
    const result = buildDraftObjectData(
      baseConfig,
      { title: { text: "Shipped v2" }, description: { text: "A subtitle" } },
      "landscape",
    );
    expect(result.title).toEqual({ text: "Shipped v2" });
    expect(result.description).toEqual({ text: "A subtitle" });
  });

  it("falls back to previewText when draft has no text for an object", () => {
    const result = buildDraftObjectData(baseConfig, undefined, "landscape");
    // standard-browser landscape title has previewText "Text goes here"
    expect(result.title).toEqual({ text: "Text goes here" });
    // description has no previewText → empty string
    expect(result.description).toEqual({ text: "" });
  });

  it("populates image_url onto imageBase64 for visual objects", () => {
    const result = buildDraftObjectData(
      baseConfig,
      { image: { image_url: "https://example.com/shot.png" } },
      "landscape",
    );
    expect(result.image).toEqual({ imageBase64: "https://example.com/shot.png" });
  });

  it("populates video_url onto videoUrl for visual objects", () => {
    const result = buildDraftObjectData(
      baseConfig,
      { image: { video_url: "https://example.com/clip.mp4" } },
      "landscape",
    );
    expect(result.image).toEqual({ videoUrl: "https://example.com/clip.mp4" });
  });

  it("prefers image_url over video_url when both are present", () => {
    const result = buildDraftObjectData(
      baseConfig,
      { image: { image_url: "img.png", video_url: "vid.mp4" } },
      "landscape",
    );
    expect(result.image).toEqual({ imageBase64: "img.png" });
  });

  it("omits visual objects entirely when no image/video content is provided", () => {
    const result = buildDraftObjectData(baseConfig, { title: { text: "Hi" } }, "landscape");
    expect(result.image).toBeUndefined();
  });

  it("falls back to landscape layout when the requested format is missing", () => {
    const partialConfig = {
      ...baseConfig,
      formats: { landscape: baseConfig.formats.landscape },
    } as unknown as CanvasTemplateConfig;
    const result = buildDraftObjectData(
      partialConfig,
      { title: { text: "Hi" }, image: { image_url: "img.png" } },
      "portrait",
    );
    // Derived from landscape layout ids (title is text, image is visual)
    expect(result.title).toEqual({ text: "Hi" });
    expect(result.image).toEqual({ imageBase64: "img.png" });
  });

  it("handles empty objectContent", () => {
    const result = buildDraftObjectData(baseConfig, {}, "landscape");
    // All text objects should have previewText or "", no visual objects populated
    expect(result.title).toEqual({ text: "Text goes here" });
    expect(result.image).toBeUndefined();
  });
});
