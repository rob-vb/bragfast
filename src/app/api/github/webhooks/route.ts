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
import { analyzeRelease } from "@/lib/github/analyze-release";
import { getDefaultConfig } from "@/lib/templates/default-configs";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";

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

  // 8. Load template to discover available object slots
  const templateName = repoConfig?.template ?? "standard-browser";
  let templateConfig: CanvasTemplateConfig | null = null;

  const defaultConfig = getDefaultConfig(templateName);
  if (defaultConfig) {
    templateConfig = defaultConfig;
  } else if (templateName.startsWith("tmpl_")) {
    const tmpl = await convex.query(api.templates.getByExternalId, { externalId: templateName });
    if (tmpl) templateConfig = tmpl.config as CanvasTemplateConfig;
  }

  // Extract object slots from the first format with line capacity hints
  const templateObjects = templateConfig
    ? Object.values(templateConfig.formats)[0].objects.map((o) => {
        const slot: { id: string; type: "text" | "image" | "logo"; maxLines?: number } = {
          id: o.id,
          type: o.type as "text" | "image" | "logo",
        };
        if (o.type === "text" && o.height && o.fontSize) {
          slot.maxLines = Math.max(1, Math.floor(o.height / ((o.fontSize) * (o.lineHeight || 1.2))));
        }
        return slot;
      })
    : [
        { id: "title", type: "text" as const },
        { id: "description", type: "text" as const },
      ];

  // 9. AI analysis
  const maxSlides = repoConfig?.maxSlides ?? 1;
  const aiResult = await analyzeRelease({
    releaseName: payload.release.name || payload.release.tag_name,
    releaseTag: payload.release.tag_name,
    releaseBody: payload.release.body || "",
    templateObjects,
    maxSlides,
  });

  const aiContentJson = JSON.stringify(aiResult);
  const autoApprove = repoConfig?.autoApprove ?? false;

  // 10. Build ReleaseRequest from AI content
  const releaseRequest = mapReleaseToRequest(payload, {
    brandId: repoConfig?.brandId,
    template: repoConfig?.template,
    formats: repoConfig?.formats,
  });

  // Override the mechanical slides with AI-generated content
  for (const formatEntry of releaseRequest.formats) {
    formatEntry.slides = aiResult.slides;
  }

  if (repoConfig?.webhookUrl) {
    releaseRequest.webhook_url = repoConfig.webhookUrl;
  }

  const generateImages = repoConfig?.generateImages ?? true;
  const generateVideo = repoConfig?.generateVideo ?? false;
  const cookIds: { cook_id: string; output: "image" | "video"; mode: string }[] = [];

  if (autoApprove) {
    // 11a. Auto-approve: reserve credits, create release(s), render

    // ── Image release ──
    if (generateImages) {
      const creditsNeeded = calculateCredits({ formats: releaseRequest.formats });
      try {
        await convex.mutation(api.userProfiles.reserve, { userId, amount: creditsNeeded });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Insufficient credits")) {
          await convex.mutation(api.githubSkippedReleases.log, {
            userId, repoFullName, releaseTag,
            releaseName: payload.release.name ?? undefined,
            reason: "insufficient_credits",
          });
          return Response.json({ ok: true, skipped: "insufficient_credits" });
        }
        throw err;
      }

      const result = await createRelease(releaseRequest, userId, {
        source: "github",
        sourceMetadata,
      });
      after(() => renderReleaseAsync(result.cook_id, releaseRequest, userId));
      cookIds.push({ cook_id: result.cook_id, output: "image", mode: "auto" });
    }

    // ── Video release ──
    if (generateVideo) {
      const videoCredits = calculateCredits({ video: true, formats: releaseRequest.formats });
      let videoReserved = false;
      try {
        await convex.mutation(api.userProfiles.reserve, { userId, amount: videoCredits });
        videoReserved = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Insufficient credits")) {
          await convex.mutation(api.githubSkippedReleases.log, {
            userId, repoFullName, releaseTag,
            releaseName: payload.release.name ?? undefined,
            reason: "insufficient_credits",
          });
          // If images were already queued, skip video but return image results
          if (cookIds.length === 0) {
            return Response.json({ ok: true, skipped: "insufficient_credits" });
          }
        } else {
          throw err;
        }
      }

      if (videoReserved) {
        const videoCookId = `cook_${crypto.randomUUID().slice(0, 10)}`;
        const videoSourceMetadata = sourceMetadata + ":video";

        await convex.mutation(api.releases.create, {
          userId,
          externalId: videoCookId,
          template: releaseRequest.template || "standard-browser",
          credits_used: videoCredits,
          output: "video",
          source: "github",
          sourceMetadata: videoSourceMetadata,
          webhook_url: releaseRequest.webhook_url,
        });

        await convex.mutation(api.releases.scheduleVideoRender, {
          cookId: videoCookId,
          userId,
          request: JSON.stringify({
            ...releaseRequest,
            video: true,
          }),
        });
        cookIds.push({ cook_id: videoCookId, output: "video", mode: "auto" });
      }
    }

    return Response.json({ ok: true, releases: cookIds, mode: "auto" });
  } else {
    // 11b. Manual approval: store as pending_review, no credits reserved yet

    // Snapshot render config at webhook time to prevent config drift
    const basePendingConfig = {
      template: repoConfig?.template ?? "standard-browser",
      formats: repoConfig?.formats ?? ["landscape"],
      brandId: repoConfig?.brandId,
      webhookUrl: repoConfig?.webhookUrl,
    };

    // ── Image pending_review ──
    if (generateImages) {
      const imageReleaseId = `cook_${crypto.randomUUID().slice(0, 10)}`;
      await convex.mutation(api.releases.create, {
        userId,
        externalId: imageReleaseId,
        template: releaseRequest.template || "standard-browser",
        credits_used: 0,
        source: "github",
        sourceMetadata,
        status: "pending_review",
        aiContent: aiContentJson,
        pendingConfig: JSON.stringify({ ...basePendingConfig, output: "image" }),
      });
      cookIds.push({ cook_id: imageReleaseId, output: "image", mode: "pending_review" });
    }

    // ── Video pending_review ──
    if (generateVideo) {
      const videoReleaseId = `cook_${crypto.randomUUID().slice(0, 10)}`;
      const videoSourceMetadata = sourceMetadata + ":video";
      await convex.mutation(api.releases.create, {
        userId,
        externalId: videoReleaseId,
        template: releaseRequest.template || "standard-browser",
        credits_used: 0,
        source: "github",
        sourceMetadata: videoSourceMetadata,
        status: "pending_review",
        output: "video",
        aiContent: aiContentJson,
        pendingConfig: JSON.stringify({ ...basePendingConfig, output: "video" }),
      });
      cookIds.push({ cook_id: videoReleaseId, output: "video", mode: "pending_review" });
    }

    return Response.json({ ok: true, releases: cookIds, mode: "pending_review" });
  }
}
