"use client";

import { useRef, useId, useState } from "react";
import type { AnimationPreset } from "@/lib/types";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import { MotionPreviewTooltip } from "./motion-preview-tooltip";

type PresetOption = {
  slug: AnimationPreset;
  name: string;
  requiresHero?: boolean;
};

const PRESETS: PresetOption[] = [
  { slug: "showcase", name: "Showcase" },
  { slug: "3d-tilt-angles", name: "3D Multiple Angles", requiresHero: true },
  { slug: "simple-fade", name: "Simple Fade" },
];

interface MotionPresetPickerProps {
  value?: AnimationPreset;
  autoSelected?: AnimationPreset;
  templateHasHero: boolean;
  templateConfig?: CanvasTemplateConfig;
  onChange: (preset: AnimationPreset) => void;
}

export function MotionPresetPicker({
  value,
  templateHasHero,
  templateConfig,
  onChange,
}: MotionPresetPickerProps) {
  const groupId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ preset: AnimationPreset; x: number; y: number } | null>(null);

  function handleKeyNav(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>("[role='radio']");
    if (!buttons) return;
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + buttons.length) % buttons.length;
    else return;
    e.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div className="space-y-2">
      <p
        id={`${groupId}-label`}
        className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase"
      >
        Choose Motion
      </p>
      <div
        ref={gridRef}
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="flex flex-wrap gap-3"
      >
        {PRESETS.map((preset, i) => {
          const selected = value === preset.slug;
          const degraded = preset.requiresHero && !templateHasHero;
          return (
            <button
              key={preset.slug}
              type="button"
              role="radio"
              aria-checked={selected}
              onKeyDown={(e) => handleKeyNav(e, i)}
              onClick={() => onChange(preset.slug)}
              onMouseMove={(e) => setTooltip({ preset: preset.slug, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
              className={`
                flex items-center gap-2 border-2 border-brand px-3 py-2
                font-[family-name:var(--font-geist-sans)] text-sm text-brand
                transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                ${selected ? "bg-gold" : "bg-white hover:bg-gold/20"}
                ${degraded ? "opacity-60" : ""}
              `}
            >
              <span
                aria-hidden
                className={`
                  w-4 h-4 border-2 border-brand flex-shrink-0 flex items-center justify-center
                  ${selected ? "bg-brand" : "bg-white"}
                `}
              >
                {selected && (
                  <span className="text-gold text-[8px] leading-none">✓</span>
                )}
              </span>
              <span className="font-medium">{preset.name}</span>
              {degraded && (
                <span className="ml-1 text-xs text-brand/50">needs visual</span>
              )}
            </button>
          );
        })}
      </div>
      {tooltip && templateConfig && (
        <MotionPreviewTooltip
          preset={tooltip.preset}
          config={templateConfig}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
