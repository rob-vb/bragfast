import { describe, it, expect } from "vitest";
import { stripAccentMarkers, parseAccentSegments } from "@/lib/templates/canvas-renderer";

describe("stripAccentMarkers", () => {
  it("returns input unchanged when no markers", () => {
    expect(stripAccentMarkers("Plain title here")).toBe("Plain title here");
  });

  it("strips a single accent pair", () => {
    expect(stripAccentMarkers("Turn an *idea* into success")).toBe("Turn an idea into success");
  });

  it("strips adjacent accent pairs", () => {
    expect(stripAccentMarkers("*Hello* *World*")).toBe("Hello World");
  });

  it("leaves unbalanced markers literal", () => {
    expect(stripAccentMarkers("Half *open here")).toBe("Half *open here");
  });

  it("handles empty string", () => {
    expect(stripAccentMarkers("")).toBe("");
  });

  it("does not match across newlines", () => {
    expect(stripAccentMarkers("*line1\nline2*")).toBe("*line1\nline2*");
  });
});

describe("parseAccentSegments", () => {
  it("returns single non-accent segment for plain text", () => {
    expect(parseAccentSegments("Plain")).toEqual([{ text: "Plain", accent: false }]);
  });

  it("splits a single accent pair into 3 segments", () => {
    expect(parseAccentSegments("Turn an *idea* into success")).toEqual([
      { text: "Turn an ", accent: false },
      { text: "idea", accent: true },
      { text: " into success", accent: false },
    ]);
  });

  it("handles accent at start", () => {
    expect(parseAccentSegments("*Hello* world")).toEqual([
      { text: "Hello", accent: true },
      { text: " world", accent: false },
    ]);
  });

  it("handles accent at end", () => {
    expect(parseAccentSegments("hello *world*")).toEqual([
      { text: "hello ", accent: false },
      { text: "world", accent: true },
    ]);
  });

  it("handles adjacent accents with space", () => {
    expect(parseAccentSegments("*A* *B*")).toEqual([
      { text: "A", accent: true },
      { text: " ", accent: false },
      { text: "B", accent: true },
    ]);
  });

  it("treats unbalanced asterisks as literal", () => {
    expect(parseAccentSegments("Half *open")).toEqual([
      { text: "Half *open", accent: false },
    ]);
  });

  it("handles empty string", () => {
    expect(parseAccentSegments("")).toEqual([{ text: "", accent: false }]);
  });
});
