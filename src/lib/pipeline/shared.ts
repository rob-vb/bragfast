import type { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { CanvasTemplateConfig, FormatKey, FormatLayout } from "../templates/canvas-types";
import { migrateConfig } from "../templates/canvas-types";
import { getDefaultConfig } from "../templates/default-configs";
import type { ObjectDataMap } from "../templates/canvas-renderer";
import { fetchImageAsBase64 } from "../images";
import type { Brand, BrandColors, ObjectModification } from "../types";

export async function resolveTemplate(
  templateName: string,
  userId: string,
  convex: ConvexHttpClient
): Promise<CanvasTemplateConfig> {
  const defaultConfig = getDefaultConfig(templateName);
  if (defaultConfig) return migrateConfig(defaultConfig);

  if (templateName.startsWith("tmpl_")) {
    const tmpl = await convex.query(api.templates.getByExternalId, { externalId: templateName });
    if (!tmpl) throw new Error(`Template not found: ${templateName}`);
    if (!tmpl.isDefault && tmpl.userId !== userId) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return migrateConfig(tmpl.config as CanvasTemplateConfig);
  }

  throw new Error(`Invalid template: ${templateName}`);
}

export async function resolveBrand(
  request: { brand_id?: string; name?: string; logo_url?: string; colors?: BrandColors; font_family?: string },
  fallbackColors: BrandColors,
  convex: ConvexHttpClient
): Promise<Brand> {
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

  // Inline brand from request — falls back to template's manual colors if none provided
  return {
    name: request.name ?? "",
    logoBase64: request.logo_url
      ? await fetchImageAsBase64(request.logo_url)
      : "",
    website: "",
    colors: request.colors ?? fallbackColors,
    font_family: request.font_family,
  };
}

export async function buildSlideDataMaps(
  slides: Array<{ objects?: ObjectModification[] }>
): Promise<ObjectDataMap[]> {
  return Promise.all(
    slides.map(async (s) => {
      if (!s.objects) return {};
      const dataMap: ObjectDataMap = {};
      for (const mod of s.objects) {
        const entry: ObjectDataMap[string] = {};
        if (mod.text) entry.text = mod.text;
        if (mod.image_url) entry.imageBase64 = await fetchImageAsBase64(mod.image_url);
        if (mod.font_family) entry.fontFamily = mod.font_family;
        if (mod.font_weight) entry.fontWeight = Number(mod.font_weight);
        if (mod.color) entry.color = mod.color;
        if (mod.image_frame) entry.imageFrame = mod.image_frame;
        if (mod.image_frame_color) entry.imageFrameColor = mod.image_frame_color;
        if (mod.anchor_x) entry.anchorX = mod.anchor_x;
        if (mod.anchor_y) entry.anchorY = mod.anchor_y;
        if (mod.entrance) entry.entrance = mod.entrance;
        if (mod.exit) entry.exit = mod.exit;
        dataMap[mod.id] = entry;
      }
      return dataMap;
    })
  );
}

export async function prefetchStaticImages(
  templateConfig: CanvasTemplateConfig
): Promise<Record<string, string>> {
  const staticSrcs = new Set<string>();
  for (const fKey of Object.keys(templateConfig.formats) as FormatKey[]) {
    const fLayout = templateConfig.formats[fKey];
    if (!fLayout) continue;
    for (const obj of fLayout.objects) {
      if (obj.type === "image" && obj.src) staticSrcs.add(obj.src);
    }
  }
  const srcMap: Record<string, string> = {};
  if (staticSrcs.size > 0) {
    const srcEntries = await Promise.all(
      [...staticSrcs].map(async (src) => [src, await fetchImageAsBase64(src)] as const)
    );
    Object.assign(srcMap, Object.fromEntries(srcEntries));
  }
  return srcMap;
}

export function injectStaticImages(
  slideDataMaps: ObjectDataMap[],
  formatLayout: FormatLayout,
  srcMap: Record<string, string>
): void {
  for (const obj of formatLayout.objects) {
    if (obj.type === "image" && obj.src && srcMap[obj.src]) {
      for (const dataMap of slideDataMaps) {
        if (!dataMap[obj.id]?.imageBase64) {
          dataMap[obj.id] = { ...dataMap[obj.id], imageBase64: srcMap[obj.src] };
        }
      }
    }
  }
}
