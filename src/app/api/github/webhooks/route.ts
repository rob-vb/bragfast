import { after } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { verifyWebhookSignature } from "@/lib/github/verify-webhook";
import {
  mapReleaseToRequest,
  buildSourceMetadata,
  type GitHubReleasePayload,
} from "@/lib/github/map-release";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { calculateCredits } from "@/lib/types";

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

    case "release":
      if (payload.action === "published") {
        return handleReleasePublished(payload);
      }
      return Response.json({ ok: true, skipped: "unhandled action" });

    default:
      return Response.json({ ok: true, skipped: "unhandled event" });
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
    await convex.mutation(api.githubInstallations.upsert, {
      installationId: installation.id,
      userId: "", // linked in callback
      accountLogin: installation.account.login,
      accountType: installation.account.type as "User" | "Organization",
    });
  } else if (payload.action === "deleted") {
    await convex.mutation(api.githubInstallations.remove, {
      installationId: installation.id,
    });
  } else if (payload.action === "suspend") {
    await convex.mutation(api.githubInstallations.suspend, {
      installationId: installation.id,
    });
  } else if (payload.action === "unsuspend") {
    await convex.mutation(api.githubInstallations.unsuspend, {
      installationId: installation.id,
    });
  }

  return Response.json({ ok: true });
}

async function handleReleasePublished(payload: GitHubReleasePayload) {
  const installationId = payload.installation?.id;
  if (!installationId) {
    return Response.json(
      { error: "Missing installation ID" },
      { status: 400 }
    );
  }

  // 1. Look up installation
  const installation = await convex.query(
    api.githubInstallations.getByInstallationId,
    { installationId }
  );
  if (!installation || !installation.userId) {
    console.log(
      `GitHub webhook: no linked installation for ${installationId}`
    );
    return Response.json({ ok: true, skipped: "unlinked_installation" });
  }

  const userId = installation.userId;
  const repoFullName = payload.repository.full_name;
  const releaseTag = payload.release.tag_name;

  // 2. Check installation enabled
  if (!installation.enabled || installation.status !== "active") {
    await convex.mutation(api.githubSkippedReleases.log, {
      userId,
      repoFullName,
      releaseTag,
      releaseName: payload.release.name ?? undefined,
      reason: "account_disabled",
    });
    return Response.json({ ok: true, skipped: "account_disabled" });
  }

  // 3. Look up repo config
  const repoConfig = await convex.query(api.githubRepoConfigs.getByRepo, {
    installationId,
    repoFullName,
  });

  // 4. Check repo enabled
  if (repoConfig && !repoConfig.enabled) {
    await convex.mutation(api.githubSkippedReleases.log, {
      userId,
      repoFullName,
      releaseTag,
      releaseName: payload.release.name ?? undefined,
      reason: "repo_disabled",
    });
    return Response.json({ ok: true, skipped: "repo_disabled" });
  }

  // 5. Check prerelease filter
  const skipPrereleases = repoConfig?.skipPrereleases ?? true;
  if (skipPrereleases && payload.release.prerelease) {
    await convex.mutation(api.githubSkippedReleases.log, {
      userId,
      repoFullName,
      releaseTag,
      releaseName: payload.release.name ?? undefined,
      reason: "prerelease",
    });
    return Response.json({ ok: true, skipped: "prerelease" });
  }

  // 6. Check tag filter (simple glob: supports * wildcard and prefix matching)
  if (repoConfig?.tagFilter) {
    const pattern = repoConfig.tagFilter;
    const matches = pattern.includes("*")
      ? new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(releaseTag)
      : releaseTag.startsWith(pattern);
    if (!matches) {
      await convex.mutation(api.githubSkippedReleases.log, {
        userId,
        repoFullName,
        releaseTag,
        releaseName: payload.release.name ?? undefined,
        reason: "filtered",
      });
      return Response.json({ ok: true, skipped: "filtered" });
    }
  }

  // 7. Idempotency check
  const sourceMetadata = buildSourceMetadata(payload);
  const existing = await convex.query(api.releases.getBySourceMetadata, {
    sourceMetadata,
  });
  if (existing) {
    await convex.mutation(api.githubSkippedReleases.log, {
      userId,
      repoFullName,
      releaseTag,
      releaseName: payload.release.name ?? undefined,
      reason: "duplicate",
    });
    return Response.json({ ok: true, skipped: "duplicate" });
  }

  // 8. Build ReleaseRequest
  const releaseRequest = mapReleaseToRequest(payload, {
    brandId: repoConfig?.brandId,
    template: repoConfig?.template,
    formats: repoConfig?.formats,
  });

  // 9. Reserve credits
  const creditsNeeded = calculateCredits({ output: "image", formats: releaseRequest.formats });
  try {
    await convex.mutation(api.userProfiles.reserve, {
      userId,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      await convex.mutation(api.githubSkippedReleases.log, {
        userId,
        repoFullName,
        releaseTag,
        releaseName: payload.release.name ?? undefined,
        reason: "insufficient_credits",
      });
      return Response.json({ ok: true, skipped: "insufficient_credits" });
    }
    throw err;
  }

  // 10. Create release with source metadata
  const result = await createRelease(releaseRequest, userId, {
    source: "github",
    sourceMetadata,
  });

  // 11. Render in background
  after(() => renderReleaseAsync(result.cook_id, releaseRequest, userId));

  return Response.json({ ok: true, cook_id: result.cook_id });
}
