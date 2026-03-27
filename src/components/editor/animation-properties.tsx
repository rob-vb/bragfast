"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const DEFAULT_ENTRANCE: Record<string, string> = {
  text: "fade-in",
  image: "fade-in",
  logo: "none",
};

const DEFAULT_EXIT: Record<string, string> = {
  text: "fade-out",
  image: "fade-out",
  logo: "none",
};

export function AnimationProperties() {
  const { selectedObject, dispatch } = useEditor();

  if (!selectedObject) return null;

  const entrance = selectedObject.entrance ?? DEFAULT_ENTRANCE[selectedObject.type] ?? "fade-in";
  const exit = selectedObject.exit ?? DEFAULT_EXIT[selectedObject.type] ?? "fade-out";
  const kenBurns = selectedObject.kenBurns ?? false;

  function updateEntrance(value: string) {
    dispatch({
      type: "UPDATE_PROPERTY",
      objectId: selectedObject!.id,
      property: "entrance",
      value,
      allFormats: true,
    });
  }

  function updateExit(value: string) {
    dispatch({
      type: "UPDATE_PROPERTY",
      objectId: selectedObject!.id,
      property: "exit",
      value,
      allFormats: true,
    });
  }

  function updateKenBurns(value: boolean) {
    dispatch({
      type: "UPDATE_PROPERTY",
      objectId: selectedObject!.id,
      property: "kenBurns",
      value,
      allFormats: true,
    });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Video Animation</Label>

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Entrance</Label>
        <Select value={entrance} onValueChange={updateEntrance}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade-in">Fade In</SelectItem>
            <SelectItem value="slide-up">Slide Up</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
            <SelectItem value="showcase-rise">Showcase Rise</SelectItem>
            <SelectItem value="showcase-reveal">Showcase Reveal</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-zinc-400">Controls how this object enters in video mode</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Exit</Label>
        <Select value={exit} onValueChange={updateExit}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade-out">Fade Out</SelectItem>
            <SelectItem value="slide-down">Slide Down</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-zinc-400">Controls how this object exits in video mode</p>
      </div>

      {selectedObject.type === "image" && (
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-zinc-500">Ken Burns</Label>
            <p className="text-[10px] text-zinc-400">Slow zoom &amp; pan effect</p>
          </div>
          <Switch checked={kenBurns} onCheckedChange={updateKenBurns} />
        </div>
      )}
    </div>
  );
}
