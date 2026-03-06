import { describe, it, expect } from "vitest";
import { extractBearerToken } from "../auth/validate-api-key";

describe("extractBearerToken", () => {
  it("extracts token from Bearer header", () => {
    expect(
      extractBearerToken(new Headers({ authorization: "Bearer bk_test123" }))
    ).toBe("bk_test123");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(new Headers())).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(
      extractBearerToken(new Headers({ authorization: "Basic abc" }))
    ).toBeNull();
  });

  it("returns null for empty Bearer value", () => {
    expect(
      extractBearerToken(new Headers({ authorization: "Bearer " }))
    ).toBeNull();
  });
});
