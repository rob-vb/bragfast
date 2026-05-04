import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { validateDraftPayload } from "@/lib/drafts/validate";
import type { DraftConfig, DraftSource } from "@/lib/drafts/types";

type AuthResolved = { userId: string; source: DraftSource };

async function resolveAuth(request: Request): Promise<AuthResolved | null> {
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return { userId: apiKeyAuth.userId, source: "agent" };
  const user = await getSessionUser();
  if (user) return { userId: user._id, source: "user" };
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await fetchQuery(api.drafts.getByExternalId, {
    externalId: id,
    userId: auth.userId,
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  let config: DraftConfig;
  try {
    config = JSON.parse(row.config) as DraftConfig;
  } catch {
    return Response.json({ error: "Corrupt draft config" }, { status: 500 });
  }

  return Response.json({
    id: row.id,
    name: row.name,
    source: row.source,
    created_at: row.created_at,
    config,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateDraftPayload(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const updated = await fetchMutation(api.drafts.update, {
    externalId: id,
    userId: auth.userId,
    name: result.name ?? undefined,
    config: JSON.stringify(result.config),
  });
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ draft_id: updated.id, created_at: updated.created_at });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // S6.3: optional `reason` query string lets the drafts UI capture why a user
  // skipped a Sous-Chef draft. Threads through to the trigger event.
  const url = new URL(request.url);
  const reason = url.searchParams.get("reason") ?? undefined;
  const removed = await fetchMutation(api.drafts.remove, {
    externalId: id,
    userId: auth.userId,
    reason,
  });
  if (!removed) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(null, { status: 204 });
}
