import { describe, it, expect, vi, beforeEach } from "vitest";

const headObject = vi.fn();
const uploadImage = vi.fn();
const loadFontsForFamily = vi.fn();
const satori = vi.fn();

vi.mock("../../storage/r2", () => ({
  headObject: (...args: unknown[]) => headObject(...args),
  uploadImage: (...args: unknown[]) => uploadImage(...args),
}));

vi.mock("../../fonts", () => ({
  loadFontsForFamily: (...args: unknown[]) => loadFontsForFamily(...args),
}));

vi.mock("satori", () => ({
  default: (...args: unknown[]) => satori(...args),
}));

vi.mock("sharp", () => {
  const chain = {
    flatten: () => chain,
    jpeg: () => chain,
    toBuffer: async () => Buffer.from("x".repeat(1024)),
  };
  return { default: () => chain };
});

vi.hoisted(() => {
  process.env.R2_PUBLIC_URL = "https://cdn.test";
});

import {
  previewCacheKey,
  getCachedPreviewUrl,
  renderAndUploadPreview,
} from "../render-preview";

beforeEach(() => {
  headObject.mockReset();
  uploadImage.mockReset();
  loadFontsForFamily.mockReset();
  loadFontsForFamily.mockResolvedValue([]);
  satori.mockReset();
  satori.mockResolvedValue("<svg/>");
});

describe("previewCacheKey", () => {
  it("is deterministic per repo+pr", () => {
    const a = previewCacheKey("rob/bragfast", 7);
    const b = previewCacheKey("rob/bragfast", 7);
    expect(a).toBe(b);
    expect(a).toMatch(/^preview\/[a-f0-9]{64}\.jpg$/);
  });

  it("differs across repos and PR numbers", () => {
    expect(previewCacheKey("rob/bragfast", 7)).not.toBe(previewCacheKey("rob/bragfast", 8));
    expect(previewCacheKey("rob/bragfast", 7)).not.toBe(previewCacheKey("rob/other", 7));
  });
});

describe("getCachedPreviewUrl", () => {
  it("returns null on miss", async () => {
    headObject.mockResolvedValue(null);
    expect(await getCachedPreviewUrl("preview/x.jpg")).toBeNull();
  });

  it("returns public URL on hit", async () => {
    headObject.mockResolvedValue({ size: 1, contentType: "image/jpeg" });
    expect(await getCachedPreviewUrl("preview/x.jpg")).toBe("https://cdn.test/preview/x.jpg");
  });
});

describe("renderAndUploadPreview", () => {
  it("returns cached URL without rendering when key exists", async () => {
    headObject.mockResolvedValue({ size: 1, contentType: "image/jpeg" });
    const url = await renderAndUploadPreview({ number: 7, title: "t" }, "rob/bragfast");
    expect(url).toMatch(/^https:\/\/cdn\.test\/preview\/[a-f0-9]{64}\.jpg$/);
    expect(satori).not.toHaveBeenCalled();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("renders + uploads on cache miss", async () => {
    headObject.mockResolvedValue(null);
    uploadImage.mockResolvedValue("https://cdn.test/preview/new.jpg");
    const url = await renderAndUploadPreview(
      { number: 7, title: "Add feature" },
      "rob/bragfast",
    );
    expect(satori).toHaveBeenCalled();
    expect(uploadImage).toHaveBeenCalled();
    const [, key] = uploadImage.mock.calls[0];
    expect(key).toMatch(/^preview\/[a-f0-9]{64}\.jpg$/);
    expect(url).toBe("https://cdn.test/preview/new.jpg");
  });
});

