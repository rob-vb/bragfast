"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useEditor } from "./editor-context";
import { SelectionHandles, type HandlePosition } from "./selection-handles";
import type { TemplateObject } from "@/lib/templates/canvas-types";
import { FORMAT_DIMENSIONS, getObjectBorderRadius } from "@/lib/templates/canvas-types";

/**
 * Auto-fit font size to container.
 * textFit=true (On): resize up or down to fill the height
 * textFit=false (Off): only shrink if text exceeds the height
 */
function useAutoFitFontSize(
  text: string,
  baseFontSize: number,
  containerWidth: number,
  containerHeight: number,
  fontFamily: string,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  textFit: boolean,
) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [fittedSize, setFittedSize] = useState(baseFontSize);

  const deps = useMemo(() => ({
    text, baseFontSize, containerWidth, containerHeight, fontFamily, fontWeight, lineHeight, letterSpacing, textFit,
  }), [text, baseFontSize, containerWidth, containerHeight, fontFamily, fontWeight, lineHeight, letterSpacing, textFit]);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const minSize = 8;
    const maxSize = 400;

    const applyStyle = (size: number) => {
      el.style.fontSize = `${size}px`;
      el.style.fontFamily = `${deps.fontFamily}, sans-serif`;
      el.style.fontWeight = String(deps.fontWeight);
      el.style.lineHeight = String(deps.lineHeight);
      el.style.letterSpacing = `${deps.letterSpacing}px`;
      el.style.width = `${deps.containerWidth}px`;
      el.innerText = deps.text;
    };

    if (deps.textFit) {
      // On: scale up or down to fill the height
      // Binary search for the largest size that fits
      let lo = minSize;
      let hi = maxSize;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        applyStyle(mid);
        if (el.scrollHeight <= deps.containerHeight) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      setFittedSize(lo);
    } else {
      // Off: only shrink if it overflows
      let size = deps.baseFontSize;
      applyStyle(size);
      while (el.scrollHeight > deps.containerHeight && size > minSize) {
        size -= 1;
        applyStyle(size);
      }
      setFittedSize(size);
    }
  }, [deps]);

  return { fittedSize, measureRef };
}

const SNAP_THRESHOLD = 8; // px in canvas space

interface CanvasObjectProps {
  obj: TemplateObject;
  scale: number;
  isSelected: boolean;
}

function snapEdges(
  x: number, y: number, w: number, h: number,
  canvasW: number, canvasH: number,
  others: TemplateObject[], selfId: string,
) {
  // Collect snap lines: canvas edges + other objects' edges
  const xLines = [0, canvasW];
  const yLines = [0, canvasH];
  for (const o of others) {
    if (o.id === selfId) continue;
    xLines.push(o.x, o.x + o.width);
    yLines.push(o.y, o.y + o.height);
  }

  let sx = x, sy = y, sw = w, sh = h;

  // Snap left edge
  for (const line of xLines) {
    if (Math.abs(sx - line) < SNAP_THRESHOLD) { sx = line; break; }
  }
  // Snap right edge
  for (const line of xLines) {
    if (Math.abs((sx + sw) - line) < SNAP_THRESHOLD) { sx = line - sw; break; }
  }
  // Snap top edge
  for (const line of yLines) {
    if (Math.abs(sy - line) < SNAP_THRESHOLD) { sy = line; break; }
  }
  // Snap bottom edge
  for (const line of yLines) {
    if (Math.abs((sy + sh) - line) < SNAP_THRESHOLD) { sy = line - sh; break; }
  }

  return { x: sx, y: sy, w: sw, h: sh };
}

function snapResize(
  x: number, y: number, w: number, h: number,
  handle: string,
  canvasW: number, canvasH: number,
  others: TemplateObject[], selfId: string,
) {
  const xLines = [0, canvasW];
  const yLines = [0, canvasH];
  for (const o of others) {
    if (o.id === selfId) continue;
    xLines.push(o.x, o.x + o.width);
    yLines.push(o.y, o.y + o.height);
  }

  // Snap the edge being dragged
  if (handle.includes("e")) {
    const right = x + w;
    for (const line of xLines) {
      if (Math.abs(right - line) < SNAP_THRESHOLD) { w = line - x; break; }
    }
  }
  if (handle.includes("w")) {
    for (const line of xLines) {
      if (Math.abs(x - line) < SNAP_THRESHOLD) { w += (x - line); x = line; break; }
    }
  }
  if (handle.includes("s")) {
    const bottom = y + h;
    for (const line of yLines) {
      if (Math.abs(bottom - line) < SNAP_THRESHOLD) { h = line - y; break; }
    }
  }
  if (handle.includes("n")) {
    for (const line of yLines) {
      if (Math.abs(y - line) < SNAP_THRESHOLD) { h += (y - line); y = line; break; }
    }
  }

  return { x, y, w: Math.max(20, w), h: Math.max(20, h) };
}

