import React from "react";
import type { CarouselShape } from "../canvas-types";

interface ShapeProps {
  width: number;
  height: number;
  fill: string;
  opacity?: number;
}

function Blob1({ width, height, fill, opacity = 1 }: ShapeProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path
        d="M40,90 C20,55 60,15 110,20 C160,25 195,60 185,110 C175,160 130,190 85,180 C40,170 60,125 40,90 Z"
        fill={fill}
        opacity={opacity}
      />
    </svg>
  );
}

function Blob2({ width, height, fill, opacity = 1 }: ShapeProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path
        d="M30,110 C25,65 80,30 130,45 C175,58 195,105 175,150 C155,195 95,200 60,170 C30,140 35,135 30,110 Z"
        fill={fill}
        opacity={opacity}
      />
    </svg>
  );
}

function Circle({ width, height, fill, opacity = 1 }: ShapeProps) {
  const r = Math.min(width, height) / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <circle cx={width / 2} cy={height / 2} r={r} fill={fill} opacity={opacity} />
    </svg>
  );
}

function Wave({ width, height, fill, opacity = 1 }: ShapeProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block" }}>
      <path
        d="M0,40 C50,10 100,70 200,30 L200,80 L0,80 Z"
        fill={fill}
        opacity={opacity}
      />
    </svg>
  );
}

export function CarouselShapeSVG({ shape, width, height, fill, opacity }: ShapeProps & { shape: CarouselShape }) {
  switch (shape) {
    case "blob1": return <Blob1 width={width} height={height} fill={fill} opacity={opacity} />;
    case "blob2": return <Blob2 width={width} height={height} fill={fill} opacity={opacity} />;
    case "circle": return <Circle width={width} height={height} fill={fill} opacity={opacity} />;
    case "wave": return <Wave width={width} height={height} fill={fill} opacity={opacity} />;
  }
}
