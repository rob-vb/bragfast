import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";
import { loadBrandFont } from "./fonts";
import {
  TransitionSeries,
  linearTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type {
  VideoTemplateConfig,
  SceneContent,
  TransitionType,
} from "../lib/video/types";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { TextScene } from "./scenes/TextScene";
import { CtaScene } from "./scenes/CtaScene";

export type VideoCompositionProps = {
  template: VideoTemplateConfig;
  scenes: SceneContent[];
  brand: {
    name: string;
    logoBase64?: string;
    colors: { background: string; text: string; primary: string };
    fontFamily: string;
  };
  imageMap: Record<string, string>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(type: TransitionType): TransitionPresentation<any> | null {
  switch (type) {
    case "fade":
      return fade();
    case "slide-from-left":
      return slide({ direction: "from-left" });
    case "slide-from-right":
      return slide({ direction: "from-right" });
    case "slide-from-top":
      return slide({ direction: "from-top" });
    case "slide-from-bottom":
      return slide({ direction: "from-bottom" });
    case "wipe":
      return wipe();
    case "none":
      return null;
  }
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  template,
  scenes,
  brand,
  imageMap,
}) => {
  const { fps } = useVideoConfig();
  const transitionFrames = Math.round(template.transition_duration * fps);

  // Load brand font before rendering
  const [fontLoaded, setFontLoaded] = useState(false);
  const [handle] = useState(() => delayRender("Loading brand font"));

  useEffect(() => {
    loadBrandFont(brand.fontFamily)
      .then(() => {
        setFontLoaded(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Font loading failed, continuing with fallback:", err);
        setFontLoaded(true);
        continueRender(handle);
      });
  }, [brand.fontFamily, handle]);

  if (!fontLoaded) return null;

  const elements: React.ReactNode[] = [];

  template.scenes.forEach((sceneConfig, i) => {
    const content = scenes[i];
    const durationInFrames = Math.round(sceneConfig.duration * fps);

    // Transition before this scene (except first)
    if (i > 0) {
      const transType = sceneConfig.transition ?? template.transition;
      const presentation = getPresentation(transType);
      if (presentation) {
        elements.push(
          <TransitionSeries.Transition
            key={`t-${i}`}
            presentation={presentation}
            timing={linearTiming({ durationInFrames: transitionFrames })}
          />
        );
      }
    }

    // Render scene by type
    const sharedProps = { colors: brand.colors, fontFamily: brand.fontFamily };
    let sceneElement: React.ReactNode;

    switch (sceneConfig.type) {
      case "intro":
        sceneElement = (
          <IntroScene
            title={content.title}
            subtitle={content.subtitle}
            logoBase64={brand.logoBase64}
            {...sharedProps}
          />
        );
        break;
      case "feature": {
        const imageUrl = content.image_url ?? "";
        sceneElement = (
          <FeatureScene
            title={content.title}
            description={content.description}
            imageBase64={imageMap[imageUrl] ?? imageUrl}
            device={content.device ?? sceneConfig.device ?? "browser"}
            {...sharedProps}
          />
        );
        break;
      }
      case "text":
        sceneElement = (
          <TextScene
            title={content.title}
            description={content.description}
            {...sharedProps}
          />
        );
        break;
      case "cta":
        sceneElement = (
          <CtaScene
            title={content.title}
            url={content.url}
            logoBase64={brand.logoBase64}
            {...sharedProps}
          />
        );
        break;
      default:
        sceneElement = null;
    }

    elements.push(
      <TransitionSeries.Sequence
        key={`s-${i}`}
        durationInFrames={durationInFrames}
      >
        {sceneElement}
      </TransitionSeries.Sequence>
    );
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{elements}</TransitionSeries>
    </AbsoluteFill>
  );
};
