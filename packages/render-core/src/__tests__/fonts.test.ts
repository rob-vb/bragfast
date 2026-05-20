import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGoogleFontBufferCached, loadFontsForFamily, writeFontToDisk } from "../fonts";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("font __dirname resolution", () => {
  it("loads Plus Jakarta Sans regardless of cwd", async () => {
    process.chdir("/tmp");
    const fonts = await loadFontsForFamily("Plus Jakarta Sans");
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts[0].data.byteLength).toBeGreaterThan(0);
  });
});

describe("D-05 disk cache", () => {
  it("returns cached bytes without network call on repeat fetch", async () => {
    const tmpCache = mkdtempSync(path.join(os.tmpdir(), "brag-font-cache-"));
    try {
      const bytes = Buffer.from("FAKE_TTF_BYTES");
      await writeFontToDisk("Test Family", 400, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), tmpCache);
      const fetcher = vi.fn(async () => Buffer.from("NETWORK").buffer as ArrayBuffer);

      const result = await fetchGoogleFontBufferCached("Test Family", 400, tmpCache, fetcher);

      expect(Buffer.from(result ?? new ArrayBuffer(0)).toString()).toBe("FAKE_TTF_BYTES");
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      rmSync(tmpCache, { recursive: true, force: true });
    }
  });
});
