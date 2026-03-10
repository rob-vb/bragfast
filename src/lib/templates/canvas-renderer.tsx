// src/lib/templates/canvas-renderer.tsx
import type { CanvasTemplateConfig, TemplateObject, FormatKey } from "./canvas-types";
import type { Brand } from "../types";
import { FORMAT_DIMENSIONS } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";

interface Slide {
  title: string;
  description?: string;
  imageBase64?: string;
  device?: "browser" | "mobile";
  align?: "left" | "center" | "right";
}

interface CanvasRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  slide: Slide;
  brand: Brand;
  transparent?: boolean;
}

export function CanvasRenderer({ config, format, slide, brand, transparent }: CanvasRendererProps) {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format];
  const colors = config.brandId ? brand.colors : config.colors;
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div style={{
      width, height,
      background: transparent ? "transparent" : colors.background,
      position: "relative",
      overflow: "hidden",
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
          {renderObject(obj, slide, brand, colors)}
        </div>
      ))}
    </div>
  );
}

function renderObject(
  obj: TemplateObject,
  slide: Slide,
  brand: Brand,
  colors: { background: string; text: string; primary: string },
) {
  switch (obj.type) {
    case "title":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 48,
          fontWeight: obj.fontWeight || 700,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          width: "100%",
          wordWrap: "break-word",
        }}>
          {slide.title || "Title here"}
        </div>
      );

    case "description":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 22,
          fontWeight: obj.fontWeight || 400,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.4,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          opacity: 0.85,
          width: "100%",
          wordWrap: "break-word",
        }}>
          {slide.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
        </div>
      );

    case "productName":
      return (
        <div style={{
          fontFamily: obj.fontFamily || "Plus Jakarta Sans",
          fontSize: obj.fontSize || 14,
          fontWeight: obj.fontWeight || 700,
          letterSpacing: obj.letterSpacing || 0,
          lineHeight: obj.lineHeight || 1.2,
          textAlign: obj.textAlign || "left",
          color: colors.text,
          width: "100%",
        }}>
          {brand.name || "Product"}
        </div>
      );

    case "logo":
      if (!brand.logoBase64) return null;
      return (
        <img
          src={brand.logoBase64}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: obj.objectFit || "contain",
          }}
        />
      );

    case "image": {
      const imgSrc = slide.imageBase64;
      if (!imgSrc) {
        return (
          <div style={{
            width: "100%", height: "100%",
            background: "#e0e0e0",
            borderRadius: 8,
          }} />
        );
      }
      const device = obj.device || slide.device || "browser";
      if (device === "none") {
        return (
          <img
            src={imgSrc}
            style={{
              width: "100%", height: "100%",
              objectFit: obj.objectFit || "cover",
              borderRadius: 8,
            }}
          />
        );
      }
      if (device === "mobile") {
        return (
          <MobileFrame
            imageBase64={imgSrc}
            primaryColor={colors.primary}
            width={obj.width}
            maxHeight={obj.height}
          />
        );
      }
      return (
        <BrowserFrame
          imageBase64={imgSrc}
          primaryColor={colors.primary}
          width={obj.width}
          maxHeight={obj.height}
        />
      );
    }
  }
}
