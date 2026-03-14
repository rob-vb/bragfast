import type { SceneConfig, SceneContent } from "./types";

export function validateVideoScenes(
  scenes: SceneContent[],
  templateScenes: SceneConfig[]
): string | null {
  if (scenes.length !== templateScenes.length) {
    return `Expected ${templateScenes.length} scenes, got ${scenes.length}`;
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const config = templateScenes[i];
    const label = `scene ${i + 1}`;

    if (!scene.title || scene.title.trim().length === 0) {
      return `${label}: title is required`;
    }
    if (scene.title.length > 100) {
      return `${label}: title must be 100 characters or fewer`;
    }
    if (scene.description && scene.description.length > 300) {
      return `${label}: description must be 300 characters or fewer`;
    }
    if (config.type === "feature" && !scene.image_url) {
      return `${label}: image_url is required for feature scenes`;
    }
  }

  return null;
}
