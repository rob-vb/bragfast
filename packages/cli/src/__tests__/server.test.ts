import { mkdtempSync, writeFileSync } from "fs";
import { rm } from "fs/promises";
import { createServer } from "node:net";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Credentials } from "../credentials";
import { startServer } from "../server";

import request from "supertest";

let tmp: string;
let handles: Array<{ close: () => Promise<void> }> = [];

const testCredentials: Credentials = {
  api_key: "bf_test_key_1234",
  created_at: new Date().toISOString(),
};

function makeSpaDir(): string {
  const spaDir = mkdtempSync(path.join(os.tmpdir(), "brag-spa-"));
  writeFileSync(path.join(spaDir, "index.html"), "<!DOCTYPE html><html><body>Workspace</body></html>");
  return spaDir;
}

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-server-"));
  process.env.BRAG_HOME = tmp;
  handles = [];
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  for (const h of handles) {
    await h.close().catch(() => undefined);
  }
  await rm(tmp, { recursive: true, force: true });
});

describe("server", () => {
  describe("port binding and URL print (CLI-05)", () => {
    it("binds to 127.0.0.1 and returns a positive port number", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const chunks: string[] = [];
      const stdout = { write: (chunk: string) => { chunks.push(chunk); return true; } };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      handles.push(handle);

      expect(handle.port).toBeTypeOf("number");
      expect(handle.port).toBeGreaterThan(0);
    });

    it("writes 'Workspace: http://127.0.0.1:<PORT>' to stdout (CLI-05 URL-print)", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const chunks: string[] = [];
      const stdout = { write: (chunk: string) => { chunks.push(chunk); return true; } };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      handles.push(handle);

      const printed = chunks.join("");
      expect(printed).toContain(`Workspace: http://127.0.0.1:${handle.port}`);
    });

    it("calls openBrowser with 'http://127.0.0.1:<PORT>' (CLI-05 browser-open)", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const chunks: string[] = [];
      const stdout = { write: (chunk: string) => { chunks.push(chunk); return true; } };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      handles.push(handle);

      expect(openBrowser).toHaveBeenCalledOnce();
      expect(openBrowser).toHaveBeenCalledWith(`http://127.0.0.1:${handle.port}`);
    });
  });

  describe("port conflict fallback (CLI-06)", () => {
    it("uses a different port when default port 3421 is already occupied", async () => {
      const spaDir = makeSpaDir();
      const blocker = createServer();
      await new Promise<void>((resolve) => blocker.listen(3421, "127.0.0.1", resolve));

      try {
        const openBrowser = vi.fn(async (_url: string) => undefined);
        const stdout = { write: () => true };

        const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
        handles.push(handle);

        expect(handle.port).not.toBe(3421);
        expect(handle.port).toBeGreaterThan(0);
      } finally {
        await new Promise<void>((resolve) => blocker.close(() => resolve()));
      }
    });
  });

  describe("SPA static fallback", () => {
    it("GET / returns 200 (static SPA index.html)", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const stdout = { write: () => true };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      handles.push(handle);

      const res = await request(`http://127.0.0.1:${handle.port}`).get("/");
      expect(res.status).toBe(200);
    });

    it("GET /nonexistent-path returns 200 (SPA router fallback, not 404)", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const stdout = { write: () => true };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      handles.push(handle);

      const res = await request(`http://127.0.0.1:${handle.port}`).get("/some/nested/route");
      expect(res.status).toBe(200);
    });
  });

  describe("local media routes", () => {
    it("uploads a PNG locally and serves it back from /media", async () => {
      const spaDir = makeSpaDir();
      const mediaDir = path.join(tmp, "media");
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const stdout = { write: () => true };
      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      const handle = await startServer(testCredentials, {
        openBrowser,
        stdout,
        spaDir,
        mediaDir,
      });
      handles.push(handle);

      const upload = await request(`http://127.0.0.1:${handle.port}`)
        .post("/api/local/media")
        .attach("file", pngBytes, { filename: "shot.png", contentType: "image/png" });

      expect(upload.status).toBe(200);
      expect(upload.body.id).toEqual(expect.any(String));
      expect(upload.body.url).toContain(`/media/`);

      const mediaPath = new URL(upload.body.url).pathname;
      const served = await request(`http://127.0.0.1:${handle.port}`).get(mediaPath);
      expect(served.status).toBe(200);
      expect(served.body).toEqual(pngBytes);
    });

    it("rejects unsupported local media MIME types without proxying upstream", async () => {
      const spaDir = makeSpaDir();
      const mediaDir = path.join(tmp, "media");
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const stdout = { write: () => true };

      const handle = await startServer(testCredentials, {
        openBrowser,
        stdout,
        spaDir,
        mediaDir,
      });
      handles.push(handle);

      const res = await request(`http://127.0.0.1:${handle.port}`)
        .post("/api/local/media")
        .attach("file", Buffer.from("nope"), {
          filename: "note.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Unsupported type");
    });
  });

  describe("server lifecycle", () => {
    it("close() resolves without error", async () => {
      const spaDir = makeSpaDir();
      const openBrowser = vi.fn(async (_url: string) => undefined);
      const stdout = { write: () => true };

      const handle = await startServer(testCredentials, { openBrowser, stdout, spaDir });
      // Remove from handles so afterEach doesn't double-close
      handles = handles.filter((h) => h !== handle);

      await expect(handle.close()).resolves.toBeUndefined();
    });
  });
});
