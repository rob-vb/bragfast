"use client";
import dynamic from "next/dynamic";
import type { CanvasTemplateConfig, FormatKey } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";
import { VideoCanvasComposition } from "@/remotion/VideoCanvasComposition";
import type { AnimationPreset } from "@/lib/types";
import { getPreviewDuration, buildSampleSlide, buildSampleBrand } from "@/lib/preview-sample";

// Dynamic import to avoid SSR issues with @remotion/player browser APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false }) as any;

interface MotionPreviewProps {
  config: CanvasTemplateConfig;
  format?: FormatKey;
  presetOverride?: AnimationPreset;
  width?: number;
}

export function MotionPreview({
  config,
  format = "landscape",
  presetOverride,
  width = 240,
}: MotionPreviewProps) {
  const previewConfig: CanvasTemplateConfig = presetOverride
    ? { ...config, animation_preset: presetOverride }
    : config;

  const dims = FORMAT_DIMENSIONS[format];
  const height = Math.round(width * dims.height / dims.width);

  const duration = getPreviewDuration(previewConfig.animation_preset);
  const cappedDuration = Math.min(duration, 5);
  const durationInFrames = Math.round(cappedDuration * 30);

  const slide = buildSampleSlide(previewConfig, format);
  const brand = buildSampleBrand(previewConfig);

  return (
    <div style={{ width, height, overflow: "hidden" }}>
      <Player
        component={VideoCanvasComposition}
        inputProps={{
          config: previewConfig,
          format,
          slides: [slide],
          brand,
          slideDuration: cappedDuration,
        }}
        durationInFrames={durationInFrames}
        compositionWidth={dims.width}
        compositionHeight={dims.height}
        fps={30}
        style={{ width, height }}
        autoPlay={true}
        loop={true}
        controls={false}
        showVolumeControls={false}
      />
    </div>
  );
}
