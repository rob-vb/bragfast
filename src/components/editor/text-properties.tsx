"use client";
import { useRef, useState, useEffect } from "react";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_CATEGORIES } from "./font-data";
import { resolveTextColor } from "@/lib/templates/canvas-types";

export function TextProperties() {
  const { selectedObject, dispatch, state } = useEditor();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const isText = selectedObject?.type === "text";
  const colors = state.config.colors;
  const currentColor = isText ? resolveTextColor(selectedObject!, colors) : colors.text;
  const currentRole = isText ? selectedObject!.colorRole : undefined;
  const [hexInput, setHexInput] = useState(currentColor);

  const bgRole = isText ? selectedObject!.backgroundColorRole : undefined;
  const bgHex = isText ? selectedObject!.backgroundColor : undefined;
  const hasBg = Boolean(bgRole || bgHex);
  const resolvedBg = bgRole ? colors[bgRole] : (bgHex ?? "#ffffff");
  const [bgHexInput, setBgHexInput] = useState(resolvedBg);

  // Sync local hex input when the actual color changes (swatch click, picker, different object)
  useEffect(() => { setHexInput(currentColor); }, [currentColor]);
  useEffect(() => { setBgHexInput(resolvedBg); }, [resolvedBg]);

  if (!selectedObject || !isText) return null;

  function updateShared(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  function updatePerFormat(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: false });
  }

  // Pin color to a semantic role (tracks brand/template changes).
  function setColorRole(role: "primary" | "text") {
    updateShared("colorRole", role);
    updateShared("color", undefined);
  }

  // Pin color to a literal hex (clears any role).
  function setColorHex(hex: string) {
    updateShared("colorRole", undefined);
    updateShared("color", hex);
  }

  function clearBackground() {
    updateShared("backgroundColorRole", undefined);
    updateShared("backgroundColor", undefined);
  }
  function setBackgroundRole(role: "primary" | "text" | "background") {
    updateShared("backgroundColorRole", role);
    updateShared("backgroundColor", undefined);
  }
  function setBackgroundHex(hex: string) {
    updateShared("backgroundColorRole", undefined);
    updateShared("backgroundColor", hex);
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
            onClick={() => setColorRole("text")}
            title={`Text color (${colors.text})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              currentRole === "text" ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.text }}
          />
          {/* Primary color swatch */}
          <button
            onClick={() => setColorRole("primary")}
            title={`Primary color (${colors.primary})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              currentRole === "primary" ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.primary }}
          />
          {/* Custom color picker */}
          <div className="relative">
            <button
              onClick={() => colorInputRef.current?.click()}
              title="Custom color"
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                !currentRole ? "border-blue-500 scale-110" : "border-zinc-300"
              }`}
              style={{
                background: !currentRole
                  ? currentColor
                  : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              }}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => setColorHex(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          {/* Hex input */}
          <Input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              if (/^#[0-9a-fA-F]{6}$/.test(v)) setColorHex(v);
            }}
            onBlur={() => {
              let v = hexInput.trim();
              if (!v.startsWith("#")) v = "#" + v;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                setColorHex(v);
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

      {/* Text fit */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Text Fit</Label>
        <div className="flex gap-1">
          {([
            { value: true, label: "On" },
            { value: false, label: "Off" },
          ] as const).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => updateShared("textFit", opt.value)}
              className={`flex-1 py-1 text-xs rounded border ${
                (selectedObject.textFit ?? false) === opt.value
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400">
          {selectedObject.textFit
            ? "Text resizes up or down to fit the height"
            : "Text only shrinks if it exceeds the height"}
        </p>
      </div>

      {/* Background */}
      <div className="space-y-1 pt-2 border-t border-zinc-200">
        <Label className="text-xs text-zinc-500">Background</Label>
        <div className="flex items-center gap-2">
          {/* None */}
          <button
            onClick={clearBackground}
            title="No background"
            className={`w-7 h-7 rounded-full border-2 transition-all relative overflow-hidden ${
              !hasBg ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: "#fff" }}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="block w-full h-[2px] bg-red-500 rotate-45 origin-center" />
            </span>
          </button>
          {/* Primary */}
          <button
            onClick={() => setBackgroundRole("primary")}
            title={`Primary (${colors.primary})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              bgRole === "primary" ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.primary }}
          />
          {/* Text */}
          <button
            onClick={() => setBackgroundRole("text")}
            title={`Text (${colors.text})`}
            className={`w-7 h-7 rounded-full border-2 transition-all ${
              bgRole === "text" ? "border-blue-500 scale-110" : "border-zinc-300"
            }`}
            style={{ backgroundColor: colors.text }}
          />
          {/* Custom */}
          <div className="relative">
            <button
              onClick={() => bgColorInputRef.current?.click()}
              title="Custom color"
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                hasBg && !bgRole ? "border-blue-500 scale-110" : "border-zinc-300"
              }`}
              style={{
                background: hasBg && !bgRole
                  ? resolvedBg
                  : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
              }}
            />
            <input
              ref={bgColorInputRef}
              type="color"
              value={resolvedBg}
              onChange={(e) => setBackgroundHex(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <Input
            value={hasBg ? bgHexInput : ""}
            placeholder="none"
            onChange={(e) => {
              const v = e.target.value;
              setBgHexInput(v);
              if (/^#[0-9a-fA-F]{6}$/.test(v)) setBackgroundHex(v);
            }}
            onBlur={() => {
              let v = bgHexInput.trim();
              if (!v) return;
              if (!v.startsWith("#")) v = "#" + v;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                setBackgroundHex(v);
              } else {
                setBgHexInput(resolvedBg);
              }
            }}
            className="h-7 text-xs flex-1 font-mono uppercase"
            maxLength={7}
          />
        </div>
      </div>

      {/* Padding & radius — only meaningful when background is set */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Pad X</Label>
          <Input
            type="number"
            value={selectedObject.paddingX ?? 0}
            onChange={(e) => updateShared("paddingX", Number(e.target.value) || undefined)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Pad Y</Label>
          <Input
            type="number"
            value={selectedObject.paddingY ?? 0}
            onChange={(e) => updateShared("paddingY", Number(e.target.value) || undefined)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Radius</Label>
          <Input
            type="number"
            value={selectedObject.borderRadius ?? 0}
            onChange={(e) => updateShared("borderRadius", Number(e.target.value) || undefined)}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
