import { authenticate } from "@/lib/auth/authenticate";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draft = await fetchQuery(api.drafts.getById, { id: id as Id<"drafts"> });
  if (!draft) return Response.json({ error: "Not found" }, { status: 404 });
  if (draft.userId !== auth.userId) {
    // Opaque 404 to avoid leaking existence.
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(draft);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { copy?: string } | null;
  if (!body || typeof body.copy !== "string") {
    return Response.json({ error: "copy required" }, { status: 400 });
  }
  try {
    await fetchMutation(api.drafts.updateDraftCopy, {
      userId: auth.userId,
      id: id as Id<"drafts">,
      copy: body.copy,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("not found") ? 404 : 409;
    return Response.json({ error: msg }, { status });
  }
  return Response.json({ ok: true });
}
