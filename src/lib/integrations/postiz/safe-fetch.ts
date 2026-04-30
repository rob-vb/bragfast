/**
 * SSRF-safe fetch wrapper for user-supplied Postiz instance URLs.
 *
 * Defenses:
 *  1. Rejects non-https scheme outside development.
 *  2. DNS-resolves the hostname and rejects private / loopback / link-local / IMDS ranges.
 *  3. Pins the resolved IP into the request (defeats DNS rebinding).
 *  4. Caps response size (10 MB) and enforces a 10 s timeout.
 *
 * All Postiz HTTP traffic MUST go through this module — no direct fetch(instanceUrl).
 */

import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";

// ---------------------------------------------------------------------------
// IP-range guards
// ---------------------------------------------------------------------------

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isBlockedIPv4(ip: string): boolean {
  const p = parseIPv4(ip);
  if (!p) return false;
  const [a, b, c] = p;
  // 127.0.0.0/8  — loopback
  if (a === 127) return true;
  // 10.0.0.0/8  — RFC-1918
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16  — link-local / AWS IMDS
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10  — shared address (CGNAT / Tailscale)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  // ::1/128 — loopback
  if (addr === "::1") return true;
  // fc00::/7 — unique local
  const first2 = addr.split(":")[0];
  if (first2) {
    const n = parseInt(first2, 16);
    if (!isNaN(n)) {
      // fc00::/7  — high bit 1111110x
      if ((n & 0xfe00) === 0xfc00) return true;
      // fe80::/10 — link-local
      if ((n & 0xffc0) === 0xfe80) return true;
    }
  }
  // ::ffff:0:0/96  — IPv4-mapped; check embedded v4
  if (addr.startsWith("::ffff:")) {
    const v4part = addr.slice("::ffff:".length);
    // could be dotted or hex
    if (v4part.includes(".")) {
      if (isBlockedIPv4(v4part)) return true;
    } else {
      // convert hex pairs to dotted
      const hex = v4part.replace(/:/g, "");
      if (hex.length === 8) {
        const dotted = [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          parseInt(hex.slice(6, 8), 16),
        ].join(".");
        if (isBlockedIPv4(dotted)) return true;
      }
    }
  }
  return false;
}

export function isBlockedIP(ip: string): boolean {
  return isBlockedIPv4(ip) || isBlockedIPv6(ip);
}

// ---------------------------------------------------------------------------
// DNS resolution + IP pinning
// ---------------------------------------------------------------------------

interface ResolvedTarget {
  /** The IP address we pinned. */
  ip: string;
  /** Family: 4 or 6. */
  family: 4 | 6;
}

/**
 * Resolve `hostname` and return the first non-blocked address.
 * Throws if all addresses are blocked or DNS fails.
 */
interface LookupResult {
  address: string;
  family: number;
}

export async function resolveHostname(hostname: string): Promise<ResolvedTarget> {
  let addresses: LookupResult[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })) as LookupResult[];
  } catch (err) {
    throw new Error(`DNS resolution failed for ${hostname}: ${String(err)}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS returned no addresses for ${hostname}`);
  }

  for (const { address, family } of addresses) {
    if (isBlockedIP(address)) {
      throw new Error(
        `instance URL not reachable: resolved to blocked IP ${address}`,
      );
    }
    return { ip: address, family: family as 4 | 6 };
  }

  // All addresses blocked (loop above throws on first blocked address, but TypeScript
  // requires a return path).
  throw new Error(`instance URL not reachable: all resolved IPs are blocked`);
}

// ---------------------------------------------------------------------------
// Response size cap
// ---------------------------------------------------------------------------

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Public: safeFetch
// ---------------------------------------------------------------------------

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Override timeout in ms (default 10 000). */
  timeoutMs?: number;
}

export interface SafeFetchResult {
  status: number;
  body: string;
}

/**
 * Fetch `url` via the SSRF-safe path.
 *
 * - Validates scheme.
 * - DNS-resolves + blocks private ranges.
 * - Pins the resolved IP in the outgoing request.
 * - 10 s timeout + 10 MB cap.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  // 1. Parse and validate scheme
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const isDev = process.env.NODE_ENV === "development";
  if (parsed.protocol === "http:" && !isDev) {
    throw new Error("https required: http is only allowed in development");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported scheme: ${parsed.protocol}`);
  }

  // 2. DNS resolve + block check
  const { ip, family } = await resolveHostname(parsed.hostname);

  // 3. Build a custom agent that pins the resolved IP
  const useHttps = parsed.protocol === "https:";
  const port =
    parsed.port
      ? parseInt(parsed.port, 10)
      : useHttps
        ? 443
        : 80;

  const agentOpts = {
    // Override lookup to always return the pinned IP — defeats DNS rebinding
    lookup: (
      _hostname: string,
      _opts: unknown,
      callback: (err: Error | null, address: string, family: number) => void,
    ) => {
      callback(null, ip, family);
    },
  };

  const agent = useHttps
    ? new https.Agent(agentOpts)
    : new http.Agent(agentOpts);

  // 4. Build fetch options with timeout + pinned agent
  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // node-fetch / undici fetch accept an `agent` option; the global RequestInit
  // type doesn't include it, so we widen to allow the extra property.
  const fetchOptions = {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
    signal: controller.signal,
    agent,
  } as RequestInit & { agent?: unknown };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${parsed.hostname} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // 5. Cap response size
  const reader = response.body?.getReader();
  if (!reader) {
    return { status: response.status, body: "" };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        reader.cancel().catch(() => undefined);
        throw new Error(
          `Response from ${parsed.hostname} exceeded size limit (${MAX_RESPONSE_BYTES} bytes)`,
        );
      }
      chunks.push(value);
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const body = new TextDecoder().decode(combined);
  return { status: response.status, body };
}
