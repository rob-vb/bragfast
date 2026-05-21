import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  probeClipDurationInFrames,
  resolveAndRenderVideo,
  type VideoRenderJob,
} from "../video-render-resolver";
import { renderVideo } from "@bragfast/render-core";

vi.mock("@bragfast/render-core", async () => {
  const actual = await vi.importActual<typeof import("@bragfast/render-core")>("@bragfast/render-core");
  return {
    ...actual,
    renderVideo: vi.fn(),
  };
});

const renderVideoMock = vi.mocked(renderVideo);

function makeJob(): VideoRenderJob {
  return {
    jobId: "draft_1",
    draftId: "draft_1",
    phase: "pending",
    framesRendered: 0,
    totalFrames: 0,
    downloadPct: 0,
  };
}

function makeStdout() {
  const chunks: string[] = [];
  return {
    stdout: { write: (chunk: string) => { chunks.push(chunk); return true; } } as NodeJS.WriteStream,
    chunks,
  };
}

function makeMvhdMp4(durationSeconds: number): Buffer {
  const ftyp = Buffer.alloc(16);
  ftyp.writeUInt32BE(16, 0);
  ftyp.write("ftyp", 4, "ascii");

  const mvhd = Buffer.alloc(108);
  mvhd.writeUInt32BE(108, 0);
  mvhd.write("mvhd", 4, "ascii");
  mvhd.writeUInt8(0, 8);
  mvhd.writeUInt32BE(30000, 20);
  mvhd.writeUInt32BE(Math.round(durationSeconds * 30000), 24);

  const moov = Buffer.alloc(8 + mvhd.length);
  moov.writeUInt32BE(moov.length, 0);
  moov.write("moov", 4, "ascii");
  mvhd.copy(moov, 8);

  return Buffer.concat([ftyp, moov]);
}

function mockFetchWithVideo(durationSeconds: number | null) {
  global.fetch = vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes("/api/v1/drafts/")) {
      return new Response(JSON.stringify({
        id: "draft_1",
        config: {
          templateId: "standard-browser",
          objectContent: {
            image: { video_url: "/media/foo.mp4" },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (href.includes("/media/foo.mp4") && durationSeconds !== null) {
      return new Response(makeMvhdMp4(durationSeconds), { status: 206 });
    }
    if (href.includes("/media/foo.mp4")) {
      return new Response("nope", { status: 500 });
    }
    throw new Error(`unexpected fetch: ${href}`);
  }) as typeof fetch;
}

async function runResolver(durationSeconds: number | null, job = makeJob()) {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "brag-video-output-"));
  const { stdout } = makeStdout();
  mockFetchWithVideo(durationSeconds);

  await resolveAndRenderVideo(
    "draft_1",
    "landscape",
    "bf_test",
    "https://api.test",
    outputDir,
    3421,
    stdout,
    job,
  );

  return { outputDir, job };
}

beforeEach(() => {
  renderVideoMock.mockReset();
  renderVideoMock.mockResolvedValue({ buffer: Buffer.from("mp4"), compositionId: "landscape" });
});

afterEach(async () => {
  vi.restoreAllMocks();
});

describe("probeClipDurationInFrames", () => {
  it("returns rounded duration in frames from a faststart MP4 mvhd box", async () => {
    global.fetch = vi.fn(async () => new Response(makeMvhdMp4(3), { status: 206 })) as typeof fetch;

    await expect(probeClipDurationInFrames("http://127.0.0.1:3421/media/clip.mp4")).resolves.toBe(90);
  });

  it("returns null when probing fails", async () => {
    global.fetch = vi.fn(async () => new Response("missing", { status: 404 })) as typeof fetch;

    await expect(probeClipDurationInFrames("http://127.0.0.1:3421/media/clip.mp4")).resolves.toBeNull();
  });
});

describe("resolveAndRenderVideo", () => {
  it("sets the Chrome download phase only when Chromium is not already available", async () => {
    renderVideoMock.mockImplementation(async (req) => {
      req.onBrowserDownload?.().onProgress({ alreadyAvailable: false, percent: 0.42 });
      return { buffer: Buffer.from("mp4"), compositionId: "landscape" };
    });
    const job = makeJob();

    await runResolver(3, job);

    expect(job.downloadPct).toBe(42);
    expect(job.phase).toBe("done");
  });

  it("does not enter chrome-download when Chromium is already available", async () => {
    renderVideoMock.mockImplementation(async (req) => {
      req.onBrowserDownload?.().onProgress({ alreadyAvailable: true, percent: 1 });
      expect(job.phase).toBe("pending");
      return { buffer: Buffer.from("mp4"), compositionId: "landscape" };
    });
    const job = makeJob();

    await runResolver(3, job);

    expect(job.downloadPct).toBe(0);
    expect(job.phase).toBe("done");
  });

  it("rewrites local /media video URLs to absolute 127.0.0.1 URLs", async () => {
    await runResolver(3);

    const req = renderVideoMock.mock.calls[0][0];
    const inputProps = req.inputProps as { slides: Array<Record<string, { videoUrl?: string }>> };
    expect(inputProps.slides[0].image.videoUrl).toBe("http://127.0.0.1:3421/media/foo.mp4");
  });

  it("writes the MP4 buffer and marks the job done", async () => {
    renderVideoMock.mockResolvedValue({ buffer: Buffer.from("rendered-mp4"), compositionId: "landscape" });

    const { outputDir, job } = await runResolver(3);

    await expect(readFile(path.join(outputDir, "draft_1", "landscape.mp4"), "utf8")).resolves.toBe("rendered-mp4");
    expect(job.phase).toBe("done");
    expect(job.url).toBe("/output/draft_1/landscape.mp4");
    await rm(outputDir, { recursive: true, force: true });
  });

  it("marks the job failed when renderVideo rejects", async () => {
    renderVideoMock.mockRejectedValue(new Error("render exploded"));
    const job = makeJob();

    await runResolver(3, job);

    expect(job.phase).toBe("failed");
    expect(job.error).toContain("render exploded");
  });

  it("passes the probed short clip duration to inputProps for composition looping", async () => {
    await runResolver(3);

    const inputProps = renderVideoMock.mock.calls[0][0].inputProps as { videoDurationInFrames: number };
    expect(inputProps.videoDurationInFrames).toBe(90);
  });

  it("caps long clips at 240 frames for trimming", async () => {
    await runResolver(12);

    const inputProps = renderVideoMock.mock.calls[0][0].inputProps as { videoDurationInFrames: number };
    expect(inputProps.videoDurationInFrames).toBe(240);
  });

  it("falls back to 240 frames when clip probing fails", async () => {
    await runResolver(null);

    const inputProps = renderVideoMock.mock.calls[0][0].inputProps as { videoDurationInFrames: number };
    expect(inputProps.videoDurationInFrames).toBe(240);
  });

  it("streams frame progress into the job", async () => {
    renderVideoMock.mockImplementation(async (req) => {
      req.onProgress?.({ renderedFrames: 12, totalFrames: 240 });
      return { buffer: Buffer.from("mp4"), compositionId: "landscape" };
    });
    const job = makeJob();

    await runResolver(3, job);

    expect(job.framesRendered).toBe(12);
    expect(job.totalFrames).toBe(240);
  });
});
