import { describe, it, expect, vi } from "vitest";
import { collectUploadKeys, cleanupUploads } from "../pipeline/cleanup";
import type { FormatEntry } from "../types";

// Mock r2 module — collectUploadKeys uses isR2Url/keyFromUrl, cleanupUploads uses deleteByKey
vi.mock("../storage/r2", () => {
  const R2_PUBLIC_URL = "https://cdn.example.com";
  return {
    isR2Url: (url: string) => url.startsWith(R2_PUBLIC_URL),
    keyFromUrl: (url: string) =>
      url.startsWith(R2_PUBLIC_URL) ? url.slice(R2_PUBLIC_URL.length + 1) : null,
    deleteByKey: vi.fn().mockResolvedValue(undefined),
  };
});

import { deleteByKey } from "../storage/r2";

function makeFormats(imageUrls: (string | undefined)[]): FormatEntry[] {
  return [
    {
      name: "landscape" as const,
      slides: imageUrls.map((url) => ({
        objects: url ? [{ id: "img1", image_url: url }] : [],
      })),
    },
  ];
}

describe("collectUploadKeys", () => {
  it("collects R2 upload URLs", () => {
    const formats = makeFormats(["https://cdn.example.com/uploads/user1/abc.png"]);
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(1);
    expect(keys.has("uploads/user1/abc.png")).toBe(true);
  });

  it("skips non-R2 URLs", () => {
    const formats = makeFormats(["https://external.com/image.png"]);
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(0);
  });

  it("skips R2 URLs that are not under uploads/ prefix", () => {
    const formats = makeFormats([
      "https://cdn.example.com/brands/brand1/logo.png",
      "https://cdn.example.com/releases/cook_abc/landscape-1.jpg",
    ]);
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(0);
  });

  it("handles empty slides and missing objects", () => {
    const formats: FormatEntry[] = [
      { name: "landscape", slides: [{ objects: undefined as any }] },
      { name: "square", slides: [] },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(0);
  });

  it("handles slides with no image_url", () => {
    const formats: FormatEntry[] = [
      {
        name: "landscape",
        slides: [{ objects: [{ id: "txt1", text: "Hello" }] }],
      },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(0);
  });

  it("deduplicates same URL across multiple slides", () => {
    const url = "https://cdn.example.com/uploads/user1/abc.png";
    const formats: FormatEntry[] = [
      {
        name: "landscape",
        slides: [
          { objects: [{ id: "img1", image_url: url }] },
          { objects: [{ id: "img1", image_url: url }] },
        ],
      },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(1);
  });

  it("collects video_url when image_url is absent", () => {
    const formats: FormatEntry[] = [
      {
        name: "landscape",
        slides: [
          { objects: [{ id: "vid1", video_url: "https://cdn.example.com/uploads/u1/clip.mp4" }] },
        ],
      },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(1);
    expect(keys.has("uploads/u1/clip.mp4")).toBe(true);
  });

  it("collects both image_url and video_url from the same visual", () => {
    const formats: FormatEntry[] = [
      {
        name: "landscape",
        slides: [
          {
            objects: [
              {
                id: "vis1",
                image_url: "https://cdn.example.com/uploads/u1/poster.png",
                video_url: "https://cdn.example.com/uploads/u1/clip.mp4",
              },
            ],
          },
        ],
      },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(2);
    expect(keys.has("uploads/u1/poster.png")).toBe(true);
    expect(keys.has("uploads/u1/clip.mp4")).toBe(true);
  });

  it("collects from multiple formats and slides", () => {
    const formats: FormatEntry[] = [
      {
        name: "landscape",
        slides: [
          { objects: [{ id: "img1", image_url: "https://cdn.example.com/uploads/u1/a.png" }] },
        ],
      },
      {
        name: "square",
        slides: [
          { objects: [{ id: "img1", image_url: "https://cdn.example.com/uploads/u1/b.jpg" }] },
        ],
      },
    ];
    const keys = collectUploadKeys(formats);
    expect(keys.size).toBe(2);
    expect(keys.has("uploads/u1/a.png")).toBe(true);
    expect(keys.has("uploads/u1/b.jpg")).toBe(true);
  });
});

describe("cleanupUploads", () => {
  it("calls deleteByKey for each key", async () => {
    const mockDelete = vi.mocked(deleteByKey);
    mockDelete.mockClear();

    const keys = new Set(["uploads/u1/a.png", "uploads/u1/b.jpg"]);
    await cleanupUploads(keys);

    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalledWith("uploads/u1/a.png");
    expect(mockDelete).toHaveBeenCalledWith("uploads/u1/b.jpg");
  });

  it("does nothing for empty set", async () => {
    const mockDelete = vi.mocked(deleteByKey);
    mockDelete.mockClear();

    await cleanupUploads(new Set());
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("continues deleting when one key fails", async () => {
    const mockDelete = vi.mocked(deleteByKey);
    mockDelete.mockClear();
    mockDelete
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(undefined);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const keys = new Set(["uploads/u1/fail.png", "uploads/u1/ok.png"]);
    await cleanupUploads(keys);

    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Upload cleanup failed for a key:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("handles all deletions failing", async () => {
    const mockDelete = vi.mocked(deleteByKey);
    mockDelete.mockClear();
    mockDelete.mockRejectedValue(new Error("network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const keys = new Set(["uploads/u1/a.png", "uploads/u1/b.png"]);
    await cleanupUploads(keys);

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
