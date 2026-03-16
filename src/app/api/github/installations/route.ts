import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  return Response.json(installations);
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { installationId, enabled } = body;

  if (typeof installationId !== "number" || typeof enabled !== "boolean") {
    return Response.json({ error: "installationId (number) and enabled (boolean) required" }, { status: 400 });
  }

  await fetchMutation(api.githubInstallations.toggle, {
    installationId,
    userId: user._id,
    enabled,
  });

  return Response.json({ success: true });
}
