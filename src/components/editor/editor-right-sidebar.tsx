"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandColorSection } from "./brand-color-section";
import { CommonProperties } from "./common-properties";
import { TextProperties } from "./text-properties";
import { ImageProperties } from "./image-properties";

export function EditorRightSidebar() {
  const { state, dispatch, selectedObject } = useEditor();

  return (
    <div className="w-72 border-l border-zinc-200 bg-white flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-3">
          {!selectedObject ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Template</h3>
              <BrandColorSection />
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs font-medium text-zinc-500 uppercase">Video Preset</Label>
                <Select
                  value={state.config.animation_preset ?? "none"}
                  onValueChange={(v) => dispatch({ type: "SET_ANIMATION_PRESET", preset: v === "none" ? undefined : v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="showcase">Showcase</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-zinc-400">Controls how objects animate in video mode</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Object: {selectedObject.name}</h3>
              <CommonProperties />
              <Separator />
              <TextProperties />
              <ImageProperties />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
