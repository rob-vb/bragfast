"use client";
import { useEditor } from "./editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

export function CommonProperties() {
  const { selectedObject, dispatch, state } = useEditor();
  if (!selectedObject) return null;
  const dims = FORMAT_DIMENSIONS[state.activeFormat];

  function update(property: string, value: number, allFormats = false) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats });
  }

  function align(pos: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") {
    const obj = selectedObject!;
    switch (pos) {
      case "left": update("x", 0); break;
      case "center-h": update("x", Math.round((dims.width - obj.width) / 2)); break;
      case "right": update("x", dims.width - obj.width); break;
      case "top": update("y", 0); break;
      case "center-v": update("y", Math.round((dims.height - obj.height) / 2)); break;
      case "bottom": update("y", dims.height - obj.height); break;
    }
    dispatch({ type: "COMMIT_MOVE" });
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

      {/* Align to canvas */}
      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Align to canvas</Label>
        <TooltipProvider delayDuration={200}>
          <div className="flex gap-1">
            {([
              { id: "left", label: "Left", icon: "M4 4v16M8 12h10" },
              { id: "center-h", label: "Center H", icon: "M12 4v16M6 12h3M15 12h3" },
              { id: "right", label: "Right", icon: "M20 4v16M6 12h10" },
              { id: "top", label: "Top", icon: "M4 4h16M12 8v10" },
              { id: "center-v", label: "Center V", icon: "M4 12h16M12 6v3M12 15v3" },
              { id: "bottom", label: "Bottom", icon: "M4 20h16M12 6v10" },
            ] as const).map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => align(item.id)}
                    className="flex-1 flex items-center justify-center h-7 rounded border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d={item.icon} />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
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
          onValueChange={([v]) => update("opacity", v, true)}
        />
      </div>
    </div>
  );
}
