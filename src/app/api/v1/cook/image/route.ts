import { after } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export const maxDuration = 60;

import {
  authenticateAndCheckRateLimit,
  parseJsonBody,
  validateCommonFields,
  reserveCreditsOrError,
  refundAndFail,
  toReleaseRequest,
} from "../_shared";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { calculateCredits } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await authenticateAndCheckRateLimit(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  if (body.video !== undefined) {
    return Response.json(
      { error: "video field is not allowed on /cook/image; use /cook/video instead" },
      { status: 400 }
    );
  }

  const commonError = await validateCommonFields(body, userId);
  if (commonError) return commonError;

  const imageBody = toReleaseRequest(body);

  const creditsNeeded = calculateCredits({ formats: imageBody.formats });

  const reserveResult = await reserveCreditsOrError(userId, creditsNeeded);
  if (reserveResult instanceof Response) return reserveResult;
  const { remaining } = reserveResult;

  try {
    const result = await createRelease(imageBody, userId, { source: "api" });
    result.credits_remaining = remaining;

    const draftId = typeof body.draft_id === "string" ? body.draft_id : undefined;
    if (draftId) {
      await fetchMutation(api.drafts.remove, { externalId: draftId, userId }).catch((err) => {
        console.error(`[cook/image] Failed to delete draft ${draftId}:`, err);
      });
    }

    after(() => renderReleaseAsync(result.cook_id, imageBody, userId));
    return Response.json(result, { status: 202 });
  } catch (err) {
    console.error("Failed to create release:", err);
    return refundAndFail(userId, creditsNeeded, "image createRelease");
  }
}
