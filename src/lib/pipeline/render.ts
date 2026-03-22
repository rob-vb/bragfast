import satori from "satori";
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { CanvasRenderer } from "../templates/canvas-renderer";
import type { FormatKey } from "../templates/canvas-types";
import { loadFontsForFamily, loadFontsForObjects } from "../fonts";
import { uploadImage } from "../storage/r2";
import { ReleaseRequest, ReleaseResult, FORMAT_DIMENSIONS, calculateCredits } from "../types";
import { resolveTemplate, resolveBrand, buildSlideDataMaps, prefetchStaticImages, injectStaticImages } from "./shared";

const OUTPUT_LOCAL = process.env.OUTPUT_LOCAL === "true";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function createRelease(
  request: ReleaseRequest,
  userId: string,
  sourceInfo?: { source: "api" | "github"; sourceMetadata?: string }
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
    sourceMetadata: sourceInfo?.sourceMetadata,
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
  try {
    const templateName = request.template || "standard-browser";

    const templateConfig = await resolveTemplate(templateName, userId, convex);

    const brand = await resolveBrand(request, templateConfig.colors, convex);

    const images: Record<string, { slides: string[]; dimensions: string }> = {};

    // Collect all static image src URLs across all formats (fetch once)
    const srcMap = await prefetchStaticImages(templateConfig);

    for (const formatEntry of request.formats) {
      const format = formatEntry.name;
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];

      // Build slideDataMaps for THIS format's slides
      const slideDataMaps = await buildSlideDataMaps(formatEntry.slides);

      // Inject static images for this format
      const formatLayout = templateConfig.formats[format as FormatKey] ?? templateConfig.formats.landscape;
      injectStaticImages(slideDataMaps, formatLayout, srcMap);

      // Font loading
      let fonts = await loadFontsForObjects(formatLayout.objects);
      if (brand.font_family) {
        const brandFonts = await loadFontsForFamily(brand.font_family);
        fonts = [...fonts, ...brandFonts];
      }
      const overrideFamilies = new Set<string>();
      for (const dataMap of slideDataMaps) {
        for (const entry of Object.values(dataMap)) {
          if (entry.fontFamily) overrideFamilies.add(entry.fontFamily);
        }
      }
      for (const family of overrideFamilies) {
        const overrideFonts = await loadFontsForFamily(family);
        fonts = [...fonts, ...overrideFonts];
      }

      // Render slides
      for (let i = 0; i < slideDataMaps.length; i++) {
        const jsx = CanvasRenderer({
          config: templateConfig,
          format: format as FormatKey,
          objectData: slideDataMaps[i],
          brand,
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
