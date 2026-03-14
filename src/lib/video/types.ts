export type TransitionType =
  | "fade"
  | "slide-from-left"
  | "slide-from-right"
  | "slide-from-top"
  | "slide-from-bottom"
  | "wipe"
  | "none";

export type SceneType = "intro" | "feature" | "text" | "cta";

export type SceneConfig = {
  type: SceneType;
  duration: number;
  device?: "browser" | "mobile";
  transition?: TransitionType;
};

export type VideoTemplateConfig = {
  fps: number;
  transition: TransitionType;
  transition_duration: number;
  scenes: SceneConfig[];
};

export type SceneContent = {
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  device?: "browser" | "mobile";
  url?: string;
};

export type VideoFormatEntry = {
  name: "landscape" | "square" | "portrait";
  scenes: SceneContent[];
};

/** Calculate net video duration accounting for transition overlap */
export function calculateVideoDuration(config: VideoTemplateConfig): number {
  const grossDuration = config.scenes.reduce((sum, s) => sum + s.duration, 0);
  let overlapCount = 0;
  for (let i = 1; i < config.scenes.length; i++) {
    const transType = config.scenes[i].transition ?? config.transition;
    if (transType !== "none") overlapCount++;
  }
  return grossDuration - overlapCount * config.transition_duration;
}

export const VIDEO_DIMENSIONS = {
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
} as const;
