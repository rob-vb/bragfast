import { describe, it, expect } from "vitest";
import { calculateCredits } from "../types";
import { calculateVideoDuration } from "../video/types";
import type { VideoTemplateConfig, SceneContent, VideoFormatEntry } from "../video/types";

describe("VideoTemplateConfig", () => {
  it("should define a valid template config", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "feature", duration: 4, device: "browser" },
        { type: "cta", duration: 3 },
      ],
    };
    expect(config.scenes).toHaveLength(3);
    expect(config.fps).toBe(30);
  });
});

describe("SceneContent", () => {
  it("should accept valid intro scene content", () => {
    const scene: SceneContent = { title: "Hello World" };
    expect(scene.title).toBe("Hello World");
  });

  it("should accept valid feature scene content", () => {
    const scene: SceneContent = {
      title: "New Feature",
      description: "Check it out",
      image_url: "https://example.com/img.png",
      device: "browser",
    };
    expect(scene.image_url).toBeDefined();
  });
});

describe("calculateCredits", () => {
  it("should calculate image credits as sum of slides", () => {
    const credits = calculateCredits({
      output: "image",
      formats: [
        { name: "landscape", slides: [{ objects: [] }, { objects: [] }] },
        { name: "square", slides: [{ objects: [] }] },
      ],
    });
    expect(credits).toBe(3);
  });

  it("should calculate video credits as 5 per format", () => {
    const credits = calculateCredits({
      output: "video",
      formats: [
        { name: "landscape", scenes: [{ title: "A" }, { title: "B" }] },
        { name: "square", scenes: [{ title: "A" }] },
      ],
    });
    expect(credits).toBe(10);
  });

  it("should default to image credits when output is undefined", () => {
    const credits = calculateCredits({
      formats: [
        { name: "landscape", slides: [{ objects: [] }] },
      ],
    });
    expect(credits).toBe(1);
  });
});

describe("calculateVideoDuration", () => {
  it("should calculate net duration with transition overlap", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "feature", duration: 4 },
        { type: "feature", duration: 4 },
        { type: "cta", duration: 3 },
      ],
    };
    expect(calculateVideoDuration(config)).toBe(12.5);
  });

  it("should handle single scene (no transitions)", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "fade",
      transition_duration: 0.5,
      scenes: [{ type: "intro", duration: 5 }],
    };
    expect(calculateVideoDuration(config)).toBe(5);
  });

  it("should handle transition_duration of 0", () => {
    const config: VideoTemplateConfig = {
      fps: 30,
      transition: "none",
      transition_duration: 0,
      scenes: [
        { type: "intro", duration: 3 },
        { type: "cta", duration: 3 },
      ],
    };
    expect(calculateVideoDuration(config)).toBe(6);
  });
});
