import { authenticate } from "@/lib/auth/authenticate";
import { headObject, keyFromUrl } from "@/lib/storage/r2";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const upload = await fetchQuery(api.uploads.getByExternalId, { externalId: id });
  if (!upload || upload.userId !== auth.userId) {
    return Response.json({ error: "Upload not found" }, { status: 404 });
  }
  if (upload.status === "completed") {
    return Response.json({ upload_id: id, url: upload.url, size_bytes: upload.sizeBytes });
  }
  if (upload.status !== "pending" || !upload.url) {
    return Response.json({ error: "Upload not in pending state" }, { status: 409 });
  }

  const key = keyFromUrl(upload.url);
  if (!key) {
    return Response.json({ error: "Invalid upload url" }, { status: 500 });
  }

  const head = await headObject(key);
  if (!head) {
    return Response.json({ error: "Upload not found in storage" }, { status: 404 });
  }

  await fetchMutation(api.uploads.completeByExternalId, {
    externalId: id,
    sizeBytes: head.size,
  });

  return Response.json({ upload_id: id, url: upload.url, size_bytes: head.size });
}
