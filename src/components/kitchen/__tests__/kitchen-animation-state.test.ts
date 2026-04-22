import { describe, expect, it } from "vitest";
import { deriveAnimPhase } from "../kitchen-animation-state";

describe("deriveAnimPhase", () => {
  it("maps recipe to the shelves pose", () => {
    expect(deriveAnimPhase("recipe", "idle")).toEqual({
      station: "shelves",
      pose: "recipe",
      accent: "none",
    });
  });

  it("maps seasoning to the shelves pose", () => {
    expect(deriveAnimPhase("seasoning", "idle")).toEqual({
      station: "shelves",
      pose: "seasoning",
      accent: "none",
    });
  });

  it("maps ingredients to the fridge pose", () => {
    expect(deriveAnimPhase("ingredients", "idle")).toEqual({
      station: "fridge",
      pose: "ingredients",
      accent: "none",
    });
  });

  it("maps plating to the oven pose", () => {
    expect(deriveAnimPhase("plating", "idle")).toEqual({
      station: "oven",
      pose: "plating",
      accent: "none",
    });
  });

  it("prefers cooking status over the active step", () => {
    expect(deriveAnimPhase("ingredients", "cooking")).toEqual({
      station: "center",
      pose: "cooking",
      accent: "cooking",
    });
  });

  it("prefers done status over the active step", () => {
    expect(deriveAnimPhase("recipe", "done")).toEqual({
      station: "center",
      pose: "done",
      accent: "done",
    });
  });

  it("prefers error status over the active step", () => {
    expect(deriveAnimPhase("plating", "error")).toEqual({
      station: "oven",
      pose: "error",
      accent: "error",
    });
  });

  it("falls back to the center idle pose when no step is open", () => {
    expect(deriveAnimPhase(null, "idle")).toEqual({
      station: "center",
      pose: "idle",
      accent: "none",
    });
  });
});
