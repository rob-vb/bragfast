"use client";

import { useId } from "react";

export type FormatKey = "landscape" | "square" | "portrait";

const LABELS: Record<FormatKey, string> = {
  landscape: "Landscape",
  square: "Square",
  portrait: "Portrait",
};

export function FormatTabStrip({
  formats,
  active,
  onChange,
  className = "",
}: {
  formats: readonly FormatKey[];
  active: FormatKey;
  onChange: (next: FormatKey) => void;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      role="tablist"
      aria-label="Preview format"
      className={`flex gap-2 ${className}`}
    >
      {formats.map((key) => {
        const selected = key === active;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            id={`${groupId}-${key}`}
            aria-selected={selected}
            aria-controls={`${groupId}-${key}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            className={`border-2 border-brand px-3 py-1 font-[family-name:var(--font-press-start)] text-[10px] transition-none ${
              selected
                ? "bg-gold text-brand shadow-[2px_2px_0_var(--color-brand)]"
                : "bg-white text-brand hover:bg-cream"
            }`}
          >
            {LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
