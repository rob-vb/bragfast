import crypto from "crypto";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import type { LocalVideoRenderRequest, VideoRenderResult } from "./types";

export async function renderVideo(req: LocalVideoRenderRequest): Promise<VideoRenderResult> {
  const { bundle } = await import("@remotion/bundler");
  const { ensureBrowser, renderMedia, selectComposition } = await import("@remotion/renderer");

  await ensureBrowser({
    onBrowserDownload: req.onBrowserDownload,
  });

  const bundleLocation = await bundle({ entryPoint: req.remotionEntryPoint });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: req.compositionId,
    inputProps: req.inputProps,
  });

  const tmpFile = path.join(os.tmpdir(), `render-core-${crypto.randomUUID()}.mp4`);
  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      crf: 28,
      x264Preset: "slow",
      encodingMaxRate: "5M",
      encodingBufferSize: "10M",
      muted: true,
      outputLocation: tmpFile,
      inputProps: req.inputProps,
      onProgress: req.onProgress
        ? (p: { renderedFrames: number }) =>
            req.onProgress?.({
              renderedFrames: p.renderedFrames,
              totalFrames: composition.durationInFrames,
            })
        : undefined,
    });
    const buffer = await fs.readFile(tmpFile);
    return { buffer, compositionId: req.compositionId };
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}
