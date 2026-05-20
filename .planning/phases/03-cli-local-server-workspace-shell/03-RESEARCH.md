# Phase 3: CLI Local Server + Workspace Shell - Research

**Researched:** 2026-05-20
**Domain:** Node.js local HTTP server, Express 5, Vite SPA, authenticated reverse proxy, git context extraction
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Workspace SPA tech — LOCKED:** Vite standalone SPA in a new `packages/workspace` package. Built to static assets (`packages/workspace/dist`); the CLI Express server serves them via static middleware. No Next.js runtime runs locally. The existing Next.js app remains the thin backend only. Components are ported/shared from `src/` as needed; do not depend on Next.js server features in the SPA.
- **Local server:** Express server bound to `127.0.0.1` (loopback only — never `0.0.0.0`). Default port with automatic next-open-port fallback when occupied (CLI-06). Print the resolved `http://127.0.0.1:<PORT>` URL as a fallback even when the browser auto-opens (CLI-05).
- **Origin-locking (AUTH-02):** The local server accepts requests only from the Workspace origin (`http://127.0.0.1:<PORT>`); requests from any other origin are rejected (401 or CORS block). The stored Bearer credential (from Phase 2, `~/.brag/credentials.json`) is injected server-side by the proxy — never exposed to the browser.
- **Repo context (CLI-07):** `/api/repo-context` returns current repo git tag, commit SHA, package name, and package version from the user's cwd repo. No AI. Handle non-git / no-package.json gracefully.

### Claude's Discretion
- Port range / default port number, port-scan strategy.
- Proxy library vs hand-rolled fetch passthrough.
- Browser-open mechanism (reuse Phase 2 approach if present).
- SPA shell scaffolding details (router, minimal landing view).

### Deferred Ideas (OUT OF SCOPE)
- Workspace editor + slot filling — Phase 4.
- Image/video render wiring — Phases 5/6.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-05 | After login, CLI auto-opens browser to the Workspace and prints URL as fallback | `open` package already in `packages/cli`; `server.listen` callback provides resolved port |
| CLI-06 | CLI picks an open localhost port automatically when the default is taken | `get-port` v7 pure ESM; `getPort({ port: N })` returns preferred or next available |
| CLI-07 | CLI reads repo context (latest commit/tag, package.json version) to prefill copy field; no AI | `child_process.execSync` wrapped in try/catch for graceful non-git fallback |
| AUTH-02 | Workspace browser communicates only with the local CLI; local server is locked to Workspace origin and rejects other callers | `cors` middleware with exact dynamic-origin match + Host header guard |
</phase_requirements>

---

## Summary

Phase 3 builds the bridge between the Phase 2 CLI binary (`packages/cli`) and the browser Workspace: a local Express 5 HTTP server that serves a Vite-built SPA, proxies authenticated API requests to the hosted Next.js/Convex backend by injecting the stored `bf_` Bearer credential server-side, and exposes a `/api/repo-context` endpoint that reads the user's cwd repo without any AI involvement.

The key technical insight for the **Workspace SPA distribution** is that `packages/workspace/dist/` must be bundled into the published `bragfast` npm package via its `files` array. The CLI server resolves the assets directory relative to the CLI's own `dist/index.js` using `fileURLToPath(new URL('../workspace-dist', import.meta.url))` (ESM) or copies the built workspace assets into a `workspace-dist/` sibling folder during the CLI's `tsup` `onSuccess` hook. This is the same pattern the `render-core` package uses for fonts.

The **origin-locking** strategy is layered: (1) Express binds to `127.0.0.1` so the TCP port is unreachable from the network, (2) `cors` middleware matches only `http://127.0.0.1:<PORT>` as the allowed origin, (3) a manual middleware checks the `Host` header equals `127.0.0.1:<PORT>` and the `Origin` header equals `http://127.0.0.1:<PORT>` — requests from any browser tab at a different origin are blocked at the CORS preflight or rejected 401 on direct access. The Bearer credential never leaves the server process.

