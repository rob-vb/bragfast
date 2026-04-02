/** Maps cook-page state → animation phase for the 3D kitchen scene. */

export type CookStep = "recipe" | "seasoning" | "ingredients" | "plating" | "preview";
export type CookStatus = "idle" | "previewing" | "cooking" | "done" | "error";

export type CookAnim = "idle" | "walk" | "action";

export interface AnimPhase {
  /** Target grid-column X for the cook sprite */
  targetX: number;
  /** Sprite animation to play */
  cookAnim: CookAnim;
  /** Show oven flames */
  showFlames: boolean;
  /** Show steam wisps */
  showSteam: boolean;
  /** Show "ORDER UP!" ticket */
  showDone: boolean;
  /** Show error X */
  showError: boolean;
}

// Named X positions (grid columns) for key kitchen landmarks
export const POS = {
  FRIDGE: 8,
  OVEN: 40,
  SHELVES: 90,
  CENTER: 55,
  IDLE: 55,
} as const;

export function deriveAnimPhase(
  activeStep: CookStep | null,
  status: CookStatus,
): AnimPhase {
  // Status overrides step-based positioning
  if (status === "previewing") {
    return {
      targetX: POS.OVEN,
      cookAnim: "action",
      showFlames: true,
      showSteam: false,
      showDone: false,
      showError: false,
    };
  }

  if (status === "cooking") {
    return {
      targetX: POS.CENTER,
      cookAnim: "action",
      showFlames: true,
      showSteam: false,
      showDone: false,
      showError: false,
    };
  }

  if (status === "done") {
    return {
      targetX: POS.CENTER,
      cookAnim: "idle",
      showFlames: false,
      showSteam: true,
      showDone: true,
      showError: false,
    };
  }

  if (status === "error") {
    return {
      targetX: POS.OVEN,
      cookAnim: "idle",
      showFlames: false,
      showSteam: false,
      showDone: false,
      showError: true,
    };
  }

  // Step-based positioning
  const base: AnimPhase = {
    targetX: POS.IDLE,
    cookAnim: "idle",
    showFlames: false,
    showSteam: false,
    showDone: false,
    showError: false,
  };

  switch (activeStep) {
    case "recipe":
      return { ...base, targetX: POS.SHELVES };
    case "seasoning":
      return { ...base, targetX: POS.SHELVES, cookAnim: "action" };
    case "ingredients":
      return { ...base, targetX: POS.FRIDGE, cookAnim: "action" };
    case "plating":
      return { ...base, targetX: POS.OVEN };
    case "preview":
      return { ...base, targetX: POS.OVEN };
    default:
      return base;
  }
}
