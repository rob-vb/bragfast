"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { renderVideo, cleanupRender } from "../src/lib/video/lambda";
import { makeInvokeHyperframesLambda } from "../src/lib/video/hyperframes-lambda";
import { uploadImage } from "../src/lib/storage/r2";
import { createPresignedUploadUrl } from "../src/lib/storage/r2";
import { buildSlideDataMaps, prefetchStaticImages, injectStaticImages } from "../src/lib/pipeline/shared";
import { collectUploadKeys, cleanupUploads } from "../src/lib/pipeline/cleanup";
import { fetchImageAsBase64 } from "../src/lib/images";
import { getDefaultConfig } from "../src/lib/templates/default-configs";
import { migrateConfig } from "../src/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "../src/lib/templates/canvas-types";
import type { FormatKey } from "../src/lib/templates/canvas-types";
import type { CanvasTemplateConfig } from "../src/lib/templates/canvas-types";
import { calculateCredits, type Brand, type BrandColors, type FormatEntry, type VideoField } from "../src/lib/types";
import { probeMp4DurationSeconds } from "../src/lib/video/probe";
import {
  getHyperframesTemplate,
  isHyperframesTemplate,
} from "../src/lib/templates/hyperframes-templates";
import type { HyperframeFormat } from "../src/lib/pipeline/render-hyperframe";

const DEFAULT_SLIDE_DURATION = 8;
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
  variables?: Record<string, unknown>;
};

