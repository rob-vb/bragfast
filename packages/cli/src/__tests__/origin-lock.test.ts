import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { originLockMiddleware } from "../server";

import request from "supertest";

const TEST_PORT = 3421;

function buildTestApp(port: number) {
  const app = express();
  const [hostGuard, corsMiddleware] = originLockMiddleware(port);
  app.use(hostGuard);
  app.use(corsMiddleware);
  app.get("/api/repo-context", (_req, res) => {
    res.json({ tag: null, sha: null, name: null, version: null });
  });
  return app;
}

describe("originLockMiddleware (AUTH-02)", () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp(TEST_PORT);
  });

  afterEach(() => {
    // no persistent state to clean up
  });

  describe("wrong-origin rejection", () => {
    it("rejects GET /api/repo-context with Origin 'http://evil.com' and correct Host with 401", async () => {
      const res = await request(app)
        .get("/api/repo-context")
        .set("Origin", "http://evil.com")
        .set("Host", `127.0.0.1:${TEST_PORT}`);

      expect(res.status).toBe(401);
    });

    it("rejects GET /api/repo-context with Origin 'http://evil.com' and wrong Host with 401", async () => {
      const res = await request(app)
        .get("/api/repo-context")
        .set("Origin", "http://evil.com")
        .set("Host", "evil.com");

      expect(res.status).toBe(401);
    });
  });

  describe("same-origin pass-through", () => {
    it("passes through GET /api/repo-context with no Origin header and correct Host", async () => {
      const res = await request(app)
        .get("/api/repo-context")
        .set("Host", `127.0.0.1:${TEST_PORT}`);

      // No Origin header means same-origin request — should not be rejected at CORS level
      expect(res.status).not.toBe(401);
    });

    it("passes through GET /api/repo-context with correct Origin 'http://127.0.0.1:<PORT>' and correct Host", async () => {
      const res = await request(app)
        .get("/api/repo-context")
        .set("Origin", `http://127.0.0.1:${TEST_PORT}`)
        .set("Host", `127.0.0.1:${TEST_PORT}`);

      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
    });
  });
});
