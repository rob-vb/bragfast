import { describe, it, expect } from "vitest";
import { validateVideoScenes } from "../video/validation";
import type { SceneConfig, SceneContent } from "../video/types";

const templateScenes: SceneConfig[] = [
  { type: "intro", duration: 3 },
  { type: "feature", duration: 4, device: "browser" },
  { type: "cta", duration: 3 },
];

describe("validateVideoScenes", () => {
  it("should accept valid scenes matching template", () => {
    const scenes: SceneContent[] = [
      { title: "Welcome" },
      { title: "New Feature", image_url: "https://example.com/img.png" },
      { title: "Try it now" },
    ];
    expect(validateVideoScenes(scenes, templateScenes)).toBeNull();
  });

  it("should reject scene count mismatch", () => {
    const scenes: SceneContent[] = [{ title: "Welcome" }];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("Expected 3 scenes, got 1");
  });

  it("should reject missing title", () => {
    const scenes = [
      { title: "" },
      { title: "Feature", image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ] as SceneContent[];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("title");
  });

  it("should reject title over 100 chars", () => {
    const scenes: SceneContent[] = [
      { title: "A".repeat(101) },
      { title: "Feature", image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("title");
    expect(error).toContain("100");
  });

  it("should reject description over 300 chars", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature", description: "D".repeat(301), image_url: "https://example.com/img.png" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("description");
    expect(error).toContain("300");
  });

  it("should reject feature scene without image_url", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature without image" },
      { title: "CTA" },
    ];
    const error = validateVideoScenes(scenes, templateScenes);
    expect(error).toContain("image_url");
    expect(error).toContain("scene 2");
  });

  it("should accept feature scene with image_url", () => {
    const scenes: SceneContent[] = [
      { title: "Intro" },
      { title: "Feature", image_url: "https://example.com/shot.png" },
      { title: "CTA" },
    ];
    expect(validateVideoScenes(scenes, templateScenes)).toBeNull();
  });
});
