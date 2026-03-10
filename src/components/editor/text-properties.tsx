"use client";
import { useRef, useState, useEffect } from "react";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_CATEGORIES } from "./font-data";

export function TextProperties() {
  const { selectedObject, dispatch, state } = useEditor();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isText = selectedObject?.type === "title" || selectedObject?.type === "description";
  const colors = state.config.colors;
  const currentColor = isText ? (selectedObject!.color || colors.text) : colors.text;
  const [hexInput, setHexInput] = useState(currentColor);

  // Sync local hex input when the actual color changes (swatch click, picker, different object)
  useEffect(() => { setHexInput(currentColor); }, [currentColor]);

  if (!selectedObject || !isText) return null;

  function updateShared(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  function updatePerFormat(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: false });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Text</Label>

      {/* Color */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Color</Label>
        <div className="flex items-center gap-2">
          {/* Text color swatch */}
          <button
            onClick={() => updateShared("color", colors.text)}
            title={`Text color (${colors.text})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              currentColor === colors.text ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.text }}
          />
          {/* Primary color swatch */}
          <button
            onClick={() => updateShared("color", colors.primary)}
            title={`Primary color (${colors.primary})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              currentColor === colors.primary ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.primary }}
          />
          {/* Custom color picker */}
          <div className="relative">
            <button
              onClick={() => colorInputRef.current?.click()}
              title="Custom color"
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                currentColor !== colors.text && currentColor !== colors.primary
                  ? "border-blue-500 scale-110"
                  : "border-zinc-300"
              }`}
              style={{
                background: currentColor !== colors.text && currentColor !== colors.primary
                  ? currentColor
                  : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              }}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => updateShared("color", e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {/* Hex input */}
          <Input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              if (/^#[0-9a-fA-F]{6}$/.test(v)) updateShared("color", v);
            }}
            onBlur={() => {
              let v = hexInput.trim();
              if (!v.startsWith("#")) v = "#" + v;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                updateShared("color", v);
              } else {
                setHexInput(currentColor);
              }
            }}
            className="h-7 text-xs flex-1 font-mono uppercase"
            maxLength={7}
          />
        </div>
      </div>

      {/* Font family */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Font</Label>
        <Select value={selectedObject.fontFamily || "Plus Jakarta Sans"} onValueChange={(v) => updateShared("fontFamily", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectGroup>
              <SelectLabel>System</SelectLabel>
              <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
            </SelectGroup>
            {Object.entries(FONT_CATEGORIES).map(([group, fonts]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {fonts.map((font) => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size & Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Size</Label>
          <Input
            type="number" value={selectedObject.fontSize || 24}
            onChange={(e) => updateShared("fontSize", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Weight</Label>
          <Select value={String(selectedObject.fontWeight || 400)} onValueChange={(v) => updateShared("fontWeight", Number(v))}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                <SelectItem key={w} value={String(w)}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Letter spacing & Line height */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Spacing</Label>
          <Input
            type="number" value={selectedObject.letterSpacing || 0} step={0.5}
            onChange={(e) => updateShared("letterSpacing", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Line H</Label>
          <Input
            type="number" value={selectedObject.lineHeight || 1.3} step={0.05}
            onChange={(e) => updateShared("lineHeight", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Text align — per format */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Align</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => updatePerFormat("textAlign", a)}
              className={`flex-1 py-1 text-xs rounded border ${
                (selectedObject.textAlign || "left") === a
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical align — per format */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">V. Align</Label>
        <div className="flex gap-1">
          {(["top", "center", "bottom"] as const).map((a) => (
            <button
              key={a}
              onClick={() => updatePerFormat("verticalAlign", a)}
              className={`flex-1 py-1 text-xs rounded border ${
                (selectedObject.verticalAlign || "top") === a
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
