"use client";
import { useEditor } from "./editor-context";
import { cn } from "@/lib/utils";
import { GripVertical, X } from "lucide-react";
import { useRef, useState } from "react";

export function ObjectLayerList() {
  const { state, dispatch, activeObjects } = useEditor();
  const sorted = [...activeObjects].sort((a, b) => b.zIndex - a.zIndex);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dragOverIdx.current = idx;
  }

  function handleDrop() {
    if (dragIdx === null || dragOverIdx.current === null || dragIdx === dragOverIdx.current) {
      setDragIdx(null);
      return;
    }
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dragOverIdx.current, 0, moved);
    // Reverse back: highest zIndex = first in list
    const ids = reordered.map((o) => o.id);
    dispatch({ type: "REORDER_OBJECTS", objectIds: ids.reverse() });
    setDragIdx(null);
  }

  return (
    <div className="space-y-1">
      {sorted.map((obj, idx) => (
        <div
          key={obj.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={handleDrop}
          onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: obj.id })}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer group",
            state.selectedObjectId === obj.id
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "hover:bg-zinc-50 border border-transparent"
          )}
        >
          <GripVertical className="w-3 h-3 text-zinc-400 cursor-grab" />
          <span className="flex-1 truncate">{obj.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "REMOVE_OBJECT", objectId: obj.id });
            }}
            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
