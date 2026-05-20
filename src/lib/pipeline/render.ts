import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { renderImage } from "@bragfast/render-core";
import type { ImageRenderResult, LocalRenderRequest } from "@bragfast/render-core";
import type { CanvasTemplateConfig, FormatKey } from "../templates/canvas-types";
import { uploadImage } from "../storage/r2";
import { ReleaseRequest, ReleaseResult, FORMAT_DIMENSIONS, calculateCredits } from "../types";
import { resolveAllTemplates, resolveBrand, buildSlideDataMaps, prefetchStaticImages } from "./shared";
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

    const templates = await resolveAllTemplates(templateName, request.formats, userId, convex);
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

    if (request.logo_url && !brand.logoBase64) {
      throw new Error(
        `render-core purity violation: brand "${brand.name}" has logo_url but logoBase64 is missing. ` +
          "resolveBrand() must fetch and embed the logo as base64 before calling renderImage()."
      );
    }

    const coreReq: LocalRenderRequest = { brand, formats: [] };
    for (const formatEntry of request.formats) {
      const format = formatEntry.name;
      const slideDataMaps = await buildSlideDataMaps(formatEntry.slides);
      coreReq.formats.push({
        name: format,
        slides: formatEntry.slides.map((slide, idx) => {
          const slideTemplateName = slide.templateId ?? templateName;
          return {
            objectData: slideDataMaps[idx],
            templateConfig: resolveSlideConfig(slide),
            backgroundImageBase64: bgPerTemplate.get(slideTemplateName),
            srcMap: aggregateSrcMap,
          };
        }),
      });
    }

    const coreResult: ImageRenderResult = await renderImage(coreReq);

    for (const formatEntry of request.formats) {
      const format = formatEntry.name;
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];
      const rendered = coreResult.formats[format];
      if (!rendered) throw new Error(`render-core did not return format "${format}"`);

      for (let i = 0; i < rendered.slides.length; i++) {
        const jpg = rendered.slides[i];
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
