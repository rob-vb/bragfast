import sharp from "sharp";
import type { ObjectDataMap } from "./canvas-renderer";
import type { FormatLayout } from "./canvas-types";
import type { Brand } from "./types";

export function injectStaticImages(
  slideDataMaps: ObjectDataMap[],
  formatLayout: FormatLayout,
  srcMap: Record<string, string>,
): void {
  if (Object.keys(srcMap).length === 0) return;
  for (const dataMap of slideDataMaps) {
    for (const obj of formatLayout.objects) {
      if (obj.type === "visual" && obj.src && srcMap[obj.src] && !dataMap[obj.id]?.imageBase64) {
        dataMap[obj.id] = { ...(dataMap[obj.id] ?? {}), imageBase64: srcMap[obj.src] };
      }
    }
  }
}

export function applySignatureDefaults(dataMap: ObjectDataMap, layout: FormatLayout, brand: Brand): void {
  const ids = new Set(layout.objects.map((obj) => obj.id));
  if (ids.has("signature_avatar") && !dataMap.signature_avatar?.imageBase64 && brand.logoBase64) {
    dataMap.signature_avatar = { ...(dataMap.signature_avatar ?? {}), imageBase64: brand.logoBase64 };
  }
  if (ids.has("signature_name") && !dataMap.signature_name?.text && brand.name) {
    dataMap.signature_name = { ...(dataMap.signature_name ?? {}), text: brand.name };
  }
}

export async function normalizeDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return dataUri;
  const raw = Buffer.from(match[1], "base64");
  const png = await sharp(raw).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
