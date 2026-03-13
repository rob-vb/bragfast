const SLUG_TO_EXTERNAL_ID: Record<string, string> = {
  "standard-browser": "tmpl_standard_browser",
  "standard-mobile": "tmpl_standard_mobile",
  "split-browser": "tmpl_split_browser",
  "split-mobile": "tmpl_split_mobile",
  "hero": "tmpl_hero",
};

/**
 * Resolves a template slug (e.g. "standard-mobile") or external ID (e.g. "tmpl_standard_mobile")
 * to the Convex externalId. Custom template IDs (tmpl_*) pass through unchanged.
 */
export function resolveTemplateId(id: string): string {
  return SLUG_TO_EXTERNAL_ID[id] ?? id;
}
