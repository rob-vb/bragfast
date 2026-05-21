import cors from "cors";
import express from "express";
import type { Application, RequestHandler } from "express";
import getPort from "get-port";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { createBackendProxy } from "./proxy";
import { getRepoContext } from "./repo-context";
import { getBragHome, type Credentials } from "./credentials";
import { resolveAndRender, type RenderJob } from "./render-resolver";
import { resolveAndSchedule, type ScheduleSelection } from "./schedule-resolver";
import { resolveAndRenderVideo, type VideoRenderJob } from "./video-render-resolver";
import type { FormatKey } from "@bragfast/render-core";

const DEFAULT_PORT = 3421;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Map<string, { ext: string }>([
  ["image/png", { ext: "png" }],
  ["image/jpeg", { ext: "jpg" }],
  ["image/webp", { ext: "webp" }],
  ["image/svg+xml", { ext: "svg" }],
  ["video/mp4", { ext: "mp4" }],
  ["video/quicktime", { ext: "mov" }],
  ["video/webm", { ext: "webm" }],
]);
const renderJobs = new Map<string, RenderJob>();
const videoRenderJobs = new Map<string, VideoRenderJob>();

export interface ServerOptions {
  port?: number;
  openBrowser?: (url: string) => Promise<unknown>;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  /** Override the compiled workspace-dist path (used by tests). */
  spaDir?: string;
  /** Override the local media cache path (used by tests). */
  mediaDir?: string;
  /** Override the rendered image output path (used by tests). */
  outputDir?: string;
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
    // Reject a missing Host as well as a wrong one — HTTP/1.0 clients and raw
    // tools can omit it, and a blank Host must not slip past the guard.
    if (!host || host !== `127.0.0.1:${port}`) {
      res.status(401).json({ error: "forbidden" });
      return;
    }
    next();
  };

  const corsHandler = cors({
    origin: (incoming, callback) => {
      if (!incoming || incoming === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("CORS: forbidden origin"));
      }
    },
    credentials: false,
  });

  // Wrap cors so a rejected origin yields a 401 directly. The cors package
  // forwards its rejection to next(err), which Express's default handler would
  // turn into a 500 — but a forbidden cross-origin request is an auth failure
  // (T-03-05), so it must be 401. Keeps the array two elements (the contract
  // origin-lock.test.ts destructures), with no separate error middleware.
  const corsMiddleware: RequestHandler = (req, res, next) => {
    corsHandler(req, res, (err: unknown) => {
      if (err) {
        res.status(401).json({ error: "forbidden" });
        return;
      }
      next();
    });
  };

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

function getMediaDir(override?: string): string {
  return override ?? path.join(homedir(), ".brag", "media");
}

function getOutputDir(override?: string): string {
  if (override) return override;
  try {
    const raw = readFileSync(path.join(getBragHome(), "config.json"), "utf8");
    const parsed = JSON.parse(raw) as { outputDir?: unknown };
    if (typeof parsed.outputDir === "string" && parsed.outputDir.trim()) {
      return parsed.outputDir;
    }
  } catch {
    // Missing or malformed user config falls back to the project-local default.
  }
  return path.join(process.cwd(), "brag-output");
}

function isUnsafeOutputId(id: string): boolean {
  return id.includes("..") || id.includes("/");
}

function pendingRenderJob(jobId: string, draftId: string): RenderJob {
  return {
    jobId,
    draftId,
    createdAt: Date.now(),
    formats: {
      landscape: { phase: "pending" },
      square: { phase: "pending" },
      portrait: { phase: "pending" },
    },
  };
}

function isFormatKey(value: unknown): value is FormatKey {
  return value === "landscape" || value === "square" || value === "portrait";
}

function isScheduleSelection(value: unknown): value is ScheduleSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (!isFormatKey(item.format)) return false;
  if (Array.isArray(item.channelIds)) {
    return item.channelIds.every((id) => typeof id === "string" && id.length > 0);
  }
  return typeof item.channelId === "string" && item.channelId.length > 0;
}

function isScheduling(value: unknown): value is { mode: "queue" } | { mode: "custom"; scheduledAt: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (item.mode === "queue") return true;
  return item.mode === "custom" && typeof item.scheduledAt === "string" && item.scheduledAt.length > 0;
}

