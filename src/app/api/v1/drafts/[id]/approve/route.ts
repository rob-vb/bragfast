import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { validateApiKey } from "@/lib/auth/validate-api-key";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createRelease, renderReleaseAsync, getRelease } from "@/lib/pipeline/render";
import {
  calculateCredits,
  type FormatEntry,
  type ObjectModification,
  type ReleaseRequest,
} from "@/lib/types";
import type { DraftConfig } from "@/lib/drafts/types";

export const maxDuration = 300;

type Format =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

type Provider = "buffer" | "postiz";

interface ApproveBody {
  title: string;
  description: string;
  copyByPlatform?: {
    x?: { title: string; description: string };
    linkedin?: { title: string; description: string };
  };
  selections: Array<{ format: Format; provider: Provider; channelId: string }>;
  postState: "queue" | "draft";
  clientNonce: string;
}

async function resolveAuth(request: Request): Promise<{ userId: string } | null> {
  const apiKeyAuth = await validateApiKey(request);
  if (apiKeyAuth) return { userId: apiKeyAuth.userId };
  const user = await getSessionUser();
  if (user) return { userId: user._id };
  return null;
}

function buildObjects(cfg: DraftConfig): ObjectModification[] {
  if (!cfg.objectContent) return [];
  const out: ObjectModification[] = [];
  for (const [id, entry] of Object.entries(cfg.objectContent)) {
    const mod: ObjectModification = { id };
    if (entry.text) mod.text = entry.text;
    if (entry.image_url) mod.image_url = entry.image_url;
    if (entry.video_url) mod.video_url = entry.video_url;
    if (mod.text || mod.image_url || mod.video_url) out.push(mod);
  }
  return out;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveAuth(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = auth;

  const { id: draftId } = await params;

  let body: ApproveBody;
  try {
    body = (await request.json()) as ApproveBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.selections) || body.selections.length === 0) {
    return Response.json({ error: "selections must be a non-empty array" }, { status: 400 });
  }

  // Reject video formats — render orchestration for Remotion Lambda is a follow-up.
  const videoSelections = body.selections.filter((s) => s.format.startsWith("video-"));
  if (videoSelections.length > 0) {
    return Response.json(
      {
        error:
          "Video formats can't be approved through this flow yet. Cook the video separately, then push from history.",
      },
      { status: 400 },
    );
  }

  // Load draft
  const draftRow = await fetchQuery(api.drafts.getByExternalId, {
    externalId: draftId,
    userId,
  });
  if (!draftRow) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  let cfg: DraftConfig;
  try {
    cfg = JSON.parse(draftRow.config) as DraftConfig;
  } catch {
    return Response.json({ error: "Corrupt draft config" }, { status: 500 });
  }

  // Unique image formats from selections
  const imageFormats = Array.from(
    new Set(body.selections.map((s) => s.format)),
  ) as Array<"square" | "landscape" | "portrait">;

  // Build a single release covering all needed formats
  const objects = buildObjects(cfg);
  const formats: FormatEntry[] = imageFormats.map((fmt) => ({
    name: fmt,
    slides: [{ objects: objects.length > 0 ? objects : undefined }],
  }));

  const releaseRequest: ReleaseRequest = {
    template: (cfg.templateId as ReleaseRequest["template"]) ?? "standard-browser",
    formats,
    ...(cfg.brandId
      ? { brand_id: cfg.brandId }
      : cfg.colors
        ? { colors: cfg.colors }
        : {}),
  };

  // Reserve credits
  const creditsNeeded = calculateCredits({ formats });
  let creditsRemaining: number;
  try {
    creditsRemaining = await fetchMutation(api.userProfiles.reserve, {
      userId,
      amount: creditsNeeded,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Insufficient credits")) {
      return Response.json(
        { error: "Not enough credits.", credits_needed: creditsNeeded },
        { status: 429 },
      );
    }
    if (msg.includes("User profile not found")) {
      return Response.json({ error: "No user profile." }, { status: 403 });
    }
    return Response.json({ error: "Reserve failed." }, { status: 500 });
  }

  // Render synchronously
  let release;
  try {
    release = await createRelease(releaseRequest, userId, { source: "api" });
    await renderReleaseAsync(release.cook_id, releaseRequest, userId);
  } catch (err) {
    console.error("[drafts/approve] render failed:", err);
    await fetchMutation(api.userProfiles.refund, {
      userId,
      amount: creditsNeeded,
    }).catch(() => {});
    return Response.json({ error: "Render failed." }, { status: 500 });
  }

  // Read back resolved release
  const completed = await getRelease(release.cook_id);
  if (!completed || completed.status !== "completed" || !completed.images) {
    return Response.json({ error: "Render did not complete." }, { status: 500 });
  }

  // Build mediaUrlByFormat — first slide URL per format
  const mediaUrlByFormat: Partial<Record<Format, string>> = {};
  for (const fmt of imageFormats) {
    const url = completed.images[fmt]?.slides?.[0];
    if (!url) {
      return Response.json(
        { error: `Render missing for format ${fmt}` },
        { status: 500 },
      );
    }
    mediaUrlByFormat[fmt] = url;
  }

  // Delete the draft (it's been approved — keeping it would clutter the queue)
  await fetchMutation(api.drafts.remove, {
    externalId: draftId,
    userId,
  }).catch((err) => console.error("[drafts/approve] draft remove failed:", err));

  // Approve via Convex
  const result = await fetchMutation(api.draftPushes.approveDraft, {
    draftId,
    title: body.title,
    description: body.description,
    copyByPlatform: body.copyByPlatform,
    selections: body.selections,
    postState: body.postState,
    clientNonce: body.clientNonce,
    mediaUrlByFormat,
    actingUserId: userId,
  });

  return Response.json({ ...result, credits_remaining: creditsRemaining });
}
