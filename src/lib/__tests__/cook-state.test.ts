import { describe, it, expect } from "vitest";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import type { AnimationPreset, ObjectModification, ReleaseResult } from "@/lib/types";

// ─── Replicate reducer logic from cook-page.tsx ────────────────────────────
// The reducer is internal to a "use client" component, so we replicate it here.

interface CookState {
  templateId: string | null;
  templateConfig: CanvasTemplateConfig | null;
  brandId?: string;
  colors: { background: string; text: string; primary: string };
  objectContent: Record<string, ObjectModification>;
  formats: FormatKey[];
  outputType: "image" | "video";
  animationPreset?: AnimationPreset;
  status: "idle" | "previewing" | "cooking" | "done" | "error";
  cookId?: string;
  results?: ReleaseResult;
  error?: string;
}

type CookAction =
  | { type: "SELECT_TEMPLATE"; templateId: string; config: CanvasTemplateConfig }
  | { type: "SET_BRAND"; brandId: string | undefined; colors: { background: string; text: string; primary: string } }
  | { type: "SET_COLORS"; colors: { background: string; text: string; primary: string } }
  | { type: "SET_CONTENT"; id: string; mod: ObjectModification }
  | { type: "TOGGLE_FORMAT"; format: FormatKey }
  | { type: "SET_OUTPUT_TYPE"; outputType: "image" | "video" }
  | { type: "SET_ANIMATION_PRESET"; preset: AnimationPreset | undefined }
  | { type: "START_COOK"; cookId: string }
  | { type: "COOK_DONE"; results: ReleaseResult }
  | { type: "COOK_ERROR"; error: string }
  | { type: "RESET" };

const DEFAULT_COLORS = { background: "#FFF8F0", text: "#1A1A1A", primary: "#F8AF3C" };

const INITIAL_STATE: CookState = {
  templateId: null,
  templateConfig: null,
  colors: DEFAULT_COLORS,
  objectContent: {},
  formats: ["landscape", "square", "portrait"],
  outputType: "image",
  status: "idle",
};

