import { describe, it, expect, vi } from "vitest";
import { fetchPublicLatestPr } from "../public-pr";

function fetchSeq(...responses: Response[]) {
  let i = 0;
  return vi.fn().mockImplementation(async () => responses[i++]) as unknown as typeof fetch;
}

const repoOk = (defaultBranch = "main") =>
  new Response(JSON.stringify({ default_branch: defaultBranch }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const pullsOk = (pulls: unknown[]) =>
  new Response(JSON.stringify(pulls), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("fetchPublicLatestPr", () => {
  it("returns latest merged PR on success", async () => {
    const f = fetchSeq(
      repoOk("main"),
      pullsOk([
        { number: 12, title: "WIP", body: null, html_url: "u12", merged_at: null },
        { number: 11, title: "Done", body: "b", html_url: "u11", merged_at: "2026-04-29T00:00:00Z" },
      ]),
    );
    const r = await fetchPublicLatestPr("rob/bragfast", f);
    expect(r).toEqual({
      ok: true,
      pr: { number: 11, title: "Done", body: "b", html_url: "u11", merged_at: "2026-04-29T00:00:00Z" },
      defaultBranch: "main",
    });
  });

  it("returns not_found when repo is 404", async () => {
    const f = fetchSeq(new Response(null, { status: 404 }));
    const r = await fetchPublicLatestPr("rob/missing", f);
    expect(r).toEqual({ ok: false, code: "not_found" });
  });

  it("returns rate_limited when repo is 403", async () => {
    const f = fetchSeq(new Response(null, { status: 403 }));
    const r = await fetchPublicLatestPr("rob/bragfast", f);
    expect(r).toEqual({ ok: false, code: "rate_limited" });
  });

  it("returns rate_limited when pulls list is 403", async () => {
    const f = fetchSeq(repoOk(), new Response(null, { status: 403 }));
    const r = await fetchPublicLatestPr("rob/bragfast", f);
    expect(r).toEqual({ ok: false, code: "rate_limited" });
  });

  it("returns no_pr when no merged PRs found", async () => {
    const f = fetchSeq(
      repoOk(),
      pullsOk([
        { number: 1, title: "x", body: null, html_url: "u", merged_at: null },
      ]),
    );
    const r = await fetchPublicLatestPr("rob/bragfast", f);
    expect(r).toEqual({ ok: false, code: "no_pr" });
  });

  it("encodes default branch in pulls URL", async () => {
    const f = fetchSeq(repoOk("feature/x"), pullsOk([]));
    await fetchPublicLatestPr("rob/bragfast", f);
    const calls = (f as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1][0]).toContain("base=feature%2Fx");
  });
});
