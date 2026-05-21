// src/lib/templates/canvas-renderer.tsx
import type { CanvasTemplateConfig, TemplateObject, FormatKey, ColorRole } from "./canvas-types";
import type { Brand } from "./types";
import { FORMAT_DIMENSIONS, getObjectBorderRadius, resolveTextColor } from "./canvas-types";
import { BrowserFrame } from "./components/BrowserFrame";
import { MobileFrame } from "./components/MobileFrame";
import { resolveBackground } from "./mesh-gradient";

const ACCENT_RE = /\*([^*\n]+)\*/g;

/** Remove `*…*` accent markers, keeping inner content. Used to feed plain text to autoFitFontSize. */
export function stripAccentMarkers(text: string): string {
  return text.replace(ACCENT_RE, "$1");
}

export interface AccentSegment {
  text: string;
  accent: boolean;
}

/** Split a single line into accent / non-accent segments. Unbalanced `*` are kept literal. */
export function parseAccentSegments(line: string): AccentSegment[] {
  const segments: AccentSegment[] = [];
  let lastIndex = 0;
  ACCENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ACCENT_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), accent: false });
    }
    segments.push({ text: match[1], accent: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), accent: false });
  }
  if (segments.length === 0) segments.push({ text: line, accent: false });
  return segments;
}

function resolveBackgroundFill(
  obj: TemplateObject,
  colors: { background: string; text: string; primary: string },
): string | undefined {
  if (obj.backgroundColorRole) return colors[obj.backgroundColorRole];
  return obj.backgroundColor;
}

function resolveColorRole(
  role: ColorRole | undefined,
  fallback: string,
  colors: { background: string; text: string; primary: string },
): string {
  if (role) return colors[role];
  return fallback;
}

// Object data keyed by object ID — values are resolved (URLs already fetched to base64)
export interface ObjectDataMap {
  [objectId: string]: {
    text?: string;
    imageBase64?: string;
    videoUrl?: string;
    fontFamily?: string;
    fontWeight?: number;
    color?: string;
    visualFrame?: string;
    visualFrameColor?: string;
    anchorX?: string;
    anchorY?: string;
  };
}

interface CanvasRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  objectData: ObjectDataMap;
  brand: Brand;
  VideoComponent?: RenderObjectOptions["VideoComponent"];
  backgroundImageBase64?: string;
  /** When true, skip text/image objects that have no data in objectData */
  skipEmpty?: boolean;
  /** When true, render device-framed grey placeholders for visual objects with no image/video data.
   *  Off by default so Satori/production render paths are unaffected. */
  showPlaceholders?: boolean;
}

