"use client";

import type { FormatKey } from "@/lib/templates/canvas-types";
import type { AnimationPreset } from "@/lib/types";

const FORMAT_LABELS: Record<FormatKey, string> = {
  landscape: "Landscape",
  square: "Square",
  portrait: "Portrait",
};

const FORMAT_DIMS: Record<FormatKey, string> = {
  landscape: "1200×675",
  square: "1080×1080",
  portrait: "1080×1350",
};

interface PlatingStepProps {
  formats: FormatKey[];
  outputType: "image" | "video";
  animationPreset?: AnimationPreset;
  creditBalance?: number;
  onToggleFormat: (format: FormatKey) => void;
  onOutputTypeChange: (type: "image" | "video") => void;
  onAnimationPresetChange: (preset: AnimationPreset | undefined) => void;
}

export function PlatingStep({
  formats,
  outputType,
  animationPreset,
  creditBalance,
  onToggleFormat,
  onOutputTypeChange,
  onAnimationPresetChange,
}: PlatingStepProps) {
  const creditCost = formats.length * (outputType === "video" ? 5 : 1);

  return (
    <div className="space-y-5">
      {/* Format checkboxes */}
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Formats
        </p>
        <div className="flex flex-wrap gap-3">
          {(["landscape", "square", "portrait"] as FormatKey[]).map((fmt) => {
            const checked = formats.includes(fmt);
            return (
              <button
                key={fmt}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggleFormat(fmt)}
                className={`
                  flex items-center gap-2 border-2 border-brand px-3 py-2
                  font-[family-name:var(--font-geist-sans)] text-sm text-brand
                  transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                  ${checked ? "bg-gold" : "bg-white hover:bg-gold/20"}
                `}
              >
                <span
                  className={`
                    w-4 h-4 border-2 border-brand flex-shrink-0 flex items-center justify-center
                    ${checked ? "bg-brand" : "bg-white"}
                  `}
                >
                  {checked && (
                    <span className="text-gold text-[8px] leading-none">✓</span>
                  )}
                </span>
                <span>
                  <span className="font-medium">{FORMAT_LABELS[fmt]}</span>
                  <span className="ml-1 text-xs text-brand/50">{FORMAT_DIMS[fmt]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output type toggle */}
      <div className="space-y-2">
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
          Output
        </p>
        <div className="inline-flex border-2 border-brand">
          {(["image", "video"] as const).map((type) => {
            const active = outputType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onOutputTypeChange(type)}
                className={`
                  font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 capitalize
                  transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold
                  ${active ? "bg-gold text-brand" : "bg-white text-brand/50 hover:text-brand hover:bg-gold/20"}
                `}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Animation preset — video only */}
      {outputType === "video" && (
        <div className="space-y-2">
          <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase">
            Animation Preset
          </p>
          <select
            className="border-2 border-brand px-3 py-2 text-sm font-[family-name:var(--font-geist-sans)] text-brand bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            value={animationPreset ?? "none"}
            onChange={(e) => {
              const v = e.target.value;
              onAnimationPresetChange(v === "none" ? undefined : (v as AnimationPreset));
            }}
          >
            <option value="none">None</option>
            <option value="showcase">Showcase</option>
          </select>
        </div>
      )}

      {/* Credit display */}
      <div
        className="flex items-center justify-between border-t-2 border-brand/10 pt-4"
        aria-live="polite"
      >
        <div>
          <p className="font-[family-name:var(--font-geist-mono)] text-sm text-brand">
            <span className="font-semibold">{creditCost}</span>{" "}
            {creditCost === 1 ? "credit" : "credits"} needed
          </p>
          {creditBalance !== undefined && (
            <p className="font-[family-name:var(--font-geist-mono)] text-xs text-brand/50 mt-0.5">
              {creditBalance} remaining
            </p>
          )}
        </div>
        {formats.length === 0 && (
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50">
            Select at least one format
          </p>
        )}
      </div>
    </div>
  );
}
