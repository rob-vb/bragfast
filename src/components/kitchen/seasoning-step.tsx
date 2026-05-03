"use client";

import { BrandColorPicker } from "@/components/shared/brand-color-picker";

interface SeasoningStepProps {
  brandId?: string;
  colors: { background: string; text: string; primary: string };
  onBrandChange: (
    brandId: string | undefined,
    colors: { background: string; text: string; primary: string }
  ) => void;
  onColorsChange: (colors: {
    background: string;
    text: string;
    primary: string;
  }) => void;
}

export function SeasoningStep({
  brandId,
  colors,
  onBrandChange,
  onColorsChange,
}: SeasoningStepProps) {
  return (
    <div className="space-y-2">
      <BrandColorPicker
        brandId={brandId}
        colors={colors}
        onBrandChange={onBrandChange}
        onColorsChange={onColorsChange}
      />
    </div>
  );
}
