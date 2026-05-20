import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { renderVideo as renderVideoCore } from "@bragfast/render-core";
import type { LocalVideoRenderRequest, VideoRenderResult } from "@bragfast/render-core";
import { renderVideo as renderVideoLambda } from "../video/lambda";
import { uploadImage } from "../storage/r2";
import { resolveTemplate, resolveBrand, buildSlideDataMaps, prefetchStaticImages, injectStaticImages } from "./shared";
import { FORMAT_DIMENSIONS } from "../templates/canvas-types";
import type { FormatKey } from "../templates/canvas-types";
import type { ReleaseResult, FormatEntry, VideoField, AnimationPreset } from "../types";
import { calculateCredits } from "../types";
import { probeMp4DurationSeconds } from "../video/probe";

const OUTPUT_LOCAL = process.env.OUTPUT_LOCAL === "true";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const DEFAULT_SLIDE_DURATION = 8;
const FPS = 30;

// Per-preset default slide duration. Presets with longer motion arcs
// need more runway so they don't feel rushed. Falls back to DEFAULT_SLIDE_DURATION.
const PRESET_DEFAULT_DURATION: Partial<Record<AnimationPreset, number>> = {
  "3d-tilt-angles": 12,
};

type VideoRenderRequest = {
  brand_id?: string;
  colors?: { background: string; text: string; primary: string };
  name?: string;
  logo_url?: string;
  font_family?: string;
  template?: string;
  formats: FormatEntry[];
  video: VideoField;
  webhook_url?: string;
  metadata?: string;
};

function getSlideDuration(video: VideoField, preset?: AnimationPreset): number {
  const requested = typeof video === "object" ? video.duration : undefined;
  if (requested !== undefined) return requested;
  if (preset && PRESET_DEFAULT_DURATION[preset] !== undefined) {
    return PRESET_DEFAULT_DURATION[preset]!;
  }
  return DEFAULT_SLIDE_DURATION;
}

function calculateVideoDuration(slideCount: number, slideDuration: number): number {
  return slideDuration * slideCount;
}

export function createVideoRelease(
  creditsUsed: number
): { cookId: string; result: ReleaseResult } {
  const cookId = `cook_${crypto.randomUUID().slice(0, 10)}`;
  return {
    cookId,
    result: {
      cook_id: cookId,
      output: "video" as const,
      status: "pending" as const,
      images: null,
      videos: null,
      credits_used: creditsUsed,
      credits_remaining: 0,
      created_at: new Date().toISOString(),
    },
  };
}

