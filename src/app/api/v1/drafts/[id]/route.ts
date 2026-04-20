import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getSessionUser } from "@/lib/auth/get-session-user";
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const removed = await fetchMutation(api.drafts.remove, {
    externalId: id,
    userId: auth.userId,
  });
  if (!removed) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(null, { status: 204 });
}
