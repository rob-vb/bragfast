import { describe, it, expect } from "vitest";
import {
  TemplateMediumMismatchError,
  resolveTemplate,
} from "../pipeline/shared";
import {
  TEMPLATE_MEDIUMS,
  getDefaultMedium,
} from "../templates/canvas-defaults";

// Minimal ConvexHttpClient stub — built-in templates never call convex.query,
// so these tests don't need a live client to assert the gate.
const stubConvex = {
  query: async () => {
    throw new Error("convex should not be called for built-in templates");
  },
} as unknown as Parameters<typeof resolveTemplate>[2];

describe("getDefaultMedium", () => {
  it("returns the in-process map value for known slugs", () => {
    for (const [slug, expected] of Object.entries(TEMPLATE_MEDIUMS)) {
      expect(getDefaultMedium(slug)).toBe(expected);
    }
  });

  it("returns null for unknown slugs", () => {
    expect(getDefaultMedium("not-a-template")).toBeNull();
  });
});

describe("resolveTemplate medium gate", () => {
  it("allows requested=image when supported=both", async () => {
    await expect(
      resolveTemplate("standard-browser", "u1", stubConvex, "image"),
    ).resolves.toBeTruthy();
  });

  it("allows requested=video when supported=both", async () => {
    await expect(
      resolveTemplate("standard-browser", "u1", stubConvex, "video"),
    ).resolves.toBeTruthy();
  });

  it("throws TemplateMediumMismatchError when image-only template asked for video", async () => {
    expect(getDefaultMedium("carousel-slide")).toBe("image");
    await expect(
      resolveTemplate("carousel-slide", "u1", stubConvex, "video"),
    ).rejects.toBeInstanceOf(TemplateMediumMismatchError);
  });

  it("error carries templateName / requested / supported", async () => {
    try {
      await resolveTemplate("carousel-slide", "u1", stubConvex, "video");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateMediumMismatchError);
      const e = err as TemplateMediumMismatchError;
      expect(e.templateName).toBe("carousel-slide");
      expect(e.requested).toBe("video");
      expect(e.supported).toBe("image");
    }
  });

  it("does not throw when requested medium is not supplied", async () => {
    await expect(
      resolveTemplate("carousel-slide", "u1", stubConvex),
    ).resolves.toBeTruthy();
  });
});
