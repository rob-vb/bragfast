import type { ChefPose, KitchenStation } from "./kitchen-scene-assets";

/** Maps cook-page state to the upgraded kitchen scene. */

export type CookStep = "recipe" | "seasoning" | "ingredients" | "plating";
export type CookStatus = "idle" | "cooking" | "done" | "error";

export interface AnimPhase {
  station: KitchenStation;
  pose: ChefPose;
  accent: "none" | "done" | "error" | "cooking";
}

export function deriveAnimPhase(
  activeStep: CookStep | null,
  status: CookStatus,
): AnimPhase {
  if (status === "cooking") {
    return {
      station: "center",
      pose: "cooking",
      accent: "cooking",
    };
  }

  if (status === "done") {
    return {
      station: "center",
      pose: "done",
      accent: "done",
    };
  }

  if (status === "error") {
    return {
      station: "oven",
      pose: "error",
      accent: "error",
    };
  }

  switch (activeStep) {
    case "recipe":
      return { station: "shelves", pose: "recipe", accent: "none" };
    case "seasoning":
      return { station: "shelves", pose: "seasoning", accent: "none" };
    case "ingredients":
      return { station: "fridge", pose: "ingredients", accent: "none" };
    case "plating":
      return { station: "oven", pose: "plating", accent: "none" };
    default:
      return { station: "center", pose: "idle", accent: "none" };
  }
}
