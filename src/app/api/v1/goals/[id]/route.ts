import { authenticate } from "@/lib/auth/authenticate";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticate(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await fetchMutation(api.goals.remove, {
      userId: auth.userId,
      externalId: id,
    });
    if (!result.deleted) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[goals] delete failed:", err);
    return Response.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.enabled !== "boolean") {
    return Response.json({ error: "enabled (boolean) is required" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await fetchMutation(api.goals.setEnabled, {
      userId: auth.userId,
      externalId: id,
      enabled: b.enabled,
    });
    if (!result.updated) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[goals] patch failed:", err);
    return Response.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
