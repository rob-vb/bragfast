import { describe, it, expect } from "vitest";
import { calculateCredits } from "@/lib/types";
import type { FormatKey } from "@/lib/templates/canvas-types";

// Helper: build a single-slide FormatEntry array from a list of format keys.
// The Cook page always creates single-slide releases, so each format has 1 slide.
function singleSlideFormats(keys: FormatKey[]) {
  return keys.map((name) => ({ name, slides: [{}] }));
}

describe("cook credit calculation — image", () => {
  it("3 formats × image = 3 credits", () => {
    expect(
      calculateCredits({
        formats: singleSlideFormats(["landscape", "square", "portrait"]),
      })
    ).toBe(3);
  });

  it("1 format × image = 1 credit", () => {
    expect(
      calculateCredits({
        formats: singleSlideFormats(["landscape"]),
      })
    ).toBe(1);
  });

  it("2 formats × image = 2 credits", () => {
    expect(
      calculateCredits({
        formats: singleSlideFormats(["square", "portrait"]),
      })
    ).toBe(2);
  });
});

describe("cook credit calculation — video", () => {
  it("3 formats × video = 15 credits", () => {
    expect(
      calculateCredits({
        video: true,
        formats: singleSlideFormats(["landscape", "square", "portrait"]),
      })
    ).toBe(15);
  });

  it("1 format × video = 5 credits", () => {
    expect(
      calculateCredits({
        video: true,
        formats: singleSlideFormats(["landscape"]),
      })
    ).toBe(5);
  });

  it("2 formats × video = 10 credits", () => {
    expect(
      calculateCredits({
        video: true,
        formats: singleSlideFormats(["square", "portrait"]),
      })
    ).toBe(10);
  });

  it("video with preset object counts the same as video: true", () => {
    expect(
      calculateCredits({
        video: { preset: "showcase" },
        formats: singleSlideFormats(["landscape", "square", "portrait"]),
      })
    ).toBe(15);
  });
});

describe("cook credit calculation — edge cases", () => {
  it("0 formats = 0 credits (image)", () => {
    expect(calculateCredits({ formats: [] })).toBe(0);
  });

  it("0 formats = 0 credits (video)", () => {
    expect(calculateCredits({ video: true, formats: [] })).toBe(0);
  });
});
