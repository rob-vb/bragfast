export type VariableDecl =
  | { id: string; type: "string"; label: string; default?: string; required?: boolean }
  | { id: string; type: "image_url"; label: string; required?: boolean }
  | { id: string; type: "video_url"; label: string; required?: boolean }
  | { id: string; type: "string_array"; label: string; min?: number; max?: number; default?: string[] };

export type VariableManifest = VariableDecl[];

export function parseManifest(html: string): VariableManifest {
  const match = html.match(/<html\b[^>]*\sdata-composition-variables=(['"])([\s\S]*?)\1/i);
  if (!match) return [];
  const raw = match[2];
  let parsed: VariableDecl[];
  try {
    parsed = JSON.parse(raw) as VariableDecl[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid data-composition-variables JSON: ${reason}`);
  }
  const seen = new Set<string>();
  for (const decl of parsed) {
    if (seen.has(decl.id)) {
      throw new Error(`Duplicate variable id "${decl.id}" in data-composition-variables`);
    }
    seen.add(decl.id);
  }
  return parsed;
}
