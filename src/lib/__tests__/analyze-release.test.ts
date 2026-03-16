import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeRelease, buildAnalysisPrompt, parseAnalysisResponse } from "../github/analyze-release";

describe("buildAnalysisPrompt", () => {
  const templateObjects = [
    { id: "title", type: "text" as const },
    { id: "description", type: "text" as const },
    { id: "image", type: "image" as const },
  ];

  it("includes release body in user message", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "## Features\n- Fast\n- Reliable",
      templateObjects,
      maxSlides: 3,
    });
    expect(prompt.userMessage).toContain("## Features");
    expect(prompt.userMessage).toContain("v1.0");
  });

  it("lists available template slots", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "body",
      templateObjects,
      maxSlides: 1,
    });
    expect(prompt.userMessage).toContain("title");
    expect(prompt.userMessage).toContain("description");
    expect(prompt.userMessage).toContain("image");
  });

  it("includes maxSlides constraint", () => {
    const prompt = buildAnalysisPrompt({
      releaseName: "v1.0",
      releaseTag: "v1.0.0",
      releaseBody: "body",
      templateObjects,
      maxSlides: 2,
    });
    expect(prompt.userMessage).toContain("2");
  });
});

describe("parseAnalysisResponse", () => {
  it("parses valid JSON slides array", () => {
    const response = JSON.stringify({
      slides: [
        {
          objects: [
            { id: "title", text: "Big Launch" },
            { id: "description", text: "We shipped it" },
          ],
        },
      ],
    });
    const result = parseAnalysisResponse(response);
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].objects[0].text).toBe("Big Launch");
  });

  it("extracts image URLs into image_url field", () => {
    const response = JSON.stringify({
      slides: [
        {
          objects: [
            { id: "image", image_url: "https://example.com/screenshot.png" },
          ],
        },
      ],
    });
    const result = parseAnalysisResponse(response);
    expect(result.slides[0].objects[0].image_url).toBe("https://example.com/screenshot.png");
  });

  it("respects maxSlides by truncating", () => {
    const response = JSON.stringify({
      slides: [
        { objects: [{ id: "title", text: "Slide 1" }] },
        { objects: [{ id: "title", text: "Slide 2" }] },
        { objects: [{ id: "title", text: "Slide 3" }] },
      ],
    });
    const result = parseAnalysisResponse(response, 2);
    expect(result.slides).toHaveLength(2);
  });

  it("returns fallback on invalid JSON", () => {
    const result = parseAnalysisResponse("not json");
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].objects[0].id).toBe("title");
  });
});
