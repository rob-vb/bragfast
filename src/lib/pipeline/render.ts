import satori from "satori";
import sharp from "sharp";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { templates } from "../templates/registry";
import { loadFontsForFamily } from "../fonts";
import { fetchImageAsBase64 } from "../images";
import { uploadPng } from "../storage/r2";
import { ReleaseRequest, ReleaseResult, Brand, FORMAT_DIMENSIONS } from "../types";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function createRelease(
  request: ReleaseRequest,
  userId: string
): Promise<ReleaseResult> {
  const releaseId = `rel_${crypto.randomUUID().slice(0, 10)}`;
  const formats = request.formats || ["landscape", "square", "portrait"];
  const creditsUsed = request.slides.length * formats.length;

  await convex.mutation(api.releases.create, {
    userId,
    externalId: releaseId,
    template: request.template || "classic",
    credits_used: creditsUsed,
    transparent: request.transparent ?? false,
    metadata: request.metadata,
    webhook_url: request.webhook_url,
  });

  return {
    release_id: releaseId,
    status: "pending",
    images: null,
    credits_used: creditsUsed,
    credits_remaining: -1, // filled by caller
    created_at: new Date().toISOString(),
    transparent: request.transparent ?? false,
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
    release_id: r.externalId,
    status: r.status,
    images: r.images ?? null,
    credits_used: r.credits_used,
    credits_remaining: -1, // filled by caller
    created_at: r.created_at,
    completed_at: r.completed_at,
    transparent: r.transparent,
    metadata: r.metadata,
    webhook_url: r.webhook_url,
  };
}

async function resolveBrand(request: ReleaseRequest): Promise<Brand> {
  if (request.brand_id) {
    const record = await convex.query(api.brands.getByExternalId, {
      externalId: request.brand_id,
    });
    if (record) {
      return {
        name: record.name,
        logoBase64: record.logo_url
          ? await fetchImageAsBase64(record.logo_url)
          : "",
        website: record.website ?? "",
        colors: record.colors,
        font: record.font,
      };
    }
  }

  // Inline brand from request (validated upstream — colors guaranteed present)
  return {
    name: request.name ?? "",
    logoBase64: request.logo_url
      ? await fetchImageAsBase64(request.logo_url)
      : "",
    website: "",
    colors: request.colors!,
    font: request.font,
  };
}

export async function renderReleaseAsync(
  releaseId: string,
  request: ReleaseRequest,
  userId: string
): Promise<void> {
  try {
    const brand = await resolveBrand(request);
    const templateName = request.template || "classic";
    const template = templates[templateName];
    const formats = request.formats || ["landscape", "square", "portrait"];
    const fonts = await loadFontsForFamily(brand.font);
    const transparent = request.transparent ?? false;

    const slides = await Promise.all(
      request.slides.map(async (s) => ({
        title: s.title,
        description: s.description,
        imageBase64: s.image_url
          ? await fetchImageAsBase64(s.image_url)
          : undefined,
        device: s.device || ("browser" as const),
        align: s.align,
      }))
    );

    const images: Record<string, { slides: string[]; dimensions: string }> = {};

    for (const format of formats) {
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        const jsx = template({
          slide: slides[i],
          brand,
          width,
          height,
          transparent,
        });
        const svg = await satori(jsx, { width, height, fonts });
        const png = await sharp(Buffer.from(svg))
          .ensureAlpha()
          .png()
          .toBuffer();
        const filename = `${format}-${i + 1}.png`;
        const cdnUrl = await uploadPng(
          png,
          `releases/${releaseId}/${filename}`
        );
        slideUrls.push(cdnUrl);
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
    console.error(`Render failed for ${releaseId}:`, err);

    // Refund reserved credits on render failure
    const formats = request.formats || ["landscape", "square", "portrait"];
    const amount = request.slides.length * formats.length;
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