export function CanvasObject({ obj, scale, isSelected }: CanvasObjectProps) {
  const { dispatch, state, activeObjects } = useEditor();
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = FORMAT_DIMENSIONS[state.activeFormat];
  const dragStart = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);
  const resizeStart = useRef<{
    handle: HandlePosition;
    startX: number; startY: number;
    objX: number; objY: number;
    objW: number; objH: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (resizeStart.current) return;
    e.stopPropagation();
    dispatch({ type: "SELECT_OBJECT", objectId: obj.id });
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      objX: obj.x, objY: obj.y,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [dispatch, obj.id, obj.x, obj.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStart.current && !resizeStart.current) {
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      const rawX = dragStart.current.objX + dx;
      const rawY = dragStart.current.objY + dy;
      const snapped = snapEdges(rawX, rawY, obj.width, obj.height, dims.width, dims.height, activeObjects, obj.id);
      dispatch({
        type: "MOVE_OBJECT",
        objectId: obj.id,
        x: Math.round(snapped.x),
        y: Math.round(snapped.y),
      });
    }
    if (resizeStart.current) {
      const rs = resizeStart.current;
      const dx = (e.clientX - rs.startX) / scale;
      const dy = (e.clientY - rs.startY) / scale;
      let { objX: x, objY: y, objW: w, objH: h } = rs;

      if (rs.handle.includes("e")) { w = Math.max(20, rs.objW + dx); }
      if (rs.handle.includes("w")) { w = Math.max(20, rs.objW - dx); x = rs.objX + (rs.objW - w); }
      if (rs.handle.includes("s")) { h = Math.max(20, rs.objH + dy); }
      if (rs.handle.includes("n")) { h = Math.max(20, rs.objH - dy); y = rs.objY + (rs.objH - h); }

      const snapped = snapResize(x, y, w, h, rs.handle, dims.width, dims.height, activeObjects, obj.id);
      dispatch({
        type: "RESIZE_OBJECT",
        objectId: obj.id,
        x: Math.round(snapped.x), y: Math.round(snapped.y),
        width: Math.round(snapped.w), height: Math.round(snapped.h),
      });
    }
  }, [dispatch, obj.id, obj.width, obj.height, scale, dims.width, dims.height, activeObjects]);

  const handlePointerUp = useCallback(() => {
    if (dragStart.current || resizeStart.current) {
      dispatch({ type: "COMMIT_MOVE" });
    }
    dragStart.current = null;
    resizeStart.current = null;
  }, [dispatch]);

  const handleResizeStart = useCallback((handle: HandlePosition, e: React.PointerEvent) => {
    resizeStart.current = {
      handle,
      startX: e.clientX, startY: e.clientY,
      objX: obj.x, objY: obj.y,
      objW: obj.width, objH: obj.height,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [obj.x, obj.y, obj.width, obj.height]);

  const handleDoubleClick = useCallback(() => {
    if (obj.type === "text") {
      setIsEditing(true);
    }
  }, [obj.type]);

  const colors = state.config.colors;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        cursor: isSelected ? "move" : "pointer",
        outline: isSelected ? "2px solid #3b82f6" : "none",
        outlineOffset: -1,
        zIndex: obj.zIndex,
      }}
    >
      {/* Object content — opacity applied here so handles stay visible */}
      <div style={{ width: "100%", height: "100%", opacity: obj.opacity }}>
        {renderObjectPreview(obj, colors, isEditing, (text) => {
          dispatch({ type: "UPDATE_PROPERTY", objectId: obj.id, property: "previewText", value: text, allFormats: true });
        }, () => setIsEditing(false))}
      </div>

      {/* Selection handles */}
      {isSelected && <SelectionHandles onResizeStart={handleResizeStart} />}
    </div>
  );
}

