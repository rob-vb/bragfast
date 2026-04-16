"use client";
import { createPortal } from "react-dom";
import { MotionPreview } from "@/components/editor/motion-preview";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { AnimationPreset } from "@/lib/types";

interface MotionPreviewTooltipProps {
  preset: AnimationPreset;
  config: CanvasTemplateConfig;
  x: number;
  y: number;
}

export function MotionPreviewTooltip({ preset, config, x, y }: MotionPreviewTooltipProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <div className="border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] bg-white overflow-hidden">
        <MotionPreview config={config} presetOverride={preset} width={200} />
      </div>
    </div>,
    document.body
  );
}
