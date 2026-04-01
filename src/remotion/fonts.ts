import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const fontCache = new Map<string, boolean>();

export async function loadBrandFont(family: string): Promise<string> {
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

  // Google Fonts — fetch 400 and 700 separately; fall back to 400 if 700 unavailable
  if (!fontCache.has(family)) {
    const encodedFamily = encodeURIComponent(family);

    async function fetchFontUrl(weight: number): Promise<string | null> {
      const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weight}&display=swap`;
      const css = await fetch(cssUrl, { headers: { "User-Agent": "curl/7.85.0" } }).then((r) => r.text());
      const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.(?:ttf|otf|woff2?))\)/);
      return match ? match[1] : null;
    }

    const [url400, url700] = await Promise.all([fetchFontUrl(400), fetchFontUrl(700)]);
    if (url400) {
      await loadFont({ family, url: url400, weight: "400" });
      await loadFont({ family, url: url700 ?? url400, weight: "700" });
    }
    fontCache.set(family, true);
  }
  return family;
}
