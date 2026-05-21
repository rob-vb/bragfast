import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CanvasRenderer,
  FORMAT_DIMENSIONS,
  type CanvasTemplateConfig,
  type FormatKey,
  type ObjectDataMap,
} from "@bragfast/render-core/browser";
import type { Brand } from "../types";
import { buildSampleSlide } from "../lib/buildDraftObjectData";
import { injectGoogleFont } from "../lib/clientFonts";

interface TemplatePreviewProps {
  config: CanvasTemplateConfig;
  brand: Brand;
  format?: FormatKey;
  objectData?: ObjectDataMap;
}

function BrowserVideoComponent({
  src,
  style,
  muted,
  loop,
}: {
  src: string;
  style?: React.CSSProperties;
  muted?: boolean;
  loop?: boolean;
}) {
  return (
    <video
      src={src}
      style={style}
      autoPlay
      muted={muted ?? true}
      loop={loop ?? true}
      playsInline
    />
  );
}

export const TemplatePreview = memo(function TemplatePreview({
  config,
  brand,
  format = "landscape",
  objectData,
}: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [fontTick, setFontTick] = useState(0);
  const { width, height } = FORMAT_DIMENSIONS[format];

  useEffect(() => {
    let cancelled = false;
    const families = new Set<string>(["Plus Jakarta Sans"]);
    if (brand.font_family) families.add(brand.font_family);
    for (const layout of Object.values(config.formats)) {
      for (const obj of layout.objects) {
        if (obj.fontFamily) families.add(obj.fontFamily);
      }
    }
    if (objectData) {
      for (const data of Object.values(objectData)) {
        if (data.fontFamily) families.add(data.fontFamily);
      }
    }
    Promise.all([...families].map((family) => injectGoogleFont(family))).then(() => {
      if (!cancelled) setFontTick((tick) => tick + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [brand.font_family, config, objectData]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => setScale(container.clientWidth / width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  const slideData = objectData ?? buildSampleSlide(config, format);

  return (
    <div
      ref={containerRef}
      style={{ aspectRatio: `${width} / ${height}` }}
      className="relative h-full w-full overflow-hidden bg-white"
    >
      {scale > 0 && (
        <div
          key={fontTick}
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CanvasRenderer
            config={config}
            format={format}
            objectData={slideData}
            brand={brand}
            VideoComponent={BrowserVideoComponent}
            showPlaceholders
          />
        </div>
      )}
    </div>
  );
});