**Primary recommendation:** Use Express 5 + `get-port` + `http-proxy-middleware` v4 + `cors` v2 for the server; scaffold `packages/workspace` as a Vite 8 `react-ts` SPA; copy its `dist/` into the CLI package at build time via the `tsup` `onSuccess` hook — matching the project's existing `render-core` font-copy pattern.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Local HTTP server (port bind, lifecycle) | CLI process | — | Server runs in the `bragfast` Node.js process; user's machine only |
| Static SPA serving | CLI process (Express `express.static`) | — | `packages/workspace/dist` served at `/`; no CDN involved |
| Backend API proxy (auth injection) | CLI process (server-side middleware) | — | Bearer token injected in `proxyReq` callback; never sent to browser |
| Origin validation / CORS enforcement | CLI process (Express middleware) | — | Runs before every route; `127.0.0.1` loopback + cors origin check |
| `/api/repo-context` extraction | CLI process | — | Reads user's cwd via `child_process.execSync`; no network calls |
| Browser auto-open | CLI process (`open` package) | — | Already used in Phase 2 `auth.ts`; reuse exact same mechanism |
| Workspace SPA (shell UI) | Browser / Client | — | Vite React SPA; only talks to `http://127.0.0.1:<PORT>` |
| Hosted backend (Convex + auth) | API / Backend | — | Not modified in Phase 3; receives proxied requests with injected Bearer |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | `5.2.1` | HTTP server, static middleware, routing | [VERIFIED: npm registry] industry standard; v5 stable since Dec 2025; already implied by project stack |
| `get-port` | `7.2.0` | Automatic available-port detection | [VERIFIED: npm registry] Sindre Sorhus maintained; pure ESM matches CLI module type; `getPort({ port: N })` gives preferred-or-next |
| `http-proxy-middleware` | `4.0.0` | Authenticated reverse proxy to Next.js/Convex backend | [VERIFIED: npm registry] canonical Express proxy library; `on.proxyReq` hook injects Authorization header |
| `cors` | `2.8.6` | Origin-locking CORS middleware | [VERIFIED: npm registry] expressjs org maintained; dynamic `origin` callback rejects non-matching origins |
| `vite` | `8.0.13` | Build tool for `packages/workspace` SPA | [VERIFIED: npm registry] vitejs org; current major; already a devDependency in root |
| `@vitejs/plugin-react` | `6.0.2` | React fast-refresh and JSX for Vite | [VERIFIED: npm registry] official vitejs plugin; compatible with Vite 8 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/express` | `5.0.6` | TypeScript types for Express 5 | Always — CLI is TypeScript |
| `@types/cors` | `2.8.19` | TypeScript types for cors middleware | Always — CLI is TypeScript |
| `open` | `11.0.0` | Browser auto-open | Already in `packages/cli`; reuse — no new install needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `http-proxy-middleware` | Hand-rolled `fetch` passthrough | `http-proxy-middleware` handles streaming, error recovery, connection reuse; hand-rolled misses binary responses and chunked streams |
| `get-port` | Manual port scan with `net.createServer` try/catch loop | `get-port` handles race conditions and OS-level port reservation atomically; the naive loop has TOCTOU bugs |
| `cors` package | Manual `Access-Control-Allow-*` header setting | `cors` handles preflight OPTIONS correctly; manual header code misses `Vary`, credential handling, and method negotiation |

**Installation (in `packages/cli`):**
```bash
npm install express get-port http-proxy-middleware cors --workspace=packages/cli
npm install --save-dev @types/express @types/cors --workspace=packages/cli
```

**Installation (in `packages/workspace` — new package):**
```bash
npm create vite@latest packages/workspace -- --template react-ts
# Then in packages/workspace:
npm install
```

**Version verification results:**
- `express` 5.2.1 — published 2025-12-01 [VERIFIED: npm registry]
- `get-port` 7.2.0 — published 2026-03-22 [VERIFIED: npm registry]
- `http-proxy-middleware` 4.0.0 — published 2026-05-05 [VERIFIED: npm registry]
- `cors` 2.8.6 — published 2026-01-22 [VERIFIED: npm registry]
- `vite` 8.0.13 — first released 2020; current major 8 [VERIFIED: npm registry]
- `@vitejs/plugin-react` 6.0.2 — published 2026-05-14 [VERIFIED: npm registry]

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged [ASSUMED] for origin provenance and the planner must gate each install behind a `checkpoint:human-verify` task. Registry existence and age/history are verified.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `express` | npm | 15+ yrs (2010), 318 versions | github.com/expressjs/express | [ASSUMED] | Approved — expressjs org, 5 maintainers |
| `get-port` | npm | 12+ yrs (2014), 20 versions | github.com/sindresorhus/get-port | [ASSUMED] | Approved — Sindre Sorhus |
| `http-proxy-middleware` | npm | 10+ yrs (2015), 99 versions | github.com/chimurai/http-proxy-middleware | [ASSUMED] | Approved — known canonical proxy lib |
| `cors` | npm | 13+ yrs (2013), 35 versions | github.com/expressjs/cors | [ASSUMED] | Approved — expressjs org |
| `vite` | npm | 6+ yrs (2020); major 8 current | github.com/vitejs/vite | [ASSUMED] | Approved — vitejs org, 2 maintainers |
| `@vitejs/plugin-react` | npm | published 2026-05-14, vitejs org | github.com/vitejs/vite-plugin-react | [ASSUMED] | Approved — official vitejs plugin |
| `@types/express` | npm | DefinitelyTyped | github.com/DefinitelyTyped | [ASSUMED] | Approved — DefinitelyTyped standard |
| `@types/cors` | npm | DefinitelyTyped | github.com/DefinitelyTyped | [ASSUMED] | Approved — DefinitelyTyped standard |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (all long-lived, well-maintained packages from known organizations)

*slopcheck was unavailable at research time — all packages above are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

---

## Architecture Patterns

### System Architecture Diagram

```
User's terminal
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  bragfast CLI process (packages/cli/dist/index.js)      │
│                                                         │
│  1. readCredentials() ← ~/.brag/credentials.json        │
│  2. getPort({ port: 3421 }) ← OS port scan              │
│  3. Express app bound to 127.0.0.1:<PORT>               │
│                                                         │
│  ┌──────────────────────────────────────────────┐       │
│  │  Express middleware stack (per-request)      │       │
│  │                                              │       │
│  │  [1] Host header guard (rejects spoofed)     │       │
│  │  [2] cors({ origin: 'http://127.0.0.1:PORT' })│      │
│  │  [3] Route dispatch:                         │       │
│  │      GET /api/repo-context → git exec        │       │
│  │      /api/* → http-proxy-middleware           │       │
│  │               (injects Authorization: Bearer) │       │
│  │      /* → express.static(workspace-dist/)    │       │
│  │           + SPA fallback (sendFile index.html)│       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│  4. open('http://127.0.0.1:<PORT>')                     │
│  5. stdout.write('http://127.0.0.1:<PORT>\n')           │
└─────────────────────────────────────────────────────────┘
           │                         │
           ▼                         ▼
    Browser (Workspace SPA)    bragfast.com backend
    http://127.0.0.1:<PORT>    (Next.js + Convex)
    ─────────────────────      ─────────────────────
    fetch('/api/...')  ──────► proxy forwards with
                               Authorization: Bearer bf_xxx
    fetch('/api/repo-context')
    ──► returns { tag, sha,
                  name, version }
```

### Recommended Project Structure

```
packages/
├── cli/
│   ├── src/
│   │   ├── index.ts          # extend: `brag` default action starts server
│   │   ├── server.ts         # NEW: startServer(credentials) → { port, close }
│   │   ├── proxy.ts          # NEW: createProxyMiddleware wrapper
│   │   ├── repo-context.ts   # NEW: getRepoContext(cwd) → RepoContext
│   │   ├── auth.ts           # Phase 2 — unchanged
│   │   ├── credentials.ts    # Phase 2 — unchanged
│   │   └── http.ts           # Phase 2 — unchanged
│   ├── tsup.config.ts        # extend onSuccess: copy workspace-dist/
│   └── package.json          # add: express, get-port, http-proxy-middleware, cors
├── workspace/                # NEW — `npm create vite@latest` react-ts
│   ├── src/
│   │   ├── main.tsx          # React entry
│   │   ├── App.tsx           # Minimal shell: fetch /api/repo-context, render
│   │   └── api.ts            # client helpers: fetch with relative URLs
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts        # base: '/', build.outDir: 'dist'
│   └── package.json
└── render-core/              # Phase 1 — unchanged
```

### Pattern 1: Express Server Lifecycle (bound to loopback)

**What:** Start Express on 127.0.0.1, find a free port, print URL, open browser, return a stop function.
**When to use:** In `packages/cli/src/server.ts`, called from `index.ts` default action.

```typescript
// Source: Node.js net.Server docs + expressjs.com/en/5x/api.html
import express from "express";
import getPort from "get-port";
import { createServer } from "http";
import type { Credentials } from "./credentials";

const DEFAULT_PORT = 3421;

export interface ServerHandle {
  port: number;
  close: () => Promise<void>;
}

export async function startServer(credentials: Credentials): Promise<ServerHandle> {
  const port = await getPort({ port: DEFAULT_PORT });
  const app = buildApp(credentials, port);
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });

  const close = () =>
    new Promise<void>((resolve) => server.close(() => resolve()));

  return { port, close };
}
```

### Pattern 2: CORS Origin-Locking + Host Guard

**What:** Reject any browser request whose `Origin` header does not exactly match `http://127.0.0.1:<PORT>`. A second guard rejects requests whose `Host` header is wrong (catches reverse-proxy abuse).
**When to use:** First middleware in the Express stack, before all routes.

```typescript
// Source: expressjs.com/en/resources/middleware/cors/
import cors from "cors";
import type { RequestHandler } from "express";

export function originLockMiddleware(port: number): RequestHandler[] {
  const allowedOrigin = `http://127.0.0.1:${port}`;

  // Guard 1: reject wrong Host header (catches transparent proxies / DNS rebinding)
  const hostGuard: RequestHandler = (req, res, next) => {
    const host = req.headers["host"];
    if (host && host !== `127.0.0.1:${port}`) {
      res.status(401).json({ error: "forbidden" });
      return;
    }
    next();
  };

  // Guard 2: CORS — rejects cross-origin browser requests at preflight
  const corsMiddleware = cors({
    origin: (incoming, callback) => {
      // Allow same-origin (no Origin header) and exact match
      if (!incoming || incoming === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("CORS: forbidden origin"));
      }
    },
    credentials: false,
  });

  return [hostGuard, corsMiddleware];
}
```

### Pattern 3: Authenticated Proxy to Backend

**What:** Forward `/api/*` requests (except `/api/repo-context`) to `BRAG_API_URL`, injecting the stored Bearer token in the `Authorization` header.
**When to use:** In `packages/cli/src/proxy.ts`.

```typescript
// Source: github.com/chimurai/http-proxy-middleware README
import { createProxyMiddleware } from "http-proxy-middleware";
import { getApiUrl } from "./http";

export function createBackendProxy(apiKey: string) {
  return createProxyMiddleware({
    target: getApiUrl(),
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq) => {
        // Inject credential server-side — never sent to the browser
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      },
    },
  });
}
```

### Pattern 4: SPA Static Serving with Fallback

**What:** Serve the Vite-built `workspace-dist/` directory; for any non-API route that doesn't match a static file, serve `index.html` so the client-side router handles navigation.
**When to use:** Last handler block in Express, after `/api/*` routes.

```typescript
// Source: expressjs.com/en/5x/api.html#express.static + SPA routing pattern
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import type { Application } from "express";

function getSpaDir(): string {
  // ESM: __dirname equivalent
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  return path.join(__dirname, "workspace-dist");
}

export function mountSpa(app: Application): void {
  const spaDir = getSpaDir();
  app.use(express.static(spaDir));
  // SPA fallback: all unmatched GET requests serve index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(spaDir, "index.html"));
  });
}
```

### Pattern 5: Repo Context Extraction

**What:** `execSync` three git commands + `readFileSync` for package.json; wrap each in try/catch so non-git directories return `null` fields rather than throwing.
**When to use:** In `packages/cli/src/repo-context.ts`, called from the `/api/repo-context` handler.

```typescript
// Source: nodejs.org/api/child_process.html
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

export interface RepoContext {
  tag: string | null;
  sha: string | null;
  name: string | null;
  version: string | null;
}

export function getRepoContext(cwd: string): RepoContext {
  const exec = (cmd: string): string | null => {
    try {
      return execSync(cmd, { cwd, stdio: "pipe" }).toString().trim() || null;
    } catch {
      return null;
    }
  };

  const tag = exec("git describe --tags --abbrev=0");
  const sha = exec("git rev-parse --short HEAD");

  let name: string | null = null;
  let version: string | null = null;
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(cwd, "package.json"), "utf8")
    ) as { name?: string; version?: string };
    name = pkg.name ?? null;
    version = pkg.version ?? null;
  } catch {
    // non-npm project — return nulls
  }

  return { tag, sha, name, version };
}
```

### Pattern 6: CLI tsup onSuccess — Copy Workspace Assets

**What:** After the workspace package builds its `dist/`, the CLI's `tsup` `onSuccess` hook copies the entire directory into `packages/cli/dist/workspace-dist/` so it's included in the published npm package. Mirrors the existing `render-core` font-copy pattern.
**When to use:** `packages/cli/tsup.config.ts` extension.

```typescript
// Source: existing packages/render-core/tsup.config.ts pattern
import { cpSync, mkdirSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node20",
  async onSuccess() {
    const { chmodSync } = await import("fs");
    chmodSync("dist/index.js", 0o755);
    // Copy Workspace SPA assets into CLI dist
    mkdirSync("dist/workspace-dist", { recursive: true });
    cpSync("../workspace/dist", "dist/workspace-dist", { recursive: true });
  },
});
```

**Prerequisite:** `packages/workspace` must build before `packages/cli`. Update root `package.json` build script:
```json
"cli:build": "npm run build --workspace=packages/workspace && npm run build --workspace=packages/cli"
```

### Pattern 7: Workspace Vite Config

**What:** Minimal `vite.config.ts` for `packages/workspace` — base `/`, output to `dist/`, React plugin.

```typescript
// Source: vite.dev/guide/ + vite.dev/config/build-options
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
```

### Pattern 8: CLI `index.ts` Default Action Extension

**What:** Replace the Phase 2 placeholder with real server start, browser open, and URL print.

```typescript
// Extends packages/cli/src/index.ts
.action(async () => {
  const credentials = await readCredentials();
  if (!credentials) {
    await login();
    return;
  }
  const { port, close } = await startServer(credentials);
  const url = `http://127.0.0.1:${port}`;
  process.stdout.write(`Workspace: ${url}\n`);
  await open(url).catch(() => undefined); // fallback: URL already printed
  process.on("SIGINT", async () => { await close(); process.exit(0); });
  process.on("SIGTERM", async () => { await close(); process.exit(0); });
});
```

### Anti-Patterns to Avoid

- **Binding to `0.0.0.0`:** Makes the local server reachable from the LAN. Always use `127.0.0.1` explicitly. [CITED: CONTEXT.md locked decision]
- **CORS wildcard `origin: '*'`:** Would allow any origin. Always use a dynamic callback with exact port match.
- **Sending Bearer token in the browser response or a `<meta>` tag:** The token must never leave the server process; the SPA communicates with the local server using same-origin requests only.
- **ESM `__dirname` usage:** `packages/cli` uses `"type": "module"`. Use `fileURLToPath(new URL(".", import.meta.url))` — `__dirname` is not defined in ESM.
- **Hardcoded port without fallback:** The default port may be occupied on a developer's machine. Always call `getPort({ port: DEFAULT })` before `listen`.
- **`cpSync` before workspace is built:** The `tsup` `onSuccess` copy will silently produce an empty `workspace-dist/` if `packages/workspace` hasn't been built first. Build order matters.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Port availability check | `net.createServer` try/catch loop | `get-port` | TOCTOU race; `get-port` atomically reserves the port |
| Reverse proxy with header injection | `fetch` passthrough + `pipe(res)` | `http-proxy-middleware` | Streaming responses, binary data, WebSocket upgrades, error recovery — all handled |
| CORS preflight handling | Manual `Access-Control-*` headers | `cors` package | Preflight OPTIONS, `Vary`, credential negotiation; easy to miss edge cases |
| Browser open with fallback | `child_process.spawn('open', ...)` | `open` (already installed) | Cross-platform (macOS/Linux/Win) + already in `packages/cli` |

**Key insight:** The proxy, CORS, and port-selection problems each have well-known failure modes (streaming breaks, TOCTOU race, missing preflight) that the standard libraries handle correctly. Do not reimplement.

---

## Common Pitfalls

### Pitfall 1: ESM `__dirname` in tsup-bundled CLI

**What goes wrong:** `__dirname` throws `ReferenceError` in the compiled ESM output of `packages/cli`. The `getSpaDir()` function fails to locate `workspace-dist/`.
**Why it happens:** `packages/cli` uses `"type": "module"` and tsup targets ESM. `__dirname` is a CommonJS-only global.
**How to avoid:** Use `fileURLToPath(new URL(".", import.meta.url))` in all source files. Verify with `tsup`'s `target: "node20"` (import.meta is supported).
**Warning signs:** `ReferenceError: __dirname is not defined` at runtime; static files return 404.

### Pitfall 2: Workspace Build Order

**What goes wrong:** `packages/cli` builds successfully but `dist/workspace-dist/` is empty or missing; the server starts but serves a blank page.
**Why it happens:** `tsup`'s `onSuccess` runs `cpSync("../workspace/dist", ...)` before `packages/workspace` has been built.
**How to avoid:** Root `build` script must build `packages/workspace` before `packages/cli`. Add workspace to the build order in root `package.json`.
**Warning signs:** `dist/workspace-dist/` exists but is empty; browser gets a 200 on `/` but with zero-byte HTML.

### Pitfall 3: CORS Double-Blocking on Localhost

**What goes wrong:** The SPA's fetch requests fail even though they originate from the same server, because the `Origin` header is present on same-site requests in some browsers.
**Why it happens:** Chrome sends `Origin: http://127.0.0.1:<PORT>` on cross-origin fetches — but this IS the same origin; the CORS middleware should pass these through. Problems arise if the port in the origin callback doesn't match the actual listening port.
**How to avoid:** Build the `cors` config after `getPort()` resolves, using the actual port value. Never build the CORS config at module load time with a hardcoded port.
**Warning signs:** Browser console shows `CORS error` on `/api/repo-context`; Network tab shows 401 or preflight failure even from the Workspace page.

### Pitfall 4: `http-proxy-middleware` v4 Breaking Change

**What goes wrong:** Code written against v1/v2 API (`proxyRes` option, not `on.proxyRes`) silently does nothing in v4.
**Why it happens:** v3/v4 moved all event hooks under the `on` namespace (`on.proxyReq`, `on.proxyRes`, `on.error`).
**How to avoid:** Use the `on.proxyReq` callback (shown in Pattern 3 above) — not the legacy top-level `proxyReq` option. [CITED: github.com/chimurai/http-proxy-middleware README]
**Warning signs:** Authorization header not present on proxied requests; backend returns 401.

### Pitfall 5: Graceful Shutdown Leaves Port Occupied

**What goes wrong:** User Ctrl+C's the CLI; the next run can't bind the same port because the TCP socket is in TIME_WAIT.
**Why it happens:** `server.close()` stops accepting new connections but doesn't destroy existing keep-alive connections.
**How to avoid:** Call `server.closeAllConnections()` (Node 18.2+) before `server.close()` in the SIGINT handler. With Node 22 (project requirement is >=20), this is available. Alternatively, use `get-port` to find the next available port on retry.
**Warning signs:** `EADDRINUSE` on the second invocation within 60 seconds.

### Pitfall 6: Non-Git CWD Crashes `repo-context`

**What goes wrong:** `getRepoContext()` throws because `git describe` exits non-zero when there are no tags, or `git rev-parse` fails when the directory isn't a git repo.
**Why it happens:** `execSync` throws on non-zero exit by default.
**How to avoid:** Wrap every `execSync` call in its own try/catch (Pattern 5); return `null` for each field individually. A repo with no tags should still return a valid `sha`; a non-git directory returns `{ tag: null, sha: null, name: null, version: null }`.
**Warning signs:** `/api/repo-context` returns 500 when run outside a git repo.

---

## Code Examples

Verified patterns from official sources are in the Architecture Patterns section above. Additional quick references:

### get-port Preferred Port with Fallback
```typescript
// Source: github.com/sindresorhus/get-port README
import getPort from "get-port";
const port = await getPort({ port: 3421 });
// Returns 3421 if free, or next available port otherwise
```

### Express `server.listen` with Loopback
```typescript
// Source: Node.js net.Server docs (underlying Express)
// Signature: server.listen(port, host, callback)
server.listen(port, "127.0.0.1", () => {
  console.log(`Listening on http://127.0.0.1:${port}`);
});
```

### Express Graceful Shutdown (Node 22)
```typescript
// Source: expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
process.on("SIGTERM", () => {
  server.closeAllConnections(); // Node 18.2+; project requires >=20
  server.close(() => process.exit(0));
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `http-proxy-middleware` v1 `proxyReq` top-level option | v4 `on.proxyReq` event namespace | v3 (2023) | All hook options moved under `on: {}` — old code silently does nothing |
| `__dirname` in Node modules | `fileURLToPath(new URL(".", import.meta.url))` | Node 12 ESM | CJS globals unavailable in ESM; must use import.meta |
| `server.close()` only | `server.closeAllConnections()` + `server.close()` | Node 18.2 (2022) | Without `closeAllConnections`, keep-alive sockets hold the port open |
| Vite 5/6 `base` defaults | Vite 8 `base: "/"` is still the default | Vite 8 (2025) | No change needed; default works for Express-served SPA |

**Deprecated/outdated:**
- `detect-port` npm package: 2.1.0, single maintainer, older approach. `get-port` by Sindre Sorhus is the current standard and is pure ESM — use `get-port` instead. [ASSUMED]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `detect-port` is inferior to `get-port` for this use case | Standard Stack Alternatives | Minor — either works; `get-port` is still correct choice |
| A2 | Port 3421 as the default port (Claude's discretion) | Architecture Patterns | Low — any port in 3000-9999 works; change is trivial |
| A3 | All package slopcheck verdicts are [OK] based on age/maintainer reputation | Package Legitimacy Audit | Low — all are well-known packages with years of history |

---

## Open Questions

1. **Workspace SPA CSS/Tailwind**
   - What we know: Root package has Tailwind v4 as devDependency; Workspace SPA will need styling.
   - What's unclear: Should `packages/workspace` install its own Tailwind, or share from root? Vite + Tailwind v4 needs `@tailwindcss/vite` plugin.
   - Recommendation: Install `tailwindcss` + `@tailwindcss/vite` in `packages/workspace` directly — packages should be self-contained per project pattern.

2. **Component sharing between Next.js app and Workspace SPA**
   - What we know: CONTEXT.md says "components are ported/shared from `src/` as needed".
   - What's unclear: Phase 3 only needs a minimal shell — no shared components needed yet. Phase 4 will need to access design tokens.
   - Recommendation: Defer component sharing architecture to Phase 4; Phase 3 SPA shell is standalone.

3. **Vite dev server vs pre-built assets during workspace development**
   - What we know: The CLI serves pre-built `dist/` assets; Vite's dev server is separate.
   - What's unclear: Developer workflow when iterating on the SPA — run `vite dev` directly? Or re-build on every change?
   - Recommendation: `packages/workspace` dev should run `npm run dev` (Vite dev server) directly at port `5173` for fast iteration. The CLI integration is tested with built assets (`npm run build && brag`). No special wiring needed for Phase 3.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 20 | CLI runtime (existing requirement) | Yes | v22.20.0 | — |
| npm | Package install | Yes | 11.10.1 | — |
| git | `getRepoContext()` `execSync` | Yes | 2.50.1 | Returns null fields gracefully |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** git (`getRepoContext` returns all-null if absent — this is handled in code, not a blocker).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.x (already configured in `packages/cli/vitest.config.ts`) |
| Config file | `packages/cli/vitest.config.ts` |
| Quick run command | `npm run test --workspace=packages/cli` |
| Full suite command | `npm run test --workspace=packages/cli && npm run test --workspace=packages/workspace` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-05 | Browser is opened with correct URL; URL is printed to stdout | unit | `npx vitest run --workspace=packages/cli src/__tests__/server.test.ts` | ❌ Wave 0 |
| CLI-06 | When default port is occupied, server binds to the next free port | unit (mock `getPort`) | `npx vitest run --workspace=packages/cli src/__tests__/server.test.ts` | ❌ Wave 0 |
| CLI-07 | `/api/repo-context` returns tag/sha/name/version from a real git repo; returns nulls for non-git dir | unit + fixture | `npx vitest run --workspace=packages/cli src/__tests__/repo-context.test.ts` | ❌ Wave 0 |
| AUTH-02 | Request from wrong origin receives CORS block; request from correct origin succeeds | integration (supertest) | `npx vitest run --workspace=packages/cli src/__tests__/origin-lock.test.ts` | ❌ Wave 0 |
| AUTH-02 | Bearer token is injected into proxied requests and never present in browser responses | unit (mock proxy target) | `npx vitest run --workspace=packages/cli src/__tests__/proxy.test.ts` | ❌ Wave 0 |
| CLI-05 | SPA `index.html` served at `/`; non-API unknown path serves `index.html` (SPA fallback) | integration (supertest) | `npx vitest run --workspace=packages/cli src/__tests__/server.test.ts` | ❌ Wave 0 |

### Validation Scenarios

**Origin rejection (AUTH-02):**
```typescript
// Wrong-origin request must be rejected
const res = await request(app)
  .get("/api/repo-context")
  .set("Origin", "http://evil.com")
  .set("Host", "127.0.0.1:3421");
expect(res.status).toBe(401); // or check CORS header absence
```

**Port conflict (CLI-06):**
```typescript
// Occupy the default port, then start server — verify different port used
const blocker = net.createServer();
await new Promise(r => blocker.listen(3421, '127.0.0.1', r));
const { port } = await startServer(credentials);
expect(port).not.toBe(3421);
blocker.close();
```

**Non-git repo context (CLI-07):**
```typescript
// Run in a temp directory with no .git
const ctx = getRepoContext(os.tmpdir());
expect(ctx).toEqual({ tag: null, sha: null, name: null, version: null });
```

### Sampling Rate

- **Per task commit:** `npm run test --workspace=packages/cli`
- **Per wave merge:** Full suite across both packages
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/cli/src/__tests__/server.test.ts` — covers CLI-05, CLI-06, SPA fallback
- [ ] `packages/cli/src/__tests__/origin-lock.test.ts` — covers AUTH-02 origin rejection
- [ ] `packages/cli/src/__tests__/proxy.test.ts` — covers AUTH-02 token injection
- [ ] `packages/cli/src/__tests__/repo-context.test.ts` — covers CLI-07
- [ ] `packages/workspace/src/__tests__/` — covers SPA builds and fetches `/api/repo-context`
- [ ] Install `supertest` + `@types/supertest` as devDependency in `packages/cli` for integration tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partial | Bearer token stored at rest (chmod 600) — Phase 2; injected server-side in Phase 3 |
| V3 Session Management | No | No sessions; stateless Bearer per request |
| V4 Access Control | Yes | Origin-lock middleware + Host header guard |
| V5 Input Validation | Yes | `/api/repo-context` input is `process.cwd()` — no user-controlled input to sanitize |
| V6 Cryptography | No | Not applicable in Phase 3 |

### Known Threat Patterns for Local HTTP Server

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DNS rebinding (attacker's site resolves to 127.0.0.1) | Spoofing | Host header guard: reject requests whose `Host` ≠ `127.0.0.1:<PORT>` |
| Cross-origin tab (different browser tab at unrelated URL) | Spoofing | CORS `origin` callback rejects non-matching Origin header |
| Credential exfiltration via proxied response headers | Information Disclosure | `http-proxy-middleware` never forwards Authorization response headers; Bearer only goes in `proxyReq` |
| Port scan from LAN attacker | Elevation of Privilege | TCP bind to `127.0.0.1` only — unreachable from network |

**DNS rebinding rationale:** Even though the server is loopback-only at the TCP level, a DNS rebinding attack can direct a browser to `127.0.0.1` with a crafted `Host` header. The Host header guard (Pattern 2) blocks this. [CITED: OWASP DNS Rebinding mitigation pattern]

---

## Sources

### Primary (HIGH confidence)
- [expressjs.com/en/5x/api.html](https://expressjs.com/en/5x/api.html) — Express 5 API: `app.listen`, `express.static`, middleware
- [expressjs.com/en/advanced/healthcheck-graceful-shutdown.html](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html) — Graceful shutdown pattern
- [vite.dev/guide/](https://vite.dev/guide/) — Vite SPA scaffold, `base` option, `build.outDir`
- [vite.dev/config/build-options](https://vite.dev/config/build-options) — `build.outDir`, `build.assetsDir`
- [github.com/sindresorhus/get-port README](https://github.com/sindresorhus/get-port/blob/main/readme.md) — `getPort({ port: N })` API
- [github.com/chimurai/http-proxy-middleware README](https://github.com/chimurai/http-proxy-middleware/blob/master/README.md) — `createProxyMiddleware`, `on.proxyReq`
- [expressjs.com/en/resources/middleware/cors/](https://expressjs.com/en/resources/middleware/cors/) — `cors` dynamic origin callback
- Node.js docs: `net.Server.listen(port, host, callback)`, `child_process.execSync`, `server.closeAllConnections()`

### Secondary (MEDIUM confidence)
- [npm registry: express 5.2.1](https://www.npmjs.com/package/express) — version and publish date verified
- [npm registry: get-port 7.2.0](https://www.npmjs.com/package/get-port) — version and publish date verified
- [npm registry: http-proxy-middleware 4.0.0](https://www.npmjs.com/package/http-proxy-middleware) — version and publish date verified
- [npm registry: cors 2.8.6](https://www.npmjs.com/package/cors) — version and publish date verified
- [npm registry: vite 8.0.13](https://www.npmjs.com/package/vite) — version and publish date verified

### Tertiary (LOW confidence — training knowledge)
- DNS rebinding Host header guard pattern — [ASSUMED] well-known security practice; not from a specific docs URL verified in this session

---

## Project Constraints (from CLAUDE.md)

Directives extracted from `./CLAUDE.md` that the planner must verify compliance with:

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| Stack: Next.js 16 App Router + Convex (DB + auth) | Backend unchanged; CLI proxies to existing Next.js routes |
| Stack: npm workspaces (not pnpm) | Use `--workspace=packages/workspace` flag; `workspace:*` protocol in package.json |
| `packages/cli` uses `tsup` for building | tsup `onSuccess` hook for copying workspace assets — follow existing pattern |
| Convex: always read `convex/_generated/ai/guidelines.md` first when working on Convex code | No Convex changes in Phase 3; not applicable |
| Commands: `npm run dev`, `npm run build`, `npx vitest run` | Test commands must use these; add workspace-scoped variants |
| `render-core` is CJS, `cli` is ESM | New `packages/workspace` is a browser SPA (ESM); no conflict. CLI server code must remain ESM (use `fileURLToPath`) |
| BRAND_VOICE.md / DESIGN.md | Workspace SPA shell should follow NES-retro aesthetic, Press Start 2P + Geist fonts, hard-offset shadows, zero border-radius, light mode only |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified via `npm view`; APIs verified via official docs
- Architecture: HIGH — patterns derived from official Express/Vite docs and existing codebase conventions
- Pitfalls: HIGH — ESM `__dirname`, `http-proxy-middleware` v4 API, and build order pitfalls are verified against real code in repo and official changelogs
- Security domain: MEDIUM — origin-locking and DNS rebinding patterns are well-known; specific ASVS mapping is [ASSUMED] based on training knowledge

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable ecosystem; Vite/Express versions unlikely to change in 30 days)
