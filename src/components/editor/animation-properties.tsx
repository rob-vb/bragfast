"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_ENTRANCE: Record<string, string> = {
  text: "fade-in",
  image: "fade-in",
  logo: "bounce",
};

export function AnimationProperties() {
  const { selectedObject, dispatch } = useEditor();

  if (!selectedObject) return null;

  const entrance = selectedObject.entrance ?? DEFAULT_ENTRANCE[selectedObject.type] ?? "fade-in";

  function update(value: string) {
    dispatch({
      type: "UPDATE_PROPERTY",
      objectId: selectedObject!.id,
      property: "entrance",
      value,
      allFormats: true,
    });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Video Animation</Label>

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Entrance</Label>
        <Select value={entrance} onValueChange={update}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade-in">Fade In</SelectItem>
            <SelectItem value="slide-up">Slide Up</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-zinc-400">Controls how this object enters in video mode</p>
      </div>
    </div>
  );
}
