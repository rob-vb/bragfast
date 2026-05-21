import {
  getCanvasDefaultConfig,
  renderVideo,
  type Brand,
  type BrandColors,
  type CanvasTemplateConfig,
  type FormatKey,
  type LocalVideoRenderRequest,
  type ObjectDataMap,
} from "@bragfast/render-core";
import type { OnBrowserDownload } from "@remotion/renderer";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBragHome } from "./credentials";

function moduleDir(): string {
  const moduleUrl = new URL(".", import.meta.url);
  if (moduleUrl.protocol === "file:") return fileURLToPath(moduleUrl);
  return path.resolve("packages/cli/src");
}

const __dir = moduleDir();
const REMOTION_ENTRY = path.resolve(__dir, "../../../src/remotion/index.ts");

if (!existsSync(REMOTION_ENTRY)) {
  throw new Error(`[brag] Cannot find Remotion entry at ${REMOTION_ENTRY}. Ensure the CLI is run from the installed bragfast package.`);
}

export interface VideoRenderJob {
  jobId: string;
  draftId: string;
  phase: "pending" | "chrome-download" | "rendering" | "done" | "failed";
  framesRendered: number;
  totalFrames: number;
  downloadPct: number;
  url?: string;
  error?: string;
}

interface DraftObjectContent {
  text?: string;
  image_url?: string;
  video_url?: string;
  font_family?: string;
  font_weight?: number;
}

interface DraftConfig {
  templateId?: string;
  brandId?: string;
  colors?: BrandColors;
  objectContent?: Record<string, DraftObjectContent>;
}

interface DraftResponse {
  id: string;
  config: DraftConfig;
}

interface BrandRecord {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  font_family?: string;
  colors: BrandColors;
}

interface TemplateRecord {
  id: string;
  config: CanvasTemplateConfig;
}

async function probeMp4DurationSeconds(url: string): Promise<number | null> {
  try {
    const buf = await fetchLeadingBytes(url, 4 * 1024 * 1024);
    if (!buf) return null;
    return parseMp4DurationFromBuffer(buf);
  } catch {
    return null;
  }
}

async function fetchLeadingBytes(url: string, bytes: number): Promise<Buffer | null> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${bytes - 1}` } });
  if (!res.ok && res.status !== 206) return null;
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function parseMp4DurationFromBuffer(buf: Buffer): number | null {
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;

    if (type === "moov") {
      return findMvhdInContainer(buf, offset + 8, offset + size);
    }

    if (size === 1) {
      const hi = buf.readUInt32BE(offset + 8);
      const lo = buf.readUInt32BE(offset + 12);
      offset += hi * 0x100000000 + lo;
    } else {
      offset += size;
    }
  }
  return null;
}

function findMvhdInContainer(buf: Buffer, start: number, end: number): number | null {
  let offset = start;
  while (offset + 8 <= Math.min(end, buf.length)) {
    const size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;

    if (type === "mvhd") {
      const version = buf.readUInt8(offset + 8);
      if (version === 0) {
        const timescale = buf.readUInt32BE(offset + 20);
        const duration = buf.readUInt32BE(offset + 24);
        if (!timescale) return null;
        return duration / timescale;
      }
      const timescale = buf.readUInt32BE(offset + 28);
      const hi = buf.readUInt32BE(offset + 32);
      const lo = buf.readUInt32BE(offset + 36);
      const duration = hi * 0x100000000 + lo;
      if (!timescale) return null;
      return duration / timescale;
    }

    offset += size;
  }
  return null;
}

export async function probeClipDurationInFrames(absoluteUrl: string, fps = 30): Promise<number | null> {
  const seconds = await probeMp4DurationSeconds(absoluteUrl);
  if (seconds === null) return null;
  return Math.round(seconds * fps);
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (response.status === 404) throw new Error("not-found");
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  return (await response.json()) as T;
}

function guessMime(absPath: string): string {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

async function fileToDataUri(absPath: string): Promise<string> {
  const buffer = await fs.readFile(absPath);
  return `data:${guessMime(absPath)};base64,${buffer.toString("base64")}`;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed (${response.status})`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function resolveImageRef(imageUrl: string, stdout: NodeJS.WriteStream): Promise<string> {
  if (imageUrl.startsWith("/media/")) {
    const absPath = path.join(getBragHome(), "media", path.basename(imageUrl));
    try {
      return await fileToDataUri(absPath);
    } catch (err) {
      stdout.write(`  [brag] Missing media: ${absPath}\n`);
      stdout.write(`  [brag] ${err instanceof Error ? err.message : String(err)}\n`);
      return "";
    }
  }
  return imageUrl;
}

function buildObjectDataForCLI(
  templateConfig: CanvasTemplateConfig,
  objectContent: Record<string, DraftObjectContent> | undefined,
  format: FormatKey,
  stdout: NodeJS.WriteStream,
): Promise<ObjectDataMap> {
  const layout = templateConfig.formats[format] ?? templateConfig.formats.landscape;
  const slide: ObjectDataMap = {};

  return (async () => {
    for (const obj of layout.objects) {
      const content = objectContent?.[obj.id];

      if (obj.type === "text") {
        const userText = content?.text;
        let entry: ObjectDataMap[string] | undefined;
        if (userText) {
          entry = { text: userText };
        } else if (obj.previewText !== "") {
          entry = { text: obj.previewText ?? "" };
        }
        if (!entry) continue;
        if (content?.font_family) entry.fontFamily = content.font_family;
        if (content?.font_weight) entry.fontWeight = content.font_weight;
        slide[obj.id] = entry;
        continue;
      }

      if (content?.image_url) {
        slide[obj.id] = { imageBase64: await resolveImageRef(content.image_url, stdout) };
      } else if (content?.video_url) {
        slide[obj.id] = { videoUrl: content.video_url };
      }
    }

    return slide;
  })();
}

