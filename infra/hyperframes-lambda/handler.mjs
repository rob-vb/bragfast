import { mkdtemp, writeFile, readFile, rm, stat, cp, mkdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileP = promisify(execFile);

// Hyperframes caches the headless browser at $HOME/.cache/hyperframes. We
// pre-bake it to /opt/hyperframes-cache during the image build (see Dockerfile)
// and copy it into /tmp on cold start so runtime doesn't re-download Chrome.
const HF_CACHE_SRC = "/opt/hyperframes-cache/hyperframes";
const HF_CACHE_DST = "/tmp/.cache/hyperframes";
let cacheSeeded = false;
async function seedHyperframesCache() {
  if (cacheSeeded) return;
  try {
    await access(HF_CACHE_DST);
  } catch {
    await mkdir("/tmp/.cache", { recursive: true });
    await cp(HF_CACHE_SRC, HF_CACHE_DST, { recursive: true });
  }
  cacheSeeded = true;
}

// Lambda's Node.js runtime sometimes spawns children with a stripped PATH,
// causing tools that rely on `which` (like hyperframes) to fail. Force a
// known-good PATH that includes both /usr/bin (where we install ffmpeg)
// and /usr/local/bin (npm-global hyperframes binary).
const SPAWN_PATH = "/var/lang/bin:/usr/local/bin:/usr/bin:/bin:/opt/bin";

let diagnosticsLogged = false;
async function logDiagnosticsOnce(spawnEnv) {
  if (diagnosticsLogged) return;
  diagnosticsLogged = true;
  console.log("[diag] PATH =", spawnEnv.PATH);
  const probes = [
    "/usr/bin/ffmpeg",
    "/usr/bin/which",
    "/var/lang/bin/hyperframes",
    "/usr/local/bin/hyperframes",
    "/opt/hyperframes-cache/hyperframes",
  ];
  for (const p of probes) {
    try {
      const s = await stat(p);
      console.log(`[diag] ${p} exists, mode=${(s.mode & 0o777).toString(8)}, size=${s.size}`);
    } catch (e) {
      console.log(`[diag] ${p} missing: ${e.code ?? e.message}`);
    }
  }
  for (const cmd of ["ffmpeg", "hyperframes"]) {
    try {
      const { stdout } = await execFileP("which", [cmd], { env: spawnEnv });
      console.log(`[diag] which ${cmd} =>`, stdout.trim());
    } catch (e) {
      console.log(`[diag] which ${cmd} failed:`, e.message);
    }
  }
}

const STUB_HYPERFRAMES_JSON = {
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
};
const STUB_PACKAGE_JSON = { name: "render", private: true, type: "module" };

export async function handler(event) {
  const start = Date.now();
  const { html, variables, format, duration, presignedPutUrl } = event;
  if (!html || !presignedPutUrl) {
    throw new Error("Missing required event fields: html, presignedPutUrl");
  }

  const projDir = await mkdtemp(join(tmpdir(), "hf-"));
  const outPath = join(projDir, "out.mp4");

  try {
    await writeFile(join(projDir, "index.html"), html, "utf8");
    await writeFile(join(projDir, "hyperframes.json"), JSON.stringify(STUB_HYPERFRAMES_JSON), "utf8");
    await writeFile(join(projDir, "package.json"), JSON.stringify(STUB_PACKAGE_JSON), "utf8");
    await writeFile(
      join(projDir, "meta.json"),
      JSON.stringify({ id: "render", name: "render", createdAt: new Date().toISOString() }),
      "utf8",
    );

    const args = [
      "render", projDir,
      "-o", outPath,
      "--format", "mp4",
      "--variables", JSON.stringify(variables ?? {}),
      "--no-browser-gpu",
      "--quiet",
    ];

    const spawnEnv = { ...process.env, HOME: "/tmp", PATH: SPAWN_PATH };
    await seedHyperframesCache();
    await logDiagnosticsOnce(spawnEnv);

    await execFileP("/usr/local/bin/hyperframes", args, {
      env: spawnEnv,
      maxBuffer: 64 * 1024 * 1024,
    });

    const buf = await readFile(outPath);
    const res = await fetch(presignedPutUrl, {
      method: "PUT",
      body: buf,
      headers: { "Content-Type": "video/mp4" },
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    return { ok: true, durationMs: Date.now() - start, format, requestedDuration: duration };
  } finally {
    await rm(projDir, { recursive: true, force: true }).catch(() => {});
  }
}
