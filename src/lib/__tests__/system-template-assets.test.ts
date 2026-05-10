import { describe, it, expect } from "vitest";
import {
  CANVAS_DEFAULTS,
  TEMPLATE_MEDIUMS,
  type TemplateMedium,
} from "../templates/canvas-defaults";

// The seed list lives in convex/templates.ts:seedDefaults. Mirroring it here
// keeps the parity check unit-testable without booting Convex. If a slug is
// added to / removed from the seed list there, update this constant.
const SEED_SLUGS = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
  "carousel-slide",
] as const;

describe("system template assets", () => {
  it("every seeded slug has a TEMPLATE_MEDIUMS entry", () => {
    for (const slug of SEED_SLUGS) {
      expect(TEMPLATE_MEDIUMS[slug]).toBeDefined();
    }
  });

  it("every seeded slug has a CANVAS_DEFAULTS entry", () => {
    for (const slug of SEED_SLUGS) {
      expect(CANVAS_DEFAULTS[slug]).toBeDefined();
    }
  });

  it("TEMPLATE_MEDIUMS values are limited to image | video | both", () => {
    const allowed: TemplateMedium[] = ["image", "video", "both"];
    for (const value of Object.values(TEMPLATE_MEDIUMS)) {
      expect(allowed).toContain(value);
    }
  });

  it("TEMPLATE_MEDIUMS keys are a superset of seed slugs", () => {
    const mediumKeys = Object.keys(TEMPLATE_MEDIUMS);
    for (const slug of SEED_SLUGS) {
      expect(mediumKeys).toContain(slug);
    }
  });

  it("each default config carries a v2 schema and at least one format", () => {
    for (const slug of SEED_SLUGS) {
      const cfg = CANVAS_DEFAULTS[slug]?.config as
        | { version?: number; formats?: Record<string, unknown> }
        | undefined;
      expect(cfg).toBeDefined();
      expect(cfg?.version).toBe(2);
      const formats = Object.keys(cfg?.formats ?? {});
      expect(formats.length).toBeGreaterThan(0);
    }
  });
});
