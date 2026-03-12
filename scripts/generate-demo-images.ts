/**
 * Generate all pre-rendered demo images.
 *
 * Prerequisites:
 *   1. Dev server running:  npm run dev
 *   2. OUTPUT_LOCAL=true in .env.local
 *   3. TEST_API_KEY set in .env.local
 *
 * Usage:  npx tsx scripts/generate-demo-images.ts
 */

import { readFileSync, copyFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.TEST_API_KEY ?? readApiKeyFromEnv();
// Dev server cwd may differ from script cwd (e.g. worktree vs main repo)
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? path.join(process.cwd(), ".output");

function readApiKeyFromEnv(): string {
  try {
    const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const match = env.match(/^TEST_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("TEST_API_KEY not found in env or .env.local");
}

const TEMPLATES = ["classic", "split", "hero"] as const;
const FONTS = ["Inter", "Raleway", "Saira"] as const;
const FORMATS = ["landscape", "square", "portrait"] as const;

const UPDATE_TYPES = {
  website: {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    device: "browser" as const,
    image: "photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop",
  },
  mobile: {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    device: "mobile" as const,
    image: "photo-1512941937669-90a1b58e7e9c?w=600&h=1200&fit=crop",
  },
  bugs: {
    title: "Squashed 12 bugs",
    description:
      "Stability and performance improvements across the board",
    device: "browser" as const, // overridden to none for hero below
    image: "photo-1461749280684-dccba630e2f6?w=1200&h=800&fit=crop",
  },
} as const;

type UpdateType = keyof typeof UPDATE_TYPES;

function buildPayload(
  template: string,
  type: UpdateType,
  font: string
) {
  const preset = UPDATE_TYPES[type];
  // hero+bugs: no device frame, but still include background image
  const device_type =
    type === "bugs" && template === "hero" ? "none" : preset.device;

  return {
    template,
    font_family: font,
    colors: {
      background: "#4A3326",
      text: "#FFF8F0",
      primary: "#F8AF3C",
    },
    name: "Acme Inc",
    slides: [
      {
        objects: [
          { id: "title", text: preset.title },
          { id: "description", text: preset.description },
          {
            id: "image",
            image_url: `https://images.unsplash.com/${preset.image}`,
            device_type,
          },
        ],
      },
    ],
    formats: [...FORMATS],
  };
}

async function createRelease(payload: ReturnType<typeof buildPayload>, retries = 5): Promise<{ release_id: string }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${BASE}/api/v1/release`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      const wait = 5000 * (attempt + 1);
      console.log(`    Rate limited, waiting ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`POST /api/v1/release failed (${res.status}): ${body}`);
    }
    return (await res.json()) as { release_id: string };
  }
  throw new Error("Rate limited after all retries");
}

async function pollRelease(id: string, maxWait = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE}/api/v1/release/${id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { status: string };
      if (data.status === "completed") return;
      if (data.status === "failed")
        throw new Error(`Release ${id} failed`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Release ${id} timed out`);
}

function slugify(font: string) {
  return font.toLowerCase();
}

async function main() {
  const destDir = path.join(process.cwd(), "public", "demo");
  mkdirSync(destDir, { recursive: true });

  let total = 0;
  let errors = 0;

  for (const template of TEMPLATES) {
    for (const type of Object.keys(UPDATE_TYPES) as UpdateType[]) {
      for (const font of FONTS) {
        const label = `${template}-${type}-${slugify(font)}`;

        console.log(`Generating ${label}...`);

        try {
          const payload = buildPayload(template, type, font);
          const { release_id } = await createRelease(payload);
          await pollRelease(release_id);

          // Copy output files to public/demo/
          for (const format of FORMATS) {
            const src = path.join(OUTPUT_DIR, release_id, `${format}-1.jpg`);
            const dest = path.join(destDir, `${label}-${format}.jpg`);
            if (!existsSync(src)) {
              throw new Error(`Output file not found: ${src}`);
            }
            copyFileSync(src, dest);
            total++;
          }
          console.log(`  OK (${release_id})`);

          // Delay to avoid rate limits
          await new Promise((r) => setTimeout(r, 1500));
        } catch (err) {
          console.error(`  FAILED: ${err}`);
          errors++;
        }
      }
    }
  }

  console.log(`\nDone: ${total} images generated, ${errors} errors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
