import { fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { api } from "@convex/_generated/api";
import { createRelease, getRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import {
  calculateCredits,
  type FormatEntry,
  type ObjectModification,
  type ReleaseRequest,
} from "@/lib/types";
import type { DraftConfig, DraftPlatform } from "@/lib/drafts/types";

type ApprovalFormat =
  | "square"
  | "landscape"
  | "portrait"
  | "video-square"
  | "video-landscape"
  | "video-portrait";

type Provider = "buffer" | "postiz";

type CopyVariant = { title: string; description: string };

export interface ApproveDraftPostBody {
  title: string;
  description: string;
  copyByPlatform?: Partial<Record<DraftPlatform, CopyVariant>>;
  copyByChannel?: Record<string, CopyVariant>;
  selections: Array<{ format: ApprovalFormat; provider: Provider; channelId: string }>;
  postState: "queue" | "draft";
  clientNonce: string;
  /**
   * Cook id of an already-rendered release. When provided, approve uses the
   * existing release's images instead of re-cooking from the draft config —
   * which avoids a second credit charge and removes the dependency on the
   * draft row still existing. Callers that just cooked (kitchen) should pass
   * this. Callers that haven't cooked (weekly summary) omit it and approve
   * falls back to the legacy cook-from-draft path.
   */
  cookId?: string;
}

export type PostApprovalActor = {
  userId: string;
  source: "api_key" | "session";
};

export type ApproveDraftPostResult = {
  status: number;
  body: Record<string, unknown>;
};

function json(status: number, body: Record<string, unknown>): ApproveDraftPostResult {
  return { status, body };
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

export async function approveDraftPost(input: {
  actor: PostApprovalActor;
  draftId: string;
  body: ApproveDraftPostBody;
}): Promise<ApproveDraftPostResult> {
  const { actor, draftId, body } = input;
  const { userId } = actor;

  if (!Array.isArray(body.selections) || body.selections.length === 0) {
    return json(400, { error: "selections must be a non-empty array" });
  }

  const videoSelections = body.selections.filter((s) =>
    s.format.startsWith("video-"),
  );
  if (videoSelections.length > 0) {
    return json(400, {
      error:
        "Video formats can't be approved through this flow yet. Cook the video separately, then push from history.",
    });
  }

  const imageFormats = Array.from(
    new Set(body.selections.map((s) => s.format)),
  ) as Array<"square" | "landscape" | "portrait">;

  const mediaUrlByFormat: Partial<Record<ApprovalFormat, string>> = {};
  let creditsRemaining: number | undefined;
  let creditsNeeded = 0;

  if (body.cookId) {
    // Reuse the release the kitchen just cooked. No second cook, no second
    // credit charge. The cook endpoint already reserved credits and produced
    // images in R2; we just need to verify ownership and pull URLs.
    const existing = await getRelease(body.cookId);
    if (!existing) {
      return json(404, { error: "Cook not found" });
    }
    const releaseUserId = await fetchQuery(api.releases.getOwnerId, {
      externalId: body.cookId,
    });
    if (releaseUserId !== userId) {
      return json(404, { error: "Cook not found" });
    }
    if (existing.status === "pending") {
      return json(409, { error: "Cook still rendering. Try again in a moment." });
    }
    if (existing.status !== "completed" || !existing.images) {
      return json(500, { error: "Cook did not complete." });
    }
    for (const fmt of imageFormats) {
      const url = existing.images[fmt]?.slides?.[0];
      if (!url) {
        return json(500, { error: `Cook missing for format ${fmt}` });
      }
      mediaUrlByFormat[fmt] = url;
    }
  } else {
    // Legacy path: no cook_id provided (e.g. weekly summary "Send..." goes
    // straight from a never-cooked draft). Fall back to cooking from the
    // draft's stored config and reserving credits inline.
    const draftRow = await fetchQuery(api.drafts.getByExternalId, {
      externalId: draftId,
      userId,
    });
    if (!draftRow) return json(404, { error: "Draft not found" });

    let cfg: DraftConfig;
    try {
      cfg = JSON.parse(draftRow.config) as DraftConfig;
    } catch {
      return json(500, { error: "Corrupt draft config" });
    }

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

    creditsNeeded = calculateCredits({ formats });
    try {
      creditsRemaining = await fetchMutation(api.userProfiles.reserve, {
        userId,
        amount: creditsNeeded,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Insufficient credits")) {
        return json(429, {
          error: "Not enough credits.",
          credits_needed: creditsNeeded,
        });
      }
      if (message.includes("User profile not found")) {
        return json(403, { error: "No user profile." });
      }
      return json(500, { error: "Reserve failed." });
    }

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
      return json(500, { error: "Render failed." });
    }

    const completed = await getRelease(release.cook_id);
    if (!completed || completed.status !== "completed" || !completed.images) {
      return json(500, { error: "Render did not complete." });
    }

    for (const fmt of imageFormats) {
      const url = completed.images[fmt]?.slides?.[0];
      if (!url) {
        return json(500, { error: `Render missing for format ${fmt}` });
      }
      mediaUrlByFormat[fmt] = url;
    }
  }

  let result;
  try {
    result = await fetchMutation(api.draftPushes.approveDraft, {
      draftId,
      title: body.title,
      description: body.description,
      copyByPlatform: body.copyByPlatform,
      copyByChannel: body.copyByChannel,
      selections: body.selections,
      postState: body.postState,
      clientNonce: body.clientNonce,
      mediaUrlByFormat,
      trustedActor: actor,
    });
  } catch (err) {
    if (
      err instanceof ConvexError &&
      typeof err.data === "object" &&
      err.data !== null &&
      (err.data as { code?: unknown }).code === "all_selections_skipped"
    ) {
      // Only refund when this call was the one that reserved (legacy path).
      // The cookId path doesn't reserve here — credits were charged at cook
      // time and stay spent regardless of approval outcome.
      if (creditsNeeded > 0) {
        await fetchMutation(api.userProfiles.refund, {
          userId,
          amount: creditsNeeded,
        }).catch(() => {});
      }
      return json(409, {
        error: "all_selections_skipped",
        skipped: (err.data as { skipped?: unknown }).skipped,
      });
    }
    throw err;
  }

  await fetchMutation(api.drafts.remove, {
    externalId: draftId,
    userId,
  }).catch((err) => console.error("[drafts/approve] draft remove failed:", err));

  return json(
    200,
    creditsRemaining === undefined
      ? { ...result }
      : { ...result, credits_remaining: creditsRemaining },
  );
}
