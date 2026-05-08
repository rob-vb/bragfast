import type { VariableManifest } from "./hyperframe-manifest";

export type Brand = {
  background: string;
  text: string;
  primary: string;
  logoUrl?: string;
};

export type CookInput = Record<string, unknown>;

const RESERVED: Record<string, (b: Brand) => unknown> = {
  __bg: (b) => b.background,
  __text: (b) => b.text,
  __primary: (b) => b.primary,
  __logo: (b) => b.logoUrl,
};

export function resolveVariables(
  manifest: VariableManifest,
  cookInput: CookInput,
  brand: Brand,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const decl of manifest) {
    const reserved = RESERVED[decl.id];
    if (reserved) {
      out[decl.id] = reserved(brand);
      continue;
    }
    if (decl.id in cookInput) {
      const value = cookInput[decl.id];
      if (decl.type === "string_array") {
        if (!Array.isArray(value)) {
          throw new Error(`Variable "${decl.id}" must be an array`);
        }
        if (decl.min != null && value.length < decl.min) {
          throw new Error(`Variable "${decl.id}" has ${value.length} items, min is ${decl.min}`);
        }
        if (decl.max != null && value.length > decl.max) {
          throw new Error(`Variable "${decl.id}" has ${value.length} items, max is ${decl.max}`);
        }
      }
      out[decl.id] = value;
      continue;
    }
    if ("required" in decl && decl.required) {
      throw new Error(`Missing required variable "${decl.id}"`);
    }
  }
  return out;
}
