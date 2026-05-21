import type { BrandRecord, DraftColors } from "../types";

interface BrandPickerProps {
  brands: BrandRecord[];
  brandId?: string;
  colors: DraftColors;
  onBrandChange: (brandId: string | undefined, colors: DraftColors) => void;
  onColorsChange: (colors: DraftColors) => void;
}

const COLOR_FIELDS: Array<{ key: keyof DraftColors; label: string }> = [
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "primary", label: "Primary" },
];

export function BrandPicker({
  brands,
  brandId,
  colors,
  onBrandChange,
  onColorsChange,
}: BrandPickerProps) {
  function handleBrandChange(value: string) {
    if (value === "manual") {
      onBrandChange(undefined, colors);
      return;
    }
    const brand = brands.find((item) => item.id === value);
    onBrandChange(value, brand?.colors ?? colors);
  }

  function handleColorChange(key: keyof DraftColors, value: string) {
    onColorsChange({ ...colors, [key]: value });
  }

  return (
    <section className="rounded-[8px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="workspace-brand" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-sage)]">
          Brand
        </label>
        <select
          id="workspace-brand"
          value={brandId ?? "manual"}
          onChange={(event) => handleBrandChange(event.target.value)}
          className="min-h-[40px] rounded-[6px] border border-[var(--workspace-border)] bg-white px-3 text-[14px] text-[var(--workspace-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
        >
          <option value="manual">Manual colors</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3">
        {COLOR_FIELDS.map((field) => (
          <label key={field.key} className="grid grid-cols-[88px_40px_1fr] items-center gap-2 text-[12px] text-[var(--workspace-muted)]">
            <span className="font-semibold">{field.label}</span>
            <span
              aria-hidden
              className="h-8 w-8 rounded-full border border-[var(--workspace-border)]"
              style={{ background: colors[field.key] }}
            />
            <input
              type="color"
              value={colors[field.key]}
              onChange={(event) => handleColorChange(field.key, event.target.value)}
              className="h-10 w-full rounded-[6px] border border-[var(--workspace-border)] bg-white p-1"
            />
          </label>
        ))}
      </div>

      {brands.length === 0 ? (
        <p className="mt-3 text-[12px] leading-[1.35] text-[var(--workspace-muted)]">
          No brands yet. Template colors are active.
        </p>
      ) : null}
    </section>
  );
}
