import { after } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { verifyWebhookSignature } from "@/lib/github/verify-webhook";
import {
  shouldHandlePrMerge,
  buildPrMergeDraftInput,
  type GitHubPullRequestPayload,
} from "@/lib/github/pr-merge";
import {
  surfaceTrigger,
  fallbackSurfaceTrigger,
} from "@/lib/drafts/surface-trigger";
import { scanContent } from "@/lib/safety/content-filter";
import { captureServer } from "@/lib/analytics/posthog-server";

export const maxDuration = 60;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";
  const payload = JSON.parse(body);

  switch (event) {
    case "ping":
      return Response.json({ ok: true });

    case "installation":
      return handleInstallation(payload);

    case "pull_request":
      return handlePullRequest(payload);

    default:
      return Response.json({ ok: true, skipped: "unhandled event" });
  }
}

async function handlePullRequest(payload: GitHubPullRequestPayload) {
  if (!shouldHandlePrMerge(payload)) {
    return Response.json({ ok: true, skipped: "not_a_default_branch_merge" });
  }

  const installationId = payload.installation?.id;
  if (!installationId) {
    return Response.json({ ok: true, skipped: "missing_installation" });
  }

  const installation = await convex.query(
    api.githubInstallations.getByInstallationId,
    { installationId },
  );
  if (
    !installation ||
    !installation.userId ||
    !installation.enabled ||
    installation.status !== "active"
  ) {
    return Response.json({ ok: true, skipped: "installation_disabled" });
  }

  const userId = installation.userId;
  const repoFullName = payload.repository.full_name;
  const repoConfig = await convex.query(api.githubRepoConfigs.getByRepo, {
    userId,
    installationId,
    repoFullName,
  });
  if (!repoConfig?.notifyOnPrMerge) {
    return Response.json({ ok: true, skipped: "pr_merge_opt_out" });
  }

  after(() => surfacePrMerge(payload, userId));

  return Response.json({ ok: true, mode: "surface_scheduled" });
}

async function surfacePrMerge(
  payload: GitHubPullRequestPayload,
  userId: string,
) {
  try {
    const input = buildPrMergeDraftInput(payload, userId);
    const prUrl = payload.pull_request.html_url;
    const title = payload.pull_request.title;
    const body = payload.pull_request.body ?? "";

    const filter = scanContent(title, body);
    let summary: string;
    let confidence: number;
    let reason: string | undefined;

    if (filter.blocked) {
      const categories = [...new Set(filter.matches.map((m) => m.category))];
      summary = fallbackSurfaceTrigger({
        type: "pr_merged",
        title,
        body,
        repoFullName: input.repoFullName,
      }).summary;
      confidence = 0;
      reason = "content_filter";
      await convex.action(api.triggerEvents.recordSurfacedAction, {
        userId,
        sourceSystem: "github",
        triggerType: "pr_merged",
        sourceReference: prUrl,
        summary,
        confidence,
        reason,
        metadata: JSON.stringify({
          milestoneKey: input.milestoneKey,
          repoFullName: input.repoFullName,
          prNumber: input.prNumber,
          categories,
          contentFiltered: true,
        }),
      });
      return;
    }

    const surfaced = await surfaceTrigger({
      type: "pr_merged",
      title,
      body,
      repoFullName: input.repoFullName,
    });
    summary = surfaced.summary;
    confidence = surfaced.confidence;

    const result = await convex.action(api.triggerEvents.recordSurfacedAction, {
      userId,
      sourceSystem: "github",
      triggerType: "pr_merged",
      sourceReference: prUrl,
      summary,
      confidence,
      metadata: JSON.stringify({
        milestoneKey: input.milestoneKey,
        repoFullName: input.repoFullName,
        prNumber: input.prNumber,
      }),
    });

    if (result.created) {
      await captureServer({
        event: "trigger_surfaced",
        distinctId: userId,
        properties: {
          trigger_type: "pr_merged",
          source_type: "github",
          confidence_score: confidence,
        },
      });
    }
  } catch (err) {
    console.error("[sous-chef] surfacePrMerge failed:", err);
  }
}

async function handleInstallation(payload: {
  action: string;
  installation: {
    id: number;
    account: { login: string; type: string };
  };
}) {
  const { installation } = payload;

  if (payload.action === "created") {
    await convex.action(api.githubInstallations.upsertAction, {
      installationId: installation.id,
      userId: "",
      accountLogin: installation.account.login,
      accountType: installation.account.type as "User" | "Organization",
    });
  } else if (payload.action === "deleted") {
    await convex.action(api.githubInstallations.removeAction, {
      installationId: installation.id,
    });
  } else if (payload.action === "suspend") {
    await convex.action(api.githubInstallations.suspendAction, {
      installationId: installation.id,
    });
  } else if (payload.action === "unsuspend") {
    await convex.action(api.githubInstallations.unsuspendAction, {
      installationId: installation.id,
    });
  }

  return Response.json({ ok: true });
}
