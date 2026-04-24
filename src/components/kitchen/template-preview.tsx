"use client";

import React, { useRef, useState, useLayoutEffect, useEffect, memo } from "react";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { CanvasRenderer, type ObjectDataMap } from "@/lib/templates/canvas-renderer";
import { buildSampleSlide } from "@/lib/preview-sample";

const injectedFonts = new Set<string>();

function injectGoogleFont(family: string) {
  if (injectedFonts.has(family)) return;
  injectedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

interface TemplatePreviewProps {
  config: CanvasTemplateConfig;
  brand: Brand;
  format?: FormatKey;
  objectData?: ObjectDataMap;
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
  }, [config, brand.font_family]);

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
    </div>
  );
});
