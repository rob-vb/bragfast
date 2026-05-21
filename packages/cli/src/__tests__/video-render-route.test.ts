import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Credentials } from "../credentials";
import { startServer } from "../server";
import { resolveAndRenderVideo } from "../video-render-resolver";

vi.mock("../video-render-resolver", () => ({
  resolveAndRenderVideo: vi.fn(async () => undefined),
}));

const testCredentials: Credentials = {
  api_key: "bf_test_key_1234",
  created_at: new Date().toISOString(),
};

let tmp: string;
let handles: Array<{ close: () => Promise<void> }> = [];

function makeSpaDir(): string {
  const spaDir = mkdtempSync(path.join(os.tmpdir(), "brag-spa-"));
  writeFileSync(path.join(spaDir, "index.html"), "<!DOCTYPE html><html><body>Workspace</body></html>");
  return spaDir;
}

async function startTestServer() {
  const spaDir = makeSpaDir();
  const handle = await startServer(testCredentials, {
    openBrowser: vi.fn(async () => undefined),
    stdout: { write: () => true },
    spaDir,
    outputDir: path.join(tmp, "output"),
  });
  handles.push(handle);
  return handle;
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-video-route-"));
  process.env.BRAG_HOME = tmp;
  handles = [];
  vi.mocked(resolveAndRenderVideo).mockClear();
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  for (const h of handles) {
    await h.close().catch(() => undefined);
  }
  await rm(tmp, { recursive: true, force: true });
});

describe("local video render routes", () => {
  it("POST /api/local/render/video returns 202 for a draftId and format", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/render/video")
      .send({ draftId: "d1", format: "landscape" });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: "d1", status: "pending" });
    expect(resolveAndRenderVideo).toHaveBeenCalledWith(
      "d1",
      "landscape",
      testCredentials.api_key,
      expect.any(String),
      path.join(tmp, "output"),
      handle.port,
      expect.any(Object),
      expect.objectContaining({ jobId: "d1", phase: "pending" }),
    );
  });

  it("POST /api/local/render/video rejects a missing draftId", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/render/video")
      .send({ format: "landscape" });

    expect(res.status).toBe(400);
  });

  it("GET /api/local/render/video/:id/status returns video progress fields", async () => {
    const handle = await startTestServer();
    await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/render/video")
      .send({ draftId: "d1", format: "landscape" });

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .get("/api/local/render/video/d1/status");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      jobId: "d1",
      draftId: "d1",
      phase: "pending",
      framesRendered: 0,
      totalFrames: 0,
      downloadPct: 0,
    });
  });

  it("GET /api/local/render/video/:id/status rejects path traversal ids", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .get("/api/local/render/video/..%2Fetc/status");

    expect(res.status).toBe(400);
  });

  it("GET /api/local/render/video/:id/status returns 404 for unknown jobs", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .get("/api/local/render/video/unknown-id/status");

    expect(res.status).toBe(404);
  });
});
