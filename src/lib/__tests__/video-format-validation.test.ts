import { describe, it, expect } from "vitest";
import { validateVideoFormats, validateVideoTemplate } from "../validation";

describe("validateVideoFormats", () => {
  it("should accept valid video formats", () => {
    const formats = [{ name: "landscape", scenes: [{ title: "A" }] }];
    expect(validateVideoFormats(formats)).toBeNull();
  });

  it("should reject empty formats", () => {
    expect(validateVideoFormats([])).toContain("non-empty");
  });

  it("should reject invalid format name", () => {
    const formats = [{ name: "widescreen", scenes: [{ title: "A" }] }];
    expect(validateVideoFormats(formats)).toContain("widescreen");
  });

  it("should reject duplicate formats", () => {
    const formats = [
      { name: "landscape", scenes: [{ title: "A" }] },
      { name: "landscape", scenes: [{ title: "B" }] },
    ];
    expect(validateVideoFormats(formats)).toContain("Duplicate");
  });

  it("should reject empty scenes", () => {
    const formats = [{ name: "landscape", scenes: [] }];
    expect(validateVideoFormats(formats)).toContain("non-empty");
  });
});

describe("validateVideoTemplate", () => {
  it("should accept default template names", () => {
    expect(validateVideoTemplate("product-update")).toBeNull();
  });

  it("should accept vtmpl_ prefixed IDs", () => {
    expect(validateVideoTemplate("vtmpl_abc123")).toBeNull();
  });

  it("should accept undefined (defaults to product-update)", () => {
    expect(validateVideoTemplate(undefined)).toBeNull();
  });

  it("should reject unknown template names", () => {
    expect(validateVideoTemplate("nonexistent")).toContain("Invalid");
  });
});
