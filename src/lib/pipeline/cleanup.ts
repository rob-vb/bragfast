import { isR2Url, keyFromUrl, deleteByKey } from "../storage/r2";
import type { FormatEntry } from "../types";

/**
 * Collect R2 keys for user-uploaded images from request formats.
 * Only collects keys under the "uploads/" prefix — brand logos and
 * release assets are left untouched.
 */
export function collectUploadKeys(formats: FormatEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const format of formats) {
    for (const slide of format.slides) {
      if (!slide.objects) continue;
      for (const obj of slide.objects) {
        if (!obj.image_url) continue;
        if (!isR2Url(obj.image_url)) continue;
        const key = keyFromUrl(obj.image_url);
        if (key && key.startsWith("uploads/")) {
          keys.add(key);
        }
      }
    }
  }
  return keys;
}

/**
 * Delete uploaded source images from R2. Fire-and-forget —
 * failures are logged but never propagated.
 */
export async function cleanupUploads(keys: Set<string>): Promise<void> {
  if (keys.size === 0) return;
  const results = await Promise.allSettled(
    [...keys].map((key) => deleteByKey(key))
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Upload cleanup failed for a key:", result.reason);
    }
  }
}
