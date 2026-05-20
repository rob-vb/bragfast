# Phase 3: CLI Local Server + Workspace Shell - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 11 new/modified files
**Analogs found:** 9 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/cli/src/server.ts` | service | request-response | `packages/cli/src/auth.ts` | role-match (lifecycle + open pattern) |
| `packages/cli/src/proxy.ts` | middleware | request-response | `packages/cli/src/http.ts` | role-match (HTTP forwarding, auth injection) |
| `packages/cli/src/repo-context.ts` | utility | transform | `packages/cli/src/credentials.ts` | role-match (FS + try/catch read pattern) |
| `packages/cli/src/index.ts` | config | request-response | `packages/cli/src/index.ts` (self) | exact (extend default action) |
| `packages/cli/tsup.config.ts` | config | file-I/O | `packages/render-core/tsup.config.ts` | exact (onSuccess copy pattern) |
| `packages/cli/package.json` | config | — | `packages/cli/package.json` (self) | exact (add deps) |
| `packages/workspace/vite.config.ts` | config | — | root `vite.config.ts` / RESEARCH patterns | partial (no existing SPA vite config) |
| `packages/workspace/src/main.tsx` | component | request-response | `src/app/(auth)/login/page.tsx` | partial (React entry point) |
| `packages/workspace/src/App.tsx` | component | request-response | `src/components/kitchen/cook-page.tsx` | partial (top-level component shell) |
| `packages/workspace/src/api.ts` | utility | request-response | `packages/cli/src/http.ts` | role-match (HTTP client wrapper) |
| `package.json` (root) | config | — | `package.json` (self) | exact (build script ordering) |

---

## Pattern Assignments

### `packages/cli/src/server.ts` (service, request-response)

**Analog:** `packages/cli/src/auth.ts`

**Imports pattern** (auth.ts lines 1-5):
```typescript
import open from "open";
import ora from "ora";
import { writeCredentials } from "./credentials";
import { DeviceFlowError, getApiUrl, pollDeviceToken, requestDeviceCode } from "./http";
```
For server.ts, adapt to:
```typescript
import open from "open";
import express from "express";
import getPort from "get-port";
import { createServer } from "http";
import type { Credentials } from "./credentials";
import { createBackendProxy } from "./proxy";
import { getRepoContext } from "./repo-context";
```

**Lifecycle + browser-open pattern** (auth.ts lines 16-27):
```typescript
export async function login(options: LoginOptions = {}): Promise<void> {
  const apiUrl = options.apiUrl ?? getApiUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  const stdout = options.stdout ?? process.stdout;
  const openBrowser = options.openBrowser ?? ((url: string) => open(url));
  // ...
  await openBrowser(issued.verification_uri).catch(() => undefined);
```
Server.ts copies the `openBrowser` defaulting pattern and the `.catch(() => undefined)` fallback exactly.

**Options interface + injectable deps pattern** (auth.ts lines 8-14):
```typescript
export interface LoginOptions {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  openBrowser?: (url: string) => Promise<unknown>;
  stdout?: Pick<NodeJS.WriteStream, "write" | "isTTY">;
  pollDelayMs?: number;
}
```
Server.ts uses the same injectable-options pattern for testability:
```typescript
export interface ServerOptions {
  port?: number;
  openBrowser?: (url: string) => Promise<unknown>;
  stdout?: Pick<NodeJS.WriteStream, "write">;
}
export interface ServerHandle { port: number; close: () => Promise<void>; }
```

**Core server lifecycle** (from RESEARCH.md Pattern 1 — no existing codebase analog; use verbatim):
```typescript
const DEFAULT_PORT = 3421;

export async function startServer(credentials: Credentials, opts: ServerOptions = {}): Promise<ServerHandle> {
  const port = await getPort({ port: opts.port ?? DEFAULT_PORT });
  const openBrowser = opts.openBrowser ?? ((url: string) => open(url));
  const stdout = opts.stdout ?? process.stdout;

  const app = buildApp(credentials, port);
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });

  const url = `http://127.0.0.1:${port}`;
  stdout.write(`Workspace: ${url}\n`);
  await openBrowser(url).catch(() => undefined);

  const close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });

  return { port, close };
}
```

**ESM __dirname equivalent** (RESEARCH.md Pitfall 1 — no codebase analog; render-core uses CJS `__dirname`):
```typescript
// packages/render-core/src/fonts.ts line 52 uses __dirname (CJS only)
// CLI is ESM — MUST use fileURLToPath instead:
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
```
Note: `render-core/src/fonts.ts` line 52 (`const dir = path.join(__dirname, "fonts")`) is CJS — do NOT copy this directly. Use `fileURLToPath(new URL(".", import.meta.url))` in all CLI ESM files.

---

### `packages/cli/src/proxy.ts` (middleware, request-response)

**Analog:** `packages/cli/src/http.ts`

**getApiUrl reuse** (http.ts lines 1-4):
```typescript
export const DEFAULT_API_URL = "https://bragfast.com";