function pendingVideoRenderJob(jobId: string, draftId: string): VideoRenderJob {
  return {
    jobId,
    draftId,
    phase: "pending",
    framesRendered: 0,
    totalFrames: 0,
    downloadPct: 0,
  };
}

function localMediaUploadRoute(mediaDir: string, port: number): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_MEDIA_SIZE },
  }).single("file");

  return (req, res, next) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "File too large" });
        return;
      }
      if (err) {
        next(err);
        return;
      }

      void (async () => {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "Missing file" });
          return;
        }

        const mediaType = ALLOWED_MEDIA_TYPES.get(file.mimetype);
        if (!mediaType) {
          res.status(400).json({ error: `Unsupported type: ${file.mimetype}` });
          return;
        }

        await fs.mkdir(mediaDir, { recursive: true });
        const id = randomUUID().replace(/-/g, "").slice(0, 16);
        const filename = `${id}.${mediaType.ext}`;
        await fs.writeFile(path.join(mediaDir, filename), file.buffer);

        res.json({
          id,
          url: `http://127.0.0.1:${port}/media/${filename}`,
        });
      })().catch(next);
    });
  };
}

function localRenderRoute(
  outputDir: string,
  port: number,
  credentials: Credentials,
  stdout: Pick<NodeJS.WriteStream, "write">,
): RequestHandler {
  return (req, res) => {
    const body = req.body as { draftId?: unknown } | undefined;
    if (!body || typeof body.draftId !== "string" || !body.draftId) {
      res.status(400).json({ error: "Missing draftId" });
      return;
    }

    const draftId = body.draftId;
    const jobId = draftId;
    renderJobs.set(jobId, pendingRenderJob(jobId, draftId));

    void resolveAndRender(
      draftId,
      credentials.api_key,
      process.env.BRAG_API_BASE ?? "https://api.brag.fast",
      outputDir,
      port,
      stdout as NodeJS.WriteStream,
    )
      .then((job) => {
        renderJobs.set(jobId, { ...job, jobId });
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        stdout.write(`  [brag] Render failed for ${draftId}: ${error}\n`);
        renderJobs.set(jobId, {
          jobId,
          draftId,
          createdAt: Date.now(),
          formats: {
            landscape: { phase: "failed", error },
            square: { phase: "failed", error },
            portrait: { phase: "failed", error },
          },
        });
      });

    res.status(202).json({ id: jobId, status: "pending" });
  };
}

