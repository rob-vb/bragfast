import crypto from "crypto";
import { uploadImage, deleteByKey } from "@/lib/storage/r2";
import { ALLOWED_TYPES } from "@/lib/upload/constants";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MiB

/**
 * Detect MIME type from magic bytes. Returns null if unrecognised.
 */
function sniffMime(buf: Uint8Array): string | null {
  const b = buf;

  // Need at least 12 bytes for most signatures
  if (b.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // WebP: RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";

  // WebM: 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";

  // MP4/QuickTime: 4-byte box size, then 'ftyp' at offset 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = Buffer.from(b.slice(8, 12)).toString("ascii");
    if (brand === "qt  ") return "video/quicktime";
    return "video/mp4";
  }

  // SVG: XML text (check first 64 bytes)
  if (b.length >= 4) {
    const head = Buffer.from(b.slice(0, Math.min(64, b.length))).toString("utf8").trimStart();
    if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  }

  return null;
}

export async function POST(request: NextRequest) {
  const uploadToken = request.nextUrl.searchParams.get("upload_token");

  if (!uploadToken) {
    return Response.json({ error: "Missing upload_token" }, { status: 400 });
  }

  // Pre-flight: look up token before consuming body
  const tokenDoc = await fetchQuery(api.uploadTokens.getByToken, { token: uploadToken });

  if (!tokenDoc) {
    return Response.json({ error: "Token not found" }, { status: 403 });
  }
  if (tokenDoc.status === "consumed") {
    return Response.json({ error: "Token already consumed" }, { status: 403 });
  }
  if (tokenDoc.status === "expired" || tokenDoc.expiresAt <= Date.now()) {
    return Response.json({ error: "Token expired" }, { status: 410 });
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const extraKeys = Array.from(formData.keys()).filter((k) => k !== "file");
  if (extraKeys.length > 0) {
    return Response.json({ error: "Too many parts" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Missing 'file' part" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "File too large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_SIZE_BYTES) {
    return Response.json({ error: "File too large" }, { status: 413 });
  }

  // Magic-byte sniff — do not trust client Content-Type header
  const sniffed = sniffMime(buffer);
  if (!sniffed) {
    return Response.json({ error: "Unsupported content type" }, { status: 400 });
  }

  if (sniffed !== tokenDoc.contentType) {
    return Response.json(
      { error: `Content-Type mismatch: expected ${tokenDoc.contentType}, got ${sniffed}` },
      { status: 400 }
    );
  }

  const typeInfo = ALLOWED_TYPES[sniffed];
  if (!typeInfo) {
    return Response.json({ error: `Unsupported content type: ${sniffed}` }, { status: 400 });
  }

  // Upload to R2 first — if consume races and loses, we delete the key
  const rand = crypto.randomBytes(8).toString("hex");
  const key = `uploads/${tokenDoc.userId}/${rand}.${typeInfo.ext}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadImage(buffer, key, sniffed);
  } catch (err) {
    console.error("event=upload.token.consume.fail token=%s reason=storage error=%s", uploadToken, err);
    return Response.json({ error: "Upload storage failed" }, { status: 500 });
  }

  // Stable upload ID generated here so we can pass it to the atomic consume
  const uploadExternalId = `upl_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

  // Atomically consume the token
  const consumeResult = await fetchMutation(api.uploadTokens.consume, {
    token: uploadToken,
    uploadId: uploadExternalId,
  });

  if (!consumeResult.ok) {
    // Roll back: remove the R2 object we just wrote
    try { await deleteByKey(key); } catch { /* best-effort */ }
    console.error("event=upload.token.consume.fail token=%s reason=%s", uploadToken, consumeResult.reason);

    if (consumeResult.reason === "consumed") {
      return Response.json({ error: "Token already consumed" }, { status: 403 });
    }
    if (consumeResult.reason === "expired") {
      return Response.json({ error: "Token expired" }, { status: 410 });
    }
    return Response.json({ error: "Token not found" }, { status: 403 });
  }

  // Persist completed upload record
  await fetchMutation(api.uploads.createCompleted, {
    userId: tokenDoc.userId,
    externalId: uploadExternalId,
    filename: tokenDoc.filename,
    contentType: sniffed,
    sizeBytes: buffer.length,
    url: publicUrl,
  });

  console.log(
    "event=upload.token.consume.ok token=%s upload_id=%s size_actual=%d duration_ms=%d",
    uploadToken,
    uploadExternalId,
    buffer.length,
    0,
  );

  return Response.json({
    upload_id: uploadExternalId,
    url: publicUrl,
    size_bytes: buffer.length,
    content_type: sniffed,
    filename: tokenDoc.filename,
  });
}
