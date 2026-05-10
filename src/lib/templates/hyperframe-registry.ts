import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { HyperframeFormat } from "../pipeline/render-hyperframe";

export function makeReadComposition(rootDir: string) {
  return async function readComposition(
    templateId: string,
    format: HyperframeFormat,
  ): Promise<{ html: string }> {
    const path = join(rootDir, templateId, `${format}.html`);
    try {
      const html = await readFile(path, "utf8");
      return { html };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Composition not found for "${templateId}" / "${format}": ${reason}`);
    }
  };
}
