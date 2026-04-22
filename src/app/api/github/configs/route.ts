import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  const active = installations.find((i) => i.status === "active");
  if (!active) return Response.json([]);

  const configs = await fetchQuery(api.githubRepoConfigs.listByInstallation, {
    installationId: active.installationId,
  });
  return Response.json(configs);
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Verify ownership: installation must belong to this user
  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  const owns = installations.find(
    (i) => i.installationId === body.installationId && i.status === "active"
  );
  if (!owns) {
    return Response.json({ error: "Installation not found" }, { status: 404 });
  }

  await fetchMutation(api.githubRepoConfigs.upsert, {
    installationId: body.installationId,
    repoFullName: body.repoFullName,
    enabled: body.enabled,
    notifyOnPrMerge: body.notifyOnPrMerge,
  });

  return Response.json({ success: true });
}
