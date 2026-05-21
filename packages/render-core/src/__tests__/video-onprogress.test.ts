import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderMedia } from "@remotion/renderer";
import { renderVideo } from "../video";
import type { LocalVideoRenderRequest } from "../types";

vi.mock("@remotion/bundler", () => ({
  bundle: vi.fn(async () => "mock://bundle"),
}));

vi.mock("@remotion/renderer", () => ({
  ensureBrowser: vi.fn(async () => undefined),
  selectComposition: vi.fn(async () => ({
    id: "landscape",
    durationInFrames: 240,
    fps: 30,
    width: 1200,
    height: 675,
  })),
  renderMedia: vi.fn(async (options: {
    onProgress?: (progress: { renderedFrames: number }) => void;
    outputLocation: string;
  }) => {
    const fs = await import("node:fs/promises");
    options.onProgress?.({ renderedFrames: 10 });
    options.onProgress?.({ renderedFrames: 20 });
    await fs.writeFile(options.outputLocation, Buffer.from("mock mp4"));
  }),
}));

const baseRequest: LocalVideoRenderRequest = {
  compositionId: "landscape",
  inputProps: {},
  remotionEntryPoint: "./entry.ts",
};

describe("renderVideo onProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onProgress with renderedFrames and totalFrames=240", async () => {
    const onProgress = vi.fn();

    await renderVideo({ ...baseRequest, onProgress });

    expect(onProgress).toHaveBeenCalledWith({ renderedFrames: 10, totalFrames: 240 });
    expect(onProgress).toHaveBeenCalledWith({ renderedFrames: 20, totalFrames: 240 });
  });

  it("omitting onProgress does not throw", async () => {
    await expect(renderVideo(baseRequest)).resolves.toEqual({
      buffer: Buffer.from("mock mp4"),
      compositionId: "landscape",
    });
    expect(vi.mocked(renderMedia).mock.calls[0]?.[0]).toMatchObject({
      onProgress: undefined,
    });
  });

  it("totalFrames comes from composition.durationInFrames", async () => {
    const onProgress = vi.fn();

    await renderVideo({ ...baseRequest, onProgress });

    expect(onProgress.mock.calls[1]?.[0].totalFrames).toBe(240);
  });
});
