import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  approveDraftPost,
  type ApproveDraftPostBody,
  type PostApprovalActor,
} from "@/lib/posts/approve-draft";

export const maxDuration = 300;

async function resolveAuth(request: Request): Promise<PostApprovalActor | null> {
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return { userId: apiKeyAuth.userId, source: "api_key" };
  const user = await getSessionUser();
  if (user) return { userId: user._id, source: "session" };
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: ApproveDraftPostBody;
  try {
    body = (await request.json()) as ApproveDraftPostBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id: draftId } = await params;
  const result = await approveDraftPost({
    actor: auth,
    draftId,
    body,
  });

  return Response.json(result.body, { status: result.status });
}
