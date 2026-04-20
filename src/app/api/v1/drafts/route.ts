import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateDraftPayload } from "@/lib/drafts/validate";
import { derivePreviewTitle } from "@/lib/drafts/preview";
import type { DraftConfig, DraftPreview, DraftSource } from "@/lib/drafts/types";

type AuthResolved = { userId: string; source: DraftSource };

async function resolveAuth(request: Request): Promise<AuthResolved | null> {
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return { userId: apiKeyAuth.userId, source: "agent" };
  const user = await getSessionUser();
  if (user) return { userId: user._id, source: "user" };
  return null;
}

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimitResponse = await checkRateLimit(auth.userId);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateDraftPayload(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  const created = await fetchMutation(api.drafts.create, {
    userId: auth.userId,
    name: result.name ?? undefined,
    source: auth.source,
    config: JSON.stringify(result.config),
  });

  return Response.json({ draft_id: created.id, created_at: created.created_at }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await fetchQuery(api.drafts.listByUser, { userId: auth.userId });

  const drafts: DraftPreview[] = rows.map((row) => {
    let config: DraftConfig;
    try {
      config = JSON.parse(row.config) as DraftConfig;
    } catch {
      config = { output: "image" };
    }
    return {
      id: row.id,
      name: row.name,
      source: row.source,
      created_at: row.created_at,
      preview: {
        title: derivePreviewTitle(config, row.name),
        output: config.output,
        templateId: config.templateId,
      },
    };
  });

  return Response.json({ drafts });
}
