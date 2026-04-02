import { describe, it, expect } from "vitest";
import { resolvePreset } from "../../remotion/VideoCanvasComposition";

describe("resolvePreset", () => {
  it("showcase preset maps image to showcase-rise with kenBurns", () => {
    expect(resolvePreset("showcase", "image")).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  it("showcase preset maps text to showcase-reveal", () => {
    expect(resolvePreset("showcase", "text")).toEqual({
      entrance: "showcase-reveal",
      exit: "none",
    });
  });

  it("showcase preset maps logo to showcase-reveal", () => {
    expect(resolvePreset("showcase", "logo")).toEqual({
      entrance: "showcase-reveal",
      exit: "none",
    });
  });

  it("undefined preset defaults to showcase", () => {
    expect(resolvePreset(undefined, "image")).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  // Role-based classification tests

  it("hero image gets showcase-rise with kenBurns", () => {
    expect(resolvePreset("showcase", "image", true)).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  it("non-hero image gets fade-in without kenBurns", () => {
    expect(resolvePreset("showcase", "image", false)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("isHero undefined preserves backward compat (showcase-rise)", () => {
    expect(resolvePreset("showcase", "image", undefined)).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  it("isHero has no effect on text objects", () => {
    expect(resolvePreset("showcase", "text", true)).toEqual({
      entrance: "showcase-reveal",
      exit: "none",
    });
    expect(resolvePreset("showcase", "text", false)).toEqual({
      entrance: "showcase-reveal",
      exit: "none",
    });
  });
});
