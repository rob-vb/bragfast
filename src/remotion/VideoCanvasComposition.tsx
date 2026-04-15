import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
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
  TemplateObject,
} from "../lib/templates/canvas-types";
import { FORMAT_DIMENSIONS } from "../lib/templates/canvas-types";
import { renderObject } from "../lib/templates/canvas-renderer";
import type { ObjectDataMap } from "../lib/templates/canvas-renderer";
import { resolveBackground } from "../lib/templates/mesh-gradient";
import type { Brand, EntranceType, ExitType, AnimationPreset } from "../lib/types";

export type VideoCanvasCompositionProps = {
  config: CanvasTemplateConfig;
  format: FormatKey;
  slides: ObjectDataMap[];
  brand: Brand;
  slideDuration: number; // seconds per slide (fallback)
  /** Optional per-slide duration override in seconds. When provided, each slide
   *  uses its own duration; otherwise all slides use `slideDuration`. */
  slideDurations?: number[];
};

export const VideoCanvasComposition: React.FC<VideoCanvasCompositionProps> = ({
  config,
  format,
  slides,
  brand,
  slideDuration,
  slideDurations,
}) => {
  const { fps } = useVideoConfig();
  const [fontLoaded, setFontLoaded] = useState(false);
  const [handle] = useState(() => delayRender("Loading brand font"));

  useEffect(() => {
    // Collect all unique font families + weights: brand font + per-object fonts + slide data overrides
    const layout = config.formats[format] ?? config.formats.landscape;
    const familyWeights = new Map<string, Set<number>>();
    const addFamily = (f: string, w?: number) => {
      if (!familyWeights.has(f)) familyWeights.set(f, new Set());
      if (w) familyWeights.get(f)!.add(w);
    };
    addFamily(brand.font_family || "Plus Jakarta Sans");
    for (const obj of layout.objects) {
      if (obj.fontFamily) addFamily(obj.fontFamily, obj.fontWeight);
    }
    for (const slideData of slides) {
      for (const entry of Object.values(slideData)) {
        if (entry.fontFamily) addFamily(entry.fontFamily, entry.fontWeight);
      }
    }

    Promise.all([...familyWeights].map(([f, w]) => loadBrandFont(f, w.size > 0 ? w : undefined)))
      .then(() => {
        setFontLoaded(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Failed to load font:", err);
        setFontLoaded(true);
        continueRender(handle);
      });
  }, [brand.font_family, config, format, handle, slides]);

  if (!fontLoaded) return null;

  const framesFor = (i: number) =>
    Math.round((slideDurations?.[i] ?? slideDuration) * fps);

  return (
    <Series>
      {slides.map((slideData, i) => {
        const slideFrames = framesFor(i);
        return (
          <Series.Sequence key={i} durationInFrames={slideFrames}>
            <SlideRenderer
              config={config}
              format={format}
              objectData={slideData}
              brand={brand}
              slideDurationFrames={slideFrames}
            />
          </Series.Sequence>
        );
      })}
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
  const bg = resolveBackground(config, colors);
  const sortedObjects = [...layout.objects].sort((a, b) => a.zIndex - b.zIndex);
  const heroId = findHeroImageId(sortedObjects);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        background: bg.css || undefined,
        overflow: "hidden",
      }}
    >
      {bg.imageUrl && (
        <img
          src={bg.imageUrl}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      {sortedObjects.filter((obj) => {
        // Skip text/image objects with no user-provided data
        if (obj.type === "logo") return true;
        if (obj.type === "visual" && obj.src) return true;
        return !!objectData[obj.id];
      }).map((obj, sortIndex) => {
        const data = objectData[obj.id];

        // Background images: static, no animation
        const isBg = obj.type === "visual" && obj.background === true;
        const isHero = obj.type === "visual" ? obj.id === heroId : undefined;

        // Resolve animation from preset (or fall back to type defaults)
        const presetAnim = isBg
          ? { entrance: "none" as EntranceType, exit: "none" as ExitType, kenBurns: false }
          : resolvePreset(config.animation_preset, obj.type, isHero);
        const entrance: EntranceType = presetAnim.entrance ?? getDefaultEntrance(obj.type);
        const exit: ExitType = presetAnim.exit ?? getDefaultExit(obj.type);

        const staggerDelay = sortIndex * Math.round(fps * 0.15);
        const localFrame = Math.max(0, frame - staggerDelay);

        // Compute entrance animation style
        const entranceStyle = computeEntranceStyle(entrance, localFrame, fps, slideDurationFrames, height);

        // Compute exit animation style
        const exitStyle = computeExitStyle(exit, frame, fps, slideDurationFrames);

        // Compute image-specific effects (Ken Burns from preset)
        const kenBurnsEnabled = presetAnim.kenBurns ?? false;
        const imageEffectStyle =
          obj.type === "visual" && kenBurnsEnabled && entrance !== "showcase-rise"
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
                {renderObject(obj, objectData, brand, colors, { VideoComponent: OffthreadVideo })}
              </div>
            </div>
          ) : (
            renderObject(obj, objectData, brand, colors, { VideoComponent: OffthreadVideo })
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
    case "visual":
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
    case "visual":
      return "fade-out";
    case "logo":
      return "none";
    default:
      return "fade-out";
  }
}

export function findHeroImageId(objects: TemplateObject[]): string | null {
  const candidates = objects.filter(
    (o) => o.type === "visual" && !o.background,
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.zIndex !== a.zIndex) return b.zIndex - a.zIndex;
    if ((b.opacity ?? 1) !== (a.opacity ?? 1)) return (b.opacity ?? 1) - (a.opacity ?? 1);
    return a.id.localeCompare(b.id);
  });
  return candidates[0].id;
}

export function resolvePreset(
  preset: AnimationPreset | undefined,
  objectType: string,
  isHero?: boolean,
): { entrance?: EntranceType; exit?: ExitType; kenBurns?: boolean } {
  if (!preset) preset = "showcase";

  switch (preset) {
    case "showcase": {
      if (objectType === "visual") {
        if (isHero === false) return { entrance: "fade-in", exit: "none", kenBurns: false };
        return { entrance: "showcase-rise", exit: "none", kenBurns: true };
      }
      return { entrance: "showcase-reveal", exit: "none" };
    }
    case "kinetic": {
      return { entrance: "slide-up", exit: "slide-down" };
    }
    case "minimal": {
      return { entrance: "fade-in-slow", exit: "fade-out" };
    }
    case "bounce-pop": {
      return { entrance: "scale-pop", exit: "scale-out" };
    }
    case "ken-burns": {
      if (objectType === "visual" && isHero === true) {
        return { entrance: "zoom-hold", exit: "none", kenBurns: true };
      }
      return { entrance: "fade-in-slow", exit: "fade-out" };
    }
    case "cinematic": {
      if (objectType === "visual") {
        if (isHero === true) return { entrance: "drift-in", exit: "drift-out" };
        return { entrance: "fade-in-slow", exit: "fade-out" };
      }
      return { entrance: "showcase-reveal", exit: "fade-out" };
    }
    default:
      return {};
  }
}

function computeEntranceStyle(
  entrance: EntranceType,
  localFrame: number,
  fps: number,
  slideDurationFrames?: number,
  containerHeight?: number,
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

    case "showcase-rise": {
      // All timings are proportional to slide duration so they scale
      // with any duration (5s, 10s, etc.).
      // First 60% = motion (rise, zoom, tilt), last 40% = settled & readable.
      const total = slideDurationFrames ?? Math.round(fps * 5);

      // Rise: 0→20% fly up with overshoot, 20→50% settle to position
      const riseMid = Math.round(total * 0.2);
      const riseEnd = Math.round(total * 0.5);
      const riseDistance = containerHeight ?? 600;
      const overshoot = -250;

      let translateY: number;
      if (localFrame <= riseMid) {
        translateY = interpolate(localFrame, [0, riseMid], [riseDistance, overshoot], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });
      } else {
        translateY = interpolate(localFrame, [riseMid, riseEnd], [overshoot, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      }

      // Zoom: 0→40% overshoot small, 40→60% settle to 1.0
      const zoomOutEnd = Math.round(total * 0.4);
      const zoomSettleEnd = Math.round(total * 0.6);

      let scale: number;
      if (localFrame <= zoomOutEnd) {
        scale = interpolate(localFrame, [0, zoomOutEnd], [1.3, 0.9], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      } else {
        scale = interpolate(localFrame, [zoomOutEnd, zoomSettleEnd], [0.9, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      }

      // 3D tilt: 0→30% pan across, 30→60% settle to neutral
      const tiltMid = Math.round(total * 0.3);
      const tiltEnd = Math.round(total * 0.6);

      let rotateY: number;
      let rotateX: number;
      if (localFrame <= tiltMid) {
        rotateY = interpolate(localFrame, [0, tiltMid], [-12, 10], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
        rotateX = interpolate(localFrame, [0, tiltMid], [6, 2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      } else {
        rotateY = interpolate(localFrame, [tiltMid, tiltEnd], [10, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
        rotateX = interpolate(localFrame, [tiltMid, tiltEnd], [2, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      }

      return {
        opacity: 1,
        transform: `perspective(1200px) translateY(${translateY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
      };
    }

    case "showcase-reveal": {
      // Reveal after the image has settled into position.
      // Starts at 40% so text is readable for ~2.5s on a 5s slide.
      const totalFrames = slideDurationFrames ?? Math.round(fps * 10);
      const revealStart = Math.round(totalFrames * 0.4);
      const revealDuration = Math.round(fps * 0.6);

      if (localFrame < revealStart) {
        return { opacity: 0 };
      }

      const progress = localFrame - revealStart;
      const opacity = interpolate(progress, [0, revealDuration], [0, 1], {
        extrapolateRight: "clamp",
      });
      const slideY = interpolate(progress, [0, revealDuration], [16, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });

      return {
        opacity,
        transform: `translateY(${slideY}px)`,
      };
    }

    case "fade-in-slow": {
      const duration = Math.round(fps * 1.2);
      const opacity = interpolate(localFrame, [0, duration], [0, 1], {
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
      return { opacity };
    }

    case "scale-pop": {
      const opacity = interpolate(localFrame, [0, Math.round(fps * 0.3)], [0, 1], {
        extrapolateRight: "clamp",
      });
      const scale = spring({
        frame: localFrame,
        fps,
        from: 0.6,
        to: 1.0,
        config: { damping: 6, stiffness: 180 },
      });
      return { opacity, transform: `scale(${scale})` };
    }

    case "drift-in": {
      const duration = Math.round(fps * 1.0);
      const opacity = interpolate(localFrame, [0, duration], [0, 1], {
        extrapolateRight: "clamp",
      });
      const translateX = interpolate(localFrame, [0, duration], [-40, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
      return { opacity, transform: `translateX(${translateX}px)` };
    }

    case "zoom-hold": {
      const duration = Math.round(fps * 0.8);
      const opacity = interpolate(localFrame, [0, duration], [0, 1], {
        extrapolateRight: "clamp",
      });
      return { opacity };
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

    case "scale-out": {
      const duration = Math.round(fps * 0.4);
      const exitStart = slideDurationFrames - duration;
      const framesFromEnd = Math.max(0, frame - exitStart);
      const scale = spring({
        frame: framesFromEnd,
        fps,
        from: 1.0,
        to: 1.1,
        config: { damping: 10, stiffness: 140 },
      });
      const opacity = interpolate(frame, [exitStart, slideDurationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return { opacity, transform: `scale(${scale})` };
    }

    case "drift-out": {
      const duration = Math.round(fps * 0.6);
      const exitStart = slideDurationFrames - duration;
      const opacity = interpolate(frame, [exitStart, slideDurationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const translateX = interpolate(frame, [exitStart, slideDurationFrames], [0, 40], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      });
      return { opacity, transform: `translateX(${translateX}px)` };
    }

    default:
      return {};
  }
}

function computeImageEffects(
  frame: number,
  totalFrames: number,
): React.CSSProperties {
  // Ken Burns effect — slow continuous zoom and gentle pan
  const scale = interpolate(frame, [0, totalFrames], [1.05, 1.2], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const translateX = interpolate(frame, [0, totalFrames], [-20, 20], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const translateY = interpolate(frame, [0, totalFrames], [-10, 10], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    transformOrigin: "center center",
  };
}

