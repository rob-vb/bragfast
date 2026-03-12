import satori from "satori";
import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { ConfigRenderer } from "../templates/config-renderer";
import { CanvasRenderer, type ObjectDataMap } from "../templates/canvas-renderer";
import { migrateConfig } from "../templates/canvas-types";
import { getDefaultConfig } from "../templates/default-configs";
import type { TemplateConfig } from "../templates/config-types";
import type { CanvasTemplateConfig, FormatKey } from "../templates/canvas-types";
import { loadFontsForFamily, loadFontsForObjects } from "../fonts";
import { fetchImageAsBase64 } from "../images";
import { uploadImage } from "../storage/r2";
import { ReleaseRequest, ReleaseResult, Brand, FORMAT_DIMENSIONS } from "../types";

const OUTPUT_LOCAL = process.env.OUTPUT_LOCAL === "true";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function isCanvasConfig(config: unknown): config is CanvasTemplateConfig {
  return typeof config === "object" && config !== null && "version" in config && (config as any).version === 2;
}

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
        font_family: record.font_family,
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
    font_family: request.font_family,
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

    // Resolve template config (v1 TemplateConfig or v2 CanvasTemplateConfig)
    let templateConfig: TemplateConfig | CanvasTemplateConfig;
    const defaultConfig = getDefaultConfig(templateName);
    if (defaultConfig) {
      templateConfig = defaultConfig;
    } else if (templateName.startsWith("tmpl_")) {
      const tmpl = await convex.query(api.templates.getByExternalId, { externalId: templateName });
      if (!tmpl) throw new Error(`Template not found: ${templateName}`);
      if (!tmpl.isDefault && tmpl.userId !== userId) {
        throw new Error(`Template not found: ${templateName}`);
      }
      templateConfig = tmpl.config as TemplateConfig | CanvasTemplateConfig;
    } else {
      throw new Error(`Invalid template: ${templateName}`);
    }

    const formats = request.formats || ["landscape", "square", "portrait"];
    const isCanvas = isCanvasConfig(templateConfig);
    if (isCanvas) {
      templateConfig = migrateConfig(templateConfig as CanvasTemplateConfig);
    }

    // Build per-slide object data maps
    const slideDataMaps: ObjectDataMap[] = await Promise.all(
      request.slides.map(async (s) => {
        if (s.objects) {
          const dataMap: ObjectDataMap = {};
          for (const mod of s.objects) {
            const entry: ObjectDataMap[string] = {};
            if (mod.text) entry.text = mod.text;
            if (mod.image_url) entry.imageBase64 = await fetchImageAsBase64(mod.image_url);
            if (mod.font_family) entry.fontFamily = mod.font_family;
            if (mod.color) entry.color = mod.color;
            if (mod.device_type) entry.deviceType = mod.device_type;
            if (mod.device_color) entry.deviceColor = mod.device_color;
            dataMap[mod.id] = entry;
          }
          return dataMap;
        }
        // Legacy format: title/description/image_url
        const dataMap: ObjectDataMap = {};
        if (s.title) dataMap["title"] = { text: s.title };
        if (s.description) dataMap["description"] = { text: s.description };
        if (s.image_url) {
          dataMap["image"] = { imageBase64: await fetchImageAsBase64(s.image_url) };
        }
        return dataMap;
      })
    );

    // Inject static images (src field) — fetch each unique URL once
    if (isCanvas) {
      const canvasConfig = templateConfig as CanvasTemplateConfig;
      const staticSrcs = new Set<string>();
      for (const fKey of Object.keys(canvasConfig.formats) as FormatKey[]) {
        for (const obj of canvasConfig.formats[fKey].objects) {
          if (obj.type === "image" && obj.src) staticSrcs.add(obj.src);
        }
      }
      if (staticSrcs.size > 0) {
        const srcEntries = await Promise.all(
          [...staticSrcs].map(async (src) => [src, await fetchImageAsBase64(src)] as const)
        );
        const srcMap = Object.fromEntries(srcEntries);
        // For each format's objects, inject into every slide's data map (API override wins)
        for (const fKey of Object.keys(canvasConfig.formats) as FormatKey[]) {
          for (const obj of canvasConfig.formats[fKey].objects) {
            if (obj.type === "image" && obj.src) {
              for (const dataMap of slideDataMaps) {
                if (!dataMap[obj.id]?.imageBase64) {
                  dataMap[obj.id] = { ...dataMap[obj.id], imageBase64: srcMap[obj.src] };
                }
              }
            }
          }
        }
      }
    }

    // Build legacy slide format for v1 ConfigRenderer
    const legacySlides = !isCanvas
      ? await Promise.all(
          request.slides.map(async (s) => ({
            title: s.title || "",
            description: s.description,
            imageBase64: s.image_url ? await fetchImageAsBase64(s.image_url) : undefined,
            device: s.device || ("browser" as const),
            align: s.align,
          }))
        )
      : [];

    const images: Record<string, { slides: string[]; dimensions: string }> = {};

    for (const format of formats) {
      const { width, height } = FORMAT_DIMENSIONS[format];
      const slideUrls: string[] = [];

      // Font loading per-format: canvas configs may use different fonts per format
      // Also load brand font and any per-object font overrides
      let fonts = isCanvas
        ? await loadFontsForObjects((templateConfig as CanvasTemplateConfig).formats[format as FormatKey].objects)
        : await loadFontsForFamily(brand.font_family);
      if (isCanvas && brand.font_family) {
        const brandFonts = await loadFontsForFamily(brand.font_family);
        fonts = [...fonts, ...brandFonts];
      }
      // Load fonts for per-object font_family overrides
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

      for (let i = 0; i < slideDataMaps.length; i++) {
        const jsx = isCanvas
          ? CanvasRenderer({
              config: templateConfig as CanvasTemplateConfig,
              format: format as FormatKey,
              objectData: slideDataMaps[i],
              brand,
            })
          : ConfigRenderer({
              config: templateConfig as TemplateConfig,
              slide: legacySlides[i],
              brand,
              width,
              height,
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
