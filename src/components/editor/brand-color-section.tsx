"use client";
import { useEffect, useState } from "react";
import { useEditor } from "./editor-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BrandOption {
  id: string;
  name: string;
  colors: { background: string; text: string; primary: string };
}

export function BrandColorSection() {
  const { state, dispatch } = useEditor();
  const [brands, setBrands] = useState<BrandOption[]>([]);

  useEffect(() => {
    fetch("/api/v1/brands")
      .then((r) => r.json())
      .then((data) => setBrands(Array.isArray(data) ? data : data.brands || []))
      .catch(() => {});
  }, []);

  const hasBrand = !!state.config.brandId;

  function handleBrandChange(value: string) {
    if (value === "none") {
      dispatch({ type: "SET_BRAND", brandId: undefined });
    } else {
      const brand = brands.find((b) => b.id === value);
      dispatch({ type: "SET_BRAND", brandId: value, previewColors: brand?.colors });
    }
  }

  function handleColorChange(key: "background" | "text" | "primary", value: string) {
    dispatch({
      type: "SET_COLORS",
      colors: { ...state.config.colors, [key]: value },
    });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Colors</Label>

      <Select value={state.config.brandId || "none"} onValueChange={handleBrandChange}>
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
                  value={state.config.colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                />
                <Input
                  value={state.config.colors[key]}
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
