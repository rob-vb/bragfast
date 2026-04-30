import { fetchQuery, fetchMutation } from "convex/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { after } from "next/server";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { runRetroPrMergeDraft } from "@/lib/github/retro-pr";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const installations = await fetchQuery(api.githubInstallations.listByUserId, {
    userId: user._id,
  });
  const active = installations.find((i) => i.status === "active");
  if (!active) return Response.json([]);

  const configs = await fetchQuery(api.githubRepoConfigs.listByInstallation, {
    userId: user._id,
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

  // Detect transition from off → on so we only fire the retro pipeline once.
  const prior = await fetchQuery(api.githubRepoConfigs.getByRepo, {
    userId: user._id,
    installationId: body.installationId,
    repoFullName: body.repoFullName,
  });
  const wasOn = prior?.notifyOnPrMerge === true;
  const willBeOn = body.notifyOnPrMerge === true;

  await fetchMutation(api.githubRepoConfigs.upsert, {
    userId: user._id,
    installationId: body.installationId,
    repoFullName: body.repoFullName,
    enabled: body.enabled,
    notifyOnPrMerge: body.notifyOnPrMerge,
  });

  // Retro draft: when the user opts a repo into PR-merge notifications for the
  // first time, fetch the most-recent merged PR and run the same pipeline as
  // the live webhook. Idempotent — re-toggling won't double-insert.
  if (!wasOn && willBeOn) {
    const userId = user._id;
    const installationId = body.installationId as number;
    const repoFullName = body.repoFullName as string;
    after(async () => {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      await runRetroPrMergeDraft(
        convex,
        userId,
        installationId,
        repoFullName,
      );
    });
  }

  return Response.json({ success: true });
}
