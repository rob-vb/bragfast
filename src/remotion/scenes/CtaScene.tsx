import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

type CtaSceneProps = {
  title: string;
  url?: string;
  logoBase64?: string;
  colors: { background: string; text: string; primary: string };
  fontFamily: string;
};

export const CtaScene: React.FC<CtaSceneProps> = ({
  title,
  url,
  logoBase64,
  colors,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo converges from top
  const logoSpring = spring({ frame, fps, config: { damping: 200 } });
  const logoY = interpolate(logoSpring, [0, 1], [-60, 0], {
    extrapolateRight: "clamp",
  });
  const logoOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title converges from below
  const titleDelay = Math.round(fps * 0.15);
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 200 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0], {
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(
    frame,
    [titleDelay, titleDelay + fps * 0.4],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // URL converges from below, further delayed
  const urlDelay = Math.round(fps * 0.3);
  const urlSpring = spring({
    frame: Math.max(0, frame - urlDelay),
    fps,
    config: { damping: 200 },
  });
  const urlY = interpolate(urlSpring, [0, 1], [40, 0], {
    extrapolateRight: "clamp",
  });
  const urlOpacity = interpolate(
    frame,
    [urlDelay, urlDelay + fps * 0.4],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Subtle pulse on title after it's fully visible (frame > 1.5*fps)
  const pulseStart = Math.round(fps * 1.5);
  const pulseAmount =
    frame > pulseStart
      ? Math.sin(((frame - pulseStart) / fps) * Math.PI * 2 * 0.8) * 0.02
      : 0;
  const titleScale = 1 + pulseAmount;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        fontFamily,
      }}
    >
      {logoBase64 && (
        <div
          style={{
            opacity: logoOpacity,
            transform: `translateY(${logoY}px)`,
          }}
        >
          <Img
            src={logoBase64}
            style={{ height: 48, width: "auto", objectFit: "contain" }}
          />
        </div>
      )}

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          textAlign: "center",
          color: colors.primary,
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.15,
          maxWidth: "80%",
        }}
      >
        {title}
      </div>

      {url && (
        <div
          style={{
            opacity: urlOpacity * 0.7,
            transform: `translateY(${urlY}px)`,
            textAlign: "center",
            color: colors.text,
            fontSize: 28,
            fontWeight: 400,
          }}
        >
          {url}
        </div>
      )}
    </AbsoluteFill>
  );
};
