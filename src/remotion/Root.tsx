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
  const slideDuration = props.slideDuration || 8;
  const perSlide = props.slideDurations;
  const total = perSlide && perSlide.length > 0
    ? perSlide.reduce((sum, d) => sum + d, 0)
    : calculateVideoDuration(slideCount, slideDuration);
  return { durationInFrames: Math.ceil(total * FPS) };
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

// Showcase compositions — one per built-in template.
// Each template has animation_preset: "showcase" baked in,
// so the preset resolves entrance types automatically.
const showcaseBrand = {
  name: "brag.fast",
  logoBase64: staticFile("demo/bragfastlogo.png"),
  website: "https://bragfast.com",
  colors: { background: "#F5F5F5", text: "#1A1A1A", primary: "#F8AF3C" },
  font_family: "Plus Jakarta Sans",
};

const showcaseSlide = {
  image: { imageBase64: staticFile("demo/browserdemo.jpg") },
  title: { text: "Product Update" },
  description: { text: "Check out our latest feature" },
  logo: {},
};

const SHOWCASE_TEMPLATES = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
] as const;

// Test composition: custom font + font_weight override
const fontTestProps: VideoCanvasCompositionProps = {
  config: getDefaultConfig("split-mobile")!,
  format: "landscape",
  slides: [
    {
      title: { text: "Font Weight Test", fontFamily: "Instrument Serif", fontWeight: 400 },
      description: { text: "This should render in Corben 400", fontFamily: "Corben" },
      image: { imageBase64: staticFile("demo/browserdemo.jpg") },
    },
    {
      title: { text: "Bold Weight", fontFamily: "Corben", fontWeight: 700 },
      description: { text: "Instrument Serif (no 700)", fontFamily: "Instrument Serif", fontWeight: 400 },
      image: { imageBase64: staticFile("demo/browserdemo.jpg") },
    },
  ],
  brand: {
    name: "Font Test",
    logoBase64: "",
    website: "",
    colors: { background: "#0e0c09", text: "#f5ede0", primary: "#e8a030" },
  },
  slideDuration: 5,
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
      <Composition
        id="font-test"
        component={VideoCanvasComposition}
        fps={FPS}
        width={FORMAT_DIMENSIONS.landscape.width}
        height={FORMAT_DIMENSIONS.landscape.height}
        durationInFrames={Math.ceil(10 * FPS)}
        defaultProps={fontTestProps}
        calculateMetadata={calculateMetadata}
      />
      {SHOWCASE_TEMPLATES.flatMap((tmpl) => {
        const duration = tmpl === "hero" ? 5 : 10;
        return (["landscape", "square", "portrait"] as const).map((fmt) => (
        <Composition
          key={`showcase-${tmpl}-${fmt}`}
          id={`showcase-${tmpl}-${fmt}`}
          component={VideoCanvasComposition}
          fps={FPS}
          width={FORMAT_DIMENSIONS[fmt].width}
          height={FORMAT_DIMENSIONS[fmt].height}
          durationInFrames={Math.ceil(duration * FPS)}
          defaultProps={{
            config: getDefaultConfig(tmpl)!,
            format: fmt,
            slides: [showcaseSlide],
            brand: showcaseBrand,
            slideDuration: duration,
          }}
          calculateMetadata={calculateMetadata}
        />
        ));
      })}
    </>
  );
};
