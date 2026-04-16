import { describe, it, expect } from "vitest";
import { resolvePreset } from "../../remotion/VideoCanvasComposition";

describe("resolvePreset", () => {
  it("showcase preset maps image to showcase-rise with kenBurns", () => {
    expect(resolvePreset("showcase", "visual")).toEqual({
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
    expect(resolvePreset(undefined, "visual")).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  // Role-based classification tests

  it("hero image gets showcase-rise with kenBurns", () => {
    expect(resolvePreset("showcase", "visual", true)).toEqual({
      entrance: "showcase-rise",
      exit: "none",
      kenBurns: true,
    });
  });

  it("non-hero image gets fade-in without kenBurns", () => {
    expect(resolvePreset("showcase", "visual", false)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("isHero undefined preserves backward compat (showcase-rise)", () => {
    expect(resolvePreset("showcase", "visual", undefined)).toEqual({
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

  // 3d-tilt-angles preset

  it("3d-tilt-angles hero visual maps to 3d-tilt without kenBurns", () => {
    expect(resolvePreset("3d-tilt-angles", "visual", true)).toEqual({
      entrance: "3d-tilt",
      exit: "none",
      kenBurns: false,
    });
  });

  it("3d-tilt-angles non-hero visual maps to fade-in", () => {
    expect(resolvePreset("3d-tilt-angles", "visual", false)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("3d-tilt-angles visual without isHero defaults to 3d-tilt (backward compat)", () => {
    expect(resolvePreset("3d-tilt-angles", "visual", undefined)).toEqual({
      entrance: "3d-tilt",
      exit: "none",
      kenBurns: false,
    });
  });

  it("3d-tilt-angles text uses 3d-tilt-reveal so text lands after screenshot settles", () => {
    expect(resolvePreset("3d-tilt-angles", "text")).toEqual({
      entrance: "3d-tilt-reveal",
      exit: "none",
    });
  });

  it("3d-tilt-angles logo uses 3d-tilt-reveal", () => {
    expect(resolvePreset("3d-tilt-angles", "logo")).toEqual({
      entrance: "3d-tilt-reveal",
      exit: "none",
    });
  });

  // simple-fade preset

  it("simple-fade hero visual maps to fade-in without kenBurns", () => {
    expect(resolvePreset("simple-fade", "visual", true)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("simple-fade non-hero visual maps to fade-in without kenBurns", () => {
    expect(resolvePreset("simple-fade", "visual", false)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("simple-fade text maps to fade-in", () => {
    expect(resolvePreset("simple-fade", "text")).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("simple-fade logo maps to fade-in", () => {
    expect(resolvePreset("simple-fade", "logo")).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });

  it("simple-fade isHero has no effect (undefined still gives fade-in)", () => {
    expect(resolvePreset("simple-fade", "visual", undefined)).toEqual({
      entrance: "fade-in",
      exit: "none",
      kenBurns: false,
    });
  });
});
