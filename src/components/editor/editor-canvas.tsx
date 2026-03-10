"use client";
import { useRef, useEffect, useState } from "react";
import { useEditor } from "./editor-context";
import { CanvasObject } from "./canvas-object";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

export function EditorCanvas() {
  const { state, dispatch, activeObjects } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dims = FORMAT_DIMENSIONS[state.activeFormat];

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 64;
      const scaleX = (clientWidth - padding) / dims.width;
      const scaleY = (clientHeight - padding) / dims.height;
      setScale(Math.min(scaleX, scaleY, 1));
    }
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [dims.width, dims.height]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-zinc-100 flex items-center justify-center overflow-hidden"
      onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: null })}
    >
      <div
        style={{
          width: dims.width,
          height: dims.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: state.config.colors.background,
          position: "relative",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Click on canvas background to deselect */}
        <div
          style={{ position: "absolute", inset: 0 }}
          onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: null })}
        />

        {activeObjects.map((obj) => (
          <CanvasObject
            key={obj.id}
            obj={obj}
            scale={scale}
            isSelected={state.selectedObjectId === obj.id}
          />
        ))}
      </div>
    </div>
  );
}
