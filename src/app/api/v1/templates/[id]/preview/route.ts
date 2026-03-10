import satori from "satori";
import sharp from "sharp";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConfigRenderer } from "@/lib/templates/config-renderer";
import { CanvasRenderer } from "@/lib/templates/canvas-renderer";
import { loadFontsForFamily, loadFontsForObjects } from "@/lib/fonts";
import { FORMAT_DIMENSIONS } from "@/lib/types";
import type { TemplateConfig } from "@/lib/templates/config-types";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

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
    const templateConfig = template.config as TemplateConfig | CanvasTemplateConfig;
    const isCanvas = typeof templateConfig === "object" && templateConfig !== null
      && "version" in templateConfig && (templateConfig as any).version === 2;

    const fonts = isCanvas
      ? await loadFontsForObjects((templateConfig as CanvasTemplateConfig).formats.landscape.objects)
      : await loadFontsForFamily(undefined);

    const jsx = isCanvas
      ? CanvasRenderer({
          config: templateConfig as CanvasTemplateConfig,
          format: "landscape",
          slide: placeholderSlide,
          brand: placeholderBrand,
          transparent: false,
        })
      : ConfigRenderer({
          config: templateConfig as TemplateConfig,
          slide: placeholderSlide,
          brand: placeholderBrand,
          width,
          height,
          transparent: false,
        });

    const svg = await satori(jsx, { width, height, fonts });
    const png = await sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();

    return new Response(new Uint8Array(png), {
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
