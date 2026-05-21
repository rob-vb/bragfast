import type { FormatKey } from "@bragfast/render-core/browser";

const OPTIONS: Array<{ key: FormatKey; label: string }> = [
  { key: "landscape", label: "Landscape" },
  { key: "square", label: "Square" },
  { key: "portrait", label: "Portrait" },
];

interface FormatSwitcherProps {
  value: FormatKey;
  onChange: (format: FormatKey) => void;
}

export function FormatSwitcher({ value, onChange }: FormatSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Preview format"
      className="grid w-full max-w-[420px] grid-cols-3 rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-1"
    >
      {OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              "relative min-h-[40px] min-w-0 rounded-[6px] px-2 text-[12px] font-semibold transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]",
              active
                ? "bg-[rgba(111,143,136,0.16)] text-[var(--workspace-forest)]"
                : "text-[var(--workspace-muted)] hover:text-[var(--workspace-forest)]",
            ].join(" ")}
            onClick={() => onChange(option.key)}
          >
            {option.label}
            {active ? (
              <span className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-[var(--workspace-lime)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
