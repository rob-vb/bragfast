"use client";

import React, { useRef, useState, useLayoutEffect, memo } from "react";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { Brand } from "@/lib/types";
import { CanvasRenderer } from "@/lib/templates/canvas-renderer";
import { buildSampleSlide } from "@/lib/preview-sample";

// Landscape 1200×675 — matches aspect-video container used in RecipeStep thumbnail slot
const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 675;

interface TemplatePreviewProps {
  config: CanvasTemplateConfig;
  brand: Brand;
}

/**
 * Renders a live, scaled-down preview of a template.
 * Uses `transform: scale()` so the full 1200×675 CanvasRenderer fits inside whatever
 * parent container it's placed in (typically an aspect-video tile).
 */
export const TemplatePreview = memo(function TemplatePreview({ config, brand }: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setScale(container.clientWidth / PREVIEW_WIDTH);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const objectData = buildSampleSlide(config, "landscape");

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      {scale > 0 && (
        <div
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        >
          <CanvasRenderer
            config={config}
            format="landscape"
            objectData={objectData}
            brand={brand}
            showPlaceholders
          />
        </div>
      )}
    </div>
  );
});
