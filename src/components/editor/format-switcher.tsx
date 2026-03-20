"use client";
import { useEditor } from "./editor-context";
import { FORMAT_DIMENSIONS, type FormatKey } from "@/lib/templates/canvas-types";
import { cn } from "@/lib/utils";

const FORMATS: { key: FormatKey; label: string }[] = [
  { key: "landscape", label: "Landscape" },
  { key: "square", label: "Square" },
  { key: "portrait", label: "Portrait" },
  { key: "og", label: "OG Image" },
];

export function FormatSwitcher() {
  const { state, dispatch } = useEditor();

  return (
    <div className="flex flex-col gap-1">
      {FORMATS.map(({ key, label }) => {
        const dims = FORMAT_DIMENSIONS[key];
        return (
          <button
            key={key}
            onClick={() => dispatch({ type: "SWITCH_FORMAT", format: key })}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
              state.activeFormat === key
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            <span>{label}</span>
            <span className="text-xs text-zinc-400">{dims.width}x{dims.height}</span>
          </button>
        );
      })}
    </div>
  );
}
