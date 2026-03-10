export type BlockType = "title" | "description" | "image" | "logo" | "productName";
export type Alignment = "left" | "center" | "right";
export type FontSize = "small" | "medium" | "large";
export type DeviceOption = "browser" | "mobile" | "none";
export type DisplayMode = "inline" | "fullBleed";
export type SplitSide = "left" | "right";
export type Spacing = "compact" | "normal" | "spacious";

export interface Block {
  type: BlockType;
  alignment: Alignment;
  fontSize?: FontSize;
  device?: DeviceOption;
  display?: DisplayMode;
  split?: SplitSide;
}

export interface TemplateConfig {
  background: string; // "brand" | hex color
  spacing: Spacing;
  blocks: Block[];
}
