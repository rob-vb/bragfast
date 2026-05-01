import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRepoOptedOut, __resetOptOutCache } from "../opt-out";

beforeEach(() => {
  __resetOptOutCache();
});

function fakeFetch(status: number) {
  return vi.fn().mockResolvedValue(
    new Response(null, { status }),
  ) as unknown as typeof fetch;
}

describe("isRepoOptedOut", () => {
  it("returns true when bragfast.txt exists (200)", async () => {
    const f = fakeFetch(200);
    expect(await isRepoOptedOut("rob/bragfast", f)).toBe(true);
  });

  it("returns false when bragfast.txt missing (404)", async () => {
    const f = fakeFetch(404);
    expect(await isRepoOptedOut("rob/bragfast", f)).toBe(false);
  });

  it("returns false on fetch error", async () => {
    const f = vi.fn().mockRejectedValue(new Error("net")) as unknown as typeof fetch;
    expect(await isRepoOptedOut("rob/bragfast", f)).toBe(false);
  });

  it("caches result within TTL (no second fetch call)", async () => {
    const f = fakeFetch(200);
    await isRepoOptedOut("rob/bragfast", f);
    await isRepoOptedOut("rob/bragfast", f);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("HEADs the raw URL on HEAD ref", async () => {
    const f = fakeFetch(404);
    await isRepoOptedOut("rob/bragfast", f);
    expect(f).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/rob/bragfast/HEAD/bragfast.txt",
      { method: "HEAD" },
    );
  });
});
