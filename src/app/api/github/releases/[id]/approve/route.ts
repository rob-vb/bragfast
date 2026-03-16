import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { renderReleaseAsync } from "@/lib/pipeline/render";
import { calculateCredits } from "@/lib/types";
import type { FormatEntry, ObjectModification } from "@/lib/types";
import type { FormatKey } from "@/lib/templates/canvas-types";
import { after } from "next/server";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: releaseId } = await params;

  // 1. Load the pending_review release
  const release = await fetchQuery(api.releases.getByExternalId, {
    externalId: releaseId,
  });
  if (!release || release.userId !== user._id) {
    return Response.json({ error: "Release not found" }, { status: 404 });
  }
  if (release.status !== "pending_review") {
    return Response.json({ error: "Release is not pending review" }, { status: 400 });
  }

  // 2. Parse AI content (optionally overridden by request body)
  let aiContent: { slides: Array<{ objects: ObjectModification[] }> };
  try {
    const body = await request.json().catch(() => null);
    if (body?.aiContent) {
      // User edited the AI suggestion
      aiContent = typeof body.aiContent === "string"
        ? JSON.parse(body.aiContent)
        : body.aiContent;
    } else {
      aiContent = JSON.parse(release.aiContent || "{}");
    }
  } catch {
    return Response.json({ error: "Invalid aiContent" }, { status: 400 });
  }

  if (!aiContent.slides?.length) {
    return Response.json({ error: "No slides in content" }, { status: 400 });
  }

  // 3. Reconstruct ReleaseRequest from pendingConfig snapshot (not live repo config)
  const sourceMetadata = release.sourceMetadata ? JSON.parse(release.sourceMetadata) : {};
  const pendingConfig = release.pendingConfig ? JSON.parse(release.pendingConfig) : {
    template: release.template,
    formats: ["landscape"],
  };

  const formatNames = (pendingConfig.formats ?? ["landscape"]) as FormatKey[];
  const formats: FormatEntry[] = formatNames.map((name) => ({
    name,
    slides: aiContent.slides,
  }));

  const releaseRequest = {
    template: pendingConfig.template ?? release.template,
    formats,
    brand_id: pendingConfig.brandId,
    webhook_url: pendingConfig.webhookUrl,
    ...(!pendingConfig.brandId && {
      colors: { background: "#0f172a", text: "#f8fafc", primary: "#3b82f6" },
      name: sourceMetadata.owner,
    }),
  };

  // 4. Reserve credits
  const creditsNeeded = calculateCredits({ output: "image", formats });
  try {
    await fetchMutation(api.userProfiles.reserve, {
      userId: user._id,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json({ error: "Insufficient credits" }, { status: 402 });
    }
    throw err;
  }

  // 5. Approve: update status to pending, set credits_used, update aiContent if edited
  await fetchMutation(api.releases.approve, {
    externalId: releaseId,
    userId: user._id,
    aiContent: JSON.stringify(aiContent),
    credits_used: creditsNeeded,
  });

  // 6. Trigger render in background
  after(() => renderReleaseAsync(releaseId, releaseRequest, user._id));

  return Response.json({ ok: true, cook_id: releaseId });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: releaseId } = await params;

  await fetchMutation(api.releases.dismiss, {
    externalId: releaseId,
    userId: user._id,
  });

  return Response.json({ ok: true });
}
