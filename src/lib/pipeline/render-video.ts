import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { renderVideo } from "../video/lambda";
import { getDefaultVideoTemplate } from "../video/defaults";
import { fetchImageAsBase64 } from "../images";
import { calculateVideoDuration, VIDEO_DIMENSIONS } from "../video/types";
import { uploadImage } from "../storage/r2";
import type { VideoFormatEntry, VideoTemplateConfig } from "../video/types";
import type { ReleaseResult } from "../types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type VideoRenderRequest = {
  brand_id?: string;
  colors?: { background: string; text: string; primary: string };
  name?: string;
  logo_url?: string;
  font_family?: string;
  template?: string;
  formats: VideoFormatEntry[];
  webhook_url?: string;
  metadata?: string;
};

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
  try {
    // 1. Resolve brand
    const brand = await resolveBrand(request);

    // 2. Resolve video template
    const template = await resolveVideoTemplate(request.template, userId);

    // 3. Prefetch all images from scenes
    const imageMap = await prefetchSceneImages(request.formats);

    // 4. Render each format
    const videos: Record<string, { url: string; duration: number; dimensions: string }> = {};

    for (const format of request.formats) {
      const dims = VIDEO_DIMENSIONS[format.name];
      const inputProps = {
        template,
        scenes: format.scenes,
        brand: {
          name: brand.name,
          logoBase64: brand.logoBase64 ?? "",
          colors: brand.colors,
          fontFamily: brand.fontFamily ?? "Plus Jakarta Sans",
        },
        imageMap,
      };

      const mp4Url = await renderVideo({
        compositionId: format.name,
        inputProps,
      });

      // Download from Lambda S3 and upload to R2
      const mp4Response = await fetch(mp4Url);
      const mp4Buffer = Buffer.from(await mp4Response.arrayBuffer());
      const filename = `${format.name}.mp4`;
      const r2Url = await uploadImage(
        mp4Buffer,
        `releases/${cookId}/${filename}`,
        "video/mp4"
      );

      const duration = calculateVideoDuration(template);
      videos[format.name] = {
        url: r2Url,
        duration,
        dimensions: `${dims.width}x${dims.height}`,
      };
    }

    // 5. Mark completed
    await convex.mutation(api.releases.markCompleted, {
      externalId: cookId,
      videos,
    });

    // 6. Webhook
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

    try {
      await convex.mutation(api.userProfiles.refund, {
        userId,
        amount: request.formats.length * 5,
      });
    } catch (refundErr) {
      console.error(`Failed to refund credits:`, refundErr);
    }
  }
}

async function resolveBrand(request: VideoRenderRequest) {
  if (request.brand_id) {
    const brand = await convex.query(api.brands.getByExternalId, {
      externalId: request.brand_id,
    });
    if (!brand) throw new Error(`Brand not found: ${request.brand_id}`);
    let logoBase64 = "";
    if (brand.logo_url) {
      logoBase64 = await fetchImageAsBase64(brand.logo_url);
    }
    return {
      name: brand.name,
      logoBase64,
      colors: brand.colors,
      fontFamily: brand.font_family ?? "Plus Jakarta Sans",
    };
  }

  let logoBase64 = "";
  if (request.logo_url) {
    logoBase64 = await fetchImageAsBase64(request.logo_url);
  }
  return {
    name: request.name ?? "Brand",
    logoBase64,
    colors: request.colors ?? {
      background: "#1a1a2e",
      text: "#ffffff",
      primary: "#e94560",
    },
    fontFamily: request.font_family ?? "Plus Jakarta Sans",
  };
}

async function resolveVideoTemplate(
  templateName: string | undefined,
  userId: string
): Promise<VideoTemplateConfig> {
  const name = templateName ?? "product-update";

  const defaultTmpl = getDefaultVideoTemplate(name);
  if (defaultTmpl) return defaultTmpl;

  if (name.startsWith("vtmpl_")) {
    const custom = await convex.query(api.videoTemplates.getByExternalId, {
      externalId: name,
    });
    if (!custom) throw new Error(`Video template not found: ${name}`);
    return custom.config as VideoTemplateConfig;
  }

  throw new Error(`Unknown video template: ${name}`);
}

async function prefetchSceneImages(
  formats: VideoFormatEntry[]
): Promise<Record<string, string>> {
  const urls = new Set<string>();
  for (const format of formats) {
    for (const scene of format.scenes) {
      if (scene.image_url) urls.add(scene.image_url);
    }
  }

  const imageMap: Record<string, string> = {};
  await Promise.all(
    Array.from(urls).map(async (url) => {
      imageMap[url] = await fetchImageAsBase64(url);
    })
  );
  return imageMap;
}
