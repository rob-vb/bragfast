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
  // Request each weight individually — the CSS2 API returns a 400 error for the
  // entire request if ANY weight is unsupported by the font.
  const cacheKey = weights ? `${family}:${[...weights].sort().join(",")}` : family;
  if (!fontCache.has(cacheKey)) {
    const allWeights = new Set([400, 700, ...(weights ?? [])]);
    const encodedFamily = encodeURIComponent(family);
    const cssChunks = await Promise.all(
      [...allWeights].map(async (w) => {
        try {
          const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${w}&display=swap`;
          const res = await fetch(url);
          return res.ok ? res.text() : null;
        } catch {
          // Google's 400 error pages lack CORS headers, causing fetch to throw
          // instead of returning a non-ok response. Silently skip this weight.
          return null;
        }
      })
    );
    const css = cssChunks.filter(Boolean).join("\n");

    if (css) {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);

      const loadedWeights = cssChunks.map((c, i) => c ? [...allWeights][i] : null).filter(Boolean);
      await Promise.all(
        loadedWeights.map((w) => document.fonts.load(`${w} 16px "${family}"`))
      ).catch(() => {});
    }

    fontCache.set(cacheKey, true);
  }
  return family;
}
