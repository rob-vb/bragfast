import cors from "cors";
import express from "express";
import type { Application, RequestHandler } from "express";
import getPort from "get-port";
import { createServer } from "node:http";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { createBackendProxy } from "./proxy";
import type { Credentials } from "./credentials";

const DEFAULT_PORT = 3421;

export interface ServerOptions {
  port?: number;
  openBrowser?: (url: string) => Promise<unknown>;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  /** Override the compiled workspace-dist path (used by tests). */
  spaDir?: string;
}

export interface ServerHandle {
  port: number;
  close: () => Promise<void>;
}

/**
 * Origin-locking middleware pair for the local Workspace server.
 *
 * 1. hostGuard — rejects any request whose Host header is not
 *    `127.0.0.1:<port>`, blocking DNS-rebinding attacks (T-03-04).
 * 2. cors — rejects any cross-origin browser tab whose Origin is not
 *    `http://127.0.0.1:<port>` (T-03-05). Requests with no Origin header
 *    (same-origin / non-browser) pass through.
 *
 * Built per-port at startup (not at module load) so the allowed origin
 * reflects the actually-bound port after get-port fallback.
 */
export function originLockMiddleware(port: number): RequestHandler[] {
  const allowedOrigin = `http://127.0.0.1:${port}`;

  const hostGuard: RequestHandler = (req, res, next) => {
    const host = req.headers.host;
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

/**
 * Resolves the directory holding the built Workspace SPA. Defaults to
 * `workspace-dist` next to the compiled server.js. Uses import.meta.url
 * because the CommonJS dir global is undefined in ESM.
 */
function getSpaDir(override?: string): string {
  if (override) return override;
  const here = fileURLToPath(new URL(".", import.meta.url));
  return path.join(here, "workspace-dist");
}

function buildApp(credentials: Credentials, port: number, spaDir: string): Application {
  const app = express();
  app.use(...originLockMiddleware(port));
  app.use("/api", createBackendProxy(credentials.api_key));
  app.use(express.static(spaDir));
  // SPA client-side router fallback: any unmatched path serves index.html.
  app.get("*", (_req, res) => {
    res.sendFile(path.join(spaDir, "index.html"));
  });
  return app;
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

/**
 * Starts the local Workspace server: binds to 127.0.0.1 (falling back to a
 * free port if DEFAULT_PORT is taken), prints the URL, opens the browser, and
 * returns a handle for graceful shutdown.
 */
export async function startServer(
  credentials: Credentials,
  opts: ServerOptions = {}
): Promise<ServerHandle> {
  const port = await getPort({ port: opts.port ?? DEFAULT_PORT });
  const spaDir = getSpaDir(opts.spaDir);
  const app = buildApp(credentials, port, spaDir);
  const httpServer = createServer(app);

  await listen(httpServer, port, "127.0.0.1");

  const url = `http://127.0.0.1:${port}`;
  (opts.stdout ?? process.stdout).write(`Workspace: ${url}\n`);

  const openBrowser = opts.openBrowser ?? ((u: string) => open(u));
  await openBrowser(url).catch(() => undefined);

  const close = (): Promise<void> =>
    new Promise((resolve) => {
      // closeAllConnections (Node 18.2+) drops keep-alive sockets so close()
      // resolves promptly and the port avoids lingering in TIME_WAIT.
      httpServer.closeAllConnections();
      httpServer.close(() => resolve());
    });

  return { port, close };
}
