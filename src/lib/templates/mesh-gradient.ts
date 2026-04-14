import type { CanvasTemplateConfig } from "./canvas-types";

export function generateMeshGradientCSS(
  colors: [string, string, string],
  positions: { x: number; y: number }[],
): string {
  const gradients = colors.map(
    (color, i) =>
      `radial-gradient(circle at ${positions[i].x}% ${positions[i].y}%, ${color}cc 0%, transparent 50%)`,
  );
  return `${gradients.join(", ")}, ${colors[0]}`;
}

export function randomizeMeshPositions(): { x: number; y: number }[] {
  const quadrants = [
    { xMin: 0, xMax: 50, yMin: 0, yMax: 50 },
    { xMin: 50, xMax: 100, yMin: 0, yMax: 50 },
    { xMin: 0, xMax: 50, yMin: 50, yMax: 100 },
    { xMin: 50, xMax: 100, yMin: 50, yMax: 100 },
  ];
  const picked = new Set<number>();
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < 3; i++) {
    let qi: number;
    do {
      qi = Math.floor(Math.random() * 4);
    } while (picked.has(qi) && picked.size < 4);
    picked.add(qi);
    const q = quadrants[qi];
    positions.push({
      x: Math.round(q.xMin + Math.random() * (q.xMax - q.xMin)),
      y: Math.round(q.yMin + Math.random() * (q.yMax - q.yMin)),
    });
  }
  return positions;
}

export function resolveBackground(
  config: CanvasTemplateConfig,
  colors: { background: string; text: string; primary: string },
): { css: string | undefined; imageUrl: string | undefined } {
  const bg = config.background;
  if (!bg || bg.mode === "color") {
    return { css: colors.background, imageUrl: undefined };
  }
  if (bg.mode === "mesh_gradient") {
    return { css: generateMeshGradientCSS(bg.colors, bg.positions), imageUrl: undefined };
  }
  if (bg.mode === "image") {
    return { css: undefined, imageUrl: bg.imageUrl };
  }
  return { css: colors.background, imageUrl: undefined };
}
