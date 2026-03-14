import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./VideoComposition";
import { calculateVideoDuration, VIDEO_DIMENSIONS } from "../lib/video/types";

const calculateMetadata: CalculateMetadataFunction<VideoCompositionProps> = ({
  props,
}) => {
  const netDuration = calculateVideoDuration(props.template);
  return { durationInFrames: Math.ceil(netDuration * props.template.fps) };
};

const defaultProps: VideoCompositionProps = {
  template: {
    fps: 30,
    transition: "fade",
    transition_duration: 0.5,
    scenes: [
      { type: "intro", duration: 3 },
      { type: "feature", duration: 4, device: "browser" },
      { type: "cta", duration: 3 },
    ],
  },
  scenes: [
    { title: "Product Update" },
    {
      title: "New Feature",
      description: "Check it out",
      image_url: "https://placehold.co/1200x800",
    },
    { title: "Try it now" },
  ],
  brand: {
    name: "Acme Inc",
    colors: { background: "#0F0F0F", text: "#FFFFFF", primary: "#6366F1" },
    fontFamily: "Plus Jakarta Sans",
  },
  imageMap: {},
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(["landscape", "square", "portrait"] as const).map((format) => (
        <Composition
          key={format}
          id={format}
          component={VideoComposition}
          fps={30}
          width={VIDEO_DIMENSIONS[format].width}
          height={VIDEO_DIMENSIONS[format].height}
          durationInFrames={300}
          defaultProps={defaultProps}
          calculateMetadata={calculateMetadata}
        />
      ))}
    </>
  );
};
