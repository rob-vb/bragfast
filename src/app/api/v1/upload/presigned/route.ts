import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createPresignedUploadUrl } from "@/lib/storage/r2";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const TYPE_EXT: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/svg+xml": { ext: "svg", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};
const ALLOWED_LIST = Object.keys(TYPE_EXT);

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { filename, content_type, size_bytes } = body;

  if (!filename || typeof filename !== "string") {
    return Response.json({ error: "Missing required field: filename" }, { status: 400 });
  }

  if (!content_type || typeof content_type !== "string") {
    return Response.json({ error: "Missing required field: content_type" }, { status: 400 });
  }

  const typeInfo = TYPE_EXT[content_type];
  if (!typeInfo) {
    return Response.json(
      { error: `Unsupported content type: ${content_type}. Allowed: ${ALLOWED_LIST.join(", ")}` },
      { status: 400 }
    );
  }

  const maxSize = typeInfo.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (size_bytes !== undefined) {
    if (typeof size_bytes !== "number" || size_bytes <= 0) {
      return Response.json({ error: "size_bytes must be a positive number" }, { status: 400 });
    }
    if (size_bytes > maxSize) {
      return Response.json(
        { error: `File too large: ${size_bytes} bytes exceeds ${maxSize} limit` },
        { status: 400 }
      );
    }
  }

  const key = `uploads/${auth.userId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${typeInfo.ext}`;
  const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, content_type, 300);

  const result = await fetchMutation(api.uploads.create, {
    userId: auth.userId,
    filename,
    contentType: content_type,
    sizeBytes: typeof size_bytes === "number" ? size_bytes : undefined,
    url: publicUrl,
  });

  return Response.json(
    {
      upload_id: result.externalId,
      upload_url: uploadUrl,
      public_url: publicUrl,
      method: "PUT",
      headers: { "Content-Type": content_type },
      expires_in: 300,
      max_size_bytes: maxSize,
    },
    { status: 201 }
  );
}
