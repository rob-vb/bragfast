import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackendProxy } from "../proxy";

// Mock http-proxy-middleware so tests don't make real network calls.
// The key behavior we're testing is that createBackendProxy configures
// the `on.proxyReq` callback to inject the Authorization header.
vi.mock("http-proxy-middleware", () => {
  return {
    createProxyMiddleware: vi.fn((options: {
      target: string;
      changeOrigin?: boolean;
      on?: {
        proxyReq?: (proxyReq: unknown, req?: unknown, res?: unknown) => void;
      };
    }) => {
      // Store the options so tests can inspect them
      (createProxyMiddleware as { _lastOptions?: typeof options })._lastOptions = options;
      // Return a no-op middleware
      return (_req: unknown, _res: unknown, next: () => void) => next();
    }),
  };
});

import { createProxyMiddleware } from "http-proxy-middleware";

describe("createBackendProxy (AUTH-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Bearer token injection", () => {
    it("injects 'Authorization: Bearer bf_test_key_1234' into proxyReq via setHeader", () => {
      const apiKey = "bf_test_key_1234";
      createBackendProxy(apiKey);

      expect(createProxyMiddleware).toHaveBeenCalledOnce();

      const options = (createProxyMiddleware as { _lastOptions?: Parameters<typeof createProxyMiddleware>[0] })
        ._lastOptions;

      expect(options).toBeDefined();
      expect(options?.on?.proxyReq).toBeDefined();

      // Simulate the proxyReq callback being invoked with a mock proxyReq object
      const mockProxyReq = {
        setHeader: vi.fn(),
        getHeader: vi.fn(() => undefined),
        removeHeader: vi.fn(),
      };

      options!.on!.proxyReq!(mockProxyReq as never, undefined as never, undefined as never, undefined as never);

      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(
        "Authorization",
        `Bearer ${apiKey}`
      );
    });

    it("injects the correct Bearer token for any provided api key", () => {
      const apiKey = "bf_another_key_5678";
      createBackendProxy(apiKey);

      const options = (createProxyMiddleware as { _lastOptions?: Parameters<typeof createProxyMiddleware>[0] })
        ._lastOptions;

      const mockProxyReq = { setHeader: vi.fn(), getHeader: vi.fn(), removeHeader: vi.fn() };
      options!.on!.proxyReq!(mockProxyReq as never, undefined as never, undefined as never, undefined as never);

      expect(mockProxyReq.setHeader).toHaveBeenCalledWith(
        "Authorization",
        `Bearer ${apiKey}`
      );
    });
  });

  describe("Bearer token not leaked in response (Information Disclosure mitigation)", () => {
    it("does not set Authorization header on the response object (token stays in proxyReq only)", () => {
      const apiKey = "bf_test_key_1234";
      createBackendProxy(apiKey);

      const options = (createProxyMiddleware as { _lastOptions?: Parameters<typeof createProxyMiddleware>[0] })
        ._lastOptions;

      // proxyReq (upstream request) receives the header
      const mockProxyReq = { setHeader: vi.fn(), getHeader: vi.fn(), removeHeader: vi.fn() };
      // The response object sent to the caller — Authorization must NOT be set here
      const mockRes = { setHeader: vi.fn(), removeHeader: vi.fn() };

      options!.on!.proxyReq!(mockProxyReq as never, undefined as never, mockRes as never, undefined as never);

      // The Authorization header must be set on proxyReq
      expect(mockProxyReq.setHeader).toHaveBeenCalledWith("Authorization", expect.stringContaining("Bearer"));

      // The Authorization header must NOT be set on the outgoing response
      expect(mockRes.setHeader).not.toHaveBeenCalledWith("Authorization", expect.anything());
    });
  });
});