export function getApiUrl(): string {
  return (process.env.BRAG_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}
```
proxy.ts imports `getApiUrl` from `./http` — do not redefine it.

**Core proxy pattern** (RESEARCH.md Pattern 3 — no existing analog in codebase):
```typescript
import { createProxyMiddleware } from "http-proxy-middleware";
import { getApiUrl } from "./http";

export function createBackendProxy(apiKey: string) {
  return createProxyMiddleware({
    target: getApiUrl(),
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq) => {
        // Inject credential server-side — never exposed to the browser
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      },
    },
  });
}
```
Critical: use `on.proxyReq` (v4 API), NOT top-level `proxyReq` option (v1/v2 — silently does nothing in v4).

**Origin-lock middleware** (RESEARCH.md Pattern 2 — no codebase analog; keep in server.ts or separate originLock.ts):
```typescript
import cors from "cors";
import type { RequestHandler } from "express";

export function originLockMiddleware(port: number): RequestHandler[] {
  const allowedOrigin = `http://127.0.0.1:${port}`;
  const hostGuard: RequestHandler = (req, res, next) => {
    const host = req.headers["host"];
    if (host && host !== `127.0.0.1:${port}`) {
      res.status(401).json({ error: "forbidden" });
      return;
    }
    next();
  };
  const corsMiddleware = cors({
    origin: (incoming, callback) => {
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
Build the `cors` config only AFTER `getPort()` resolves — never at module load time with a hardcoded port.

---

### `packages/cli/src/repo-context.ts` (utility, transform)

**Analog:** `packages/cli/src/credentials.ts`

**try/catch read pattern** (credentials.ts lines 20-30):
```typescript
export async function readCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(getCredentialsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (typeof parsed.api_key !== "string" || !parsed.api_key.startsWith("bf_")) return null;
    if (typeof parsed.created_at !== "string") return null;
    return parsed as Credentials;
  } catch {
    return null;
  }
}
```
repo-context.ts applies the same "wrap each fallible call in try/catch, return null on any failure" pattern — one try/catch per git command so a missing tag doesn't suppress a valid SHA.

**FS imports pattern** (credentials.ts lines 1-4):
```typescript
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
```
repo-context.ts uses `import { execSync } from "child_process"` and `import { readFileSync } from "fs"` alongside `path` — same named-import style.

**Interface export pattern** (credentials.ts lines 5-10):
```typescript
export interface Credentials {
  api_key: string;
  email?: string;
  userId?: string;
  created_at: string;
}
```
repo-context.ts mirrors this with:
```typescript
export interface RepoContext {
  tag: string | null;
  sha: string | null;
  name: string | null;
  version: string | null;
}
```

**Core implementation** (RESEARCH.md Pattern 5):
```typescript
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
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as { name?: string; version?: string };
    name = pkg.name ?? null;
    version = pkg.version ?? null;
  } catch { /* non-npm project */ }
  return { tag, sha, name, version };
}
```

---

### `packages/cli/src/index.ts` (config/entrypoint, request-response) — MODIFY

**Analog:** `packages/cli/src/index.ts` (self — extend the default action)

**Existing default action** (index.ts lines 15-22):
```typescript
.action(async () => {
  const credentials = await readCredentials();
  if (!credentials) {
    await login();
    return;
  }
  process.stdout.write("Logged in. Workspace server arrives in Phase 3.\n");
});
```

**Replacement pattern** (RESEARCH.md Pattern 8 — keep the credential check, replace the placeholder):
```typescript
import { startServer } from "./server";
// ...
.action(async () => {
  const credentials = await readCredentials();
  if (!credentials) {
    await login();
    return;
  }
  const { port, close } = await startServer(credentials);
  // URL + browser open handled inside startServer — consistent with login() pattern
  process.on("SIGINT", async () => { await close(); process.exit(0); });
  process.on("SIGTERM", async () => { await close(); process.exit(0); });
});
```
**Error handling** (index.ts lines 39-43 — copy exactly):
```typescript
program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
```

---

### `packages/cli/tsup.config.ts` (config, file-I/O) — MODIFY

**Analog:** `packages/render-core/tsup.config.ts` (exact match — onSuccess copy pattern)

**Existing render-core onSuccess** (render-core/tsup.config.ts lines 21-25):
```typescript
async onSuccess() {
  mkdirSync("dist/fonts", { recursive: true });
  copyFileSync("fonts/PlusJakartaSans-Regular.ttf", "dist/fonts/PlusJakartaSans-Regular.ttf");
  copyFileSync("fonts/PlusJakartaSans-Bold.ttf", "dist/fonts/PlusJakartaSans-Bold.ttf");
},
```
Import: `import { copyFileSync, mkdirSync } from "fs";` (render-core/tsup.config.ts line 1)

**Existing CLI onSuccess** (cli/tsup.config.ts lines 12-14):
```typescript
async onSuccess() {
  chmodSync("dist/index.js", 0o755);
},
```

**Extended CLI onSuccess — merge both** (RESEARCH.md Pattern 6):
```typescript
import { chmodSync, cpSync, mkdirSync } from "fs";
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
    chmodSync("dist/index.js", 0o755);
    // Copy Workspace SPA assets so they're included in the published npm package
    mkdirSync("dist/workspace-dist", { recursive: true });
    cpSync("../workspace/dist", "dist/workspace-dist", { recursive: true });
  },
});
```
Prerequisite: `packages/workspace` must be built before `packages/cli`. See root package.json pattern below.

---

### `packages/cli/package.json` (config) — MODIFY

**Analog:** `packages/cli/package.json` (self — add new deps)

**Existing deps block** (package.json lines 17-21):
```json
"dependencies": {
  "commander": "14.0.3",
  "open": "11.0.0",
  "ora": "9.4.0"
},
```
Add to `dependencies`:
```json
"express": "5.2.1",
"get-port": "7.2.0",
"http-proxy-middleware": "4.0.0",
"cors": "2.8.6"
```
Add to `devDependencies`:
```json
"@types/express": "5.0.6",
"@types/cors": "2.8.19",
"supertest": "^7.0.0",
"@types/supertest": "^6.0.0"
```
`open` (already present at 11.0.0) is reused — no new install needed.

---

### `package.json` (root) — MODIFY

**Analog:** `package.json` (self — build script ordering)

**Existing build script** (root package.json line 11):
```json
"build": "npm run build --workspace=packages/render-core && npm run build --workspace=packages/cli && (npx convex codegen --typecheck=disable 2>/dev/null; next build)",
```

**Existing cli:build** (root package.json line 12):
```json
"cli:build": "npm run build --workspace=packages/cli",
```

**Required change** — workspace must build before CLI:
```json
"build": "npm run build --workspace=packages/render-core && npm run build --workspace=packages/workspace && npm run build --workspace=packages/cli && (npx convex codegen --typecheck=disable 2>/dev/null; next build)",
"cli:build": "npm run build --workspace=packages/workspace && npm run build --workspace=packages/cli",
```

---

### `packages/workspace/vite.config.ts` (config) — NEW

**Analog:** No existing Vite SPA config in the codebase. Use RESEARCH.md Pattern 7 verbatim.

**Pattern** (RESEARCH.md Pattern 7):
```typescript
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

---

### `packages/workspace/src/main.tsx` (component, request-response) — NEW

**Analog:** `src/app/(auth)/login/page.tsx` (partial — React entry with minimal scaffold)

**Imports pattern** (React entry convention across codebase):
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
```
No Next.js imports, no server features. The `createRoot` pattern is standard Vite react-ts scaffold — differs from Next.js page convention but is the correct Vite SPA entrypoint.

---

### `packages/workspace/src/App.tsx` (component, request-response) — NEW

**Analog:** `src/components/kitchen/cook-page.tsx` (partial — top-level component with fetch)

**Fetch pattern** (cook-page.tsx uses client-side fetch; copy the async state pattern):
```typescript
// No analog read needed — standard React useState + useEffect fetch:
const [context, setContext] = useState<RepoContext | null>(null);
useEffect(() => {
  fetch("/api/repo-context")
    .then((r) => r.json())
    .then((data) => setContext(data as RepoContext))
    .catch(() => undefined);
}, []);
```
All fetch calls use relative URLs (`/api/...`) — the Vite SPA assumes it's served from the same origin as the local Express server. Never hardcode `http://127.0.0.1:PORT` in the SPA source.

**Design system** (DESIGN.md conventions — apply to shell): Press Start 2P + Geist fonts, hard-offset shadows, zero border-radius, light mode only. Components ported from `src/` as needed in Phase 4; Phase 3 shell is standalone minimal HTML.

---

### `packages/workspace/src/api.ts` (utility, request-response) — NEW

**Analog:** `packages/cli/src/http.ts` (role-match — HTTP client wrapper with typed returns)

**Pattern from http.ts** (lines 28-46 — typed fetch wrapper structure):
```typescript
export async function requestDeviceCode(fetchImpl = fetch, apiUrl = getApiUrl()): Promise<DeviceCodeResponse> {
  const response = await fetchImpl(`${apiUrl}/api/v1/device/code`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to request device code (${response.status})`);
  return (await response.json()) as DeviceCodeResponse;
}
```
workspace/src/api.ts uses the same pattern with relative URLs:
```typescript
export async function fetchRepoContext(): Promise<RepoContext> {
  const response = await fetch("/api/repo-context");
  if (!response.ok) throw new Error(`repo-context failed (${response.status})`);
  return (await response.json()) as RepoContext;
}
```

---

## Test Patterns

### CLI test files (new: server, origin-lock, proxy, repo-context)

**Analog:** `packages/cli/src/__tests__/auth.test.ts` (exact match for structure)

**Test file structure** (auth.test.ts lines 1-14):
```typescript
import { mkdtempSync } from "fs";
import { rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "../auth";
import { readCredentials } from "../credentials";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "brag-cli-auth-"));
  process.env.BRAG_HOME = tmp;
});

