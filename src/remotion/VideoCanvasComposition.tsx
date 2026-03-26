import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Series,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  delayRender,
  continueRender,
} from "remotion";
import { loadBrandFont } from "./fonts";
import type {
  CanvasTemplateConfig,
  FormatKey,
} from "../lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "../lib/templates/canvas-types";
import { renderObject } from "../lib/templates/canvas-renderer";
import type { ObjectDataMap } from "../lib/templates/canvas-renderer";
import type { Brand } from "../lib/types";

type EntranceType = "fade-in" | "slide-up" | "bounce" | "none";
type ExitType = "fade-out" | "slide-down" | "bounce" | "none";

export type VideoCanvasCompositionProps = {
  config: CanvasTemplateConfig;
  format: FormatKey;
  slides: ObjectDataMap[];
  brand: Brand;
  slideDuration: number; // seconds per slide
};

export const VideoCanvasComposition: React.FC<VideoCanvasCompositionProps> = ({
  config,
  format,
  slides,
  brand,
  slideDuration,
}) => {
  const { fps } = useVideoConfig();
  const [fontLoaded, setFontLoaded] = useState(false);
  const [handle] = useState(() => delayRender("Loading brand font"));

  useEffect(() => {
    const fontFamily = brand.font_family || "Plus Jakarta Sans";
    loadBrandFont(fontFamily)
      .then(() => {
        setFontLoaded(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Failed to load font:", err);
        setFontLoaded(true);
        continueRender(handle);
      });
  }, [brand.font_family, handle]);

  if (!fontLoaded) return null;

  const slideFrames = Math.round(slideDuration * fps);

  return (
    <Series>
      {slides.map((slideData, i) => (
        <Series.Sequence key={i} durationInFrames={slideFrames}>
          <SlideRenderer
            config={config}
            format={format}
            objectData={slideData}
            brand={brand}
            slideDurationFrames={slideFrames}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};

// ---------------------------------------------------------------------------
// SlideRenderer — renders a single slide with per-object animations
// ---------------------------------------------------------------------------

interface SlideRendererProps {
  config: CanvasTemplateConfig;
  format: FormatKey;
  objectData: ObjectDataMap;
  brand: Brand;
  slideDurationFrames: number;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
  config,
  format,
  objectData,
  brand,
  slideDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FORMAT_DIMENSIONS[format];
  const layout = config.formats[format] ?? config.formats.landscape;
  const colors = brand.colors ?? config.colors;
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: colors.background,
        overflow: "hidden",
      }}
    >
      {sortedObjects.map((obj, sortIndex) => {
        const data = objectData[obj.id];

        // Determine entrance type: API override > template default > type-based default
        const entrance: EntranceType =
          (data?.entrance as EntranceType | undefined) ??
          obj.entrance ??
          getDefaultEntrance(obj.type);

        // Determine exit type: API override > template default > type-based default
        const exit: ExitType =
          (data?.exit as ExitType | undefined) ??
          obj.exit ??
          getDefaultExit(obj.type);

        const staggerDelay = sortIndex * Math.round(fps * 0.15);
        const localFrame = Math.max(0, frame - staggerDelay);

        // Compute entrance animation style
        const entranceStyle = computeEntranceStyle(entrance, localFrame, fps);

        // Compute exit animation style
        const exitStyle = computeExitStyle(exit, frame, fps, slideDurationFrames);

        // Compute image-specific effects (3D rotation)
        const kenBurnsEnabled = obj.kenBurns ?? false;
        const imageEffectStyle =
          obj.type === "image" && kenBurnsEnabled
            ? computeImageEffects(frame, slideDurationFrames)
            : {};

        // Combine entrance opacity with exit opacity
        const entranceOpacity = typeof entranceStyle.opacity === "number" ? entranceStyle.opacity : 1;
        const exitOpacity = typeof exitStyle.opacity === "number" ? exitStyle.opacity : 1;
        const combinedOpacity = (obj.opacity ?? 1) * entranceOpacity * exitOpacity;

        // Combine entrance transform with exit transform
        const entranceTransform = entranceStyle.transform || "";
        const exitTransform = exitStyle.transform || "";
        const combinedTransform = [entranceTransform, exitTransform].filter(Boolean).join(" ");

        return (
          <div
            key={obj.id}
            style={{
              position: "absolute",
              left: obj.x,
              top: obj.y,
              width: obj.width,
              height: obj.height,
              zIndex: obj.zIndex,
              display: "flex",
              flexDirection: "column",
              justifyContent:
                obj.verticalAlign === "center"
                  ? "center"
                  : obj.verticalAlign === "bottom"
                    ? "flex-end"
                    : "flex-start",
              opacity: combinedOpacity,
              transform: combinedTransform || undefined,
            }}
          >
            {Object.keys(imageEffectStyle).length > 0 ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                perspective: "1200px",
                perspectiveOrigin: "center center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  ...imageEffectStyle,
                }}
              >
                {renderObject(obj, objectData, brand, colors)}
              </div>
            </div>
          ) : (
            renderObject(obj, objectData, brand, colors)
          )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

function getDefaultEntrance(type: string): EntranceType {
  switch (type) {
    case "text":
      return "fade-in";
    case "image":
      return "fade-in";
    case "logo":
      return "none";
    default:
      return "fade-in";
  }
}

function getDefaultExit(type: string): ExitType {
  switch (type) {
    case "text":
      return "fade-out";
    case "image":
      return "fade-out";
    case "logo":
      return "none";
    default:
      return "fade-out";
  }
}

function computeEntranceStyle(
  entrance: EntranceType,
  localFrame: number,
  fps: number,
): React.CSSProperties {
  switch (entrance) {
    case "none":
      return {};

    case "fade-in": {
      const duration = Math.round(fps * 0.8);
      const opacity = interpolate(localFrame, [0, duration], [0, 1], {
        extrapolateRight: "clamp",
      });
      const translateY = interpolate(localFrame, [0, duration], [24, 0], {
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "slide-up": {
      const duration = Math.round(fps * 0.3);
      const opacity = interpolate(localFrame, [0, duration], [0, 1], {
        extrapolateRight: "clamp",
      });
      const translateY = spring({
        frame: localFrame,
        fps,
        from: 60,
        to: 0,
        config: { damping: 12, stiffness: 100 },
      });
      return {
        opacity,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "bounce": {
      const scale = spring({
        frame: localFrame,
        fps,
        from: 0.8,
        to: 1.0,
        config: { damping: 8, stiffness: 150 },
      });
      return {
        transform: `scale(${scale})`,
      };
    }

    default:
      return {};
  }
}

function computeExitStyle(
  exit: ExitType,
  frame: number,
  fps: number,
  slideDurationFrames: number,
): React.CSSProperties {
  switch (exit) {
    case "none":
      return {};

    case "fade-out": {
      const duration = Math.round(fps * 0.4);
      const exitStart = slideDurationFrames - duration;
      const opacity = interpolate(frame, [exitStart, slideDurationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const translateY = interpolate(frame, [exitStart, slideDurationFrames], [0, -16], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "slide-down": {
      const duration = Math.round(fps * 0.3);
      const exitStart = slideDurationFrames - duration;
      const opacity = interpolate(frame, [exitStart, slideDurationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const framesFromEnd = Math.max(0, frame - exitStart);
      const translateY = spring({
        frame: framesFromEnd,
        fps,
        from: 0,
        to: 60,
        config: { damping: 12, stiffness: 100 },
      });
      return {
        opacity,
        transform: `translateY(${translateY}px)`,
      };
    }

    case "bounce": {
      const duration = Math.round(fps * 0.4);
      const exitStart = slideDurationFrames - duration;
      const framesFromEnd = Math.max(0, frame - exitStart);
      const scale = spring({
        frame: framesFromEnd,
        fps,
        from: 1.0,
        to: 0.8,
        config: { damping: 8, stiffness: 150 },
      });
      const opacity = interpolate(frame, [exitStart, slideDurationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        opacity,
        transform: `scale(${scale})`,
      };
    }

    default:
      return {};
  }
}

function computeImageEffects(
  frame: number,
  totalFrames: number,
): React.CSSProperties {
  // 3D tilt effect — cinematic product showcase
  // Slow pan on Y axis while maintaining a subtle forward tilt
  const rotateY = interpolate(
    frame,
    [0, totalFrames],
    [-15, 15],
    { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );
  const rotateX = interpolate(
    frame,
    [0, totalFrames],
    [8, 3],
    { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );
  // Slow zoom out for depth
  const scale = interpolate(
    frame,
    [0, totalFrames],
    [1.12, 1.0],
    { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );

  return {
    transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
    transformStyle: "preserve-3d" as const,
    transformOrigin: "center center",
  };
}

