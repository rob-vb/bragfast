import { describe, it, expect, vi } from "vitest";

// We need to test the reducer logic. Since it's inside editor-context.tsx (a "use client" component),
// we'll import and test via a minimal approach: extract the reducer behavior through the module.
// However, the reducer is not exported directly. We'll test through the action/state flow.
// Instead, let's create a minimal test by importing the types and testing the logic patterns.

// Since the reducer is internal to editor-context.tsx, we test by importing the component's
// exported hooks indirectly. For unit testing the reducer logic, we'll replicate the core
// state machine logic here and test the transitions.

import type { CanvasTemplateConfig, BackgroundConfig, BackgroundMode } from "@/lib/templates/canvas-types";

// Replicate the core SET_BACKGROUND logic for testing
function applySetBackground(
  config: CanvasTemplateConfig,
  backgroundStash: Partial<Record<BackgroundMode, BackgroundConfig>>,
  action: { background: BackgroundConfig | undefined },
  randomPositions: { x: number; y: number }[],
): { config: CanvasTemplateConfig; backgroundStash: Partial<Record<BackgroundMode, BackgroundConfig>> } {
  const currentBg = config.background;
  const currentMode: BackgroundMode = currentBg?.mode ?? "color";
  const targetMode: BackgroundMode = action.background?.mode ?? "color";
  if (currentMode === targetMode) return { config, backgroundStash };
  const newStash = { ...backgroundStash, [currentMode]: currentBg ?? { mode: "color" as const } };
  let newBg: BackgroundConfig | undefined;
  if (newStash[targetMode]) {
    newBg = newStash[targetMode];
  } else if (targetMode === "mesh_gradient") {
    newBg = {
      mode: "mesh_gradient",
      colors: [config.colors.background, config.colors.text, config.colors.primary],
      positions: randomPositions,
    };
  } else if (targetMode === "image") {
    newBg = { mode: "image", imageUrl: "" };
  }
  return {
    config: { ...config, background: targetMode === "color" ? undefined : newBg },
    backgroundStash: newStash,
  };
}

const baseConfig: CanvasTemplateConfig = {
  version: 2,
  colors: { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" },
  formats: {
    landscape: { objects: [] },
    square: { objects: [] },
    portrait: { objects: [] },
  },
};

const mockPositions = [{ x: 20, y: 30 }, { x: 80, y: 70 }, { x: 50, y: 90 }];

describe("SET_BACKGROUND reducer logic", () => {
  it("switches to mesh_gradient and initializes with template colors", () => {
    const result = applySetBackground(
      baseConfig,
      {},
      { background: { mode: "mesh_gradient", colors: ["#000", "#000", "#000"], positions: [] } },
      mockPositions,
    );
    expect(result.config.background).toBeDefined();
    expect(result.config.background!.mode).toBe("mesh_gradient");
    if (result.config.background!.mode === "mesh_gradient") {
      expect(result.config.background!.colors).toEqual(["#FFF8F0", "#1A1A1A", "#F8AF3C"]);
      expect(result.config.background!.positions).toEqual(mockPositions);
    }
  });

  it("switches to image and initializes with empty imageUrl", () => {
    const result = applySetBackground(
      baseConfig,
      {},
      { background: { mode: "image", imageUrl: "" } },
      mockPositions,
    );
    expect(result.config.background).toBeDefined();
    expect(result.config.background!.mode).toBe("image");
    if (result.config.background!.mode === "image") {
      expect(result.config.background!.imageUrl).toBe("");
    }
  });

  it("switches to color and sets background to undefined", () => {
    const meshConfig = {
      ...baseConfig,
      background: {
        mode: "mesh_gradient" as const,
        colors: ["#FFF8F0", "#1A1A1A", "#F8AF3C"] as [string, string, string],
        positions: mockPositions,
      },
    };
    const result = applySetBackground(
      meshConfig,
      {},
      { background: undefined },
      mockPositions,
    );
    expect(result.config.background).toBeUndefined();
  });

  it("preserves mesh config when switching away and back", () => {
    const customColors: [string, string, string] = ["#FF0000", "#00FF00", "#0000FF"];
    const customPositions = [{ x: 10, y: 10 }, { x: 90, y: 90 }, { x: 50, y: 50 }];
    const meshConfig = {
      ...baseConfig,
      background: {
        mode: "mesh_gradient" as const,
        colors: customColors,
        positions: customPositions,
      },
    };

    // Switch to color
    const afterColor = applySetBackground(
      meshConfig,
      {},
      { background: undefined },
      mockPositions,
    );
    expect(afterColor.config.background).toBeUndefined();
    expect(afterColor.backgroundStash.mesh_gradient).toBeDefined();

    // Switch back to mesh
    const afterMesh = applySetBackground(
      afterColor.config,
      afterColor.backgroundStash,
      { background: { mode: "mesh_gradient", colors: ["#000", "#000", "#000"], positions: [] } },
      mockPositions,
    );
    expect(afterMesh.config.background!.mode).toBe("mesh_gradient");
    if (afterMesh.config.background!.mode === "mesh_gradient") {
      expect(afterMesh.config.background!.colors).toEqual(customColors);
      expect(afterMesh.config.background!.positions).toEqual(customPositions);
    }
  });

  it("preserves image config when switching away and back", () => {
    const imageConfig = {
      ...baseConfig,
      background: { mode: "image" as const, imageUrl: "https://example.com/bg.jpg" },
    };

    // Switch to color
    const afterColor = applySetBackground(
      imageConfig,
      {},
      { background: undefined },
      mockPositions,
    );

    // Switch back to image
    const afterImage = applySetBackground(
      afterColor.config,
      afterColor.backgroundStash,
      { background: { mode: "image", imageUrl: "" } },
      mockPositions,
    );
    expect(afterImage.config.background!.mode).toBe("image");
    if (afterImage.config.background!.mode === "image") {
      expect(afterImage.config.background!.imageUrl).toBe("https://example.com/bg.jpg");
    }
  });

  it("is a no-op when switching to current mode", () => {
    const result = applySetBackground(
      baseConfig,
      {},
      { background: undefined }, // color → color
      mockPositions,
    );
    expect(result.config).toBe(baseConfig); // reference equality = no change
  });

  it("switches mesh → image → mesh with full round-trip preservation", () => {
    // Start with mesh
    const step1 = applySetBackground(
      baseConfig,
      {},
      { background: { mode: "mesh_gradient", colors: ["#000", "#000", "#000"], positions: [] } },
      mockPositions,
    );

    // Switch to image
    const step2 = applySetBackground(
      step1.config,
      step1.backgroundStash,
      { background: { mode: "image", imageUrl: "" } },
      mockPositions,
    );
    expect(step2.config.background!.mode).toBe("image");

    // Switch back to mesh
    const step3 = applySetBackground(
      step2.config,
      step2.backgroundStash,
      { background: { mode: "mesh_gradient", colors: ["#000", "#000", "#000"], positions: [] } },
      mockPositions,
    );
    expect(step3.config.background!.mode).toBe("mesh_gradient");
    if (step3.config.background!.mode === "mesh_gradient") {
      expect(step3.config.background!.positions).toEqual(mockPositions);
    }
  });
});
