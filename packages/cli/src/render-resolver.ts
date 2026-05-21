import {
  getCanvasDefaultConfig,
  renderImage,
  type Brand,
  type BrandColors,
  type CanvasTemplateConfig,
  type FormatKey,
  type LocalRenderRequest,
  type ObjectDataMap,
} from "@bragfast/render-core/image";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getBragHome } from "./credentials";

const FORMAT_KEYS: FormatKey[] = ["landscape", "square", "portrait"];

export type FormatJobState =
  | { phase: "pending" }
  | { phase: "done"; url: string }
  | { phase: "failed"; error: string };

export interface RenderJob {
  jobId: string;
  draftId: string;
  formats: Record<"landscape" | "square" | "portrait", FormatJobState>;
  createdAt: number;
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

function pendingFormats(): RenderJob["formats"] {
  return {
    landscape: { phase: "pending" },
    square: { phase: "pending" },
    portrait: { phase: "pending" },
  };
}

function failAll(message: string): RenderJob["formats"] {
  return {
    landscape: { phase: "failed", error: message },
    square: { phase: "failed", error: message },
    portrait: { phase: "failed", error: message },
  };
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

async function prefetchStaticImages(templateConfig: CanvasTemplateConfig, stdout: NodeJS.WriteStream) {
  const urls = new Set<string>();
  if (templateConfig.background?.mode === "image") urls.add(templateConfig.background.imageUrl);
  for (const format of FORMAT_KEYS) {
    const layout = templateConfig.formats[format] ?? templateConfig.formats.landscape;
    for (const obj of layout.objects) {
      if (obj.type === "visual" && obj.src && /^https?:\/\//.test(obj.src)) urls.add(obj.src);
    }
  }

  const srcMap: Record<string, string> = {};
  for (const url of urls) {
    try {
      srcMap[url] = await fetchImageAsBase64(url);
    } catch (err) {
      stdout.write(`  [brag] Failed to load template image ${url}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
  return {
    srcMap,
    backgroundImageBase64:
      templateConfig.background?.mode === "image" ? srcMap[templateConfig.background.imageUrl] : undefined,
  };
}

export async function resolveAndRender(
  draftId: string,
  apiKey: string,
  backendBase: string,
  outputDir: string,
  port: number,
  stdout: NodeJS.WriteStream,
): Promise<RenderJob> {
  const createdAt = Date.now();
  const job: RenderJob = {
    jobId: draftId,
    draftId,
    formats: pendingFormats(),
    createdAt,
  };

  let draft: DraftResponse;
  try {
    draft = await fetchJson<DraftResponse>(`${backendBase}/api/v1/drafts/${encodeURIComponent(draftId)}`, apiKey);
  } catch (err) {
    if (err instanceof Error && err.message === "not-found") throw new Error(`Draft not found: ${draftId}`);
    throw err;
  }

  try {
    const templateConfig = await resolveTemplate(draft.config.templateId, apiKey, backendBase);
    const brand = await resolveBrand(draft, apiKey, backendBase, templateConfig.colors, stdout);
    const staticImages = await prefetchStaticImages(templateConfig, stdout);
    const request: LocalRenderRequest = {
      brand,
      formats: await Promise.all(
        FORMAT_KEYS.map(async (format) => ({
          name: format,
          slides: [
            {
              objectData: await buildObjectDataForCLI(templateConfig, draft.config.objectContent, format, stdout),
              templateConfig,
              backgroundImageBase64: staticImages.backgroundImageBase64,
              srcMap: staticImages.srcMap,
            },
          ],
        })),
      ),
    };

    const result = await renderImage(request);
    for (const format of FORMAT_KEYS) {
      const rendered = result.formats[format];
      if (!rendered?.slides[0]) {
        const error = `${format} render did not return an image`;
        stdout.write(`  [brag] ${error}\n`);
        job.formats[format] = { phase: "failed", error };
        continue;
      }

      try {
        const outPath = path.join(outputDir, draftId, `${format}.jpg`);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, rendered.slides[0]);
        job.formats[format] = { phase: "done", url: `/output/${draftId}/${format}.jpg` };
        stdout.write(`  [brag] ${format} rendered\n`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        stdout.write(`  [brag] ${format} write failed: ${error}\n`);
        job.formats[format] = { phase: "failed", error };
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    stdout.write(`  [brag] Render failed for ${draftId}: ${error}\n`);
    job.formats = failAll(error);
  }

  return job;
}
