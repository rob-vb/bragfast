"use client";
import { useEditor } from "./editor-context";
import { BrandColorPicker } from "@/components/shared/brand-color-picker";

export function BrandColorSection() {
  const { state, dispatch } = useEditor();

  function handleBrandChange(
    brandId: string | undefined,
    colors: { background: string; text: string; primary: string }
  ) {
    dispatch({ type: "SET_BRAND", brandId, previewColors: brandId ? colors : undefined });
  }

  function handleColorsChange(colors: { background: string; text: string; primary: string }) {
    dispatch({ type: "SET_COLORS", colors });
  }

  return (
    <BrandColorPicker
      brandId={state.config.brandId}
      colors={state.config.colors}
      onBrandChange={handleBrandChange}
      onColorsChange={handleColorsChange}
    />
  );
}
