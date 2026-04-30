import { describe, it, expect } from "vitest";
import { parseRepoUrl, extractClientIp } from "../parse-repo-url";

describe("parseRepoUrl", () => {
  it.each([
    ["https://github.com/rob/bragfast", "rob/bragfast"],
    ["http://github.com/rob/bragfast", "rob/bragfast"],
    ["github.com/rob/bragfast", "rob/bragfast"],
    ["https://github.com/rob/bragfast.git", "rob/bragfast"],
    ["https://github.com/rob/bragfast/", "rob/bragfast"],
    ["https://github.com/rob/bragfast/pull/42", "rob/bragfast"],
    ["git@github.com:rob/bragfast.git", "rob/bragfast"],
    ["git@github.com:rob/bragfast", "rob/bragfast"],
    ["  https://github.com/rob/bragfast  ", "rob/bragfast"],
    ["https://github.com/My-Org/some.repo_name", "My-Org/some.repo_name"],
  ])("parses %s", (input, expected) => {
    expect(parseRepoUrl(input)?.fullName).toBe(expected);
  });

  it.each([
    "",
    "not a url",
    "https://gitlab.com/rob/bragfast",
    "https://github.com/rob",
    "https://github.com/",
    "github.com/-bad/name",
    "github.com/rob/.bad",
  ])("rejects %s", (input) => {
    expect(parseRepoUrl(input)).toBeNull();
  });
});

describe("extractClientIp", () => {
  it("uses first hop of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" });
    expect(extractClientIp(h)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(extractClientIp(h)).toBe("5.6.7.8");
  });

  it("returns 'unknown' when neither header present", () => {
    expect(extractClientIp(new Headers())).toBe("unknown");
  });
});
