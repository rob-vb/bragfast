import { authenticate } from "@/lib/auth/authenticate";
import { assembleChunks, deleteByPrefix } from "@/lib/storage/r2";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const upload = await fetchQuery(api.uploads.getByExternalId, { externalId: id });

  if (!upload || upload.userId !== auth.userId) {
    return Response.json({ error: "Upload not found" }, { status: 404 });
  }

  // Idempotent: already completed
  if (upload.status === "completed" && upload.url) {
    return Response.json({
      upload_id: id,
      url: upload.url,
      size_bytes: upload.sizeBytes,
      status: "completed",
    });
  }

  if (upload.status !== "uploading") {
    return Response.json({ error: "Upload not in uploading state" }, { status: 409 });
  }

  const totalParts = upload.totalParts ?? 0;
  const uploadedParts = upload.uploadedParts ?? [];

  // Verify all parts are present
  const uploadedNumbers = new Set(uploadedParts.map((p) => p.partNumber));
  const missingParts: number[] = [];
  for (let i = 1; i <= totalParts; i++) {
    if (!uploadedNumbers.has(i)) missingParts.push(i);
  }
  if (missingParts.length > 0) {
    return Response.json(
      { error: `Incomplete upload: missing parts [${missingParts.join(", ")}]` },
      { status: 409 }
    );
  }

  // Verify total size matches declared
  const totalUploaded = uploadedParts.reduce((sum, p) => sum + p.sizeBytes, 0);
  if (totalUploaded !== (upload.declaredSizeBytes ?? 0)) {
    return Response.json(
      { error: `Size mismatch: uploaded ${totalUploaded} bytes, declared ${upload.declaredSizeBytes}` },
      { status: 409 }
    );
  }

  // Build ordered chunk keys
  const chunkKeys = Array.from({ length: totalParts }, (_, i) =>
    `${upload.tempPrefix}${String(i + 1).padStart(4, "0")}`
  );

  let url: string;
  try {
    url = await assembleChunks({
      chunkKeys,
      destKey: upload.finalKey!,
      contentType: upload.contentType,
    });
  } catch (err) {
    console.error("[chunked/complete] Assembly failed:", err);
    return Response.json({ error: "Assembly failed — retry complete" }, { status: 500 });
  }

  await fetchMutation(api.uploads.completeMultipart, {
    externalId: id,
    url,
    sizeBytes: upload.declaredSizeBytes ?? totalUploaded,
  });

  // Fire-and-forget temp cleanup — don't block response
  deleteByPrefix(upload.tempPrefix!).catch((err) =>
    console.error("[chunked/complete] Temp cleanup failed:", err)
  );

  return Response.json({
    upload_id: id,
    url,
    size_bytes: upload.declaredSizeBytes ?? totalUploaded,
    status: "completed",
  });
}
