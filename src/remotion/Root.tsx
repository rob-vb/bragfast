import React from "react";
import { Composition, staticFile } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { VideoCanvasComposition } from "./VideoCanvasComposition";
import type { VideoCanvasCompositionProps } from "./VideoCanvasComposition";
import { FORMAT_DIMENSIONS } from "../lib/templates/canvas-types";
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
  const slideDuration = props.slideDuration || 5;
  const netDuration = calculateVideoDuration(slideCount, slideDuration);
  return { durationInFrames: Math.ceil(netDuration * FPS) };
};

const defaultConfig = getDefaultConfig("split-browser")!;

const defaultProps: VideoCanvasCompositionProps = {
  config: defaultConfig,
  format: "landscape",
  slides: [
    {
      title: { text: "Product Update" },
      description: { text: "Check out our latest feature" },
      image: { imageBase64: staticFile("demo/browserdemo.jpg") },
    },
  ],
  brand: {
    name: "Acme Inc",
    logoBase64: "",
    website: "",
    colors: { background: "#0F0F0F", text: "#FFFFFF", primary: "#6366F1" },
    font_family: "Plus Jakarta Sans",
  },
  slideDuration: 10,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(["landscape", "square", "portrait"] as const).map((format) => (
        <Composition
          key={format}
          id={format}
          component={VideoCanvasComposition}
          fps={FPS}
          width={FORMAT_DIMENSIONS[format].width}
          height={FORMAT_DIMENSIONS[format].height}
          durationInFrames={Math.ceil(5 * FPS)}
          defaultProps={{ ...defaultProps, format }}
          calculateMetadata={calculateMetadata}
        />
      ))}
    </>
  );
};
