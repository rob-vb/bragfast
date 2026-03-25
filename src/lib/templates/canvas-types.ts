export type ObjectType = "text" | "image" | "logo";

// Legacy types still in DB — migrated at read time
type LegacyObjectType = "title" | "description";

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
  const migrated = (type === "title" || type === "description")
    ? { ...obj, type: "text" as ObjectType }
    : { ...obj };

  // Migrate device → imageFrame
  const raw = migrated as Record<string, unknown>;
  if ("device" in raw && !("imageFrame" in raw)) {
    migrated.imageFrame = raw.device as ImageFrame;
    delete raw.device;
  }
  // Migrate deviceColor → imageFrameColor (enum to hex)
  if ("deviceColor" in raw && !("imageFrameColor" in raw)) {
    const dc = raw.deviceColor as string;
    migrated.imageFrameColor = dc === "dark" ? "#1A1A1A" : "#E8E8E8";
    delete raw.deviceColor;
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
export type ImageFrame = "browser" | "mobile" | "none";
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
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
  textFit?: boolean;

  // Image-only
  src?: string; // Static image URL — baked into template, not overridable by API
  imageFrame?: ImageFrame;
  imageFrameColor?: string;
  objectFit?: ObjectFit;
  anchorX?: AnchorX;
  anchorY?: AnchorY;
  borderRadius?: number;
  borderRadiusTL?: number;
  borderRadiusTR?: number;
  borderRadiusBR?: number;
  borderRadiusBL?: number;

  // Video animation
  entrance?: "fade-in" | "slide-up" | "bounce" | "none";
  kenBurns?: boolean; // Slow zoom+pan effect for images in video mode

  // Editor-only
  previewText?: string;
}

export interface FormatLayout {
  objects: TemplateObject[];
}

export interface CanvasTemplateConfig {
  version: 2;
  colors: {
    background: string;
    text: string;
    primary: string;
  };
  brandId?: string;
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
  portrait: { width: 1080, height: 1920 },
};