function AutoFitText({ obj, text, style }: { obj: TemplateObject; text: string; style: React.CSSProperties }) {
  const { fittedSize, measureRef } = useAutoFitFontSize(
    text,
    obj.fontSize || 24,
    obj.width,
    obj.height,
    obj.fontFamily || "Plus Jakarta Sans",
    obj.fontWeight || 400,
    obj.lineHeight || 1.3,
    obj.letterSpacing || 0,
    obj.textFit ?? false,
  );

  return (
    <>
      {/* Hidden measurement div */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflow: "hidden",
        }}
      />
      <div style={{ ...style, fontSize: fittedSize }}>{text}</div>
    </>
  );
}

function renderObjectPreview(
  obj: TemplateObject,
  colors: { background: string; text: string; primary: string },
  isEditing: boolean,
  onTextChange: (text: string) => void,
  onBlur: () => void,
) {
  const textStyle: React.CSSProperties = {
    fontFamily: `${obj.fontFamily || "Plus Jakarta Sans"}, sans-serif`,
    fontSize: obj.fontSize || 24,
    fontWeight: obj.fontWeight || 400,
    letterSpacing: obj.letterSpacing || 0,
    lineHeight: obj.lineHeight || 1.3,
    textAlign: obj.textAlign || "left",
    color: obj.color || colors.text,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: obj.verticalAlign === "center" ? "center"
                  : obj.verticalAlign === "bottom" ? "flex-end" : "flex-start",
  };

  if (obj.type === "text") {
    const text = obj.previewText || "Text goes here";
    if (isEditing) {
      return (
        <textarea
          autoFocus
          defaultValue={text}
          onBlur={(e) => { onTextChange(e.target.value); onBlur(); }}
          style={{ ...textStyle, border: "none", outline: "none", resize: "none", background: "transparent", padding: 0 }}
        />
      );
    }
    return <AutoFitText obj={obj} text={text} style={textStyle} />;
  }

  if (obj.type === "image") {
    const imageFrame = obj.imageFrame || "none";
    const checkerboard = "repeating-conic-gradient(#d4d4d4 0% 25%, #e5e5e5 0% 50%) 0 0 / 20px 20px";
    const objectPosition = `${obj.anchorX || "center"} ${obj.anchorY || "center"}`;
    const staticImgStyle: React.CSSProperties = obj.src
      ? { width: "100%", height: "100%", objectFit: (obj.objectFit || "cover") as React.CSSProperties["objectFit"], objectPosition, pointerEvents: "none", userSelect: "none" as const }
      : {};
    const contentBg = obj.src ? undefined : checkerboard;

    const isDark = obj.imageFrameColor === "dark" || (!obj.imageFrameColor && imageFrame === "mobile");

    if (imageFrame === "browser") {
      const titleBarH = 28;
      return (
        <div style={{
          width: "100%", height: "100%",
          borderRadius: 8,
          overflow: "hidden",
          background: isDark ? "#1c1c1e" : "#e4e4e7",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Title bar */}
          <div style={{
            height: titleBarH, minHeight: titleBarH,
            background: isDark ? "#2a2a2a" : "#f4f4f5",
            display: "flex", alignItems: "center", paddingLeft: 10, gap: 5,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          </div>
          {/* Content area */}
          <div style={{ flex: 1, background: contentBg, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {obj.src && <img src={obj.src} alt="" draggable={false} style={staticImgStyle} />}
          </div>
        </div>
      );
    }

    if (imageFrame === "mobile") {
      const bezel = 6;
      const radius = 24;
      return (
        <div style={{
          width: "100%", height: "100%",
          borderRadius: radius,
          background: isDark ? "#1c1c1e" : "#e8e8e8",
          padding: bezel,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}>
          <div style={{
            width: "100%", height: "100%",
            borderRadius: radius - bezel,
            overflow: "hidden",
            background: contentBg,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {obj.src && <img src={obj.src} alt="" draggable={false} style={staticImgStyle} />}
          </div>
        </div>
      );
    }

    // imageFrame === "none"
    return (
      <div style={{
        width: "100%", height: "100%",
        background: contentBg,
        borderRadius: getObjectBorderRadius(obj) || 4,
        overflow: "hidden",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {obj.src && <img src={obj.src} alt="" draggable={false} style={staticImgStyle} />}
      </div>
    );
  }

  if (obj.type === "logo") {
    const checkerboard = "repeating-conic-gradient(#d4d4d4 0% 25%, #e5e5e5 0% 50%) 0 0 / 20px 20px";
    return (
      <div style={{
        width: "100%", height: "100%",
        background: checkerboard,
        borderRadius: getObjectBorderRadius(obj) || 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px dashed #a1a1aa",
        overflow: "hidden",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return null;
}
