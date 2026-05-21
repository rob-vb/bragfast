import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";
import { getApiUrl } from "./http";

/**
 * Builds a reverse proxy that forwards `/api/*` requests from the local
 * Workspace to the bragfast backend, injecting the user's API key as a Bearer
 * token server-side.
 *
 * The token is set on the OUTBOUND request (`proxyReq`) only — it is never
 * written to the response returned to the browser, so the key cannot leak to
 * page scripts (AUTH-02 / T-03-06).
 *
 * Uses the v4 `on.proxyReq` namespace. The legacy top-level `proxyReq` option
 * (v1/v2) is a silent no-op in v4 and must not be used.
 */
export function createBackendProxy(apiKey: string): RequestHandler {
  return createProxyMiddleware({
    target: getApiUrl(),
    changeOrigin: true,
    // Mounted at the app root (not app.use("/api", ...)) so Express does not
    // strip the prefix; pathFilter scopes the proxy to /api/* and req.url keeps
    // the full path, so the backend receives /api/v1/... unchanged.
    pathFilter: "/api",
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      },
    },
  });
}