export async function renderVideoAsync(
  cookId: string,
  userId: string,
  request: VideoRenderRequest
) {
  let partialRefundCredits = 0; // credits already refunded (for partial failure)
  const creditsPerFormat = (request.formats[0]?.slides.length ?? 0) * 10;
  try {
    const templateName = request.template || "standard-browser";
    let templateConfig = await resolveTemplate(templateName, userId, convex);
    const brand = await resolveBrand(request, templateConfig.colors, convex);

    // Apply API-level animation preset override before resolving slide duration,
    // so preset-specific duration defaults (e.g. 3d-tilt-angles → 12s) apply.
    if (request.video && typeof request.video === 'object' && request.video.preset) {
      templateConfig = { ...templateConfig, animation_preset: request.video.preset };
    }

    const slideDuration = getSlideDuration(request.video, templateConfig.animation_preset);

    console.log(
      `[VIDEO] Render start cook=${cookId} template=${templateName} animation_preset=${templateConfig.animation_preset ?? "showcase"}`
    );

    const { srcMap } = await prefetchStaticImages(templateConfig);

    // Render formats sequentially to avoid Lambda concurrency limits
    const videos: Record<string, { url: string; duration: number; dimensions: string }> = {};
    const failures: string[] = [];

    for (const format of request.formats) {
      try {
        const formatKey = format.name as FormatKey;
        const dims = FORMAT_DIMENSIONS[formatKey];
        if (!dims) throw new Error(`Unknown format: ${format.name}`);

        // Build ObjectDataMaps for each slide
        const slideDataMaps = await buildSlideDataMaps(format.slides);
        const formatLayout = templateConfig.formats[formatKey] ?? templateConfig.formats.landscape;
        injectStaticImages(slideDataMaps, formatLayout, srcMap);

        // Fail if any visual has neither a video nor an image source
        for (const dataMap of slideDataMaps) {
          for (const [objId, data] of Object.entries(dataMap)) {
            const obj = formatLayout.objects.find(o => o.id === objId);
            if (obj?.type === "visual" && !obj.src && !data.imageBase64 && !data.videoUrl) {
              throw new Error(`Missing media for visual "${objId}" in format "${format.name}"`);
            }
          }
        }

        // Per-slide duration: stretch to fit the longest video on the slide,
        // never dipping below the default slide duration.
        const slideDurations = await Promise.all(
          slideDataMaps.map(async (dataMap) => {
            const videoUrls = Object.values(dataMap)
              .map((d) => d.videoUrl)
              .filter((u): u is string => !!u);
            if (videoUrls.length === 0) return slideDuration;
            const durations = await Promise.all(
              videoUrls.map((url) => probeMp4DurationSeconds(url))
            );
            const maxVideo = Math.max(0, ...durations.filter((d): d is number => d !== null));
            return Math.max(slideDuration, maxVideo);
          })
        );

        const inputProps = {
          config: templateConfig,
          format: formatKey,
          slides: slideDataMaps,
          brand: {
            name: brand.name,
            logoBase64: brand.logoBase64 ?? "",
            website: brand.website ?? "",
            colors: brand.colors,
            font_family: brand.font_family ?? "Plus Jakarta Sans",
          },
          slideDuration,
          slideDurations,
        };

        const duration = slideDurations.reduce((sum, d) => sum + d, 0);
        const filename = `${format.name}.mp4`;
        let url: string;

        if (OUTPUT_LOCAL) {
          const dir = path.join(process.cwd(), ".output", cookId);
          await mkdir(dir, { recursive: true });
          const outputPath = path.join(dir, filename);
          const coreReq: LocalVideoRenderRequest = {
            compositionId: formatKey,
            inputProps,
            remotionEntryPoint: path.join(process.cwd(), "src/remotion/index.ts"),
          };
          const coreResult: VideoRenderResult = await renderVideoCore(coreReq);
          await writeFile(outputPath, coreResult.buffer);
          url = `file://${outputPath}`;
        } else {
          const { outputUrl } = await renderVideoLambda({
            compositionId: formatKey,
            inputProps,
          });
          const mp4Response = await fetch(outputUrl);
          const mp4Buffer = Buffer.from(await mp4Response.arrayBuffer());
          url = await uploadImage(
            mp4Buffer,
            `releases/${cookId}/${filename}`,
            "video/mp4"
          );
        }

        videos[format.name] = { url, duration, dimensions: `${dims.width}x${dims.height}` };
      } catch (err: unknown) {
        failures.push(err instanceof Error ? err.message : "Unknown error");
      }
    }

    if (Object.keys(videos).length === 0) {
      throw new Error(`All formats failed: ${failures.join("; ")}`);
    }

    // Refund credits for failed formats only
    if (failures.length > 0) {
      const refundAmount = failures.length * creditsPerFormat;
      partialRefundCredits = refundAmount;
      console.warn(`[VIDEO] ${failures.length} format(s) failed for ${cookId}: ${failures.join("; ")}`);
      await convex.mutation(api.userProfiles.refund, {
        userId,
        amount: refundAmount,
      }).catch((err: Error) => console.error(`Failed to refund partial credits:`, err));
    }

    await convex.mutation(api.releases.markCompleted, {
      externalId: cookId,
      videos,
    });

    // Webhook
    if (request.webhook_url) {
      const result = await convex.query(api.releases.getByExternalId, {
        externalId: cookId,
      });
      fetch(request.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }).catch(console.error);
    }
  } catch (error) {
    console.error(`Video render failed for ${cookId}:`, error);

    try {
      await convex.mutation(api.releases.markFailed, { externalId: cookId });
    } catch (markErr) {
      console.error(`Failed to mark release as failed:`, markErr);
    }

    // Only refund formats not already refunded by partial-refund above
    try {
      const totalCredits = request.formats.length * creditsPerFormat;
      const refundAmount = totalCredits - partialRefundCredits;
      if (refundAmount > 0) {
        await convex.mutation(api.userProfiles.refund, {
          userId,
          amount: refundAmount,
        });
      }
    } catch (refundErr) {
      console.error(`Failed to refund credits:`, refundErr);
    }
  }
}
