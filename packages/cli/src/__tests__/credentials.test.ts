import { mkdtempSync, statSync } from "fs";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearCredentials, getCredentialsPath, readCredentials, writeCredentials } from "../credentials";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-"));
  process.env.BRAG_HOME = tmp;
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  await rm(tmp, { recursive: true, force: true });
});

describe("credentials", () => {
  it("writes chmod 600 credentials and reads them back", async () => {
    await writeCredentials({
      api_key: "bf_test",
      email: "dev@example.com",
      created_at: "2026-05-20T00:00:00.000Z",
    });

    const mode = statSync(getCredentialsPath()).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(await readCredentials()).toMatchObject({
      api_key: "bf_test",
      email: "dev@example.com",
    });
  });

  it("clears credentials", async () => {
    await writeCredentials({
      api_key: "bf_test",
      created_at: "2026-05-20T00:00:00.000Z",
    });
    await clearCredentials();
    expect(await readCredentials()).toBeNull();
  });
});
