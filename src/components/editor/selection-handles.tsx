"use client";
export type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { pos: HandlePosition; cursor: string; style: React.CSSProperties }[] = [
  { pos: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
  { pos: "n", cursor: "ns-resize", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
  { pos: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
  { pos: "e", cursor: "ew-resize", style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
  { pos: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
  { pos: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
  { pos: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
  { pos: "w", cursor: "ew-resize", style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
];

interface SelectionHandlesProps {
  onResizeStart: (handle: HandlePosition, e: React.PointerEvent) => void;
}

export function SelectionHandles({ onResizeStart }: SelectionHandlesProps) {
  return (
    <>
      {HANDLES.map(({ pos, cursor, style }) => (
        <div
          key={pos}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(pos, e);
          }}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            background: "white",
            border: "1.5px solid #3b82f6",
            borderRadius: 2,
            cursor,
            zIndex: 999,
            ...style,
          }}
        />
      ))}
    </>
  );
}
