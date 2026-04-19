import { authenticate } from "@/lib/auth/authenticate";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    uploadId?: string;
    editedCopy?: string;
  };

  try {
    const result = await fetchMutation(api.drafts.approveDraft, {
      userId: auth.userId,
      id: id as Id<"drafts">,
      uploadId: body.uploadId,
      editedCopy: body.editedCopy,
    });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    const status = msg.includes("Forbidden")
      ? 403
      : msg.includes("not found")
        ? 404
        : msg.includes("already")
          ? 409
          : 400;
    return Response.json({ error: msg }, { status });
  }
}
