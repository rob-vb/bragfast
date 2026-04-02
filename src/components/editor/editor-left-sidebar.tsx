"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormatSwitcher } from "./format-switcher";
import { BrandColorSection } from "./brand-color-section";
import { ObjectLayerList } from "./object-layer-list";
import { AddObjectButton } from "./add-object-button";

export function EditorLeftSidebar() {
  const { state, dispatch } = useEditor();

  return (
    <div className="w-60 border-r border-zinc-200 bg-white flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-3 space-y-4">
          {/* Format */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Format</Label>
            <FormatSwitcher />
          </div>

          <Separator />

          {/* Brand / Colors */}
          <BrandColorSection />

          <Separator />

          {/* Video Preset */}
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

          <Separator />

          {/* Objects */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Objects</Label>
            <AddObjectButton />
            <ObjectLayerList />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
