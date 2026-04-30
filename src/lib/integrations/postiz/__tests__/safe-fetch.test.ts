import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isBlockedIP, resolveHostname, safeFetch } from "../safe-fetch";

// ---------------------------------------------------------------------------
// isBlockedIP unit tests (no I/O)
// ---------------------------------------------------------------------------

describe("isBlockedIP", () => {
  it("blocks loopback 127.0.0.1", () => {
    expect(isBlockedIP("127.0.0.1")).toBe(true);
  });

  it("blocks loopback 127.x.x.x range", () => {
    expect(isBlockedIP("127.255.255.254")).toBe(true);
  });

  it("blocks RFC-1918 10.x", () => {
    expect(isBlockedIP("10.0.0.1")).toBe(true);
    expect(isBlockedIP("10.255.255.255")).toBe(true);
  });

  it("blocks RFC-1918 172.16–31.x", () => {
    expect(isBlockedIP("172.16.0.1")).toBe(true);
    expect(isBlockedIP("172.31.255.255")).toBe(true);
  });

  it("does not block 172.15.x (just outside range)", () => {
    expect(isBlockedIP("172.15.0.1")).toBe(false);
  });

  it("does not block 172.32.x (just outside range)", () => {
    expect(isBlockedIP("172.32.0.1")).toBe(false);
  });

  it("blocks RFC-1918 192.168.x", () => {
    expect(isBlockedIP("192.168.0.1")).toBe(true);
    expect(isBlockedIP("192.168.255.255")).toBe(true);
  });

  it("blocks AWS IMDS 169.254.169.254", () => {
    expect(isBlockedIP("169.254.169.254")).toBe(true);
  });

  it("blocks link-local 169.254.x.x range", () => {
    expect(isBlockedIP("169.254.0.1")).toBe(true);
  });

  it("blocks CGNAT / Tailscale 100.64.x", () => {
    expect(isBlockedIP("100.64.0.1")).toBe(true);
    expect(isBlockedIP("100.127.255.255")).toBe(true);
  });

  it("does not block 100.128.x (just outside CGNAT range)", () => {
    expect(isBlockedIP("100.128.0.1")).toBe(false);
  });

  it("blocks 0.0.0.0/8", () => {
    expect(isBlockedIP("0.0.0.1")).toBe(true);
  });

  it("allows a real public IP", () => {
    expect(isBlockedIP("1.1.1.1")).toBe(false);
    expect(isBlockedIP("8.8.8.8")).toBe(false);
    expect(isBlockedIP("93.184.216.34")).toBe(false); // example.com
  });

  it("blocks IPv6 loopback ::1", () => {
    expect(isBlockedIP("::1")).toBe(true);
  });

  it("blocks IPv6 unique-local fc00::/7", () => {
    expect(isBlockedIP("fc00::1")).toBe(true);
    expect(isBlockedIP("fd00::1")).toBe(true);
  });

  it("blocks IPv6 link-local fe80::/10", () => {
    expect(isBlockedIP("fe80::1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 of loopback ::ffff:127.0.0.1", () => {
    expect(isBlockedIP("::ffff:127.0.0.1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 of IMDS ::ffff:169.254.169.254", () => {
    expect(isBlockedIP("::ffff:169.254.169.254")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 of 10.x ::ffff:10.0.0.1", () => {
    expect(isBlockedIP("::ffff:10.0.0.1")).toBe(true);
  });

  it("allows public IPv6 address", () => {
    expect(isBlockedIP("2606:4700:4700::1111")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveHostname — mock dns.lookup
// ---------------------------------------------------------------------------

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: vi.fn(),
  },
}));

import dns from "node:dns/promises";

describe("resolveHostname", () => {
  const mockLookup = vi.mocked(dns.lookup);

  beforeEach(() => {
    mockLookup.mockReset();
  });

  it("returns a public IP successfully", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as never);
    const result = await resolveHostname("example.com");
    expect(result).toEqual({ ip: "93.184.216.34", family: 4 });
  });

  it("throws when DNS resolves to IMDS address", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "169.254.169.254", family: 4 },
    ] as never);
    await expect(resolveHostname("evil.example.com")).rejects.toThrow(
      "instance URL not reachable",
    );
  });

  it("throws when DNS resolves to 127.0.0.1", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "127.0.0.1", family: 4 },
    ] as never);
    await expect(resolveHostname("localhost")).rejects.toThrow(
      "instance URL not reachable",
    );
  });

  it("throws when DNS resolves to 10.x", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "10.0.0.1", family: 4 },
    ] as never);
    await expect(resolveHostname("internal.corp")).rejects.toThrow(
      "instance URL not reachable",
    );
  });

  it("throws when DNS resolves to 192.168.x", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "192.168.1.1", family: 4 },
    ] as never);
    await expect(resolveHostname("router.local")).rejects.toThrow(
      "instance URL not reachable",
    );
  });

  it("throws when DNS resolves to IPv6 loopback ::1", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "::1", family: 6 },
    ] as never);
    await expect(resolveHostname("ip6-localhost")).rejects.toThrow(
      "instance URL not reachable",
    );
  });

  it("throws when DNS fails entirely", async () => {
    mockLookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(resolveHostname("nxdomain.invalid")).rejects.toThrow(
      "DNS resolution failed",
    );
  });

  it("throws when DNS returns empty array", async () => {
    mockLookup.mockResolvedValueOnce([] as never);
    await expect(resolveHostname("empty.example")).rejects.toThrow(
      "DNS returned no addresses",
    );
  });
});

// ---------------------------------------------------------------------------
// safeFetch — scheme guard (no real network)
// ---------------------------------------------------------------------------

describe("safeFetch scheme validation", () => {
  it("rejects http:// outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(
        safeFetch("http://api.postiz.com/public/v1/integrations"),
      ).rejects.toThrow("https required");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects unsupported schemes like ftp://", async () => {
    await expect(
      safeFetch("ftp://api.postiz.com/integrations"),
    ).rejects.toThrow("Unsupported scheme");
  });

  it("rejects malformed URLs", async () => {
    await expect(safeFetch("not-a-url")).rejects.toThrow("Invalid URL");
  });
});
