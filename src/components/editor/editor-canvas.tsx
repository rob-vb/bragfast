"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { useEditor } from "./editor-context";
import { CanvasObject } from "./canvas-object";
import { FORMAT_DIMENSIONS } from "@/lib/templates/canvas-types";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

/** Keep at least this fraction of the canvas visible in the viewport */
const VISIBLE_MIN = 0.2;

export function EditorCanvas() {
  const { state, dispatch, activeObjects } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = FORMAT_DIMENSIONS[state.activeFormat];

  // Camera: zoom level and pan offset (in screen pixels)
  const [zoom, setZoom] = useState<number | null>(null); // null = not initialized
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const spaceHeld = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  /** Clamp pan so the canvas can't be scrolled fully out of view */
  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    if (!containerRef.current) return p;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaledW = dims.width * z;
    const scaledH = dims.height * z;
    const minVisible = VISIBLE_MIN;
    return {
      x: Math.max(-scaledW * (1 - minVisible), Math.min(clientWidth * (1 - minVisible), p.x)),
      y: Math.max(-scaledH * (1 - minVisible), Math.min(clientHeight * (1 - minVisible), p.y)),
    };
  }, [dims.width, dims.height]);

  // Fit canvas to viewport on mount and format change
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 80;
    const scaleX = (clientWidth - padding) / dims.width;
    const scaleY = (clientHeight - padding) / dims.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    setZoom(fitZoom);
    setPan({
      x: (clientWidth - dims.width * fitZoom) / 2,
      y: (clientHeight - dims.height * fitZoom) / 2,
    });
  }, [dims.width, dims.height]);

  // Zoom with Cmd/Ctrl+scroll, pan with plain scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) {
      // Zoom toward cursor position
      const rect = containerRef.current!.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setZoom((prev) => {
        const oldZoom = prev ?? 0.5;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
        const ratio = newZoom / oldZoom;

        setPan((p) => clampPan({
          x: cursorX - (cursorX - p.x) * ratio,
          y: cursorY - (cursorY - p.y) * ratio,
        }, newZoom));
        return newZoom;
      });
    } else {
      // Pan
      setZoom((z) => {
        const currentZ = z ?? 0.5;
        setPan((p) => clampPan({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }, currentZ));
        return z;
      });
    }
  }, [clampPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Middle-click or Space+left-click drag to pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const newPan = {
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      };
      setPan(clampPan(newPan, zoom ?? 0.5));
    }
  }, [clampPan, zoom]);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const currentZoom = zoom ?? 0.5;

  const zoomBy = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const cx = clientWidth / 2;
    const cy = clientHeight / 2;
    setZoom((prev) => {
      const oldZoom = prev ?? 0.5;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));
      const ratio = newZoom / oldZoom;
      setPan((p) => clampPan({
        x: cx - (cx - p.x) * ratio,
        y: cy - (cy - p.y) * ratio,
      }, newZoom));
      return newZoom;
    });
  }, [clampPan]);

  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 80;
    const scaleX = (clientWidth - padding) / dims.width;
    const scaleY = (clientHeight - padding) / dims.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    setZoom(fitZoom);
    setPan({
      x: (clientWidth - dims.width * fitZoom) / 2,
      y: (clientHeight - dims.height * fitZoom) / 2,
    });
  }, [dims.width, dims.height]);

  // Cmd+0 to fit to view, Space to pan
  const [spaceActive, setSpaceActive] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        fitToView();
      }
      if (e.code === "Space" && !e.repeat && !(e.target as HTMLElement).matches("input, textarea, select")) {
        e.preventDefault();
        spaceHeld.current = true;
        setSpaceActive(true);
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spaceHeld.current = false;
        setSpaceActive(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [fitToView]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-zinc-100 overflow-hidden relative"
      style={{ cursor: isPanning.current ? "grabbing" : spaceActive ? "grab" : "default" }}
      onClick={() => dispatch({ type: "SELECT_OBJECT", objectId: null })}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Canvas at fixed pixel dimensions, positioned via transform */}
      <div
        style={{
          position: "absolute",
          left: pan.x,
          top: pan.y,
          width: dims.width,
          height: dims.height,
          transform: `scale(${currentZoom})`,
          transformOrigin: "0 0",
          background: state.config.colors.background,
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
            scale={currentZoom}
            isSelected={state.selectedObjectId === obj.id}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 bg-white/90 backdrop-blur rounded-md border border-zinc-200 shadow-sm select-none">
        <button
          onClick={(e) => { e.stopPropagation(); zoomBy(-0.1); }}
          className="px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 rounded-l-md transition-colors"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); fitToView(); }}
          className="px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors min-w-[44px] text-center"
          title="Fit to view (Cmd+0)"
        >
          {Math.round(currentZoom * 100)}%
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); zoomBy(0.1); }}
          className="px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 rounded-r-md transition-colors"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
