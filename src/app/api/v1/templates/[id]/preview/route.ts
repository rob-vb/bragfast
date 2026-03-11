import satori from "satori";
import sharp from "sharp";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConfigRenderer } from "@/lib/templates/config-renderer";
import { CanvasRenderer, type ObjectDataMap } from "@/lib/templates/canvas-renderer";
import { loadFontsForFamily, loadFontsForObjects } from "@/lib/fonts";
import { FORMAT_DIMENSIONS } from "@/lib/types";
import { fetchImageAsBase64 } from "@/lib/images";
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

  const placeholderObjectData: ObjectDataMap = {
    title: { text: "Title here" },
    description: { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
  };

  const { width, height } = FORMAT_DIMENSIONS["landscape"];

  try {
    const templateConfig = template.config as TemplateConfig | CanvasTemplateConfig;
    const isCanvas = typeof templateConfig === "object" && templateConfig !== null
      && "version" in templateConfig && (templateConfig as any).version === 2;

    // Inject static images (src field) into placeholder data
    if (isCanvas) {
      const canvasConfig = templateConfig as CanvasTemplateConfig;
      for (const obj of canvasConfig.formats.landscape.objects) {
        if (obj.type === "image" && obj.src && !placeholderObjectData[obj.id]?.imageBase64) {
          const base64 = await fetchImageAsBase64(obj.src);
          placeholderObjectData[obj.id] = { ...placeholderObjectData[obj.id], imageBase64: base64 };
        }
      }
    }

    const fonts = isCanvas
      ? await loadFontsForObjects((templateConfig as CanvasTemplateConfig).formats.landscape.objects)
      : await loadFontsForFamily(undefined);

    const jsx = isCanvas
      ? CanvasRenderer({
          config: templateConfig as CanvasTemplateConfig,
          format: "landscape",
          objectData: placeholderObjectData,
          brand: placeholderBrand,
        })
      : ConfigRenderer({
          config: templateConfig as TemplateConfig,
          slide: placeholderSlide,
          brand: placeholderBrand,
          width,
          height,
        });

    const svg = await satori(jsx, { width, height, fonts });
    const jpg = await sharp(Buffer.from(svg))
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85 })
      .toBuffer();

    return new Response(new Uint8Array(jpg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Failed to render template preview:", err);
    return Response.json({ error: "Failed to render preview" }, { status: 500 });
  }
}
