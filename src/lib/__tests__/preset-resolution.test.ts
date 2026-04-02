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

  it("undefined preset returns empty (no preset)", () => {
    expect(resolvePreset(undefined, "image")).toEqual({});
  });
});
