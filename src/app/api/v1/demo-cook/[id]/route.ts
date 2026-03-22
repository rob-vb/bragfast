import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Only allow polling demo releases (prevents leaking non-demo data)
  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: id,
  });
  if (!release || release.source !== "demo") {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }

  const previewImages = release.previewImages as Record<
    string,
    { slides: string[]; dimensions: string }
  > | null;

  // For local dev: convert file:// URLs to base64 data URIs so the browser can display them
  let images = previewImages;
  if (images) {
    const resolved: Record<string, { slides: string[]; dimensions: string }> = {};
    for (const [format, data] of Object.entries(images)) {
      const slides = await Promise.all(
        data.slides.map(async (url) => {
          if (url.startsWith("file://")) {
            try {
              const buf = await readFile(url.replace("file://", ""));
              return `data:image/jpeg;base64,${buf.toString("base64")}`;
            } catch {
              return url;
            }
          }
          return url;
        })
      );
      resolved[format] = { slides, dimensions: data.dimensions };
    }
    images = resolved;
  }

  return Response.json({
    cook_id: release.externalId,
    status: release.status,
    images,
  });
}
