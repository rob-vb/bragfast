"use client";

import { useEffect, useRef, useState, useId } from "react";
import type { AnimationPreset } from "@/lib/types";

type PresetOption = {
  slug: AnimationPreset;
  name: string;
  requiresHero?: boolean;
};

const PRESETS: PresetOption[] = [
  { slug: "showcase", name: "Showcase" },
  { slug: "3d-tilt-angles", name: "3D Multiple Angles", requiresHero: true },
];

interface MotionPresetPickerProps {
  value?: AnimationPreset;
  autoSelected?: AnimationPreset;
  templateHasHero: boolean;
  onChange: (preset: AnimationPreset) => void;
}

export function MotionPresetPicker({
  value,
  autoSelected,
  templateHasHero,
  onChange,
}: MotionPresetPickerProps) {
  const groupId = useId();
  const [pulseTarget, setPulseTarget] = useState<AnimationPreset | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoSelected) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timed one-shot pulse; cleared by setTimeout
    setPulseTarget(autoSelected);
    const t = setTimeout(() => setPulseTarget(null), 220);
    return () => clearTimeout(t);
  }, [autoSelected]);

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
        className="font-[family-name:var(--font-press-start)] text-[10px] text-brand uppercase"
      >
        ▸ Choose Motion
      </p>
      <div
        ref={gridRef}
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {PRESETS.map((preset, i) => {
          const selected = value === preset.slug;
          const isAuto = autoSelected === preset.slug && selected;
          const degraded = preset.requiresHero && !templateHasHero;
          const pulsing = pulseTarget === preset.slug;
          return (
            <button
              key={preset.slug}
              type="button"
              role="radio"
              aria-checked={selected}
              onKeyDown={(e) => handleKeyNav(e, i)}
              onClick={() => onChange(preset.slug)}
              className={`
                relative text-left p-4 transition-all
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                ${selected
                  ? "bg-gold border-[3px] border-brand shadow-[6px_6px_0_var(--color-brand)]"
                  : "bg-white border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] hover:bg-gold/20 hover:shadow-[2px_2px_0_var(--color-brand)]"}
                ${degraded ? "opacity-60" : ""}
              `}
              style={{
                animationName: pulsing ? "pulse-once" : undefined,
                animationDuration: pulsing ? "200ms" : undefined,
                animationTimingFunction: pulsing ? "ease-out" : undefined,
              }}
            >
              {isAuto && (
                <span className="absolute top-1 right-1 font-[family-name:var(--font-press-start)] text-[8px] bg-brand text-gold px-1 py-[1px] border border-brand">
                  AUTO
                </span>
              )}
              <div className="flex items-center gap-2">
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
                <p className="font-[family-name:var(--font-press-start)] text-[11px] text-brand leading-tight">
                  {preset.name}
                </p>
              </div>
              {degraded && (
                <p className="mt-2 font-[family-name:var(--font-geist-sans)] text-[10px] text-brand/60">
                  Needs hero image
                </p>
              )}
            </button>
          );
        })}
      </div>
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        Motions apply to the whole video. Some (3D Multiple Angles) work best when
        there&apos;s a hero image.
      </p>
      <style jsx>{`
        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
