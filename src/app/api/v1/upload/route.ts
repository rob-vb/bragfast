import crypto from "crypto";
import { authenticate } from "@/lib/auth/authenticate";
import { uploadImage } from "@/lib/storage/r2";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
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

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: `Unsupported file type: ${file.type}. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `uploads/${auth.userId}/${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${ext}`;
  const url = await uploadImage(buffer, key, file.type);

  return Response.json({ url });
}
