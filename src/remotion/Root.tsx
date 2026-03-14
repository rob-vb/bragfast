import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./VideoComposition";

// Inline VIDEO_DIMENSIONS to avoid cross-directory import issues in Lambda bundle
const VIDEO_DIMENSIONS = {
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
} as const;

// Inline duration calculation
function calculateVideoDuration(template: VideoCompositionProps["template"]): number {
  const grossDuration = template.scenes.reduce((sum, s) => sum + s.duration, 0);
  let overlapCount = 0;
  for (let i = 1; i < template.scenes.length; i++) {
    const transType = template.scenes[i].transition ?? template.transition;
    if (transType !== "none") overlapCount++;
  }
  return grossDuration - overlapCount * template.transition_duration;
}

const calculateMetadata: CalculateMetadataFunction<VideoCompositionProps> = ({
  props,
}) => {
  // Guard against partial props during Remotion's prop merging
  if (!props.template?.scenes?.length) {
    return { durationInFrames: 300 }; // fallback
  }
  const netDuration = calculateVideoDuration(props.template);
  return { durationInFrames: Math.ceil(netDuration * (props.template.fps || 30)) };
};

const defaultProps: VideoCompositionProps = {
  template: {
    fps: 30,
    transition: "fade",
    transition_duration: 0.5,
    scenes: [
      { type: "intro", duration: 3 },
      { type: "feature", duration: 4, device: "browser" },
      { type: "feature", duration: 4, device: "browser", transition: "slide-from-left" },
      { type: "cta", duration: 3 },
    ],
  },
  scenes: [
    { title: "Product Update" },
    { title: "New Feature", description: "Check it out", image_url: "https://placehold.co/1200x800" },
    { title: "Feature 2", description: "Another one", image_url: "https://placehold.co/1200x800" },
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
