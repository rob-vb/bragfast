import { describe, it, expect, beforeAll } from "vitest";
import { signPartUrl, verifyPartSignature } from "../signing";

beforeAll(() => {
  process.env.UPLOAD_SIGNING_KEY = "test-signing-key";
});

describe("signPartUrl / verifyPartSignature", () => {
  const uploadId = "upl_abc1234567";
  const partNumber = 3;
  const expiresAt = Date.now() + 60_000;
  const contentType = "video/mp4";

  it("produces a deterministic hex signature", () => {
    const sig1 = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    const sig2 = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies a valid signature", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(verifyPartSignature(uploadId, partNumber, expiresAt, contentType, sig)).toBe(true);
  });

  it("rejects wrong uploadId", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(verifyPartSignature("upl_wrong00000", partNumber, expiresAt, contentType, sig)).toBe(false);
  });

  it("rejects wrong partNumber (cross-part replay prevention)", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(verifyPartSignature(uploadId, partNumber + 1, expiresAt, contentType, sig)).toBe(false);
  });

  it("rejects wrong expiresAt", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(verifyPartSignature(uploadId, partNumber, expiresAt + 1, contentType, sig)).toBe(false);
  });

  it("rejects wrong contentType", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    expect(verifyPartSignature(uploadId, partNumber, expiresAt, "video/webm", sig)).toBe(false);
  });

  it("rejects tampered signature", () => {
    const sig = signPartUrl(uploadId, partNumber, expiresAt, contentType);
    const tampered = sig.slice(0, -2) + "00";
    expect(verifyPartSignature(uploadId, partNumber, expiresAt, contentType, tampered)).toBe(false);
  });

  it("rejects mismatched-length signature without throwing", () => {
    expect(() =>
      verifyPartSignature(uploadId, partNumber, expiresAt, contentType, "tooshort")
    ).not.toThrow();
    expect(verifyPartSignature(uploadId, partNumber, expiresAt, contentType, "tooshort")).toBe(false);
  });

  it("produces different sigs for different part numbers", () => {
    const sig1 = signPartUrl(uploadId, 1, expiresAt, contentType);
    const sig2 = signPartUrl(uploadId, 2, expiresAt, contentType);
    expect(sig1).not.toBe(sig2);
  });
});
