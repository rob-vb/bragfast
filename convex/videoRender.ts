"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { renderVideo } from "../src/lib/video/lambda";
import { uploadImage } from "../src/lib/storage/r2";
import { buildSlideDataMaps, prefetchStaticImages, injectStaticImages } from "../src/lib/pipeline/shared";
import { fetchImageAsBase64 } from "../src/lib/images";
import { getDefaultConfig } from "../src/lib/templates/default-configs";
import { migrateConfig } from "../src/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "../src/lib/templates/canvas-types";
import type { FormatKey } from "../src/lib/templates/canvas-types";
import type { CanvasTemplateConfig } from "../src/lib/templates/canvas-types";
import type { Brand, BrandColors, FormatEntry, VideoField } from "../src/lib/types";

const DEFAULT_SLIDE_DURATION = 5;
const TRANSITION_DURATION = 0.5;

function getSlideDuration(video: VideoField): number {
  if (video === true) return DEFAULT_SLIDE_DURATION;
  return video.duration ?? DEFAULT_SLIDE_DURATION;
}

function calculateVideoDuration(slideCount: number, slideDuration: number): number {
  if (slideCount <= 1) return slideDuration;
  return slideDuration * slideCount - (slideCount - 1) * TRANSITION_DURATION;
}

type VideoRenderRequest = {
  brand_id?: string;
  colors?: BrandColors;
  name?: string;
  logo_url?: string;
  font_family?: string;
  template?: string;
  formats: FormatEntry[];
  video: VideoField;
  webhook_url?: string;
  metadata?: string;
};

export const render = internalAction({
  args: {
    cookId: v.string(),
    userId: v.string(),
    request: v.string(), // JSON-serialized VideoRenderRequest
  },
  handler: async (ctx, { cookId, userId, request: requestJson }) => {
    const request: VideoRenderRequest = JSON.parse(requestJson);
    let partialRefundCount = 0;

    try {
      // Resolve template (inline — replaces ConvexHttpClient call)
      const templateName = request.template || "standard-browser";
      let templateConfig: CanvasTemplateConfig;

      const defaultConfig = getDefaultConfig(templateName);
      if (defaultConfig) {
        templateConfig = migrateConfig(defaultConfig);
      } else if (templateName.startsWith("tmpl_")) {
        const tmpl = await ctx.runQuery(internal.videoRenderHelpers.getTemplate, {
          externalId: templateName,
        });
        if (!tmpl) throw new Error(`Template not found: ${templateName}`);
        if (!tmpl.isDefault && tmpl.userId !== userId) {
          throw new Error(`Template not found: ${templateName}`);
        }
        templateConfig = migrateConfig(tmpl.config as CanvasTemplateConfig);
      } else {
        throw new Error(`Invalid template: ${templateName}`);
      }

      // Resolve brand (inline — replaces ConvexHttpClient call)
      let brand: Brand;
      if (request.brand_id) {
        const record = await ctx.runQuery(internal.videoRenderHelpers.getBrand, {
          externalId: request.brand_id,
        });
        if (record) {
          brand = {
            name: record.name,
            logoBase64: record.logo_url
              ? await fetchImageAsBase64(record.logo_url)
              : "",
            website: record.website ?? "",
            colors: record.colors,
            font_family: record.font_family,
          };
        } else {
          brand = {
            name: request.name ?? "",
            logoBase64: request.logo_url ? await fetchImageAsBase64(request.logo_url) : "",
            website: "",
            colors: request.colors ?? templateConfig.colors,
            font_family: request.font_family,
          };
        }
      } else {
        brand = {
          name: request.name ?? "",
          logoBase64: request.logo_url ? await fetchImageAsBase64(request.logo_url) : "",
          website: "",
          colors: request.colors ?? templateConfig.colors,
          font_family: request.font_family,
        };
      }

      const slideDuration = getSlideDuration(request.video);
      const srcMap = await prefetchStaticImages(templateConfig);

      // Render all formats in parallel
      const formatResults = await Promise.allSettled(
        request.formats.map(async (format) => {
          const formatKey = format.name as FormatKey;
          const dims = FORMAT_DIMENSIONS[formatKey];
          if (!dims) throw new Error(`Unknown format: ${format.name}`);

          const slideDataMaps = await buildSlideDataMaps(format.slides);
          const formatLayout =
            templateConfig.formats[formatKey] ?? templateConfig.formats.landscape;
          injectStaticImages(slideDataMaps, formatLayout, srcMap);

          // Fail if any slide has a missing image that should have been provided
          for (const dataMap of slideDataMaps) {
            for (const [objId, data] of Object.entries(dataMap)) {
              const obj = formatLayout.objects.find((o) => o.id === objId);
              if (obj?.type === "image" && !obj.src && !data.imageBase64) {
                throw new Error(
                  `Missing image for object "${objId}" in format "${format.name}"`
                );
              }
            }
          }

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
          };

          const duration = calculateVideoDuration(slideDataMaps.length, slideDuration);
          const filename = `${format.name}.mp4`;

          const mp4Url = await renderVideo({
            compositionId: formatKey,
            inputProps,
          });
          const mp4Response = await fetch(mp4Url);
          const mp4Buffer = Buffer.from(await mp4Response.arrayBuffer());
          const url = await uploadImage(
            mp4Buffer,
            `releases/${cookId}/${filename}`,
            "video/mp4"
          );

          return {
            name: format.name,
            data: {
              url,
              duration,
              dimensions: `${dims.width}x${dims.height}`,
            },
          };
        })
      );

      // Collect results and handle partial completion
      const videos: Record<
        string,
        { url: string; duration: number; dimensions: string }
      > = {};
      const failures: string[] = [];

      for (const result of formatResults) {
        if (result.status === "fulfilled") {
          videos[result.value.name] = result.value.data;
        } else {
          failures.push(result.reason?.message ?? "Unknown error");
        }
      }

      if (Object.keys(videos).length === 0) {
        throw new Error(`All formats failed: ${failures.join("; ")}`);
      }

      // Refund credits for failed formats only
      if (failures.length > 0) {
        partialRefundCount = failures.length;
        const refundAmount = failures.length * 5;
        console.warn(
          `[VIDEO] ${failures.length} format(s) failed for ${cookId}: ${failures.join("; ")}`
        );
        await ctx
          .runMutation(internal.videoRenderHelpers.refundCredits, {
            userId,
            amount: refundAmount,
          })
          .catch((err: unknown) =>
            console.error(`Failed to refund partial credits:`, err)
          );
      }

      await ctx.runMutation(internal.videoRenderHelpers.markReleaseCompleted, {
        externalId: cookId,
        videos,
      });

      // Webhook
      if (request.webhook_url) {
        const result = await ctx.runQuery(internal.videoRenderHelpers.getRelease, {
          externalId: cookId,
        });
        fetch(request.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        }).catch(console.error);
      }

      console.log(`[VIDEO] Render complete for ${cookId}`);
    } catch (error) {
      console.error(`Video render failed for ${cookId}:`, error);

      try {
        await ctx.runMutation(internal.videoRenderHelpers.markReleaseFailed, {
          externalId: cookId,
        });
      } catch (markErr) {
        console.error(`Failed to mark release as failed:`, markErr);
      }

      // Only refund formats not already refunded by partial-refund above
      try {
        const refundAmount = (request.formats.length - partialRefundCount) * 5;
        if (refundAmount > 0) {
          await ctx.runMutation(internal.videoRenderHelpers.refundCredits, {
            userId,
            amount: refundAmount,
          });
        }
      } catch (refundErr) {
        console.error(`Failed to refund credits:`, refundErr);
      }
    }
  },
});

