import { mkdtempSync } from "fs";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "../auth";
import { readCredentials } from "../credentials";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-auth-"));
  process.env.BRAG_HOME = tmp;
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  await rm(tmp, { recursive: true, force: true });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("login", () => {
  it("prints code, opens URL, polls, and stores token", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        device_code: "dc_test",
        user_code: "ABCD-1234",
        verification_uri: "http://localhost/device?code=ABCD-1234",
        expires_in: 600,
        interval: 5,
      }))
      .mockResolvedValueOnce(jsonResponse({ error: "authorization_pending" }, 428))
      .mockResolvedValueOnce(jsonResponse({
        access_token: "bf_token",
        token_type: "Bearer",
        userId: "user_1",
        email: "dev@example.com",
      }));
    const openBrowser = vi.fn(async () => undefined);
    const chunks: string[] = [];

    await login({
      apiUrl: "http://localhost",
      fetchImpl,
      openBrowser,
      pollDelayMs: 1,
      stdout: { isTTY: false, write: (chunk: string) => { chunks.push(chunk); return true; } },
    });

    expect(openBrowser).toHaveBeenCalledWith("http://localhost/device?code=ABCD-1234");
    expect(chunks.join("")).toContain("ABCD-1234");
    expect(await readCredentials()).toMatchObject({
      api_key: "bf_token",
      email: "dev@example.com",
      userId: "user_1",
    });
  });
});
