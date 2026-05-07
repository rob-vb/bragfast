import satori from "satori";
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { CanvasRenderer } from "../templates/canvas-renderer";
import type { CanvasTemplateConfig, FormatKey } from "../templates/canvas-types";
import { loadFontsForFamily, loadFontsForObjects } from "../fonts";
import { uploadImage } from "../storage/r2";
import { ReleaseRequest, ReleaseResult, FORMAT_DIMENSIONS, calculateCredits } from "../types";
import { resolveTemplate, resolveAllTemplates, resolveBrand, buildSlideDataMaps, prefetchStaticImages, injectStaticImages, applySignatureDefaults } from "./shared";
import { collectUploadKeys, cleanupUploads } from "./cleanup";

const OUTPUT_LOCAL = process.env.OUTPUT_LOCAL === "true";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function createRelease(
  request: ReleaseRequest,
  userId: string,
  sourceInfo?: { source: "api" }
): Promise<ReleaseResult> {
  const releaseId = `cook_${crypto.randomUUID().slice(0, 10)}`;
  const creditsUsed = calculateCredits({ formats: request.formats });

  await convex.mutation(api.releases.create, {
    userId,
    externalId: releaseId,
    template: request.template || "standard-browser",
    credits_used: creditsUsed,
    metadata: request.metadata,
    webhook_url: request.webhook_url,
    source: sourceInfo?.source,
  });

  return {
    cook_id: releaseId,
    output: "image" as const,
    status: "pending" as const,
    images: null,
    credits_used: creditsUsed,
    credits_remaining: -1, // filled by caller
    created_at: new Date().toISOString(),
    metadata: request.metadata,
    webhook_url: request.webhook_url,
  };
}

export async function getRelease(
  releaseId: string
): Promise<ReleaseResult | null> {
  const r = await convex.query(api.releases.getByExternalId, {
    externalId: releaseId,
  });
  if (!r) return null;
  return {
    cook_id: r.externalId,
    output: (r.output ?? "image") as "image" | "video",
    status: r.status,
    images: r.images ?? null,
    videos: r.videos ?? null,
    credits_used: r.credits_used,
    credits_remaining: -1, // filled by caller
    progress: r.progress,
    created_at: r.created_at,
    completed_at: r.completed_at,
    metadata: r.metadata,
    webhook_url: r.webhook_url,
    socialCopy: r.socialCopy ? JSON.parse(r.socialCopy) : null,
  };
}