const HYPERFRAME_DIMENSIONS: Record<HyperframeFormat, string> = {
  landscape: "1200x676",
  square: "1080x1080",
  portrait: "1080x1350",
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
    const uploadKeys = collectUploadKeys(request.formats);

    try {
      // Resolve template (inline — replaces ConvexHttpClient call)
      const templateName = request.template || "standard-browser";

      if (isHyperframesTemplate(templateName)) {
        const meta = getHyperframesTemplate(templateName);
        if (!meta) throw new Error(`Unknown hyperframes template: ${templateName}`);

        const functionName = process.env.HYPERFRAMES_FUNCTION_NAME;
        if (!functionName) throw new Error("HYPERFRAMES_FUNCTION_NAME is not set");

        let brandName = request.name ?? "";
        let logoUrl = request.logo_url;
        let colors = request.colors ?? {
          background: "#fff8f0",
          text: "#4a3326",
          primary: "#d97706",
        };

        if (request.brand_id) {
          const record = await ctx.runQuery(internal.videoRenderHelpers.getBrand, {
            externalId: request.brand_id,
          });
          if (record) {
            if (record.userId !== userId) throw new Error("Brand not found");
            brandName = record.name;
            logoUrl = record.logo_url;
            colors = record.colors;
          }
        }

        const duration =
          (typeof request.video === "object" && request.video?.duration) ||
          meta.defaultDurationSeconds;
        const variables = {
          brandName,
          ...(request.variables ?? {}),
          __bg: colors.background,
          __text: colors.text,
          __primary: colors.primary,
          ...(logoUrl ? { __logo: logoUrl } : {}),
        };

        const lambda = new LambdaClient({
          region: process.env.AWS_REGION ?? "us-east-1",
        });
        const invokeLambda = makeInvokeHyperframesLambda({
          functionName,
          send: (cmd) => lambda.send(cmd),
        });

        const videos: Record<
          string,
          { url: string; duration: number; dimensions: string }
        > = {};
        const failures: Array<{ format: HyperframeFormat; reason: string; credits: number }> = [];

        for (const formatEntry of request.formats) {
          const format = formatEntry.name as HyperframeFormat;
          const credits = Math.max(1, formatEntry.slides.length) * 5;
          try {
            if (!meta.formats.includes(format)) {
              throw new Error(`Template "${meta.id}" does not support format "${format}"`);
            }
            const key = `releases/${cookId}/${format}.mp4`;
            const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
              key,
              "video/mp4",
              600,
            );
            const result = await invokeLambda({
              templateId: meta.id,
              variables,
              format,
              duration,
              presignedPutUrl: uploadUrl,
            });
            if (!result.ok) throw new Error(result.reason);
            videos[format] = {
              url: publicUrl,
              duration,
              dimensions: HYPERFRAME_DIMENSIONS[format],
            };
          } catch (err) {
            failures.push({
              format,
              credits,
              reason: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (Object.keys(videos).length === 0) {
          await ctx.runMutation(internal.videoRenderHelpers.markReleaseFailed, {
            externalId: cookId,
          });
          await ctx.runMutation(internal.videoRenderHelpers.refundCredits, {
            userId,
            amount: calculateCredits({ video: request.video, formats: request.formats }),
          });
          console.error(
            `Hyperframes render failed for ${cookId}: ${failures.map((f) => `${f.format}: ${f.reason}`).join("; ")}`,
          );
          return;
        }

        if (failures.length > 0) {
          await ctx.runMutation(internal.videoRenderHelpers.refundCredits, {
            userId,
            amount: failures.reduce((sum, f) => sum + f.credits, 0),
          });
          console.warn(
            `[VIDEO] ${failures.length} hyperframe format(s) failed for ${cookId}: ${failures.map((f) => `${f.format}: ${f.reason}`).join("; ")}`,
          );
        }

        await ctx.runMutation(internal.videoRenderHelpers.markReleaseCompleted, {
          externalId: cookId,
          videos,
        });

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

        console.log(`[VIDEO] Hyperframes render complete for ${cookId}`);
        return;
      }

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

      // Apply API-level animation preset override
      if (request.video && typeof request.video === 'object' && request.video.preset) {
        templateConfig = { ...templateConfig, animation_preset: request.video.preset };
      }

      console.log(
        `[VIDEO] Render start cook=${cookId} template=${templateName} animation_preset=${templateConfig.animation_preset ?? "showcase"}`
      );

      const { srcMap } = await prefetchStaticImages(templateConfig);

      // Render formats sequentially to avoid Lambda concurrency limits
      const videos: Record<
        string,
        { url: string; duration: number; dimensions: string }
      > = {};
      const failures: string[] = [];
      const totalFormats = request.formats.length;

      for (let fi = 0; fi < request.formats.length; fi++) {
        const format = request.formats[fi];
        try {
          const formatKey = format.name as FormatKey;
          const dims = FORMAT_DIMENSIONS[formatKey];
          if (!dims) throw new Error(`Unknown format: ${format.name}`);

          const slideDataMaps = await buildSlideDataMaps(format.slides);
          const formatLayout =
            templateConfig.formats[formatKey] ?? templateConfig.formats.landscape;
          injectStaticImages(slideDataMaps, formatLayout, srcMap);

          // Fail if any visual has neither a video nor an image source
          for (const dataMap of slideDataMaps) {
            for (const [objId, data] of Object.entries(dataMap)) {
              const obj = formatLayout.objects.find((o) => o.id === objId);
              if (obj?.type === "visual" && !obj.src && !data.imageBase64 && !data.videoUrl) {
                throw new Error(
                  `Missing media for visual "${objId}" in format "${format.name}"`
                );
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

          const slideCount = slideDataMaps.length;
          const sumSlides = slideDurations.reduce((sum, d) => sum + d, 0);
          const duration = slideCount <= 1
            ? sumSlides
            : sumSlides - (slideCount - 1) * TRANSITION_DURATION;
          const filename = `${format.name}.mp4`;

          const { outputUrl, renderId, bucketName } = await renderVideo({
            compositionId: formatKey,
            inputProps,
            onProgress: async (pct) => {
              // Scale per-format progress across total formats
              const overall = Math.round((fi * 100 + pct) / totalFormats);
              await ctx.runMutation(internal.videoRenderHelpers.updateProgress, {
                externalId: cookId,
                progress: Math.min(overall, 99), // 100 only on completion
              });
            },
          });
          const mp4Response = await fetch(outputUrl);
          const mp4Buffer = Buffer.from(await mp4Response.arrayBuffer());
          const url = await uploadImage(
            mp4Buffer,
            `releases/${cookId}/${filename}`,
            "video/mp4"
          );

          videos[format.name] = { url, duration, dimensions: `${dims.width}x${dims.height}` };

          // Clean up Remotion Lambda render artifacts from S3
          cleanupRender(renderId, bucketName).catch(() => {});
        } catch (err: unknown) {
          failures.push(err instanceof Error ? err.message : "Unknown error");
        }
      }

      if (Object.keys(videos).length === 0) {
        throw new Error(`All formats failed: ${failures.join("; ")}`);
      }

      // Refund credits for failed formats only
      if (failures.length > 0) {
        partialRefundCount = failures.length;
        const slidesPerFormat = request.formats[0]?.slides.length ?? 1;
        const refundAmount = failures.length * slidesPerFormat * 5;
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
        const slidesPerFormat = request.formats[0]?.slides.length ?? 1;
        const refundAmount = (request.formats.length - partialRefundCount) * slidesPerFormat * 5;
        if (refundAmount > 0) {
          await ctx.runMutation(internal.videoRenderHelpers.refundCredits, {
            userId,
            amount: refundAmount,
          });
        }
      } catch (refundErr) {
        console.error(`Failed to refund credits:`, refundErr);
      }
    } finally {
      await cleanupUploads(uploadKeys).catch((err) =>
        console.error(`Upload cleanup error for ${cookId}:`, err)
      );
    }
  },
});
