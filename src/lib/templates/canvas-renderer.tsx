// src/lib/templates/canvas-renderer.tsx
import type { CanvasTemplateConfig, TemplateObject, FormatKey } from "./canvas-types";
import type { Brand } from "../types";
import { FORMAT_DIMENSIONS, getObjectBorderRadius } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";

// Object data keyed by object ID — values are resolved (URLs already fetched to base64)
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    fontFamily?: string;
    color?: string;
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
}

export function CanvasRenderer({ config, format, objectData, brand }: CanvasRendererProps) {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format];
  const colors = brand.colors ?? config.colors;
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div style={{
      width, height,
      background: colors.background,
      position: "relative",
      overflow: "hidden",
      display: "flex",
    }}>
      {sortedObjects.map((obj) => (
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
function autoFitFontSize(
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
    const words = text.split(/\s+/);
    let lines = 1;
    let lineLen = 0;
    for (const word of words) {
      if (lineLen === 0) { lineLen = word.length; }
      else if (lineLen + 1 + word.length > charsPerLine) { lines++; lineLen = word.length; }
      else { lineLen += 1 + word.length; }
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

function renderObject(
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
      const resolvedColor = data?.color || obj.color || colors.text;
      const fontSize = autoFitFontSize(
        text, obj.fontSize || 24, obj.width, obj.height,
        obj.fontWeight || 400, obj.lineHeight || 1.2, obj.letterSpacing || 0,
        obj.textFit ?? false,
      );
      return (
        <div style={{
          fontFamily: resolvedFont,
          fontSize,
          fontWeight: obj.fontWeight || 400,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: resolvedColor,
          width: "100%",
          wordWrap: "break-word",
          display: "flex",
          justifyContent: obj.textAlign === "center" ? "center"
                        : obj.textAlign === "right" ? "flex-end" : "flex-start",
        }}>
          {text}
        </div>
      );
    }

    case "logo": {
      if (!brand.logoBase64) return null;
      const logoAnchorX = obj.anchorX || "center";
      const logoJustify = logoAnchorX === "center" ? "center"
                        : logoAnchorX === "right" ? "flex-end" : "flex-start";
      return (
        <div style={{
          width: "100%", height: "100%",
          display: "flex",
          justifyContent: logoJustify,
          alignItems: "center",
        }}>
          <img
            src={brand.logoBase64}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: obj.objectFit || "contain",
            }}
          />
        </div>
      );
    }

    case "image": {
      const imgSrc = data?.imageBase64;
      if (!imgSrc) {
        return (
          <div style={{
            width: "100%", height: "100%",
            background: "#e0e0e0",
            borderRadius: getObjectBorderRadius(obj) || 8,
          }} />
        );
      }
      const frame = obj.imageFrame || "none";
      const frameColor = data?.imageFrameColor || obj.imageFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
      const anchorX = data?.anchorX || obj.anchorX || "center";
      const anchorY = data?.anchorY || obj.anchorY || "top";
      const objectPosition = `${anchorX} ${anchorY}`;
      if (frame === "none") {
        return (
          <img
            src={imgSrc}
            style={{
              width: "100%", height: "100%",
              objectFit: obj.objectFit || "cover",
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
        />
      );
    }
  }
}
