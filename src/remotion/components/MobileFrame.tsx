import React from "react";
import { Img } from "remotion";

type MobileFrameProps = {
  imageBase64: string;
  width: number;
  height: number;
  frameColor?: string;
};

export const MobileFrame: React.FC<MobileFrameProps> = ({
  imageBase64,
  width,
  height,
  frameColor = "#1A1A1A",
}) => {
  const bezel = width * 0.025;
  const cornerRadius = width * 0.12;
  const innerRadius = cornerRadius - bezel;

  return (
    <div
      style={{
        width,
        height,
        borderRadius: cornerRadius,
        backgroundColor: frameColor,
        padding: bezel,
        boxShadow: "0 16px 56px rgba(0,0,0,0.30)",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <Img
        src={imageBase64}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: innerRadius,
          objectFit: "cover",
        }}
      />
    </div>
  );
};
