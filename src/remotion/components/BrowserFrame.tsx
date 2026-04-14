import React from "react";
import { Img } from "remotion";

type BrowserFrameProps = {
  imageBase64: string;
  width: number;
  height: number;
  frameColor?: string;
  objectFit?: "cover" | "contain";
};

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  imageBase64,
  width,
  height,
  frameColor = "#E8E8E8",
  objectFit = "cover",
}) => {
  const titleBarHeight = 32;
  const radius = 12;
  const dotSize = 10;
  const dotGap = 6;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.20)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: titleBarHeight,
          backgroundColor: frameColor,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          gap: dotGap,
          flexShrink: 0,
        }}
      >
        {(["#FF5F57", "#FEBC2E", "#28C840"] as const).map((color) => (
          <div
            key={color}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              backgroundColor: color,
            }}
          />
        ))}
      </div>
      <Img
        src={imageBase64}
        style={{
          width: "100%",
          height: height - titleBarHeight,
          objectFit,
        }}
      />
    </div>
  );
};