function localRenderStatusRoute(): RequestHandler {
  return (req, res) => {
    const id = req.params.id;
    if (Array.isArray(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (!id || isUnsafeOutputId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const job = renderJobs.get(id);
    if (!job) {
      res.status(404).json({ error: "Render job not found" });
      return;
    }

    res.json({ id, formats: job.formats });
  };
}

function localVideoRenderRoute(
  outputDir: string,
  port: number,
  credentials: Credentials,
  stdout: Pick<NodeJS.WriteStream, "write">,
): RequestHandler {
  return (req, res) => {
    const body = req.body as { draftId?: unknown; format?: unknown } | undefined;
    if (!body || typeof body.draftId !== "string" || !body.draftId || isUnsafeOutputId(body.draftId)) {
      res.status(400).json({ error: "Missing draftId" });
      return;
    }
    if (body.format !== undefined && !isFormatKey(body.format)) {
      res.status(400).json({ error: "Invalid format" });
      return;
    }

    const draftId = body.draftId;
    const format = body.format ?? "landscape";
    const jobId = draftId;
    const job = pendingVideoRenderJob(jobId, draftId);
    videoRenderJobs.set(jobId, job);

    void resolveAndRenderVideo(
      draftId,
      format,
      credentials.api_key,
      process.env.BRAG_API_BASE ?? "https://api.brag.fast",
      outputDir,
      port,
      stdout as NodeJS.WriteStream,
      job,
    ).catch((err: unknown) => {
      const error = err instanceof Error ? err.message : String(err);
      stdout.write(`  [brag] Video render failed for ${draftId}: ${error}\n`);
      job.phase = "failed";
      job.error = error;
    });

    res.status(202).json({ id: jobId, status: "pending" });
  };
}

function localVideoRenderStatusRoute(): RequestHandler {
  return (req, res) => {
    const id = req.params.id;
    if (Array.isArray(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (!id || isUnsafeOutputId(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const job = videoRenderJobs.get(id);
    if (!job) {
      res.status(404).json({ error: "Video render job not found" });
      return;
    }

    res.json(job);
  };
}

function localScheduleRoute(
  outputDir: string,
  credentials: Credentials,
  stdout: Pick<NodeJS.WriteStream, "write">,
): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      const body = req.body as {
        draftId?: unknown;
        selections?: unknown;
        caption?: unknown;
        scheduling?: unknown;
      } | undefined;

      if (!body || typeof body.draftId !== "string" || !body.draftId || isUnsafeOutputId(body.draftId)) {
        res.status(400).json({ error: "Invalid draftId" });
        return;
      }

      if (!Array.isArray(body.selections) || body.selections.length === 0 || !body.selections.every(isScheduleSelection)) {
        res.status(400).json({ error: "Invalid selections" });
        return;
      }

      if (!isScheduling(body.scheduling)) {
        res.status(400).json({ error: "Invalid scheduling" });
        return;
      }

      const confirmation = await resolveAndSchedule({
        outputDir,
        apiKey: credentials.api_key,
        backendBase: process.env.BRAG_API_BASE ?? "https://api.brag.fast",
        draftId: body.draftId,
        selections: body.selections,
        caption: typeof body.caption === "string" ? body.caption : "",
        scheduling: body.scheduling,
        stdout,
      });

      res.json(confirmation);
    })().catch(next);
  };
}

function localRevealRoute(outputDir: string): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      const body = req.body as { id?: unknown } | undefined;
      if (!body || typeof body.id !== "string" || !body.id || isUnsafeOutputId(body.id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      const revealPath = path.resolve(path.join(outputDir, body.id));
      if (!revealPath.startsWith(path.resolve(outputDir))) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      try {
        const stat = await fs.stat(revealPath);
        if (!stat.isDirectory()) {
          res.status(404).json({ error: "Output folder not found" });
          return;
        }
      } catch {
        res.status(404).json({ error: "Output folder not found" });
        return;
      }

      await open(revealPath);
      res.json({ ok: true });
    })().catch(next);
  };
}

function buildApp(
  credentials: Credentials,
  port: number,
  spaDir: string,
  mediaDir: string,
  outputDir: string,
  stdout: Pick<NodeJS.WriteStream, "write">,
): Application {
  const app = express();
  app.use(...originLockMiddleware(port));
  app.use(express.json());
  // Local-only route: served by the CLI itself (not proxied to the backend),
  // so it must be registered before the catch-all /api proxy. Reads git/
  // package.json context from the invoking directory to prefill Workspace copy.
  app.get("/api/repo-context", (_req, res) => {
    res.json(getRepoContext(process.cwd()));
  });
  app.post("/api/local/media", localMediaUploadRoute(mediaDir, port));
  app.use("/media", express.static(mediaDir));
  app.post("/api/local/render", localRenderRoute(outputDir, port, credentials, stdout));
  app.get("/api/local/render/:id/status", localRenderStatusRoute());
  app.post("/api/local/render/video", localVideoRenderRoute(outputDir, port, credentials, stdout));
  app.get("/api/local/render/video/:id/status", localVideoRenderStatusRoute());
  app.post("/api/local/schedule", localScheduleRoute(outputDir, credentials, stdout));
  app.post("/api/local/reveal", localRevealRoute(outputDir));
  app.use("/output", express.static(outputDir));
  // Mounted at root; the proxy's pathFilter scopes it to /api/* so the prefix
  // is preserved on the upstream request (see proxy.ts).
  app.use(createBackendProxy(credentials.api_key));
  app.use(express.static(spaDir));
  // SPA client-side router fallback: any unmatched path serves index.html.
  // Express 5 (path-to-regexp v8) removed the bare "*" wildcard — a named
  // wildcard ("/*splat") is required.
  app.get("/*splat", (_req, res) => {
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
  const mediaDir = getMediaDir(opts.mediaDir);
  const outputDir = getOutputDir(opts.outputDir);
  const stdout = opts.stdout ?? process.stdout;
  const app = buildApp(credentials, port, spaDir, mediaDir, outputDir, stdout);
  const httpServer = createServer(app);

  await listen(httpServer, port, "127.0.0.1");

  const url = `http://127.0.0.1:${port}`;
  stdout.write(`Workspace: ${url}\n`);

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