afterEach(async () => {
  delete process.env.BRAG_HOME;
  await rm(tmp, { recursive: true, force: true });
});
```
New test files follow identical `beforeEach`/`afterEach` cleanup pattern, `vi.fn()` for injectable deps, named `describe` blocks.

**vi.fn mock pattern** (auth.test.ts lines 29-46):
```typescript
const fetchImpl = vi
  .fn<typeof fetch>()
  .mockResolvedValueOnce(jsonResponse({ ... }))
  .mockResolvedValueOnce(jsonResponse({ error: "authorization_pending" }, 428))
  .mockResolvedValueOnce(jsonResponse({ ... }));
const openBrowser = vi.fn(async () => undefined);
```
server.test.ts uses same pattern for `openBrowser` and mocked `getPort`.

**Vitest config** (vitest.config.ts lines 1-15 — copy exactly, already correct):
```typescript
import path from "path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", globals: true, include: ["src/__tests__/**/*.test.ts"] },
  resolve: { alias: { "bragfast": path.resolve(__dirname, "src/index.ts") } },
});
```

---

## Shared Patterns

### ESM module resolution (`fileURLToPath`)
**Source:** RESEARCH.md Pitfall 1 — no codebase analog (render-core uses CJS `__dirname`)
**Apply to:** `packages/cli/src/server.ts` (getSpaDir), any other CLI file needing `__dirname`
```typescript
import { fileURLToPath } from "url";
import path from "path";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Then use path.join(__dirname, "workspace-dist") to resolve sibling dirs
```

### Error swallowing with `.catch(() => undefined)`
**Source:** `packages/cli/src/auth.ts` line 26
**Apply to:** `packages/cli/src/server.ts` browser-open call, `packages/workspace/src/App.tsx` fetch
```typescript
await openBrowser(url).catch(() => undefined);
```

### Named import style from `fs`
**Source:** `packages/cli/src/credentials.ts` line 1
**Apply to:** `packages/cli/tsup.config.ts` (add `cpSync`, `mkdirSync`), `packages/cli/src/repo-context.ts`
```typescript
import { mkdir, readFile, rm, writeFile } from "fs/promises";
// or for sync:
import { chmodSync, cpSync, mkdirSync } from "fs";
```

### Injectable options for testability
**Source:** `packages/cli/src/auth.ts` lines 8-14 (LoginOptions interface)
**Apply to:** `packages/cli/src/server.ts` (ServerOptions), `packages/cli/src/repo-context.ts` (cwd parameter)

All new CLI functions accept their external dependencies (stdout, openBrowser, port, cwd) as optional parameters with process-level defaults. This matches the existing pattern and enables unit testing without spawning real servers.

### Stderr error + exitCode pattern
**Source:** `packages/cli/src/index.ts` lines 39-43
**Apply to:** Any new top-level async entry in index.ts
```typescript
program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/workspace/vite.config.ts` | config | — | No Vite SPA config exists in the codebase; all prior Vite config is in root `vitest.config.ts` (test-only) |
| `packages/workspace/package.json` | config | — | No browser SPA package exists; scaffold via `npm create vite@latest` then trim to match project conventions |

For these two files, use RESEARCH.md Patterns 7 and the standard stack table as the primary reference.

---

## Metadata

**Analog search scope:** `packages/cli/src/`, `packages/render-core/`, `src/app/api/v1/`, root package.json
**Files scanned:** 10
**Pattern extraction date:** 2026-05-20
