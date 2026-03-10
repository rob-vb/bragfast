import satori from "satori";
import sharp from "sharp";
import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConfigRenderer } from "@/lib/templates/config-renderer";
import { loadFontsForFamily } from "@/lib/fonts";
import { FORMAT_DIMENSIONS } from "@/lib/types";
import type { TemplateConfig } from "@/lib/templates/config-types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await fetchQuery(api.templates.getByExternalId, {
    externalId: id,
  });

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  // Check ownership: default templates are accessible to all, user templates require ownership
  if (!template.isDefault && template.userId !== auth.userId) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  const placeholderBrand = {
    name: "Product",
    logoBase64: "",
    website: "example.com",
    colors: {
      background: "#1a1a2e",
      text: "#ffffff",
      primary: "#e94560",
    },
  };

  const placeholderSlide = {
    title: "Title here",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    device: "browser" as const,
  };

  const { width, height } = FORMAT_DIMENSIONS["landscape"];

  try {
    const fonts = await loadFontsForFamily(undefined);
    const templateConfig = template.config as TemplateConfig;

    const jsx = ConfigRenderer({
      config: templateConfig,
      slide: placeholderSlide,
      brand: placeholderBrand,
      width,
      height,
      transparent: false,
    });

    const svg = await satori(jsx, { width, height, fonts });
    const png = await sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();

    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Failed to render template preview:", err);
    return Response.json({ error: "Failed to render preview" }, { status: 500 });
  }
}
