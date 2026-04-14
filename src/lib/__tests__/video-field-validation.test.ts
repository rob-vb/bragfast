import { describe, it, expect } from "vitest";
import { validateVideoField, validateFormats } from "../validation";

describe("validateVideoField", () => {
  it("returns null for undefined (no video)", () => {
    expect(validateVideoField(undefined, 3)).toBeNull();
  });

  it("returns null for false", () => {
    expect(validateVideoField(false, 3)).toBeNull();
  });

  it("returns null for video: true with valid slide count", () => {
    expect(validateVideoField(true, 3)).toBeNull();
  });

  it("rejects video: true when total exceeds 60s", () => {
    const error = validateVideoField(true, 13); // 13 * 5 = 65s
    expect(error).toContain("60s");
  });

  it("returns null for valid duration object", () => {
    expect(validateVideoField({ duration: 10 }, 3)).toBeNull();
  });

  it("rejects duration below 3s", () => {
    const error = validateVideoField({ duration: 2 }, 1);
    expect(error).toContain("between 3 and 30");
  });

  it("rejects duration above 30s", () => {
    const error = validateVideoField({ duration: 31 }, 1);
    expect(error).toContain("between 3 and 30");
  });

  it("rejects total duration exceeding 60s with custom duration", () => {
    const error = validateVideoField({ duration: 20 }, 4); // 4 * 20 = 80s
    expect(error).toContain("60s");
  });

  it("rejects non-numeric duration", () => {
    const error = validateVideoField({ duration: "five" }, 1);
    expect(error).toContain("between 3 and 30");
  });

  it("rejects invalid video type", () => {
    const error = validateVideoField("yes", 1);
    expect(error).toContain("must be true or");
  });

  it("accepts valid preset", () => {
    expect(validateVideoField({ preset: "showcase" }, 3)).toBeNull();
  });

  it("accepts preset with duration", () => {
    expect(validateVideoField({ preset: "showcase", duration: 10 }, 3)).toBeNull();
  });

  it("rejects invalid preset", () => {
    const error = validateVideoField({ preset: "invalid" }, 1);
    expect(error).toContain("video.preset must be one of");
  });
});

