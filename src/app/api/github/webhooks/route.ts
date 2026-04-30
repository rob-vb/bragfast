import { after } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { verifyWebhookSignature } from "@/lib/github/verify-webhook";
import {
  shouldHandlePrMerge,
  buildPrMergeDraftInput,
  type GitHubPullRequestPayload,
} from "@/lib/github/pr-merge";
import { composeCopy } from "@/lib/drafts/compose-copy";
import { pickTemplate } from "@/lib/drafts/pick-template";
import type { DraftConfig } from "@/lib/drafts/types";
import { scanContent } from "@/lib/safety/content-filter";

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

const PR_MERGE_DAILY_CAP = 10;
const PR_MERGE_DEBOUNCE_MS = 30 * 60 * 1000;

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
    installationId,
    repoFullName,
  });
  if (!repoConfig?.notifyOnPrMerge) {
    return Response.json({ ok: true, skipped: "pr_merge_opt_out" });
  }

  // Layer 1 safety: pre-render content filter. Skip both fresh and rollup
  // draft paths if PR title or body matches sensitive keyword patterns.
  const filter = scanContent(
    payload.pull_request.title,
    payload.pull_request.body,
  );
  if (filter.blocked) {
    const categories = [...new Set(filter.matches.map((m) => m.category))];
    console.log(
      "[sous-chef] PR draft skipped by content filter",
      JSON.stringify({
        userId,
        repoFullName,
        prNumber: payload.pull_request.number,
        categories,
      }),
    );
    return Response.json({
      ok: true,
      skipped: "sensitive_content",
      categories,
    });
  }

  const now = new Date();
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Noise cap: skip if this repo already produced N PR-merge drafts today.
  const recentCount = await convex.query(
    api.drafts.countRecentPrMergesByRepo,
    { userId, repoFullName, sinceIso: dayAgoIso },
  );
  if (recentCount >= PR_MERGE_DAILY_CAP) {
    return Response.json({ ok: true, skipped: "rate_cap" });
  }

  // Debounce: if a PR-merge draft for this repo was created < 30 min ago,
  // roll this PR into it instead of creating a new draft.
  const debounceSinceIso = new Date(
    now.getTime() - PR_MERGE_DEBOUNCE_MS,
  ).toISOString();
  const recent = await convex.query(api.drafts.findRecentPrMergeForRepo, {
    userId,
    repoFullName,
    sinceIso: debounceSinceIso,
  });
  if (recent) {
    await convex.mutation(api.drafts.appendPrMergeRollup, {
      externalId: recent.id,
      userId,
      prTitle: payload.pull_request.title,
      prNumber: payload.pull_request.number,
    });
    return Response.json({
      ok: true,
      rollup: recent.id,
      mode: "debounced",
    });
  }

  // Fresh draft path: picker + copy + idempotent insert.
  // Move the heavy work into after() so the webhook ack is fast.
  after(() => createPrMergeDraft(payload, userId));

  return Response.json({ ok: true, mode: "draft_scheduled" });
}

async function createPrMergeDraft(
  payload: GitHubPullRequestPayload,
  userId: string,
) {
  try {
    const input = buildPrMergeDraftInput(payload, userId);
    const [pick, copy] = await Promise.all([
      pickTemplate(input.pickTemplateInput),
      composeCopy(input.composeCopyInput),
    ]);

    const draftConfig: DraftConfig = {
      output: "image",
      templateId: pick.templateId,
      objectContent: {
        title: { text: copy.title },
        description: { text: copy.description },
      },
      notes: `Sous-Chef: PR #${input.prNumber} merged to ${payload.repository.default_branch} in ${input.repoFullName}`,
    };

    await convex.action(api.drafts.insertDraftIfNewAction, {
      userId,
      idempotencyKey: input.idempotencyKey,
      sourceSystem: "github",
      milestoneKey: input.milestoneKey,
      eventReference: input.eventReference,
      name: copy.title,
      config: JSON.stringify(draftConfig),
      createdBy: "sous-chef",
    });
  } catch (err) {
    console.error("[sous-chef] createPrMergeDraft failed:", err);
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
    // Installation created — store it without a userId for now.
    // The callback route links it to a user after OAuth redirect.
    await convex.action(api.githubInstallations.upsertAction, {
      installationId: installation.id,
      userId: "", // linked in callback
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
