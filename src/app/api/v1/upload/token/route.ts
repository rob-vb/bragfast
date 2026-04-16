import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { ALLOWED_TYPES } from "@/lib/upload/constants";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MiB — matches Convex uploadTokens.mint

function sanitizeFilename(raw: string): string | null {
  // Strip path separators and null bytes
  const name = raw.replace(/[/\\?%*:|"<>\x00]/g, "").trim();
  if (!name || name.length > 255) return null;
  // Must have an extension
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx < 1 || dotIdx === name.length - 1) return null;
  return name;
}

function generateToken(): string {
  // "utk_" + 21 URL-safe chars (~126 bits entropy)
  return "utk_" + crypto.randomBytes(16).toString("base64url").slice(0, 21);
}

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
    return Response.json({ error: "Missing or invalid filename" }, { status: 400 });
  }

  const sanitized = sanitizeFilename(filename);
  if (!sanitized) {
    return Response.json({ error: "Missing or invalid filename" }, { status: 400 });
  }

  if (!content_type || typeof content_type !== "string") {
    return Response.json({ error: "Missing required field: content_type" }, { status: 400 });
  }

  if (!ALLOWED_TYPES[content_type]) {
    return Response.json(
      { error: `Unsupported content type: ${content_type}` },
      { status: 400 }
    );
  }

  if (size_bytes !== undefined) {
    if (typeof size_bytes !== "number" || !Number.isInteger(size_bytes) || size_bytes <= 0) {
      return Response.json({ error: "size_bytes must be a positive integer" }, { status: 400 });
    }
    if (size_bytes > MAX_SIZE_BYTES) {
      return Response.json(
        { error: `File too large: ${size_bytes} bytes exceeds ${MAX_SIZE_BYTES} limit` },
        { status: 400 }
      );
    }
  }

  const token = generateToken();

  const { expiresAt, maxSizeBytes } = await fetchMutation(api.uploadTokens.mint, {
    userId: auth.userId,
    token,
    filename: sanitized,
    contentType: content_type,
    sizeBytes: typeof size_bytes === "number" ? size_bytes : undefined,
  });

  const uploadUrl = `${process.env.UPLOAD_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://brag.fast"}/api/v1/upload/by-token?upload_token=${token}`;

  return Response.json(
    {
      upload_token: token,
      upload_url: uploadUrl,
      expires_in_seconds: 900,
      expires_at: new Date(expiresAt).toISOString(),
      max_size_bytes: maxSizeBytes,
      content_type,
      filename: sanitized,
    },
    { status: 201 }
  );
}
