import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } from "remotion";

type IntroSceneProps = {
  title: string;
  subtitle?: string;
  logoBase64?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  title,
  subtitle,
  logoBase64,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo: fade in + scale spring
  const logoOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Title: slides up + fades in, delayed by 0.3s
  const titleDelay = Math.round(fps * 0.3);
  const titleOpacity = interpolate(frame, [titleDelay, titleDelay + fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const titleY = interpolate(frame, [titleDelay, titleDelay + fps * 0.5], [40, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Subtitle: staggered by 0.5s after title
  const subtitleDelay = Math.round(fps * 0.6);
  const subtitleOpacity = interpolate(
    frame,
    [subtitleDelay, subtitleDelay + fps * 0.5],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const subtitleY = interpolate(
    frame,
    [subtitleDelay, subtitleDelay + fps * 0.5],
    [30, 0],
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
      }}
    >
      {logoBase64 && (
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <Img
            src={logoBase64}
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
        </div>
      )}

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          color: colors.text,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: "80%",
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            textAlign: "center",
            color: colors.primary,
            fontSize: 32,
            fontWeight: 400,
            maxWidth: "70%",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
