import type { AnimationPreset } from "./types";

export type ObjectType = "text" | "visual" | "logo";
export type ColorRole = "primary" | "text" | "background";

/** Resolve a text object's color: colorRole takes precedence over the literal color hex. */
export function resolveTextColor(
  obj: { colorRole?: ColorRole; color?: string },
  colors: { background: string; text: string; primary: string },
): string {
  if (obj.colorRole) return colors[obj.colorRole];
  return obj.color || colors.text;
}

// Legacy types still in DB — migrated at read time
type LegacyObjectType = "title" | "description" | "image";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function uniqueSlug(name: string, existingIds: string[], currentId?: string): string {
  const base = slugify(name);
  if (!base) return uniqueSlug("object", existingIds, currentId);
  const others = currentId ? existingIds.filter((id) => id !== currentId) : existingIds;
  if (!others.includes(base)) return base;
  let n = 2;
  while (others.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function migrateObject(obj: TemplateObject): TemplateObject {
  const type = obj.type as string;
  let migrated: TemplateObject;
  if (type === "title" || type === "description") {
    migrated = { ...obj, type: "text" as ObjectType };
  } else if (type === "image") {
    migrated = { ...obj, type: "visual" as ObjectType };
  } else {
    migrated = { ...obj };
  }

  // Strip legacy per-object animation fields (now preset-only)
  const raw = migrated as unknown as Record<string, unknown>;
  delete raw.entrance;
  delete raw.exit;
  delete raw.kenBurns;

  // Migrate device → visualFrame (legacy enum)
  if ("device" in raw && !("visualFrame" in raw) && !("imageFrame" in raw)) {
    migrated.visualFrame = raw.device as VisualFrame;
    delete raw.device;
  }
  // Migrate deviceColor → visualFrameColor (legacy enum → hex)
  if ("deviceColor" in raw && !("visualFrameColor" in raw) && !("imageFrameColor" in raw)) {
    const dc = raw.deviceColor as string;
    migrated.visualFrameColor = dc === "dark" ? "#1A1A1A" : "#E8E8E8";
    delete raw.deviceColor;
  }
  // Migrate imageFrame → visualFrame (previous rename)
  if ("imageFrame" in raw && !("visualFrame" in raw)) {
    migrated.visualFrame = raw.imageFrame as VisualFrame;
    delete raw.imageFrame;
  }
  // Migrate imageFrameColor → visualFrameColor (previous rename)
  if ("imageFrameColor" in raw && !("visualFrameColor" in raw)) {
    migrated.visualFrameColor = raw.imageFrameColor as string;
    delete raw.imageFrameColor;
  }

  return migrated;
}

export function migrateConfig(config: CanvasTemplateConfig): CanvasTemplateConfig {
  const formats = { ...config.formats };
  let changed = false;
  for (const key of (["landscape", "square", "portrait"] as FormatKey[])) {
    const layout = formats[key];
    if (!layout) continue;  // og may not exist in older templates
    const migrated = layout.objects.map(migrateObject);
    if (migrated.some((obj, i) => obj !== layout.objects[i])) {
      formats[key] = { objects: migrated };
      changed = true;
    }
  }
  return changed ? { ...config, formats } : config;
}
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";
export type VisualFrame = "browser" | "mobile" | "none";
export type ObjectFit = "cover" | "contain";
export type AnchorX = "left" | "center" | "right";
export type AnchorY = "top" | "center" | "bottom";
export type FormatKey = "landscape" | "square" | "portrait";
export interface TemplateObject {
  id: string;
  type: ObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;

  // Text-only
  color?: string;
  colorRole?: ColorRole;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
  textFit?: boolean;
  /** Optional solid bg color for text wrapper (badges, CTA pills). Hex. */
  backgroundColor?: string;
  /** Role-based fill, takes precedence over backgroundColor. */
  backgroundColorRole?: ColorRole;
  paddingX?: number;
  paddingY?: number;
  /** Parse `*word*` segments and render in accent color. */
  accentMarkup?: boolean;
  /** Color role for accent segments. Defaults to "primary". */
  accentColorRole?: ColorRole;

  // Visual-only
  background?: boolean;
  src?: string; // Static image URL — baked into template, not overridable by API
  video_url?: string; // Optional video URL — preferred over image for video renders
  visualFrame?: VisualFrame;
  visualFrameColor?: string;
  objectFit?: ObjectFit;
  anchorX?: AnchorX;
  anchorY?: AnchorY;
  borderRadius?: number;
  borderRadiusTL?: number;
  borderRadiusTR?: number;
  borderRadiusBR?: number;
  borderRadiusBL?: number;

  // Editor-only
  previewText?: string;
}

export interface FormatLayout {
  objects: TemplateObject[];
}

export type BackgroundMode = "color" | "image" | "mesh_gradient";

export type BackgroundConfig =
  | { mode: "color" }
  | { mode: "image"; imageUrl: string }
  | { mode: "mesh_gradient"; colors: [string, string, string]; positions: { x: number; y: number }[] };

export interface CanvasTemplateConfig {
  version: 2;
  colors: {
    background: string;
    text: string;
    primary: string;
  };
  brandId?: string;
  animation_preset?: AnimationPreset;
  background?: BackgroundConfig;
  formats: Record<"landscape" | "square" | "portrait", FormatLayout>;
}

/** Returns a CSS borderRadius string from an object's radius properties. */
export function getObjectBorderRadius(obj: {
  borderRadius?: number;
  borderRadiusTL?: number;
  borderRadiusTR?: number;
  borderRadiusBR?: number;
  borderRadiusBL?: number;
}): string | undefined {
  const uniform = obj.borderRadius ?? 0;
  const tl = obj.borderRadiusTL ?? uniform;
  const tr = obj.borderRadiusTR ?? uniform;
  const br = obj.borderRadiusBR ?? uniform;
  const bl = obj.borderRadiusBL ?? uniform;
  if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
  if (tl === tr && tr === br && br === bl) return `${tl}px`;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

export const FORMAT_DIMENSIONS: Record<FormatKey, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};
