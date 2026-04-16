import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { signPartUrl } from "@/lib/upload/signing";
import { ALLOWED_TYPES, MAX_CHUNK_SIZE, maxSizeForKind } from "@/lib/upload/constants";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

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
  if (typeof size_bytes !== "number" || size_bytes <= 0) {
    return Response.json({ error: "Missing or invalid field: size_bytes (must be a positive number)" }, { status: 400 });
  }

  const typeInfo = ALLOWED_TYPES[content_type];
  if (!typeInfo) {
    return Response.json(
      { error: `Unsupported content type: ${content_type}. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  const maxSize = maxSizeForKind(typeInfo.kind);
  if (size_bytes > maxSize) {
    return Response.json(
      { error: `File too large: ${size_bytes} bytes exceeds ${maxSize} limit` },
      { status: 413 }
    );
  }

  if (size_bytes <= MAX_CHUNK_SIZE) {
    return Response.json(
      { error: "File fits in a single request — use POST /api/v1/upload/presigned instead" },
      { status: 400 }
    );
  }

  const externalId = `upl_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const finalKey = `uploads/${auth.userId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${typeInfo.ext}`;
  const tempPrefix = `temp/${auth.userId}/${externalId}/`;
  const totalParts = Math.ceil(size_bytes / MAX_CHUNK_SIZE);
  const expiresAt = Date.now() + 15 * 60_000; // 15 minutes

  await fetchMutation(api.uploads.createMultipart, {
    userId: auth.userId,
    externalId,
    filename,
    contentType: content_type,
    declaredSizeBytes: size_bytes,
    totalParts,
    partSizeBytes: MAX_CHUNK_SIZE,
    finalKey,
    tempPrefix,
  });

  // Pre-sign all part URLs so MCP can upload without per-chunk round-trips
  const partSignatures = Array.from({ length: totalParts }, (_, i) =>
    signPartUrl(externalId, i + 1, expiresAt, content_type)
  );

  return Response.json(
    {
      upload_id: externalId,
      part_size_bytes: MAX_CHUNK_SIZE,
      total_parts: totalParts,
      expires_in: 900,
      expires_at: expiresAt,
      part_url_template: `/api/v1/upload/chunked/${externalId}/part/{n}?expires=${expiresAt}&sig={sig}`,
      part_signatures: partSignatures,
      complete_url: `/api/v1/upload/chunked/${externalId}/complete`,
      abort_url: `/api/v1/upload/chunked/${externalId}/abort`,
      max_size_bytes: maxSize,
    },
    { status: 201 }
  );
}
