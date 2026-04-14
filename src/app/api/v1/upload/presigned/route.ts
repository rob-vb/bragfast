import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { signUploadUrl } from "@/lib/upload/signing";
import { getSiteUrl } from "@/lib/site-url";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
function maxSizeFor(contentType: string): number {
  return VIDEO_TYPES.has(contentType) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}
function isAllowedType(contentType: string): boolean {
  return IMAGE_TYPES.has(contentType) || VIDEO_TYPES.has(contentType);
}
const ALLOWED_LIST = [...IMAGE_TYPES, ...VIDEO_TYPES];

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

  if (!isAllowedType(content_type as string)) {
    return Response.json(
      { error: `Unsupported content type: ${content_type}. Allowed: ${ALLOWED_LIST.join(", ")}` },
      { status: 400 }
    );
  }

  const maxSize = maxSizeFor(content_type as string);
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

  const result = await fetchMutation(api.uploads.create, {
    userId: auth.userId,
    filename: filename as string,
    contentType: content_type as string,
    sizeBytes: typeof size_bytes === "number" ? size_bytes : undefined,
  });

  const sig = signUploadUrl(result.externalId, result.expiresAt, content_type as string);
  const uploadUrl = `${getSiteUrl()}/api/v1/upload/${result.externalId}?expires=${result.expiresAt}&sig=${sig}`;

  return Response.json(
    {
      upload_id: result.externalId,
      upload_url: uploadUrl,
      expires_in: 300,
      max_size_bytes: maxSize,
    },
    { status: 201 }
  );
}
