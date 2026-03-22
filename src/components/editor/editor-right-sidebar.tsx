"use client";
import { useEditor } from "./editor-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CommonProperties } from "./common-properties";
import { TextProperties } from "./text-properties";
import { ImageProperties } from "./image-properties";
import { AnimationProperties } from "./animation-properties";

export function EditorRightSidebar() {
  const { selectedObject } = useEditor();

  return (
    <div className="w-72 border-l border-zinc-200 bg-white flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-3">
          {!selectedObject ? (
            <p className="text-sm text-zinc-400 text-center mt-8">
              Select an object to edit its properties
            </p>
          ) : (
            <div className="space-y-4">
              <CommonProperties />
              <Separator />
              <TextProperties />
              <ImageProperties />
              <Separator />
              <AnimationProperties />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