export async function renderReleaseAsync(
  releaseId: string,
  request: ReleaseRequest,
  userId: string
): Promise<void> {
  const uploadKeys = collectUploadKeys(request.formats);
  try {
    const templateName = request.template || "standard-browser";

    const templates = await resolveAllTemplates(templateName, request.formats, userId, convex, "image");
    const baseConfig = templates.get(templateName)!;
    const resolveSlideConfig = (slide: { templateId?: string }) =>
      templates.get(slide.templateId ?? templateName) ?? baseConfig;

    validateImageOutputSources(request, resolveSlideConfig);

    const brand = await resolveBrand(request, baseConfig.colors, convex);

    const images: Record<string, { slides: string[]; dimensions: string }> = {};

    // Collect static image srcs across every unique template referenced
    const aggregateSrcMap: Record<string, string> = {};
    const bgPerTemplate = new Map<string, string | undefined>();
    for (const [name, cfg] of templates) {
      const { srcMap, backgroundImageBase64 } = await prefetchStaticImages(cfg);
      Object.assign(aggregateSrcMap, srcMap);
      bgPerTemplate.set(name, backgroundImageBase64);
    }

    for (const formatEntry of request.formats) {
      const format = formatEntry.name;
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];

      // Build slideDataMaps for THIS format's slides
      const slideDataMaps = await buildSlideDataMaps(formatEntry.slides);

      // Normalize all fetched images through Sharp for Satori compatibility
      for (const dataMap of slideDataMaps) {
        for (const entry of Object.values(dataMap)) {
          if (entry.imageBase64) {
            entry.imageBase64 = await normalizeDataUri(entry.imageBase64);
          }
        }
      }

      // Inject static images and propagate brand-default signature data per slide
      formatEntry.slides.forEach((slide, idx) => {
        const cfg = resolveSlideConfig(slide);
        const layout = cfg.formats[format as FormatKey] ?? cfg.formats.landscape;
        injectStaticImages([slideDataMaps[idx]], layout, aggregateSrcMap);
        applySignatureDefaults(slideDataMaps[idx], layout, brand);
      });

      // Font loading: aggregate over every layout used by this format's slides
      const seenLayouts = new Set<string>();
      let fonts: Awaited<ReturnType<typeof loadFontsForObjects>> = [];
      for (const slide of formatEntry.slides) {
        const cfg = resolveSlideConfig(slide);
        const layout = cfg.formats[format as FormatKey] ?? cfg.formats.landscape;
        const key = slide.templateId ?? templateName;
        if (seenLayouts.has(key)) continue;
        seenLayouts.add(key);
        const layoutFonts = await loadFontsForObjects(layout.objects);
        fonts = [...fonts, ...layoutFonts];
      }
      if (brand.font_family) {
        const brandFonts = await loadFontsForFamily(brand.font_family);
        fonts = [...fonts, ...brandFonts];
      }
      const overrideFonts = new Map<string, Set<number>>();
      for (const dataMap of slideDataMaps) {
        for (const entry of Object.values(dataMap)) {
          if (entry.fontFamily) {
            if (!overrideFonts.has(entry.fontFamily)) overrideFonts.set(entry.fontFamily, new Set());
            if (entry.fontWeight) overrideFonts.get(entry.fontFamily)!.add(entry.fontWeight);
          }
        }
      }
      for (const [family, weights] of overrideFonts) {
        const loaded = await loadFontsForFamily(family, weights);
        fonts = [...fonts, ...loaded];
      }

      // Render slides
      for (let i = 0; i < slideDataMaps.length; i++) {
        const slide = formatEntry.slides[i];
        const slideConfig = resolveSlideConfig(slide);
        const slideTemplateName = slide.templateId ?? templateName;
        const jsx = CanvasRenderer({
          config: slideConfig,
          format: format as FormatKey,
          objectData: slideDataMaps[i],
          brand,
          backgroundImageBase64: bgPerTemplate.get(slideTemplateName),
          skipEmpty: true,
        });
        const svg = await satori(jsx, { width, height, fonts });
        const jpg = await sharp(Buffer.from(svg))
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 85 })
          .toBuffer();
        const filename = `${format}-${i + 1}.jpg`;
        let url: string;
        if (OUTPUT_LOCAL) {
          const dir = path.join(process.cwd(), ".output", releaseId);
          await mkdir(dir, { recursive: true });
          const filePath = path.join(dir, filename);
          await writeFile(filePath, jpg);
          url = `file://${filePath}`;
        } else {
          url = await uploadImage(jpg, `releases/${releaseId}/${filename}`);
        }
        slideUrls.push(url);
      }

      images[format] = {
        slides: slideUrls,
        dimensions: `${width}x${height}`,
      };
    }

    await convex.mutation(api.releases.markCompleted, {
      externalId: releaseId,
      images,
    });

    // Credits already reserved by the route handler — no deduction needed here

    if (request.webhook_url) {
      const result = await getRelease(releaseId);
      if (result) await callWebhook(request.webhook_url, result);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error(`Render failed for ${releaseId}: ${errMsg}`);

    // Refund reserved credits on render failure
    const amount = calculateCredits({ formats: request.formats });
    try {
      await convex.mutation(api.userProfiles.refund, { userId, amount });
    } catch (refundErr) {
      console.error(`Failed to refund credits:`, refundErr);
    }

    try {
      await convex.mutation(api.releases.markFailed, {
        externalId: releaseId,
      });
    } catch (markErr) {
      console.error(`Failed to mark release as failed:`, markErr);
    }

    if (request.webhook_url) {
      const result = await getRelease(releaseId);
      if (result) await callWebhook(request.webhook_url, result);
    }
  } finally {
    await cleanupUploads(uploadKeys).catch((err) =>
      console.error(`Upload cleanup error for ${releaseId}:`, err)
    );
  }
}

/** Image output requires each visual to have either an image_url (per slide) or a
 *  static src (on the template). Fail fast if a visual was given only video_url. */
function validateImageOutputSources(
  request: ReleaseRequest,
  resolveSlideConfig: (slide: { templateId?: string }) => CanvasTemplateConfig
): void {
  for (const formatEntry of request.formats) {
    const format = formatEntry.name;
    formatEntry.slides.forEach((slide, i) => {
      if (!slide.objects) return;
      const cfg = resolveSlideConfig(slide);
      const layout = cfg.formats[format as FormatKey] ?? cfg.formats.landscape;
      const templateStaticSrc = new Map<string, string | undefined>();
      for (const obj of layout.objects) {
        if (obj.type === "visual") templateStaticSrc.set(obj.id, obj.src);
      }
      for (const mod of slide.objects) {
        if (!mod.video_url || mod.image_url) continue;
        if (!templateStaticSrc.has(mod.id)) continue; // not a visual in this template — ignore
        const hasStatic = !!templateStaticSrc.get(mod.id);
        if (!hasStatic) {
          throw new Error(
            `Visual "${mod.id}" on slide ${i + 1} (${format}) has video_url but no image_url — image output requires an image.`
          );
        }
      }
    });
  }
}

async function normalizeDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return dataUri;
  const raw = Buffer.from(match[1], "base64");
  const png = await sharp(raw).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function callWebhook(
  url: string,
  payload: ReleaseResult
): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`Webhook delivery failed to ${url}:`, err);
  }
}
