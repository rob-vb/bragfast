import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const fontCache = new Map<string, boolean>();

export async function loadBrandFont(family: string, weights?: Set<number>): Promise<string> {
  if (family === "Plus Jakarta Sans") {
    if (!fontCache.has(family)) {
      await loadFont({
        family: "Plus Jakarta Sans",
        url: staticFile("fonts/PlusJakartaSans-Regular.ttf"),
        weight: "400",
      });
      await loadFont({
        family: "Plus Jakarta Sans",
        url: staticFile("fonts/PlusJakartaSans-Bold.ttf"),
        weight: "700",
      });
      fontCache.set(family, true);
    }
    return family;
  }

  // Google Fonts — inject CSS directly so the browser handles unicode-range
  // subsetting natively. We can't use the curl User-Agent trick here because
  // this runs in headless Chrome where User-Agent is a forbidden fetch header.
  const cacheKey = weights ? `${family}:${[...weights].sort().join(",")}` : family;
  if (!fontCache.has(cacheKey)) {
    const allWeights = new Set([400, 700, ...(weights ?? [])]);
    const encodedFamily = encodeURIComponent(family);
    const weightList = [...allWeights].sort((a, b) => a - b).join(";");
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightList}&display=swap`;
    const css = await fetch(cssUrl).then((r) => r.text());

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    await Promise.all(
      [...allWeights].map((w) => document.fonts.load(`${w} 16px "${family}"`))
    ).catch(() => {});

    fontCache.set(cacheKey, true);
  }
  return family;
}
