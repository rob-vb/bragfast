import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import JSZip from "jszip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: id,
  });
  if (!release || release.userId !== auth.userId) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }

  if (release.status === "pending" || release.status === "pending_review") {
    return Response.json(
      { error: "Images still cooking..." },
      { status: 400 }
    );
  }

  const images = release.images as Record<
    string,
    { slides: string[]; dimensions: string }
  > | null;

  if (!images || Object.keys(images).length === 0) {
    return Response.json({ error: "No images available" }, { status: 400 });
  }

  const zip = new JSZip();

  // Fetch all images in parallel and add to ZIP
  const fetchPromises: Promise<void>[] = [];

  for (const [format, data] of Object.entries(images)) {
    const folder = zip.folder(format)!;
    for (let i = 0; i < data.slides.length; i++) {
      const url = data.slides[i];
      fetchPromises.push(
        (async () => {
          try {
            let buf: ArrayBuffer;
            if (url.startsWith("file://")) {
              const filePath = url.replace("file://", "");
              buf = (await readFile(filePath)).buffer as ArrayBuffer;
            } else {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`Failed to fetch ${url}`);
              buf = await res.arrayBuffer();
            }
            const ext = url.includes(".png") ? "png" : "jpg";
            folder.file(`slide-${i + 1}.${ext}`, buf);
          } catch (err) {
            console.warn(`Skipping ${format}/slide-${i + 1}: ${(err as Error).message}`);
          }
        })()
      );
    }
  }

  await Promise.all(fetchPromises);

  // Add copy.txt if social copy exists
  if (release.socialCopy) {
    try {
      const copy = JSON.parse(release.socialCopy);
      const lines: string[] = [];
      if (copy.twitter) {
        lines.push("=== Twitter / X ===", "", copy.twitter, "");
      }
      if (copy.linkedin) {
        lines.push("=== LinkedIn ===", "", copy.linkedin, "");
      }
      if (lines.length > 0) {
        zip.file("copy.txt", lines.join("\n"));
      }
    } catch {
      // Skip if socialCopy is malformed
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${id}.zip"`,
    },
  });
}
