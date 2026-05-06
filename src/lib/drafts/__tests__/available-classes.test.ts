import { describe, it, expect } from "vitest";
import { availableClassesFromSelection } from "../available-classes";

describe("availableClassesFromSelection", () => {
  it("returns an empty list when nothing is selected", () => {
    const result = availableClassesFromSelection(new Set(), {
      buffer: [],
      postiz: [],
    });
    expect(result).toEqual([]);
  });

  it("returns one class when a single buffer channel is selected", () => {
    const result = availableClassesFromSelection(
      new Set(["square::buffer::ch1"]),
      {
        buffer: [{ channelId: "ch1", channelClass: "x" }],
        postiz: [],
      },
    );
    expect(result).toEqual(["x"]);
  });

  it("returns multiple classes from mixed providers", () => {
    const result = availableClassesFromSelection(
      new Set([
        "square::buffer::ch1",
        "square::postiz::ch3",
      ]),
      {
        buffer: [{ channelId: "ch1", channelClass: "x" }],
        postiz: [{ channelId: "ch3", channelClass: "instagram" }],
      },
    );
    expect(result).toEqual(["x", "instagram"]);
  });

  it("filters out 'other' when only an unmapped channel is selected", () => {
    const result = availableClassesFromSelection(
      new Set(["square::buffer::ch9"]),
      {
        buffer: [{ channelId: "ch9", channelClass: "other" }],
        postiz: [],
      },
    );
    expect(result).toEqual([]);
  });

  it("keeps named classes and drops 'other' when mixed", () => {
    const result = availableClassesFromSelection(
      new Set([
        "square::buffer::ch1",
        "square::buffer::ch9",
      ]),
      {
        buffer: [
          { channelId: "ch1", channelClass: "linkedin" },
          { channelId: "ch9", channelClass: "other" },
        ],
        postiz: [],
      },
    );
    expect(result).toEqual(["linkedin"]);
  });

  it("returns canonical order regardless of selection-key insertion order", () => {
    const result = availableClassesFromSelection(
      new Set([
        "square::postiz::yt",
        "square::postiz::ig",
        "square::buffer::x",
        "square::postiz::tt",
        "square::buffer::li",
      ]),
      {
        buffer: [
          { channelId: "x", channelClass: "x" },
          { channelId: "li", channelClass: "linkedin" },
        ],
        postiz: [
          { channelId: "ig", channelClass: "instagram" },
          { channelId: "tt", channelClass: "tiktok" },
          { channelId: "yt", channelClass: "youtube" },
        ],
      },
    );
    expect(result).toEqual(["x", "linkedin", "instagram", "tiktok", "youtube"]);
  });

  it("dedupes when the same class appears across multiple selections", () => {
    const result = availableClassesFromSelection(
      new Set([
        "square::buffer::ch1",
        "landscape::buffer::ch1",
        "square::postiz::ch3",
      ]),
      {
        buffer: [{ channelId: "ch1", channelClass: "x" }],
        postiz: [{ channelId: "ch3", channelClass: "x" }],
      },
    );
    expect(result).toEqual(["x"]);
  });
});
