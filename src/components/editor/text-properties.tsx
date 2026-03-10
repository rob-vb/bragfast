"use client";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_CATEGORIES } from "./font-data";

export function TextProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;
  if (selectedObject.type !== "title" && selectedObject.type !== "description" && selectedObject.type !== "productName") return null;

  function update(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Text</Label>

      {/* Font family */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Font</Label>
        <Select value={selectedObject.fontFamily || "Plus Jakarta Sans"} onValueChange={(v) => update("fontFamily", v)}>
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
            onChange={(e) => update("fontSize", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Weight</Label>
          <Select value={String(selectedObject.fontWeight || 400)} onValueChange={(v) => update("fontWeight", Number(v))}>
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
            onChange={(e) => update("letterSpacing", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Line H</Label>
          <Input
            type="number" value={selectedObject.lineHeight || 1.3} step={0.05}
            onChange={(e) => update("lineHeight", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Text align */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Align</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update("textAlign", a)}
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

      {/* Vertical align */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">V. Align</Label>
        <div className="flex gap-1">
          {(["top", "center", "bottom"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update("verticalAlign", a)}
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
