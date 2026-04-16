import { authenticate } from "@/lib/auth/authenticate";
import { deleteByPrefix } from "@/lib/storage/r2";
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
    return Response.json({ error: "Cannot abort a completed upload" }, { status: 409 });
  }

  await fetchMutation(api.uploads.abortMultipart, { externalId: id });

  if (upload.tempPrefix) {
    await deleteByPrefix(upload.tempPrefix);
  }

  return Response.json({
    upload_id: id,
    status: "aborted",
  });
}
