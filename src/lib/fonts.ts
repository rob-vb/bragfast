import { readFileSync } from "fs";
import path from "path";
import type { TemplateObject } from "./templates/canvas-types";

export const FONT_CATALOG: Record<string, string[]> = {
  Serif: [
    "Abril Fatface",
    "Alegreya",
    "Arvo",
    "BioRhyme",
    "Corben",
    "Cormorant",
    "Courier Prime",
    "Coustard",
    "DM Serif Display",
    "Eczar",
    "Frank Ruhl Libre",
    "Gravitas One",
    "IBM Plex Serif",
    "Jomolhari",
    "Libre Baskerville",
    "Lora",
    "Merriweather",
    "Neuton",
    "Noto Serif",
    "Old Standard TT",
    "PT Serif",
    "Playfair Display",
    "Prata",
    "Source Serif Pro",
    "Spectral",
    "Vollkorn",
  ],
  "Sans Serif": [
    "Alegreya Sans",
    "Anton",
    "Archivo",
    "Archivo Narrow",
    "Cabin",
    "Catamaran",
    "Chivo",
    "Fira Sans",
    "IBM Plex Sans",
    "Karla",
    "Lato",
    "Libre Franklin",
    "Montserrat",
    "Muli",
    "Noto Sans",
    "Nunito",
    "Open Sans",
    "Oswald",
    "Oxygen",
    "PT Sans",
    "Pontano Sans",
    "Poppins",
    "Puritan",
    "Raleway",
    "Roboto",
    "Source Sans Pro",
    "Space Mono",
    "Titillium Web",
    "Ubuntu",
    "Varela",
    "Work Sans",
  ],
  Display: [
    "Caveat",
    "Courgette",
    "Delius",
    "Kalam",
    "Merienda",
    "Patrick Hand",
    "Permanent Marker",
    "Press Start 2P",
    "Satisfy",
    "VT323",
  ],
  International: [
    "Noto Sans SC",
    "Noto Sans TC",
    "Noto Sans JP",
    "Noto Sans KR",
  ],
};

/** Flat set of all valid font names for validation */
export const VALID_FONTS = new Set(Object.values(FONT_CATALOG).flat());

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontStyle = "normal" | "italic";

export interface FontConfig {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: FontStyle;
}

const fontCache = new Map<string, FontConfig[]>();
const LOCAL_FAMILY = "Plus Jakarta Sans";

function loadLocalFonts(): FontConfig[] {
  if (fontCache.has(LOCAL_FAMILY)) return fontCache.get(LOCAL_FAMILY)!;
  const dir = path.join(process.cwd(), "src/assets/fonts");
  const regular = readFileSync(path.join(dir, "PlusJakartaSans-Regular.ttf"));
  const bold = readFileSync(path.join(dir, "PlusJakartaSans-Bold.ttf"));
  const fonts: FontConfig[] = [
    { name: LOCAL_FAMILY, data: regular.buffer as ArrayBuffer, weight: 400, style: "normal" },
    { name: LOCAL_FAMILY, data: bold.buffer as ArrayBuffer, weight: 700, style: "normal" },
  ];
  fontCache.set(LOCAL_FAMILY, fonts);
  return fonts;
}

async function fetchGoogleFontBuffer(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      { headers: { "User-Agent": "curl/7.85.0" } }
    ).then((r) => r.text());
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.(?:ttf|otf|woff2?))\)/);
    if (!match) return null;
    return fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadGoogleFont(family: string): Promise<FontConfig[]> {
  if (fontCache.has(family)) return fontCache.get(family)!;
  const [regularBuf, boldBuf] = await Promise.all([
    fetchGoogleFontBuffer(family, 400),
    fetchGoogleFontBuffer(family, 700),
  ]);
  if (!regularBuf) {
    console.warn(`Failed to fetch Google Font "${family}", falling back to ${LOCAL_FAMILY}`);
    return loadLocalFonts();
  }
  const fonts: FontConfig[] = [
    { name: family, data: regularBuf, weight: 400, style: "normal" },
    { name: family, data: boldBuf ?? regularBuf, weight: 700, style: "normal" },
  ];
  fontCache.set(family, fonts);
  return fonts;
}

export async function loadFontsForFamily(family: string | undefined): Promise<FontConfig[]> {
  if (!family || family === LOCAL_FAMILY) return loadLocalFonts();
  return loadGoogleFont(family);
}

// Backward compat (sync, local only)
export function loadFonts(): FontConfig[] {
  return loadLocalFonts();
}

export async function loadFontsForObjects(objects: TemplateObject[]): Promise<FontConfig[]> {
  const needed = new Map<string, Set<number>>();

  for (const obj of objects) {
    if (obj.fontFamily && obj.fontFamily !== LOCAL_FAMILY) {
      if (!needed.has(obj.fontFamily)) needed.set(obj.fontFamily, new Set());
      needed.get(obj.fontFamily)!.add(obj.fontWeight ?? 400);
    }
  }

  if (needed.size === 0) return loadLocalFonts();

  const allFonts: FontConfig[] = [];
  const fetches: Promise<void>[] = [];

  for (const [family, weights] of needed) {
    for (const weight of weights) {
      fetches.push(
        fetchGoogleFontBuffer(family, weight).then((buf) => {
          if (buf) {
            allFonts.push({ name: family, data: buf, weight: weight as Weight, style: "normal" });
          }
        })
      );
    }
  }
  await Promise.all(fetches);

  // Always include local font as fallback
  allFonts.push(...loadLocalFonts());
  return allFonts;
}
