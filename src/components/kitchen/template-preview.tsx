"use client";

import React, { useRef, useState, useLayoutEffect, useEffect, memo } from "react";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { CanvasRenderer, type ObjectDataMap } from "@/lib/templates/canvas-renderer";
import { buildSampleSlide } from "@/lib/preview-sample";
import { injectGoogleFont } from "@/lib/client-fonts";

interface TemplatePreviewProps {
  config: CanvasTemplateConfig;
  brand: Brand;
  format?: FormatKey;
  objectData?: ObjectDataMap;
  /** Overlay a "PREVIEW · brag.fast" badge in the bottom-right corner so screenshots
   *  of the live editor are clearly marked as previews. Off by default (template
   *  thumbnails don't need it). */
  watermark?: boolean;
}

/**
 * Renders a live, scaled-down preview of a template.
 * Uses `transform: scale()` so the full-size CanvasRenderer fits inside whatever
 * parent container it's placed in (parent sets aspect-ratio to match `format`).
 */
export const TemplatePreview = memo(function TemplatePreview({
  config,
  brand,
  format = "landscape",
  objectData,
  watermark = false,
}: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { width: previewWidth, height: previewHeight } = FORMAT_DIMENSIONS[format];

  useEffect(() => {
    injectGoogleFont("Plus Jakarta Sans");
    if (brand.font_family) injectGoogleFont(brand.font_family);
    for (const fmt of Object.values(config.formats)) {
      for (const obj of fmt.objects) {
        if (obj.fontFamily) injectGoogleFont(obj.fontFamily);
      }
    }
    if (objectData) {
      for (const data of Object.values(objectData)) {
        if (data.fontFamily) injectGoogleFont(data.fontFamily);
      }
    }
  }, [config, brand.font_family, objectData]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setScale(container.clientWidth / previewWidth);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [previewWidth]);

  const slideData = objectData ?? buildSampleSlide(config, format);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      {scale > 0 && (
        <div
          style={{
            width: previewWidth,
            height: previewHeight,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          <CanvasRenderer
            config={config}
            format={format}
            objectData={slideData}
            brand={brand}
            showPlaceholders
          />
        </div>
      )}
      {watermark && <PreviewWatermark />}
    </div>
  );
});

function PreviewWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-2 right-2 z-10 flex items-center gap-2 px-2 py-1 bg-black/55 text-white shadow-[2px_2px_0_rgba(0,0,0,0.35)]"
    >
      <span className="font-[family-name:var(--font-press-start)] text-[8px] tracking-widest">
        PREVIEW
      </span>
      <span className="text-white/40">·</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="brag.fast" className="h-4 w-auto" />
    </div>
  );
}
