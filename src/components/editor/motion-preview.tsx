"use client";
import dynamic from "next/dynamic";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import { VideoCanvasComposition } from "@/remotion/VideoCanvasComposition";
import type { AnimationPreset, Brand } from "@/lib/types";
import type { ObjectDataMap } from "@/lib/templates/canvas-renderer";
import { getPreviewDuration, buildSampleSlide, buildSampleBrand } from "@/lib/preview-sample";

// Dynamic import to avoid SSR issues with @remotion/player browser APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false }) as any;

interface MotionPreviewProps {
  config: CanvasTemplateConfig;
  format?: FormatKey;
  presetOverride?: AnimationPreset;
  durationOverride?: number;
  slides?: ObjectDataMap[];
  brand?: Brand;
  /** When omitted, component fills its container (100%) and derives height from aspect. */
  width?: number;
}

export function MotionPreview({
  config,
  format = "landscape",
  presetOverride,
  durationOverride,
  slides,
  brand,
  width,
}: MotionPreviewProps) {
  const previewConfig: CanvasTemplateConfig = presetOverride
    ? { ...config, animation_preset: presetOverride }
    : config;

  const dims = FORMAT_DIMENSIONS[format];
  // Cap preview duration at 60s so a malformed draft with a huge duration can't freeze the page.
  const rawDuration = durationOverride ?? getPreviewDuration(previewConfig.animation_preset);
  const duration = Math.max(1, Math.min(60, rawDuration));
  const durationInFrames = Math.round(duration * 30);

  const resolvedSlides = slides && slides.length > 0 ? slides : [buildSampleSlide(previewConfig, format)];
  const resolvedBrand = brand ?? buildSampleBrand(previewConfig);

  const fixedWidth = typeof width === "number" ? width : undefined;
  const fixedHeight = fixedWidth ? Math.round((fixedWidth * dims.height) / dims.width) : undefined;

  const style: React.CSSProperties = fixedWidth
    ? { width: fixedWidth, height: fixedHeight }
    : { width: "100%", aspectRatio: `${dims.width} / ${dims.height}` };

  return (
    <div style={{ ...style, overflow: "hidden" }}>
      <Player
        component={VideoCanvasComposition}
        inputProps={{
          config: previewConfig,
          format,
          slides: resolvedSlides,
          brand: resolvedBrand,
          slideDuration: duration,
          showPlaceholders: true,
        }}
        durationInFrames={durationInFrames}
        compositionWidth={dims.width}
        compositionHeight={dims.height}
        fps={30}
        style={{ width: "100%", height: "100%" }}
        autoPlay={true}
        loop={true}
        controls={false}
        showVolumeControls={false}
      />
    </div>
  );
}
