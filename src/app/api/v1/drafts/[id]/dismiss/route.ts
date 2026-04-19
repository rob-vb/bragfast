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
  try {
    await fetchMutation(api.drafts.dismissDraft, {
      userId: auth.userId,
      id: id as Id<"drafts">,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    const status = msg.includes("Forbidden") ? 403 : msg.includes("not found") ? 404 : 409;
    return Response.json({ error: msg }, { status });
  }
  return Response.json({ ok: true });
}