export function CanvasRenderer({ config, format, objectData, brand, VideoComponent, backgroundImageBase64, skipEmpty, showPlaceholders }: CanvasRendererProps) {
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
        if (obj.type === "visual" && obj.src) return true;
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
          {renderObject(obj, objectData, brand, colors, {
            VideoComponent,
            showVisualPlaceholders: showPlaceholders,
          })}
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

export interface RenderObjectOptions {
  /** Optional component used to render video visuals (e.g. Remotion's OffthreadVideo).
   *  When absent, video URLs are ignored and the still image is used instead. */
  VideoComponent?: React.ComponentType<{
    src: string;
    style?: React.CSSProperties;
    muted?: boolean;
    loop?: boolean;
  }>;
  /** When true, render a grey placeholder (with device frame) for visual objects with no image/video data */
  showVisualPlaceholders?: boolean;
}

export function renderObject(
  obj: TemplateObject,
  objectData: ObjectDataMap,
  brand: Brand,
  colors: { background: string; text: string; primary: string },
  options: RenderObjectOptions = {},
) {
  const fontFamily = brand.font_family || obj.fontFamily || "Plus Jakarta Sans";
  const data = objectData[obj.id];

  switch (obj.type) {
    case "text": {
      // Both missing → render nothing (e.g. carousel eyebrow/cta with previewText:"" and no slide data).
      if (!data?.text && !obj.previewText) return null;
      const rawText = data?.text || obj.previewText || "";
      const useAccent = obj.accentMarkup === true;
      const plainText = useAccent ? stripAccentMarkers(rawText) : rawText;
      const resolvedFont = data?.fontFamily || fontFamily;
      const resolvedWeight = data?.fontWeight || obj.fontWeight || 400;
      const resolvedColor = data?.color || resolveTextColor(obj, colors);
      const accentColor = resolveColorRole(obj.accentColorRole ?? "primary", colors.primary, colors);
      const bgFill = resolveBackgroundFill(obj, colors);
      const padX = obj.paddingX ?? 0;
      const padY = obj.paddingY ?? 0;
      const radius = getObjectBorderRadius(obj);
      const innerW = Math.max(1, obj.width - padX * 2);
      const innerH = Math.max(1, obj.height - padY * 2);
      const fontSize = autoFitFontSize(
        plainText, obj.fontSize || 24, innerW, innerH,
        resolvedWeight, obj.lineHeight || 1.2, obj.letterSpacing || 0,
        obj.textFit ?? false,
      );
      const lines = useAccent ? rawText.split("\n") : plainText.split("\n");
      const alignItems = obj.textAlign === "center" ? "center"
                       : obj.textAlign === "right" ? "flex-end" : "flex-start";
      const justify = obj.verticalAlign === "center" ? "center"
                    : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start";

      const renderLine = (line: string, i: number) => {
        if (!useAccent) return <div key={i}>{line}</div>;
        const segs = parseAccentSegments(line);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
            {segs.map((s, j) => (
              <span key={j} style={{ color: s.accent ? accentColor : resolvedColor, whiteSpace: "pre" }}>
                {s.text}
              </span>
            ))}
          </div>
        );
      };

      const textBlock = (
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
          alignItems,
        }}>
          {lines.length > 1 || useAccent
            ? lines.map(renderLine)
            : plainText}
        </div>
      );

      if (bgFill || radius || padX || padY) {
        return (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems,
            justifyContent: justify,
            backgroundColor: bgFill,
            borderRadius: radius,
            paddingLeft: padX,
            paddingRight: padX,
            paddingTop: padY,
            paddingBottom: padY,
            boxSizing: "border-box",
          }}>
            {textBlock}
          </div>
        );
      }
      return textBlock;
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

    case "visual": {
      // Pipeline pre-fetches obj.src into data.imageBase64 for server renders.
      // Client-only previews (TemplatePreview) skip prefetch — fall back to obj.src so
      // browser <img> loads the asset directly.
      const imgSrc = data?.imageBase64 || obj.src;
      const videoUrl = data?.videoUrl;
      const VideoEl = options.VideoComponent;
      const useVideo = !!(videoUrl && VideoEl);
      if (!imgSrc && !useVideo) {
        if (!options.showVisualPlaceholders) return null;

        const frame = data?.visualFrame || obj.visualFrame || "none";
        const frameColor = data?.visualFrameColor || obj.visualFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
        const borderRadius = getObjectBorderRadius(obj) || 4;

        const placeholderIcon = (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#AAAAAA" strokeWidth="1.5"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="#AAAAAA" strokeWidth="1.5"/>
            <path d="M21 15L16 10L5 21" stroke="#AAAAAA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

        if (frame === "browser") {
          return (
            <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", background: frameColor, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 28, minHeight: 28, background: frameColor, display: "flex", alignItems: "center", paddingLeft: 10, gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              </div>
              <div style={{ flex: 1, background: "#E0E0E0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {placeholderIcon}
              </div>
            </div>
          );
        }

        if (frame === "mobile") {
          return (
            <div style={{ width: "100%", height: "100%", borderRadius: 24, background: frameColor, padding: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 18, overflow: "hidden", background: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {placeholderIcon}
              </div>
            </div>
          );
        }

        return (
          <div style={{ width: "100%", height: "100%", background: "#E0E0E0", borderRadius, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {placeholderIcon}
          </div>
        );
      }
      const frame = data?.visualFrame || obj.visualFrame || "none";
      const frameColor = data?.visualFrameColor || obj.visualFrameColor || (frame === "mobile" ? "#1A1A1A" : "#E8E8E8");
      const anchorX = data?.anchorX || obj.anchorX || "center";
      const anchorY = data?.anchorY || obj.anchorY || "top";
      const objectPosition = `${anchorX} ${anchorY}`;
      const borderRadius = getObjectBorderRadius(obj) || 8;
      const resolvedObjectFit = obj.objectFit || "cover";

      // Video render-prop for frames. When useVideo is true, VideoEl and videoUrl
      // are both defined — frames delegate their inner media slot to this callback.
      const videoRenderMedia = useVideo && VideoEl && videoUrl
        ? (style: { width: number; height?: number; objectFit: 'cover' | 'contain'; objectPosition: string; borderRadius?: string }) => {
            const Video = VideoEl;
            const radius = style.borderRadius ? { borderRadius: style.borderRadius } : {};
            const inlineStyle: React.CSSProperties = style.objectFit === 'contain'
              ? { display: 'flex', width: `${style.width}px`, ...radius }
              : {
                  display: 'flex',
                  width: `${style.width}px`,
                  ...(style.height ? { height: `${style.height}px` } : {}),
                  objectFit: 'cover',
                  objectPosition: style.objectPosition,
                  ...radius,
                };
            return <Video src={videoUrl} muted loop style={inlineStyle} />;
          }
        : undefined;

      if (frame === "none") {
        const fitContain = resolvedObjectFit === "contain";
        const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const;
        if (fitContain) {
          return (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              justifyContent: alignMap[anchorY as keyof typeof alignMap] || "flex-start",
              borderRadius,
            }}>
              {useVideo && VideoEl && videoUrl ? (() => {
                const Video = VideoEl;
                return <Video src={videoUrl} muted loop style={{ width: "100%", borderRadius }} />;
              })() : <img src={imgSrc!} style={{ width: "100%", borderRadius }} />}
            </div>
          );
        }
        const coverStyle: React.CSSProperties = {
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition,
          borderRadius,
        };
        if (useVideo && VideoEl && videoUrl) {
          const Video = VideoEl;
          return <Video src={videoUrl} muted loop style={coverStyle} />;
        }
        return <img src={imgSrc!} style={coverStyle} />;
      }
      if (frame === "mobile") {
        return (
          <MobileFrame
            imageBase64={imgSrc}
            renderMedia={videoRenderMedia}
            primaryColor={colors.primary}
            width={obj.width}
            maxHeight={obj.height}
            color={frameColor}
            objectPosition={objectPosition}
            objectFit={resolvedObjectFit}
            anchorY={anchorY as 'top' | 'center' | 'bottom'}
          />
        );
      }
      return (
        <BrowserFrame
          imageBase64={imgSrc}
          renderMedia={videoRenderMedia}
          primaryColor={colors.primary}
          width={obj.width}
          maxHeight={obj.height}
          color={frameColor}
          objectPosition={objectPosition}
          objectFit={resolvedObjectFit}
          anchorY={anchorY as 'top' | 'center' | 'bottom'}
        />
      );
    }
  }
}
