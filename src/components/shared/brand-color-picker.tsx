"use client";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BrandOption {
  id: string;
  name: string;
  colors: { background: string; text: string; primary: string };
}

export interface BrandColorPickerProps {
  brandId?: string;
  colors: { background: string; text: string; primary: string };
  onBrandChange: (
    brandId: string | undefined,
    colors: { background: string; text: string; primary: string }
  ) => void;
  onColorsChange: (colors: { background: string; text: string; primary: string }) => void;
}

export function BrandColorPicker({
  brandId,
  colors,
  onBrandChange,
  onColorsChange,
}: BrandColorPickerProps) {
  const [brands, setBrands] = useState<BrandOption[]>([]);

  useEffect(() => {
    fetch("/api/v1/brands")
      .then((r) => r.json())
      .then((data) => setBrands(Array.isArray(data) ? data : data.brands || []))
      .catch(() => {});
  }, []);

  function handleBrandChange(value: string) {
    if (value === "none") {
      onBrandChange(undefined, colors);
    } else {
      const brand = brands.find((b) => b.id === value);
      onBrandChange(value, brand?.colors ?? colors);
    }
  }

  function handleColorChange(key: "background" | "text" | "primary", value: string) {
    onColorsChange({ ...colors, [key]: value });
  }

  const hasBrand = !!brandId;

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Colors</Label>

      <Select value={brandId || "none"} onValueChange={handleBrandChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select brand..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Manual colors</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hasBrand && (
        <div className="space-y-2">
          {(["background", "text", "primary"] as const).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 w-20 capitalize">{key}</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                />
                <Input
                  value={colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
