import { after } from "next/server";

export const maxDuration = 60;

import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import {
  authenticateAndCheckRateLimit,
  parseJsonBody,
  validateCommonFields,
  reserveCreditsOrError,
} from "../_shared";
import { createRelease, renderReleaseAsync } from "@/lib/pipeline/render";
import { ReleaseRequest, calculateCredits } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await authenticateAndCheckRateLimit(request);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as Record<string, unknown>;

  if (body.video !== undefined) {
    return Response.json(
      { error: "video field is not allowed on /cook/image; use /cook/video instead" },
      { status: 400 }
    );
  }

  const commonError = await validateCommonFields(body, userId);
  if (commonError) return commonError;

  const creditsNeeded = calculateCredits({
    formats: body.formats as ReleaseRequest["formats"],
  });

  const reserveResult = await reserveCreditsOrError(userId, creditsNeeded);
  if (reserveResult instanceof Response) return reserveResult;
  const { remaining } = reserveResult;

  const imageBody = body as unknown as ReleaseRequest;

  try {
    const result = await createRelease(imageBody, userId, { source: "api" });
    result.credits_remaining = remaining;
    after(() => renderReleaseAsync(result.cook_id, imageBody, userId));
    return Response.json(result, { status: 202 });
  } catch (err) {
    await fetchMutation(api.userProfiles.refund, {
      userId,
      amount: creditsNeeded,
    }).catch(console.error);
    console.error("Failed to create release:", err);
    return Response.json(
      { error: "Something burned. Try again." },
      { status: 500 }
    );
  }
}
