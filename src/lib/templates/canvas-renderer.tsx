// src/lib/templates/canvas-renderer.tsx
import type { CanvasTemplateConfig, TemplateObject, FormatKey } from "./canvas-types";
import type { Brand } from "../types";
import { FORMAT_DIMENSIONS, getObjectBorderRadius, resolveTextColor } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";
import { resolveBackground } from "./mesh-gradient";

// Object data keyed by object ID — values are resolved (URLs already fetched to base64)
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    fontFamily?: string;
    fontWeight?: number;
    color?: string;
    imageFrame?: string;
    imageFrameColor?: string;
    anchorX?: string;
    anchorY?: string;
  };
}

interface CanvasRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  objectData: ObjectDataMap;
  brand: Brand;
  backgroundImageBase64?: string;
  /** When true, skip text/image objects that have no data in objectData */
  skipEmpty?: boolean;
}

export function CanvasRenderer({ config, format, objectData, brand, backgroundImageBase64, skipEmpty }: CanvasRendererProps) {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format] ?? config.formats.landscape;
  const colors = brand.colors ?? config.colors;
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);
  const bg = resolveBackground(config, colors);
  const bgImgSrc = backgroundImageBase64 ?? bg.imageUrl;

  // When skipEmpty is set, filter out text/image objects with no user-provided data
  const visibleObjects = skipEmpty
    ? sortedObjects.filter((obj) => {
        if (obj.type === "logo") return true;
        // Image objects with a static src are always shown
        if (obj.type === "image" && obj.src) return true;
        return !!objectData[obj.id];
      })
    : sortedObjects;

  return (
    <div style={{
      width, height,
      background: bg.css ?? "white",
      position: "relative",
      overflow: "hidden",
      display: "flex",
    }}>
      {bgImgSrc && (
        <img
          src={bgImgSrc}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      {visibleObjects.map((obj) => (
        <div key={obj.id} style={{
          position: "absolute",
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          opacity: obj.opacity,
          display: "flex",
          flexDirection: "column",
          justifyContent: obj.verticalAlign === "center" ? "center"
                        : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start",
        }}>
          {renderObject(obj, objectData, brand, colors)}
        </div>
      ))}
    </div>
  );
}

/** Estimate the font size that fits text within a container.
 *  textFit=true: scale up or down to fill the height (binary search for largest fitting size)
 *  textFit=false: only shrink from baseFontSize if text overflows
 */
export function autoFitFontSize(
  text: string,
  baseFontSize: number,
  containerWidth: number,
  containerHeight: number,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  textFit: boolean,
): number {
  const MIN_SIZE = 8;
  const MAX_SIZE = 400;
  const charWidthRatio = fontWeight >= 700 ? 0.58 : 0.52;

  const fitsAt = (size: number): boolean => {
    const avgCharWidth = size * charWidthRatio + letterSpacing;
    const charsPerLine = Math.floor(containerWidth / avgCharWidth);
    if (charsPerLine < 1) return false;
    // Split on explicit \n first, then word-wrap each paragraph
    const paragraphs = text.split("\n");
    let lines = 0;
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) { lines++; continue; }
      let lineLen = 0;
      for (const word of words) {
        if (lineLen === 0) { lineLen = word.length; }
        else if (lineLen + 1 + word.length > charsPerLine) { lines++; lineLen = word.length; }
        else { lineLen += 1 + word.length; }
      }
      lines++;
    }
    return lines * size * lineHeight <= containerHeight;
  };

  if (textFit) {
    // Binary search for the largest size that fits
    let lo = MIN_SIZE;
    let hi = MAX_SIZE;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fitsAt(mid)) { lo = mid; } else { hi = mid - 1; }
    }
    return lo;
  }

  // Only shrink from baseFontSize
  for (let size = baseFontSize; size >= MIN_SIZE; size--) {
    if (fitsAt(size)) return size;
  }
  return MIN_SIZE;
}

export function renderObject(
  obj: TemplateObject,
  objectData: ObjectDataMap,
  brand: Brand,
  colors: { background: string; text: string; primary: string },
) {
  const fontFamily = brand.font_family || obj.fontFamily || "Plus Jakarta Sans";
  const data = objectData[obj.id];

  switch (obj.type) {
    case "text": {
      const text = data?.text || obj.previewText || "Text";
      const resolvedFont = data?.fontFamily || fontFamily;
      const resolvedWeight = data?.fontWeight || obj.fontWeight || 400;
      const resolvedColor = data?.color || resolveTextColor(obj, colors);
      const fontSize = autoFitFontSize(
        text, obj.fontSize || 24, obj.width, obj.height,
        resolvedWeight, obj.lineHeight || 1.2, obj.letterSpacing || 0,
        obj.textFit ?? false,
      );
      const lines = text.split("\n");
      return (
        <div style={{
          fontFamily: resolvedFont,
          fontSize,
          fontWeight: resolvedWeight,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: resolvedColor,
          width: "100%",
          wordWrap: "break-word",
          display: "flex",
          flexDirection: "column",
          alignItems: obj.textAlign === "center" ? "center"
                    : obj.textAlign === "right" ? "flex-end" : "flex-start",
        }}>
          {lines.length > 1
            ? lines.map((line, i) => <div key={i}>{line}</div>)
            : text}
        </div>
      );
    }

    case "logo": {
      if (!brand.logoBase64) return null;
      const logoAnchorX = obj.anchorX || "center";
      const logoAnchorY = obj.anchorY || "center";
      return (
        <img
          src={brand.logoBase64}
          style={{
            width: "100%",
            height: "100%",
            objectFit: obj.objectFit || "contain",
            objectPosition: `${logoAnchorX} ${logoAnchorY}`,
          }}
        />
      );
    }

    case "image": {
      const imgSrc = data?.imageBase64;
      if (!imgSrc) return null;
      const frame = data?.imageFrame || obj.imageFrame || "none";
      const frameColor = data?.imageFrameColor || obj.imageFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
      const anchorX = data?.anchorX || obj.anchorX || "center";
      const anchorY = data?.anchorY || obj.anchorY || "top";
      const objectPosition = `${anchorX} ${anchorY}`;
      if (frame === "none") {
        const fitContain = obj.objectFit === "contain";
        const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;
        if (fitContain) {
          return (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              justifyContent: alignMap[anchorY as keyof typeof alignMap] || "flex-start",
              borderRadius: getObjectBorderRadius(obj) || 8,
            }}>
              <img src={imgSrc} style={{ width: "100%", borderRadius: getObjectBorderRadius(obj) || 8 }} />
            </div>
          );
        }
        return (
          <img
            src={imgSrc}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition,
              borderRadius: getObjectBorderRadius(obj) || 8,
            }}
          />
        );
      }
      if (frame === "mobile") {
        return (
          <MobileFrame
            imageBase64={imgSrc}
            primaryColor={colors.primary}
            width={obj.width}
            maxHeight={obj.height}
            color={frameColor}
            objectPosition={objectPosition}
            objectFit={obj.objectFit || "cover"}
            anchorY={anchorY as 'top' | 'center' | 'bottom'}
          />
        );
      }
      return (
        <BrowserFrame
          imageBase64={imgSrc}
          primaryColor={colors.primary}
          width={obj.width}
          maxHeight={obj.height}
          color={frameColor}
          objectPosition={objectPosition}
          objectFit={obj.objectFit || "cover"}
          anchorY={anchorY as 'top' | 'center' | 'bottom'}
        />
      );
    }
  }
}
