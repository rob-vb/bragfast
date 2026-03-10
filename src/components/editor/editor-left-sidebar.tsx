"use client";
import { useRouter } from "next/navigation";
import { useEditor } from "./editor-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormatSwitcher } from "./format-switcher";
import { BrandColorSection } from "./brand-color-section";
import { ObjectLayerList } from "./object-layer-list";
import { AddObjectButton } from "./add-object-button";
import { ArrowLeft, Save } from "lucide-react";

export function EditorLeftSidebar({ onSave }: { onSave: () => Promise<void> }) {
  const router = useRouter();
  const { state, dispatch } = useEditor();

  return (
    <div className="w-60 border-r border-zinc-200 bg-white flex flex-col h-full">
      {/* Top actions */}
      <div className="p-3 space-y-2 border-b border-zinc-200">
        <Button onClick={onSave} className="w-full" size="sm">
          <Save className="w-4 h-4 mr-1" /> Save Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => router.push("/dashboard/templates")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Template name */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Name</Label>
            <Input
              value={state.name}
              onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          <Separator />

          {/* Format */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Format</Label>
            <FormatSwitcher />
          </div>

          <Separator />

          {/* Brand / Colors */}
          <BrandColorSection />

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
