import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { uploadImage } from "@/lib/storage/r2";
import { ALLOWED_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "@/lib/upload/constants";

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
