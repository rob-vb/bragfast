import type { DraftConfig } from "./types";

export function derivePreviewTitle(config: DraftConfig, name: string | null): string {
  if (name && name.trim().length > 0) return name;
  const content = config.objectContent ?? {};
  for (const entry of Object.values(content)) {
    if (entry.text && entry.text.trim().length > 0) return entry.text;
  }
  return "Untitled draft";
}
