import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { uploadImage } from "@/lib/storage/r2";

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

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Missing file field" }, { status: 400 });
  }

  const typeInfo = ALLOWED_TYPES[file.type];
  if (!typeInfo) {
    return Response.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  const maxSize = typeInfo.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return Response.json({ error: `File too large (max ${mb}MB)` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `uploads/${auth.userId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${typeInfo.ext}`;
  const url = await uploadImage(buffer, key, file.type);

  return Response.json({ url });
}
