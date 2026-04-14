import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { verifyUploadSignature } from "@/lib/upload/signing";
import { uploadImage } from "@/lib/storage/r2";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/svg+xml": { ext: "svg", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");

  if (!expires || !sig) {
    return Response.json(
      { error: "Missing required query parameters: expires, sig" },
      { status: 400 }
    );
  }

  const expiresAt = Number(expires);
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return Response.json(
      { error: "Upload URL has expired" },
      { status: 410 }
    );
  }

  const contentType = request.headers.get("content-type");
  if (!contentType || !ALLOWED_TYPES[contentType]) {
    return Response.json(
      { error: `Invalid or missing Content-Type header` },
      { status: 400 }
    );
  }

  if (!verifyUploadSignature(id, expiresAt, contentType, sig)) {
    return Response.json(
      { error: "Signature invalid" },
      { status: 403 }
    );
  }

  const upload = await fetchQuery(api.uploads.getByExternalId, {
    externalId: id,
  });

  if (!upload) {
    return Response.json(
      { error: "Upload not found" },
      { status: 404 }
    );
  }

  if (upload.status !== "pending") {
    return Response.json(
      { error: "Upload already completed or expired" },
      { status: 409 }
    );
  }

  if (contentType !== upload.contentType) {
    return Response.json(
      { error: `Content-Type mismatch: expected ${upload.contentType}, got ${contentType}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  const typeInfo = ALLOWED_TYPES[contentType];
  const maxSize = typeInfo.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (buffer.length > maxSize) {
    return Response.json(
      { error: `File too large: ${buffer.length} bytes exceeds ${maxSize} limit` },
      { status: 400 }
    );
  }

  if (buffer.length === 0) {
    return Response.json(
      { error: "Empty file" },
      { status: 400 }
    );
  }

  const key = `uploads/${upload.userId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${typeInfo.ext}`;
  const url = await uploadImage(buffer, key, contentType);

  await fetchMutation(api.uploads.markCompleted, {
    externalId: id,
    url,
    sizeBytes: buffer.length,
  });

  return Response.json({
    upload_id: id,
    url,
    size_bytes: buffer.length,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const upload = await fetchQuery(api.uploads.getByExternalId, {
    externalId: id,
  });

  if (!upload || upload.userId !== auth.userId) {
    return Response.json({ error: "Upload not found" }, { status: 404 });
  }

  return Response.json({
    upload_id: upload.externalId,
    status: upload.status,
    filename: upload.filename,
    content_type: upload.contentType,
    size_bytes: upload.sizeBytes,
    url: upload.url,
    created_at: upload.created_at,
    completed_at: upload.completed_at,
  });
}
