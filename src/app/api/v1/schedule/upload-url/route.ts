import { authenticate } from "@/lib/auth/authenticate";
import { createPresignedUploadUrl } from "@/lib/storage/r2";

const ALLOWED_FORMATS = ["landscape", "square", "portrait"] as const;
const allowedFormatSet = new Set<string>(ALLOWED_FORMATS);

type ImageFormat = (typeof ALLOWED_FORMATS)[number];

function isSafeId(value: string): boolean {
  return value.length > 0 && !value.includes("..") && !value.includes("/");
}

function parseFormats(value: unknown): ImageFormat[] | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "formats must be a non-empty array" };
  }

  const formats: ImageFormat[] = [];
  for (const format of value) {
    if (typeof format !== "string" || !allowedFormatSet.has(format)) {
      return {
        error: `format must be one of: ${ALLOWED_FORMATS.join(", ")}`,
      };
    }
    formats.push(format as ImageFormat);
  }

  return formats;
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!raw || typeof raw !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  if (typeof body.draftId !== "string" || !isSafeId(body.draftId)) {
    return Response.json({ error: "draftId must be a safe non-empty string" }, { status: 400 });
  }

  const formats = parseFormats(body.formats);
  if (!Array.isArray(formats)) {
    return Response.json({ error: formats.error }, { status: 400 });
  }

  const uploads = await Promise.all(
    formats.map(async (format) => {
      const key = `scheduled/${auth.userId}/${body.draftId}/${format}.jpg`;
      const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
        key,
        "image/jpeg",
        300,
      );

      return { format, key, uploadUrl, publicUrl };
    }),
  );

  return Response.json({ uploads });
}
