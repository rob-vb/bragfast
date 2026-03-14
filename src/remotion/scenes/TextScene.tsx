import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type TextSceneProps = {
  title: string;
  description?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const TextScene: React.FC<TextSceneProps> = ({
  title,
  description,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fades in with scale (0.9 → 1)
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleScale = interpolate(frame, [0, fps * 0.5], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  // Description staggered
  const descDelay = Math.round(fps * 0.4);
  const descOpacity = interpolate(
    frame,
    [descDelay, descDelay + fps * 0.5],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const descScale = interpolate(
    frame,
    [descDelay, descDelay + fps * 0.5],
    [0.9, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        fontFamily,
        paddingLeft: 80,
        paddingRight: 80,
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          textAlign: "center",
          color: colors.text,
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: "85%",
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            opacity: descOpacity * 0.75,
            transform: `scale(${descScale})`,
            textAlign: "center",
            color: colors.text,
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.6,
            maxWidth: "70%",
          }}
        >
          {description}
        </div>
      )}
    </AbsoluteFill>
  );
};
