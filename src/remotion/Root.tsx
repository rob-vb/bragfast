import React from "react";
import { Composition, staticFile } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { VideoCanvasComposition } from "./VideoCanvasComposition";
import type { VideoCanvasCompositionProps } from "./VideoCanvasComposition";
import { FORMAT_DIMENSIONS } from "../lib/templates/canvas-types";
import type { AnimationPreset } from "../lib/types";
import { getDefaultConfig } from "../lib/templates/default-configs";

const FPS = 30;

function calculateVideoDuration(
  slideCount: number,
  slideDuration: number,
): number {
  return slideDuration * slideCount;
}

const calculateMetadata: CalculateMetadataFunction<
  VideoCanvasCompositionProps
> = ({ props }) => {
  const slideCount = props.slides?.length || 1;
  const slideDuration = props.slideDuration || 8;
  const perSlide = props.slideDurations;
  const total = perSlide && perSlide.length > 0
    ? perSlide.reduce((sum, d) => sum + d, 0)
    : calculateVideoDuration(slideCount, slideDuration);
  return { durationInFrames: Math.ceil(total * FPS) };
};

const presetBrand = {
  name: "brag.fast",
  logoBase64: staticFile("demo/bragfastlogo.png"),
  website: "https://bragfast.com",
  colors: { background: "#F5F5F5", text: "#1A1A1A", primary: "#F8AF3C" },
  font_family: "Plus Jakarta Sans",
};

const presetSlide = {
  image: { imageBase64: staticFile("demo/browserdemo.jpg") },
  title: { text: "Product Update" },
  description: { text: "Check out our latest feature" },
  logo: {},
};

const PRESETS: AnimationPreset[] = [
  "showcase",
  "3d-tilt-angles",
  "simple-fade",
];

const baseConfig = getDefaultConfig("standard-browser")!;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {PRESETS.map((preset) => {
        const slideDuration = preset === "3d-tilt-angles" ? 12 : 8;
        return (
          <Composition
            key={`preset-${preset}`}
            id={`preset-${preset}`}
            component={VideoCanvasComposition}
            fps={FPS}
            width={FORMAT_DIMENSIONS.landscape.width}
            height={FORMAT_DIMENSIONS.landscape.height}
            durationInFrames={Math.ceil(slideDuration * FPS)}
            defaultProps={{
              config: { ...baseConfig, animation_preset: preset },
              format: "landscape",
              slides: [presetSlide],
              brand: presetBrand,
              slideDuration,
            }}
            calculateMetadata={calculateMetadata}
          />
        );
      })}
    </>
  );
};
