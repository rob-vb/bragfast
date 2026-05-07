/**
 * Seed-time OG generation for the public Template Library.
 *
 * Renders one preview per format (landscape/square/portrait) for every default
 * template, uploads to R2 under `og/templates/<externalId>-<format>.jpg`, and
 * patches Convex `templates.previewUrls` so /templates/<id> can use them as
 * og:image without a runtime renderer.
 *
 * Prerequisites:
 *   1. Dev server running:  npm run dev
 *   2. NEXT_PUBLIC_CONVEX_URL + TEST_API_KEY in .env.local
 *   3. R2 credentials configured (so cook output lands in R2, not local)
 *
 * Usage:  npx tsx scripts/generate-template-og.ts
 */

import { readFileSync } from "fs";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.TEST_API_KEY ?? readApiKeyFromEnv("TEST_API_KEY");
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? readApiKeyFromEnv("NEXT_PUBLIC_CONVEX_URL");

const TEMPLATES = [
  "standard-browser",
  "standard-mobile",
  "split-browser",
  "split-mobile",
  "hero",
  "carousel-slide",
] as const;

const FORMATS = ["landscape", "square", "portrait"] as const;
type Format = (typeof FORMATS)[number];

const SAMPLE_CONTENT: Record<
  string,
  { title: string; description: string; image: string }
> = {
  "standard-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: `${BASE}/demo/browserdemo.jpg`,
  },
  "standard-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: `${BASE}/demo/netflix.png`,
  },
  "split-browser": {
    title: "Fresh new look",
    description: "We redesigned our website from the ground up",
    image: `${BASE}/demo/browserdemo.jpg`,
  },
  "split-mobile": {
    title: "Now on mobile",
    description: "Take it anywhere with our brand new mobile app",
    image: `${BASE}/demo/netflix.png`,
  },
  hero: {
    title: "New mobile app",
    description: "Available now on iOS and Android",
    image: `${BASE}/demo/herodemo.jpg`,
  },
  "carousel-slide": {
    title: "What changed this week",
    description: "Three updates worth knowing",
    image: `${BASE}/demo/browserdemo.jpg`,
  },
};

const COLORS = { background: "#EFFBF9", text: "#104139", primary: "#31C4AB" };

function readApiKeyFromEnv(key: string): string {
  try {
    const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match) return match[1].trim();
  } catch {}
  throw new Error(`${key} not set in env or .env.local`);
}

function buildPayload(template: string, format: Format) {
  const c = SAMPLE_CONTENT[template] ?? SAMPLE_CONTENT["standard-browser"];
  return {
    template,
    colors: COLORS,
    name: "brag.fast",
    formats: [
      {
        name: format,
        slides: [
          {
            objects: [
              { id: "title", text: c.title },
              { id: "description", text: c.description },
              { id: "image", image_url: c.image },
            ],
          },
        ],
      },
    ],
  };
}

async function cook(template: string, format: Format): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/cook/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPayload(template, format)),
  });
  if (!res.ok) {
    throw new Error(
      `cook ${template}/${format} failed: ${res.status} ${await res.text()}`,
    );
  }
  const { cook_id } = (await res.json()) as { cook_id: string };

  for (let i = 0; i < 60; i++) {
    const poll = await fetch(`${BASE}/api/v1/cook/${cook_id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (poll.ok) {
      const data = (await poll.json()) as {
        status: string;
        outputs?: { format: string; url: string }[];
      };
      if (data.status === "completed") {
        const out = data.outputs?.find((o) => o.format === format);
        if (!out?.url) throw new Error(`No url returned for ${template}/${format}`);
        return out.url;
      }
      if (data.status === "failed") {
        throw new Error(`cook ${template}/${format} failed`);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`cook ${template}/${format} timed out`);
}

async function main() {
  const convex = new ConvexHttpClient(CONVEX_URL);

  for (const template of TEMPLATES) {
    console.log(`▸ ${template}`);
    const previewUrls: Record<Format, string> = {
      landscape: "",
      square: "",
      portrait: "",
    };
    for (const format of FORMATS) {
      try {
        const url = await cook(template, format);
        previewUrls[format] = url;
        console.log(`  ${format}: ${url}`);
      } catch (err) {
        console.error(`  ${format}: FAILED`, err);
      }
    }
    if (previewUrls.landscape && previewUrls.square && previewUrls.portrait) {
      await convex.mutation(api.templates.setPreviewUrls, {
        externalId: template,
        previewUrls,
      });
      console.log(`  ✓ patched`);
    } else {
      console.warn(`  ✗ skipped patch (missing urls)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
