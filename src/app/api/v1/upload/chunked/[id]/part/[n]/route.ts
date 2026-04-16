import { verifyPartSignature } from "@/lib/upload/signing";
import { putChunk } from "@/lib/storage/r2";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

export const maxDuration = 30;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const { id, n: nStr } = await params;
  const { searchParams } = new URL(request.url);
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");

  if (!expires || !sig) {
    return Response.json({ error: "Missing required query parameters: expires, sig" }, { status: 400 });
  }

  const expiresAt = Number(expires);
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return Response.json({ error: "Upload URL has expired" }, { status: 410 });
  }

  const partNumber = parseInt(nStr, 10);
  if (isNaN(partNumber) || partNumber < 1) {
    return Response.json({ error: "Invalid part number" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type");
  if (!contentType) {
    return Response.json({ error: "Missing Content-Type header" }, { status: 400 });
  }

  if (!verifyPartSignature(id, partNumber, expiresAt, contentType, sig)) {
    return Response.json({ error: "Signature invalid" }, { status: 403 });
  }

  const upload = await fetchQuery(api.uploads.getByExternalId, { externalId: id });

  if (!upload) {
    return Response.json({ error: "Upload not found" }, { status: 404 });
  }
  if (upload.status !== "uploading") {
    return Response.json({ error: "Upload not in uploading state" }, { status: 409 });
  }
  if (upload.expiresAt < Date.now()) {
    return Response.json({ error: "Upload has expired" }, { status: 410 });
  }
  if (contentType !== upload.contentType) {
    return Response.json(
      { error: `Content-Type mismatch: expected ${upload.contentType}, got ${contentType}` },
      { status: 400 }
    );
  }
  if (partNumber > (upload.totalParts ?? 0)) {
    return Response.json(
      { error: `Part number ${partNumber} exceeds total parts ${upload.totalParts}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());

  if (buffer.length === 0) {
    return Response.json({ error: "Empty chunk" }, { status: 400 });
  }

  const partSizeBytes = upload.partSizeBytes ?? 0;
  const totalParts = upload.totalParts ?? 0;
  const declaredSizeBytes = upload.declaredSizeBytes ?? 0;

  if (partNumber < totalParts) {
    // Non-final parts must be exactly partSizeBytes
    if (buffer.length !== partSizeBytes) {
      return Response.json(
        { error: `Part ${partNumber} must be exactly ${partSizeBytes} bytes, got ${buffer.length}` },
        { status: 400 }
      );
    }
  } else {
    // Final part: must equal the remainder
    const expectedFinalSize = declaredSizeBytes - (totalParts - 1) * partSizeBytes;
    if (buffer.length !== expectedFinalSize) {
      return Response.json(
        { error: `Final part must be exactly ${expectedFinalSize} bytes, got ${buffer.length}` },
        { status: 400 }
      );
    }
  }

  const chunkKey = `${upload.tempPrefix}${String(partNumber).padStart(4, "0")}`;
  await putChunk(chunkKey, buffer, contentType);

  const result = await fetchMutation(api.uploads.recordPart, {
    externalId: id,
    partNumber,
    sizeBytes: buffer.length,
  });

  return Response.json({
    upload_id: id,
    part_number: partNumber,
    uploaded_count: result.uploadedCount,
    total_parts: result.totalParts,
  });
}
