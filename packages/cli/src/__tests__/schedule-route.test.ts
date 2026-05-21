import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Credentials } from "../credentials";
import { startServer } from "../server";
import { resolveAndSchedule } from "../schedule-resolver";

vi.mock("../schedule-resolver", () => ({
  resolveAndSchedule: vi.fn(async () => ({
    confirmation: [
      {
        provider: "buffer",
        channelId: "chan_x",
        format: "landscape",
        status: "scheduled",
        scheduledAt: "2026-05-22T10:00:00.000Z",
        externalId: "post_123",
      },
    ],
  })),
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
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-schedule-route-"));
  process.env.BRAG_HOME = tmp;
  handles = [];
  vi.mocked(resolveAndSchedule).mockClear();
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  delete process.env.BRAG_API_BASE;
  for (const h of handles) {
    await h.close().catch(() => undefined);
  }
  await rm(tmp, { recursive: true, force: true });
});

describe("local schedule route", () => {
  it("POST /api/local/schedule returns success confirmation for valid body", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/schedule")
      .send({
        draftId: "draft_123",
        selections: [
          { format: "landscape", channelIds: ["chan_x"] },
        ],
        caption: "Ship it",
        scheduling: { mode: "custom", scheduledAt: "2026-05-22T10:00:00.000Z" },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      confirmation: [
        {
          provider: "buffer",
          channelId: "chan_x",
          format: "landscape",
          status: "scheduled",
          scheduledAt: "2026-05-22T10:00:00.000Z",
          externalId: "post_123",
        },
      ],
    });
  });

  it("rejects invalid or traversal draftId values", async () => {
    const handle = await startTestServer();

    const missing = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/schedule")
      .send({ selections: [{ format: "landscape", channelIds: ["chan_x"] }] });
    const traversal = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/schedule")
      .send({ draftId: "../secret", selections: [{ format: "landscape", channelIds: ["chan_x"] }] });

    expect(missing.status).toBe(400);
    expect(traversal.status).toBe(400);
    expect(resolveAndSchedule).not.toHaveBeenCalled();
  });

  it("accepts only image formats", async () => {
    const handle = await startTestServer();

    const res = await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/schedule")
      .send({
        draftId: "draft_123",
        selections: [{ format: "video-landscape", channelIds: ["chan_x"] }],
      });

    expect(res.status).toBe(400);
    expect(resolveAndSchedule).not.toHaveBeenCalled();
  });

  it("passes output directory, credentials, backend base, draft, selections, caption, and scheduling to the resolver", async () => {
    process.env.BRAG_API_BASE = "https://backend.test";
    const handle = await startTestServer();

    await request(`http://127.0.0.1:${handle.port}`)
      .post("/api/local/schedule")
      .send({
        draftId: "draft_123",
        selections: [
          { format: "landscape", channelIds: ["chan_x"] },
          { format: "square", channelIds: ["chan_y"] },
        ],
        caption: "Ship it",
        scheduling: { mode: "queue" },
      });

    expect(resolveAndSchedule).toHaveBeenCalledWith({
      outputDir: path.join(tmp, "output"),
      apiKey: testCredentials.api_key,
      backendBase: "https://backend.test",
      draftId: "draft_123",
      selections: [
        { format: "landscape", channelIds: ["chan_x"] },
        { format: "square", channelIds: ["chan_y"] },
      ],
      caption: "Ship it",
      scheduling: { mode: "queue" },
      stdout: expect.any(Object),
    });
  });
});
