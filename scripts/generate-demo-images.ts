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

const TEMPLATES = ["standard-browser", "standard-mobile", "split-browser", "split-mobile", "hero"] as const;
const FONTS = ["Inter", "Raleway", "Saira"] as const;
const FORMATS = ["landscape", "square", "portrait"] as const;

// Content varies by template purpose
type ImageAnchor = { anchor_y?: string; anchor_x?: string };
const CONTENT: Record<string, { title: string; description: string; image: string; localImage?: boolean; brandId?: string; imageAnchors?: Record<string, ImageAnchor> }> = {
  "standard-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: "browserdemo.jpg",
    localImage: true,
  },
  "standard-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: "netflix.png",
    localImage: true,
  },
  "split-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: "browserdemo.jpg",
    localImage: true,
  },
  "split-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: "netflix.png",
    localImage: true,
  },
  hero: {
    title: "New mobile app",
    description: "Available now on iOS and Android",
    image: "herodemo.jpg",
    localImage: true,
    brandId: "brand_fa431022-c",
    imageAnchors: {
      landscape: { anchor_y: "top" },
      square: { anchor_y: "top" },
    },
  },
};

// Colors per template group
const COLORS: Record<string, { background: string; text: string; primary: string }> = {
  default: { background: "#104139", text: "#EFFBF9", primary: "#31C4AB" },
  standard: { background: "#EFFBF9", text: "#104139", primary: "#31C4AB" },
  split: { background: "#EFFBF9", text: "#104139", primary: "#31C4AB" },
};

function getColors(template: string) {
  const group = template.split("-")[0];
  return COLORS[group] ?? COLORS.default;
}

function buildPayload(template: string, font: string, format: typeof FORMATS[number]) {
  const content = CONTENT[template];
  const imageUrl = content.localImage
    ? `${BASE}/demo/${content.image}`
    : `https://images.unsplash.com/${content.image}`;

  const imageObj: Record<string, string> = { id: "image", image_url: imageUrl };
  const anchors = content.imageAnchors?.[format];
  if (anchors?.anchor_x) imageObj.anchor_x = anchors.anchor_x;
  if (anchors?.anchor_y) imageObj.anchor_y = anchors.anchor_y;

  return {
    template,
    font_family: font,
    colors: getColors(template),
    name: "Acme Inc",
    ...(content.brandId && { brand_id: content.brandId }),
    formats: [{
      name: format,
      slides: [
        {
          objects: [
            { id: "title", text: content.title },
            { id: "description", text: content.description },
            imageObj,
          ],
        },
      ],
    }],
  };
}

async function createRelease(payload: ReturnType<typeof buildPayload>, retries = 5): Promise<{ cook_id: string }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${BASE}/api/v1/cook`, {
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
      throw new Error(`POST /api/v1/cook failed (${res.status}): ${body}`);
    }
    return (await res.json()) as { cook_id: string };
  }
  throw new Error("Rate limited after all retries");
}

async function pollRelease(id: string, maxWait = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE}/api/v1/cook/${id}`, {
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
    for (const font of FONTS) {
      const label = `${template}-${slugify(font)}`;

      console.log(`Generating ${label}...`);

      try {
        for (const format of FORMATS) {
          const payload = buildPayload(template, font, format);
          const { cook_id } = await createRelease(payload);
          await pollRelease(cook_id);

          const src = path.join(OUTPUT_DIR, cook_id, `${format}-1.jpg`);
          const dest = path.join(destDir, `${label}-${format}.jpg`);
          if (!existsSync(src)) {
            throw new Error(`Output file not found: ${src}`);
          }
          copyFileSync(src, dest);
          total++;

          // Delay to avoid rate limits
          await new Promise((r) => setTimeout(r, 500));
        }
        console.log(`  OK`);
      } catch (err) {
        console.error(`  FAILED: ${err}`);
        errors++;
      }
    }
  }

  console.log(`\nDone: ${total} images generated, ${errors} errors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
