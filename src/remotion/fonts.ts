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

  // Google Fonts — fetch CSS to get actual .woff2 URLs
  if (!fontCache.has(family)) {
    const encodedFamily = encodeURIComponent(family);
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;700&display=swap`;
    const cssResponse = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const css = await cssResponse.text();
    const urlMatches = css.matchAll(/src:\s*url\(([^)]+\.woff2[^)]*)\)/g);
    const weightMatches = css.matchAll(/font-weight:\s*(\d+)/g);
    const urls = Array.from(urlMatches).map((m) => m[1]);
    const weights = Array.from(weightMatches).map((m) => m[1]);
    await Promise.all(
      urls.map((url, i) =>
        loadFont({
          family,
          url,
          weight: (weights[i] ?? "400") as "400" | "700",
          format: "woff2",
        })
      )
    );
    fontCache.set(family, true);
  }
  return family;
}