function cookReducer(state: CookState, action: CookAction): CookState {
  switch (action.type) {
    case "SELECT_TEMPLATE":
      return {
        ...state,
        templateId: action.templateId,
        templateConfig: action.config,
        colors: state.brandId
          ? state.colors
          : { ...DEFAULT_COLORS, ...action.config.colors },
        objectContent: {},
      };

    case "SET_BRAND":
      return {
        ...state,
        brandId: action.brandId,
        colors: action.colors,
      };

    case "SET_COLORS":
      return { ...state, colors: action.colors };

    case "SET_CONTENT":
      return {
        ...state,
        objectContent: { ...state.objectContent, [action.id]: action.mod },
      };

    case "TOGGLE_FORMAT": {
      const has = state.formats.includes(action.format);
      if (has && state.formats.length === 1) return state;
      return {
        ...state,
        formats: has
          ? state.formats.filter((f) => f !== action.format)
          : [...state.formats, action.format],
      };
    }

    case "SET_OUTPUT_TYPE":
      return {
        ...state,
        outputType: action.outputType,
        animationPreset: action.outputType === "image" ? undefined : state.animationPreset,
      };

    case "SET_ANIMATION_PRESET":
      return { ...state, animationPreset: action.preset };

    case "START_COOK":
      return { ...state, status: "cooking", cookId: action.cookId, results: undefined, error: undefined };

    case "COOK_DONE":
      return { ...state, status: "done", results: action.results };

    case "COOK_ERROR":
      return { ...state, status: "error", error: action.error };

    case "RESET":
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseConfig: CanvasTemplateConfig = {
  version: 2,
  colors: { background: "#123456", text: "#FFFFFF", primary: "#ABCDEF" },
  formats: {
    landscape: {
      objects: [
        { id: "title", type: "text", name: "Title", x: 0, y: 0, width: 800, height: 100, zIndex: 1 },
        { id: "img", type: "image", name: "Screenshot", x: 0, y: 100, width: 800, height: 500, zIndex: 2 },
      ],
    },
    square: { objects: [] },
    portrait: { objects: [] },
  },
};

// ─── SELECT_TEMPLATE ──────────────────────────────────────────────────────────

describe("SELECT_TEMPLATE", () => {
  it("sets templateId and templateConfig", () => {
    const state = cookReducer(INITIAL_STATE, {
      type: "SELECT_TEMPLATE",
      templateId: "tmpl_abc",
      config: baseConfig,
    });
    expect(state.templateId).toBe("tmpl_abc");
    expect(state.templateConfig).toBe(baseConfig);
  });

  it("seeds colors from template config when no brand is selected", () => {
    const state = cookReducer(INITIAL_STATE, {
      type: "SELECT_TEMPLATE",
      templateId: "tmpl_abc",
      config: baseConfig,
    });
    expect(state.colors).toMatchObject({ background: "#123456", text: "#FFFFFF", primary: "#ABCDEF" });
  });

  it("keeps existing colors when a brand is already selected", () => {
    const withBrand: CookState = {
      ...INITIAL_STATE,
      brandId: "brand_1",
      colors: { background: "#AAA", text: "#BBB", primary: "#CCC" },
    };
    const state = cookReducer(withBrand, {
      type: "SELECT_TEMPLATE",
      templateId: "tmpl_abc",
      config: baseConfig,
    });
    expect(state.colors).toEqual({ background: "#AAA", text: "#BBB", primary: "#CCC" });
  });

  it("resets objectContent when switching templates", () => {
    const withContent: CookState = {
      ...INITIAL_STATE,
      objectContent: { title: { id: "title", text: "Old text" } },
    };
    const state = cookReducer(withContent, {
      type: "SELECT_TEMPLATE",
      templateId: "tmpl_abc",
      config: baseConfig,
    });
    expect(state.objectContent).toEqual({});
  });
});

// ─── SET_BRAND ────────────────────────────────────────────────────────────────

describe("SET_BRAND", () => {
  it("sets brandId and colors", () => {
    const brandColors = { background: "#111", text: "#222", primary: "#333" };
    const state = cookReducer(INITIAL_STATE, {
      type: "SET_BRAND",
      brandId: "brand_42",
      colors: brandColors,
    });
    expect(state.brandId).toBe("brand_42");
    expect(state.colors).toEqual(brandColors);
  });

  it("allows clearing brandId with undefined", () => {
    const withBrand: CookState = { ...INITIAL_STATE, brandId: "brand_1" };
    const state = cookReducer(withBrand, {
      type: "SET_BRAND",
      brandId: undefined,
      colors: DEFAULT_COLORS,
    });
    expect(state.brandId).toBeUndefined();
  });
});

// ─── SET_COLORS ───────────────────────────────────────────────────────────────

describe("SET_COLORS", () => {
  it("updates colors", () => {
    const newColors = { background: "#FF0000", text: "#00FF00", primary: "#0000FF" };
    const state = cookReducer(INITIAL_STATE, { type: "SET_COLORS", colors: newColors });
    expect(state.colors).toEqual(newColors);
  });

  it("does not clear brandId", () => {
    const withBrand: CookState = { ...INITIAL_STATE, brandId: "brand_1" };
    const state = cookReducer(withBrand, {
      type: "SET_COLORS",
      colors: { background: "#FF0000", text: "#00FF00", primary: "#0000FF" },
    });
    expect(state.brandId).toBe("brand_1");
  });
});

// ─── SET_CONTENT ──────────────────────────────────────────────────────────────

describe("SET_CONTENT", () => {
  it("stores ObjectModification by id", () => {
    const mod: ObjectModification = { id: "title", text: "Hello World" };
    const state = cookReducer(INITIAL_STATE, { type: "SET_CONTENT", id: "title", mod });
    expect(state.objectContent["title"]).toEqual(mod);
  });

  it("merges with existing objectContent", () => {
    const existing: CookState = {
      ...INITIAL_STATE,
      objectContent: { title: { id: "title", text: "First" } },
    };
    const state = cookReducer(existing, {
      type: "SET_CONTENT",
      id: "img",
      mod: { id: "img", image_url: "https://example.com/img.png" },
    });
    expect(Object.keys(state.objectContent)).toHaveLength(2);
    expect(state.objectContent["title"]).toEqual({ id: "title", text: "First" });
    expect(state.objectContent["img"]).toEqual({ id: "img", image_url: "https://example.com/img.png" });
  });

  it("overwrites existing content for the same id", () => {
    const existing: CookState = {
      ...INITIAL_STATE,
      objectContent: { title: { id: "title", text: "Old" } },
    };
    const state = cookReducer(existing, {
      type: "SET_CONTENT",
      id: "title",
      mod: { id: "title", text: "New" },
    });
    expect(state.objectContent["title"].text).toBe("New");
  });
});

// ─── TOGGLE_FORMAT ────────────────────────────────────────────────────────────

describe("TOGGLE_FORMAT", () => {
  it("removes a format when it is already selected", () => {
    const state = cookReducer(INITIAL_STATE, { type: "TOGGLE_FORMAT", format: "square" });
    expect(state.formats).not.toContain("square");
    expect(state.formats).toContain("landscape");
    expect(state.formats).toContain("portrait");
  });

  it("adds a format when it is not selected", () => {
    const oneFormat: CookState = { ...INITIAL_STATE, formats: ["landscape"] };
    const state = cookReducer(oneFormat, { type: "TOGGLE_FORMAT", format: "square" });
    expect(state.formats).toContain("landscape");
    expect(state.formats).toContain("square");
  });

  it("does not remove the last format", () => {
    const oneFormat: CookState = { ...INITIAL_STATE, formats: ["landscape"] };
    const state = cookReducer(oneFormat, { type: "TOGGLE_FORMAT", format: "landscape" });
    expect(state.formats).toEqual(["landscape"]);
    expect(state).toBe(oneFormat); // reference equality = no state update
  });
});

// ─── SET_OUTPUT_TYPE ─────────────────────────────────────────────────────────

describe("SET_OUTPUT_TYPE", () => {
  it("switches to video", () => {
    const state = cookReducer(INITIAL_STATE, { type: "SET_OUTPUT_TYPE", outputType: "video" });
    expect(state.outputType).toBe("video");
  });

  it("switches back to image", () => {
    const videoState: CookState = { ...INITIAL_STATE, outputType: "video" };
    const state = cookReducer(videoState, { type: "SET_OUTPUT_TYPE", outputType: "image" });
    expect(state.outputType).toBe("image");
  });

  it("clears animationPreset when switching to image", () => {
    const videoWithPreset: CookState = {
      ...INITIAL_STATE,
      outputType: "video",
      animationPreset: "showcase",
    };
    const state = cookReducer(videoWithPreset, { type: "SET_OUTPUT_TYPE", outputType: "image" });
    expect(state.animationPreset).toBeUndefined();
  });

  it("preserves animationPreset when switching to video", () => {
    const videoWithPreset: CookState = {
      ...INITIAL_STATE,
      outputType: "video",
      animationPreset: "showcase",
    };
    // Switching to video again (no-op scenario) — preset is preserved
    const state = cookReducer(videoWithPreset, { type: "SET_OUTPUT_TYPE", outputType: "video" });
    expect(state.animationPreset).toBe("showcase");
  });
});

// ─── SET_ANIMATION_PRESET ────────────────────────────────────────────────────

describe("SET_ANIMATION_PRESET", () => {
  it("sets the animation preset", () => {
    const state = cookReducer(INITIAL_STATE, {
      type: "SET_ANIMATION_PRESET",
      preset: "showcase",
    });
    expect(state.animationPreset).toBe("showcase");
  });

  it("clears the animation preset when set to undefined", () => {
    const withPreset: CookState = { ...INITIAL_STATE, animationPreset: "showcase" };
    const state = cookReducer(withPreset, { type: "SET_ANIMATION_PRESET", preset: undefined });
    expect(state.animationPreset).toBeUndefined();
  });
});

// ─── RESET ───────────────────────────────────────────────────────────────────

describe("RESET", () => {
  it("returns state to initial values", () => {
    const modified: CookState = {
      templateId: "tmpl_abc",
      templateConfig: baseConfig,
      brandId: "brand_1",
      colors: { background: "#111", text: "#222", primary: "#333" },
      objectContent: { title: { id: "title", text: "Hi" } },
      formats: ["landscape"],
      outputType: "video",
      animationPreset: "showcase",
      status: "done",
      cookId: "cook_xyz",
    };
    const state = cookReducer(modified, { type: "RESET" });
    expect(state.templateId).toBeNull();
    expect(state.templateConfig).toBeNull();
    expect(state.brandId).toBeUndefined();
    expect(state.colors).toEqual(DEFAULT_COLORS);
    expect(state.objectContent).toEqual({});
    expect(state.formats).toEqual(["landscape", "square", "portrait"]);
    expect(state.outputType).toBe("image");
    expect(state.animationPreset).toBeUndefined();
    expect(state.status).toBe("idle");
    expect(state.cookId).toBeUndefined();
  });
});
