export type ObjectType = "title" | "description" | "image" | "logo" | "productName";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";
export type DeviceOption = "browser" | "mobile" | "none";
export type ObjectFit = "cover" | "contain";
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
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;

  // Image-only
  device?: DeviceOption;
  objectFit?: ObjectFit;

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
  formats: Record<FormatKey, FormatLayout>;
}

export const FORMAT_DIMENSIONS: Record<FormatKey, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
};