async function resolveTemplate(templateId: string | undefined, apiKey: string, backendBase: string): Promise<CanvasTemplateConfig> {
  const id = templateId ?? "standard-browser";
  const builtIn = getCanvasDefaultConfig(id);
  if (builtIn) return builtIn;

  if (id.startsWith("tmpl_")) {
    const response = await fetchJson<{ templates: TemplateRecord[] }>(`${backendBase}/api/v1/templates`, apiKey);
    const template = response.templates.find((item) => item.id === id);
    if (template) return template.config;
  }

  throw new Error(`Template not found: ${id}`);
}

async function resolveBrand(
  draft: DraftResponse,
  apiKey: string,
  backendBase: string,
  fallbackColors: BrandColors,
  stdout: NodeJS.WriteStream,
): Promise<Brand> {
  let record: BrandRecord | undefined;
  if (draft.config.brandId) {
    try {
      const brands = await fetchJson<BrandRecord[]>(`${backendBase}/api/v1/brands`, apiKey);
      record = brands.find((item) => item.id === draft.config.brandId);
    } catch (err) {
      stdout.write(`  [brag] Failed to load brand ${draft.config.brandId}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  let logoBase64 = "";
  if (record?.logo_url) {
    try {
      logoBase64 = await fetchImageAsBase64(record.logo_url);
    } catch (err) {
      stdout.write(`  [brag] Failed to load logo ${record.logo_url}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  return {
    name: record?.name ?? "",
    logoBase64,
    website: record?.website ?? "",
    colors: record?.colors ?? draft.config.colors ?? fallbackColors,
    font_family: record?.font_family,
  };
}

function rewriteLocalVideoUrls(objectData: ObjectDataMap, port: number): void {
  for (const entry of Object.values(objectData)) {
    if (typeof entry.videoUrl === "string" && entry.videoUrl.startsWith("/media/")) {
      entry.videoUrl = `http://127.0.0.1:${port}${entry.videoUrl}`;
    }
  }
}

function firstAbsoluteVideoUrl(objectData: ObjectDataMap): string | null {
  return Object.values(objectData).find((entry) => entry.videoUrl?.startsWith("http"))?.videoUrl ?? null;
}

export async function resolveAndRenderVideo(
  draftId: string,
  format: FormatKey,
  apiKey: string,
  backendBase: string,
  outputDir: string,
  port: number,
  stdout: NodeJS.WriteStream,
  job: VideoRenderJob,
): Promise<void> {
  try {
    let draft: DraftResponse;
    try {
      draft = await fetchJson<DraftResponse>(`${backendBase}/api/v1/drafts/${encodeURIComponent(draftId)}`, apiKey);
    } catch (err) {
      if (err instanceof Error && err.message === "not-found") throw new Error(`Draft not found: ${draftId}`);
      throw err;
    }

    const templateConfig = await resolveTemplate(draft.config.templateId, apiKey, backendBase);
    const brand = await resolveBrand(draft, apiKey, backendBase, templateConfig.colors, stdout);
    const objectData = await buildObjectDataForCLI(templateConfig, draft.config.objectContent, format, stdout);
    rewriteLocalVideoUrls(objectData, port);

    const absoluteVideoUrl = firstAbsoluteVideoUrl(objectData);
    const clipFrames = absoluteVideoUrl ? await probeClipDurationInFrames(absoluteVideoUrl) : null;
    const COMPOSITION_FRAMES = 240;
    const videoDurationInFrames = clipFrames !== null && clipFrames < COMPOSITION_FRAMES ? clipFrames : COMPOSITION_FRAMES;

    const inputProps: LocalVideoRenderRequest["inputProps"] = {
      config: templateConfig,
      format,
      slides: [objectData],
      brand,
      slideDuration: 8,
      videoDurationInFrames,
    };

    const onBrowserDownload: OnBrowserDownload = () => ({
      version: null,
      onProgress: ({ alreadyAvailable, percent }) => {
        if (alreadyAvailable) return;
        job.phase = "chrome-download";
        job.downloadPct = Math.round(percent * 100);
        stdout.write(`  [brag] Chrome download: ${Math.round(percent * 100)}%\n`);
      },
    });

    const result = await renderVideo({
      compositionId: format,
      inputProps,
      remotionEntryPoint: REMOTION_ENTRY,
      onBrowserDownload,
      onProgress: ({ renderedFrames, totalFrames }) => {
        job.phase = "rendering";
        job.framesRendered = renderedFrames;
        job.totalFrames = totalFrames;
        stdout.write(`  [brag] Video: ${renderedFrames}/${totalFrames} frames\r`);
      },
    });

    const outPath = path.join(outputDir, draftId, `${format}.mp4`);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, result.buffer);
    job.phase = "done";
    job.url = `/output/${draftId}/${format}.mp4`;
    stdout.write(`  [brag] Video rendered: ${format}.mp4\n`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    stdout.write(`  [brag] Video render failed: ${error}\n`);
    job.phase = "failed";
    job.error = error;
  }
}
