import type { FormatLayout } from "../templates/canvas-types";
import type { ObjectDataMap } from "../templates/canvas-renderer";
import type { Brand } from "../types";

/** Fill signature_* objects from the brand profile when the slide carries no override.
 *  signature_avatar ← brand.logoBase64, signature_name ← brand.name.
 *  signature_title has no brand source — left empty (skipEmpty filters it out). */
export function applySignatureDefaults(
  dataMap: ObjectDataMap,
  layout: FormatLayout,
  brand: Brand,
): void {
  const ids = new Set(layout.objects.map((o) => o.id));
  if (ids.has("signature_avatar") && !dataMap.signature_avatar?.imageBase64 && brand.logoBase64) {
    dataMap.signature_avatar = { ...dataMap.signature_avatar, imageBase64: brand.logoBase64 };
  }
  if (ids.has("signature_name") && !dataMap.signature_name?.text && brand.name) {
    dataMap.signature_name = { ...dataMap.signature_name, text: brand.name };
  }
}
