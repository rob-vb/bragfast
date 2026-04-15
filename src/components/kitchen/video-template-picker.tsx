"use client";

import { useRef, useId } from "react";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { AnimationPreset } from "@/lib/types";

export interface VideoTemplateItem {
  id: string;
  name: string;
  isVideoNative: boolean;
  primaryColor: string;
  animationPreset: AnimationPreset;
  hasHero: boolean;
  config: CanvasTemplateConfig;
}

interface VideoTemplatePickerProps {
  templates: VideoTemplateItem[];
  selectedId: string | null;
  onSelect: (template: VideoTemplateItem) => void;
}

const PRESET_LABEL: Record<AnimationPreset, string> = {
  showcase: "SHOWCASE",
  "3d-tilt-angles": "3D TILT",
};

export function VideoTemplatePicker({
  templates,
  selectedId,
  onSelect,
}: VideoTemplatePickerProps) {
  const groupId = useId();
  const gridRef = useRef<HTMLDivElement>(null);

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

  if (templates.length === 0) {
    return (
      <div className="border-2 border-brand bg-white p-4">
        <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
          No templates available yet. Try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p
        id={`${groupId}-label`}
        className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase"
      >
        ▸ Choose A Layout
      </p>
      <div
        ref={gridRef}
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {templates.map((t, i) => {
          const selected = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onKeyDown={(e) => handleKeyNav(e, i)}
              onClick={() => onSelect(t)}
              className={`
                relative text-left bg-white p-4 transition-all
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                ${selected
                  ? "border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]"
                  : "border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)]"}
              `}
            >
              {t.isVideoNative && (
                <span className="absolute top-1 right-1 font-[family-name:var(--font-press-start)] text-[8px] bg-gold text-brand px-1 py-[1px] border border-brand">
                  NEW
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span
                  aria-hidden
                  className="w-8 h-8 border-2 border-brand flex-shrink-0"
                  style={{ backgroundColor: t.primaryColor }}
                />
                <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand leading-tight truncate">
                  {selected ? "▸ " : ""}
                  {t.name}
                </p>
              </div>
              <span className="inline-block font-[family-name:var(--font-press-start)] text-[8px] bg-gold text-brand px-1 py-[1px] border border-brand">
                • {PRESET_LABEL[t.animationPreset]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function detectHero(config: CanvasTemplateConfig): boolean {
  for (const layout of Object.values(config.formats)) {
    if (!layout) continue;
    if (layout.objects.some((o) => o.type === "visual")) return true;
  }
  return false;
}
