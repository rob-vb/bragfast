import { describe, it, expect, beforeEach, afterAll } from "vitest";
import crypto from "crypto";
import { seal, open, type SealedSecret } from "../secret-box";

const ORIGINAL_KEY = process.env.SECRET_BOX_KEY;

function setTestKey() {
  process.env.SECRET_BOX_KEY = crypto.randomBytes(32).toString("base64");
}

beforeEach(() => {
  setTestKey();
});

afterAll(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SECRET_BOX_KEY;
  } else {
    process.env.SECRET_BOX_KEY = ORIGINAL_KEY;
  }
});

describe("secret-box", () => {
  it("round-trips ASCII strings", () => {
    const plain = "sk_test_abcdefghijklmnop";
    expect(open(seal(plain))).toBe(plain);
  });

  it("round-trips unicode strings", () => {
    const plain = "🔐 secret — café — 日本語";
    expect(open(seal(plain))).toBe(plain);
  });

  it("round-trips a 1-byte string", () => {
    expect(open(seal("x"))).toBe("x");
  });

  it("round-trips an empty string", () => {
    expect(open(seal(""))).toBe("");
  });

  it("round-trips a 10KB string", () => {
    const plain = "a".repeat(10 * 1024);
    expect(open(seal(plain))).toBe(plain);
  });

  it("produces a fresh IV per seal (ciphertexts differ for identical plaintext)", () => {
    const plain = "same input";
    const a = seal(plain);
    const b = seal(plain);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(open(a)).toBe(plain);
    expect(open(b)).toBe(plain);
  });

  it("rejects tampered ciphertext", () => {
    const sealed = seal("original");
    const tampered: SealedSecret = {
      ...sealed,
      ciphertext: flipOneByte(sealed.ciphertext),
    };
    expect(() => open(tampered)).toThrow();
  });

  it("rejects tampered auth tag", () => {
    const sealed = seal("original");
    const tampered: SealedSecret = {
      ...sealed,
      tag: flipOneByte(sealed.tag),
    };
    expect(() => open(tampered)).toThrow();
  });

  it("rejects tampered IV", () => {
    const sealed = seal("original");
    const tampered: SealedSecret = {
      ...sealed,
      iv: flipOneByte(sealed.iv),
    };
    expect(() => open(tampered)).toThrow();
  });

  it("throws when SECRET_BOX_KEY is missing", () => {
    delete process.env.SECRET_BOX_KEY;
    expect(() => seal("x")).toThrow(/SECRET_BOX_KEY is not set/);
    expect(() => open({ ciphertext: "a", iv: "b", tag: "c" })).toThrow(
      /SECRET_BOX_KEY is not set/,
    );
  });

  it("throws when SECRET_BOX_KEY decodes to fewer than 32 bytes", () => {
    process.env.SECRET_BOX_KEY = Buffer.from("too-short").toString("base64");
    expect(() => seal("x")).toThrow(/must decode to 32 bytes/);
  });

  it("throws when SECRET_BOX_KEY decodes to more than 32 bytes", () => {
    process.env.SECRET_BOX_KEY = crypto.randomBytes(48).toString("base64");
    expect(() => seal("x")).toThrow(/must decode to 32 bytes/);
  });
});

function flipOneByte(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  buf[0] = buf[0] ^ 0x01;
  return buf.toString("base64");
}
