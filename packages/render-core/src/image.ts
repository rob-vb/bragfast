import satori from "satori";
import sharp from "sharp";
import { CanvasRenderer } from "./canvas-renderer";
import { FORMAT_DIMENSIONS } from "./canvas-types";
import type { FormatKey } from "./canvas-types";
import { loadFontsForFamily, loadFontsForObjects } from "./fonts";
import { applySignatureDefaults, injectStaticImages, normalizeDataUri } from "./pure-helpers";
import type { ImageRenderResult, LocalRenderRequest } from "./types";

export async function renderImage(req: LocalRenderRequest): Promise<ImageRenderResult> {
  const result: ImageRenderResult = { formats: {} };

  for (const formatEntry of req.formats) {
    const format = formatEntry.name as FormatKey;
    const { width, height } = FORMAT_DIMENSIONS[format];
    const slideBuffers: Buffer[] = [];
    const fonts = [];
    const seenLayouts = new Set<string>();

    for (const slide of formatEntry.slides) {
      const layout = slide.templateConfig.formats[format] ?? slide.templateConfig.formats.landscape;
      const layoutKey = JSON.stringify(layout.objects.map((obj) => obj.id));
      if (seenLayouts.has(layoutKey)) continue;
      seenLayouts.add(layoutKey);
      fonts.push(...(await loadFontsForObjects(layout.objects)));
    }

    if (req.brand.font_family) {
      fonts.push(...(await loadFontsForFamily(req.brand.font_family)));
    }

    const overrideFonts = new Map<string, Set<number>>();
    for (const slide of formatEntry.slides) {
      for (const entry of Object.values(slide.objectData)) {
        if (!entry.fontFamily) continue;
        if (!overrideFonts.has(entry.fontFamily)) overrideFonts.set(entry.fontFamily, new Set());
        if (entry.fontWeight) overrideFonts.get(entry.fontFamily)!.add(entry.fontWeight);
      }
    }
    for (const [family, weights] of overrideFonts) {
      fonts.push(...(await loadFontsForFamily(family, weights)));
    }

    for (const slide of formatEntry.slides) {
      for (const entry of Object.values(slide.objectData)) {
        if (entry.imageBase64) {
          entry.imageBase64 = await normalizeDataUri(entry.imageBase64);
        }
      }

      const layout = slide.templateConfig.formats[format] ?? slide.templateConfig.formats.landscape;
      injectStaticImages([slide.objectData], layout, slide.srcMap ?? {});
      applySignatureDefaults(slide.objectData, layout, req.brand);

      const jsx = CanvasRenderer({
        config: slide.templateConfig,
        format,
        objectData: slide.objectData,
        brand: req.brand,
        backgroundImageBase64: slide.backgroundImageBase64,
        skipEmpty: true,
      });
      const svg = await satori(jsx, { width, height, fonts });
      const jpg = await sharp(Buffer.from(svg)).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
      slideBuffers.push(jpg);
    }

    result.formats[format] = { slides: slideBuffers, dimensions: `${width}x${height}` };
  }

  return result;
}
