import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { MobileFrame } from "../components/MobileFrame";

type FeatureSceneProps = {
  title: string;
  description?: string;
  imageBase64: string;
  device: "browser" | "mobile";
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  title,
  description,
  imageBase64,
  device,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Device frame slides up from below
  const deviceSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });
  const deviceY = interpolate(deviceSpring, [0, 1], [120, 0], {
    extrapolateRight: "clamp",
  });
  const deviceOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title staggered after device
  const titleDelay = Math.round(fps * 0.3);
  const titleOpacity = interpolate(
    frame,
    [titleDelay, titleDelay + fps * 0.4],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const titleY = interpolate(
    frame,
    [titleDelay, titleDelay + fps * 0.4],
    [24, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Description staggered after title
  const descDelay = Math.round(fps * 0.5);
  const descOpacity = interpolate(
    frame,
    [descDelay, descDelay + fps * 0.4],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const descY = interpolate(
    frame,
    [descDelay, descDelay + fps * 0.4],
    [20, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Layout: device takes ~55% of height, text below
  const deviceAreaHeight = Math.round(height * 0.55);
  const frameWidth = device === "mobile"
    ? Math.round(deviceAreaHeight * 0.5)
    : Math.round(width * 0.65);
  const frameHeight = device === "mobile"
    ? deviceAreaHeight
    : Math.round(frameWidth * (9 / 16));

  const DeviceComponent = device === "browser" ? BrowserFrame : MobileFrame;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        fontFamily,
        paddingLeft: 64,
        paddingRight: 64,
      }}
    >
      <div
        style={{
          opacity: deviceOpacity,
          transform: `translateY(${deviceY}px)`,
        }}
      >
        <DeviceComponent
          imageBase64={imageBase64}
          width={frameWidth}
          height={frameHeight}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          maxWidth: "75%",
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            color: colors.text,
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>

        {description && (
          <div
            style={{
              opacity: descOpacity * 0.75,
              transform: `translateY(${descY}px)`,
              textAlign: "center",
              color: colors.text,
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
