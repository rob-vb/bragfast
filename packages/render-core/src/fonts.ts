import { promises as fs } from "fs";
import { readFileSync } from "fs";
import os from "os";
import path from "path";
import type { TemplateObject } from "./canvas-types";

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
export const FONT_DISK_CACHE_DIR = path.join(os.homedir(), ".brag", "fonts");

function fontCacheFile(family: string, weight: number, cacheDir = FONT_DISK_CACHE_DIR): string {
  const safeFamily = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return path.join(cacheDir, `${safeFamily}-${weight}.font`);
}

export async function readFontFromDisk(
  family: string,
  weight: number,
  cacheDir = FONT_DISK_CACHE_DIR,
): Promise<ArrayBuffer | null> {
  try {
    const data = await fs.readFile(fontCacheFile(family, weight, cacheDir));
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

export async function writeFontToDisk(
  family: string,
  weight: number,
  data: ArrayBuffer,
  cacheDir = FONT_DISK_CACHE_DIR,
): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(fontCacheFile(family, weight, cacheDir), Buffer.from(data));
}

function loadLocalFonts(): FontConfig[] {
  if (fontCache.has(LOCAL_FAMILY)) return fontCache.get(LOCAL_FAMILY)!;
  try {
    const dir = path.join(__dirname, "fonts");
    const regular = readFileSync(path.join(dir, "PlusJakartaSans-Regular.ttf"));
    const bold = readFileSync(path.join(dir, "PlusJakartaSans-Bold.ttf"));
    const fonts: FontConfig[] = [
      {
        name: LOCAL_FAMILY,
        data: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength) as ArrayBuffer,
        weight: 400,
        style: "normal",
      },
      {
        name: LOCAL_FAMILY,
        data: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength) as ArrayBuffer,
        weight: 700,
        style: "normal",
      },
    ];
    fontCache.set(LOCAL_FAMILY, fonts);
    return fonts;
  } catch {
    return [];
  }
}

async function loadLocalFontsAsync(): Promise<FontConfig[]> {
  const local = loadLocalFonts();
  if (local.length > 0) return local;
  return loadGoogleFont(LOCAL_FAMILY);
}

export async function fetchGoogleFontBuffer(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      { headers: { "User-Agent": "curl/7.85.0" } },
    ).then((r) => r.text());
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.(?:ttf|otf|woff2?))\)/);
    if (!match) return null;
    return fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function fetchGoogleFontBufferCached(
  family: string,
  weight: number,
  cacheDir = FONT_DISK_CACHE_DIR,
  fetcher = fetchGoogleFontBuffer,
): Promise<ArrayBuffer | null> {
  const cached = await readFontFromDisk(family, weight, cacheDir);
  if (cached) return cached;

  const fetched = await fetcher(family, weight);
  if (fetched) await writeFontToDisk(family, weight, fetched, cacheDir);
  return fetched;
}

async function loadGoogleFont(family: string, extraWeights?: Set<number>): Promise<FontConfig[]> {
  const cacheKey = family;
  const cached = fontCache.get(cacheKey);
  const weights = new Set([400, 700, ...(extraWeights ?? [])]);

  if (cached) {
    const cachedWeights = new Set(cached.map((f) => f.weight));
    const missing = [...weights].filter((w) => !cachedWeights.has(w as Weight));
    if (missing.length === 0) return cached;

    const fallbackBuf = cached.find((f) => f.weight === 400)?.data;
    const fetches = await Promise.all(
      missing.map(async (w) => {
        const buf = await fetchGoogleFontBufferCached(family, w);
        return buf ? { name: family, data: buf, weight: w as Weight, style: "normal" as FontStyle } : null;
      }),
    );
    const newFonts = fetches.filter((f): f is FontConfig => f !== null);
    for (const w of missing) {
      if (!newFonts.some((f) => f.weight === w) && fallbackBuf) {
        newFonts.push({ name: family, data: fallbackBuf, weight: w as Weight, style: "normal" });
      }
    }
    const merged = [...cached, ...newFonts];
    fontCache.set(cacheKey, merged);
    return merged;
  }

  const results = await Promise.all(
    [...weights].map(async (w) => ({
      weight: w,
      buf: await fetchGoogleFontBufferCached(family, w),
    })),
  );

  const regularBuf = results.find((r) => r.weight === 400)?.buf;
  if (!regularBuf) {
    console.warn(`Failed to fetch Google Font "${family}", falling back to ${LOCAL_FAMILY}`);
    return loadLocalFontsAsync();
  }

  const fonts: FontConfig[] = results.map((r) => ({
    name: family,
    data: r.buf ?? regularBuf,
    weight: r.weight as Weight,
    style: "normal" as FontStyle,
  }));

  fontCache.set(cacheKey, fonts);
  return fonts;
}

export async function loadFontsForFamily(family: string | undefined, extraWeights?: Set<number>): Promise<FontConfig[]> {
  if (!family || family === LOCAL_FAMILY) return loadLocalFontsAsync();
  return loadGoogleFont(family, extraWeights);
}

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

  if (needed.size === 0) return loadLocalFontsAsync();

  const allFonts: FontConfig[] = [];
  const fetches: Promise<void>[] = [];

  for (const [family, weights] of needed) {
    const fallbackBufPromise = fetchGoogleFontBufferCached(family, 400);
    for (const weight of weights) {
      fetches.push(
        (weight === 400 ? fallbackBufPromise : fetchGoogleFontBufferCached(family, weight)).then(async (buf) => {
          const data = buf ?? (weight !== 400 ? await fallbackBufPromise : null);
          if (data) {
            allFonts.push({ name: family, data, weight: weight as Weight, style: "normal" });
          }
        }),
      );
    }
  }
  await Promise.all(fetches);

  allFonts.push(...(await loadLocalFontsAsync()));
  return allFonts;
}
