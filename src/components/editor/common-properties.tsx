"use client";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function CommonProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;

  function update(property: string, value: number, allFormats = false) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats });
  }

  return (
    <div className="space-y-3">
      {/* Name */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Name</Label>
        <Input
          value={selectedObject.name}
          onChange={(e) => dispatch({
            type: "UPDATE_PROPERTY", objectId: selectedObject.id,
            property: "name", value: e.target.value, allFormats: true,
          })}
          className="h-8 text-sm"
        />
      </div>

      {/* Position & Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">W</Label>
          <Input
            type="number" value={selectedObject.width}
            onChange={(e) => update("width", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">H</Label>
          <Input
            type="number" value={selectedObject.height}
            onChange={(e) => update("height", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">X</Label>
          <Input
            type="number" value={selectedObject.x}
            onChange={(e) => update("x", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Y</Label>
          <Input
            type="number" value={selectedObject.y}
            onChange={(e) => update("y", Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs text-zinc-500">Opacity</Label>
          <span className="text-xs text-zinc-400">{Math.round(selectedObject.opacity * 100)}%</span>
        </div>
        <Slider
          value={[selectedObject.opacity]}
          min={0} max={1} step={0.01}
          onValueChange={([v]) => update("opacity", v)}
        />
      </div>
    </div>
  );
}
